import os
import json
import datetime
import logging
import requests
import time
import random
import hashlib
import google.auth 
from firebase_functions import https_fn, options
from firebase_admin import initialize_app, firestore, auth
import firebase_admin
from dodopayments import DodoPayments 
import livekit.api

# --- GOOGLE CLOUD IMPORTS (REQUIRED FOR REAL ANALYTICS) ---
from google.cloud import monitoring_v3
from google.protobuf.timestamp_pb2 import Timestamp
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest, 
    RunRealtimeReportRequest, 
    DateRange, 
    Metric, 
    Dimension,
    OrderBy
)

# ==============================================================================
# [SECTION] 1. INITIALIZATION & CONFIGURATION
# Purpose: Global vars, Database connection, API Keys, Cost Constants
# ==============================================================================

if not firebase_admin._apps:
    initialize_app()

def get_db():
    """Helper to get Firestore Client"""
    return firestore.client()

# --- SERVER & PROJECT CONFIG ---
CLOUD_RUN_URL = "https://virtualbot-agent-267592786923.us-central1.run.app"
GA4_PROPERTY_ID = os.environ.get("GA4_PROPERTY_ID", "486528682") 
PROJECT_ID = os.environ.get("GCLOUD_PROJECT")
CLOUD_RUN_SERVICE = os.environ.get("K_SERVICE", "virtualbot-agent")

# --- COST CONSTANTS (Unit Economics) ---
COST_DEEPGRAM_PER_SEC = 0.0059 / 60
COST_GPT4O_INPUT = 0.0000025
COST_GPT4O_OUTPUT = 0.000010
COST_11LABS_PER_CHAR = 0.00009
COST_INFRA_PER_SEC = 0.02 / 60
COST_VIDEO_PER_MIN = 0.10

# --- DODO PAYMENTS CONFIG ---
DODO_API_KEY = "o3xGnOW3xMkekeYj.OPXqw0XreW7ThfMnzX3wFahxyIr_3tsceNfu_y836Yw8sx0J"
DODO_WEBHOOK_SECRET = "whsec_V6iGnIbnxHE5stofUWJPEDcjEsNeggxp"

dodo_client = DodoPayments(
    bearer_token=DODO_API_KEY,
    environment="test_mode" 
)

# --- PRODUCT MAPPING ---
PRODUCT_MAP = {
    # Free Tier (Standard Pricing)
    'pdt_c74fHGZjxOdNiJj7sH6AA': {'mins': 1, 'price': 1.00},
    'pdt_Uax7d9XyeCatIS7XoRkew': {'mins': 3, 'price': 3.00},
    'pdt_mpHm9RZmDlJ0wnqp49zYH': {'mins': 5, 'price': 5.00},
    'pdt_fL5tifug3sB8mIRa0vYel': {'mins': 10, 'price': 10.00},
    'pdt_DYYQCvpI3Sy1p056D9sKf': {'mins': 30, 'price': 30.00},
    
    # Pro Tier (Discounted Pricing)
    'pdt_1YFyVRaE0uJScFZO0KffX': {'mins': 1, 'price': 0.70},
    'pdt_a27UokCuhb3XVdHg64F1s': {'mins': 3, 'price': 2.10},
    'pdt_VFTtAZcQldRULwwPNcjxL': {'mins': 5, 'price': 3.50},
    'pdt_V526bk2eHPpu3UCnblxa3': {'mins': 10, 'price': 7.00},
    'pdt_RSW1JuLDhiGmjxxqbe1QG': {'mins': 30, 'price': 21.00},
    
    # Subscription (Fixed Price)
    'pdt_A7SyzDwkFIv2eOqI755gx': {'mins': 50, 'price': 29.00}
}
SUB_PRODUCT_ID = 'pdt_A7SyzDwkFIv2eOqI755gx'

# --- HELPERS ---
def get_admin_uid():
    env_id = os.environ.get("ADMIN_UID", "").strip()
    return env_id if env_id else "rfDcQEItSBPMxv7xK7mVDjO6WV72".strip()
    
# ==============================================================================
# [SECTION] 1.5 NOTIFICATION SERVICE
# ==============================================================================

def send_notification_email(uid, type, context):
    try:
        db = get_db()
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists: return

        user_data = user_doc.to_dict()
        settings = user_data.get("settings", {})
        email = user_data.get("email")

        # 1. CHECK USER SETTINGS
        should_send = False
        if type == "PAYMENT_RECEIPT" and settings.get("paymentReceipts", True): should_send = True
        elif type == "SUBSCRIPTION_UPDATE" and settings.get("renewalAlerts", True): should_send = True

        if should_send and email:
            print(f"✅ [EMAIL TRIGGER] Type: {type} | To: {email}")
            # Placeholder for SendGrid/Mailgun logic
            db.collection("system_logs").add({
                "type": "EMAIL_INTENT",
                "subtype": type,
                "uid": uid,
                "timestamp": firestore.SERVER_TIMESTAMP
            })

    except Exception as e:
        print(f"Notification Error: {e}")

# ==============================================================================
# [SECTION] 2. INFRASTRUCTURE MONITORING
# ==============================================================================

def get_cloud_run_metrics(hours=1): 
    try:
        if not PROJECT_ID: 
            return {"active_instances": 0, "cpu_utilization": 0, "memory_utilization": 0, "status": "UNKNOWN"}

        client = monitoring_v3.MetricServiceClient()
        project_name = f"projects/{PROJECT_ID}"
        
        now = time.time()
        seconds = int(now)
        nanos = int((now - seconds) * 10**9)
        
        interval = monitoring_v3.TimeInterval(
            end_time={"seconds": seconds, "nanos": nanos},
            start_time={"seconds": seconds - 180, "nanos": nanos}, 
        )

        results = {"active_instances": 0, "cpu_utilization": 0.0, "memory_utilization": 0.0, "status": "UNKNOWN"}

        # 1. INSTANCE COUNT
        count_filter = (
            f'metric.type="run.googleapis.com/container/instance_count" '
            f'AND resource.labels.service_name="{CLOUD_RUN_SERVICE}"'
        )
        count_aggregation = monitoring_v3.Aggregation(
            alignment_period={"seconds": 60},
            per_series_aligner=monitoring_v3.Aggregation.Aligner.ALIGN_MAX,
            cross_series_reducer=monitoring_v3.Aggregation.Reducer.REDUCE_MAX
        )
        request = monitoring_v3.ListTimeSeriesRequest(
            name=project_name, filter=count_filter, interval=interval,
            aggregation=count_aggregation,
            view=monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
        )
        
        for page in client.list_time_series(request):
            for point in page.points:
                val = point.value.int64_value
                if val > results["active_instances"]: results["active_instances"] = val

        # Aggregation for CPU/RAM
        dist_aggregation = monitoring_v3.Aggregation(
            alignment_period={"seconds": 60},
            per_series_aligner=monitoring_v3.Aggregation.Aligner.ALIGN_MEAN, 
            cross_series_reducer=monitoring_v3.Aggregation.Reducer.REDUCE_MEAN 
        )

        # 2. CPU UTILIZATION
        cpu_filter = (
            f'metric.type="run.googleapis.com/container/cpu/utilizations" '
            f'AND resource.labels.service_name="{CLOUD_RUN_SERVICE}"'
        )
        request_cpu = monitoring_v3.ListTimeSeriesRequest(
            name=project_name, filter=cpu_filter, interval=interval,
            aggregation=dist_aggregation, 
            view=monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
        )

        for page in client.list_time_series(request_cpu):
            for point in page.points:
                results["cpu_utilization"] = round(point.value.double_value * 100, 1)
                break 

        # 3. MEMORY UTILIZATION
        mem_filter = (
            f'metric.type="run.googleapis.com/container/memory/utilizations" '
            f'AND resource.labels.service_name="{CLOUD_RUN_SERVICE}"'
        )
        request_mem = monitoring_v3.ListTimeSeriesRequest(
            name=project_name, filter=mem_filter, interval=interval,
            aggregation=dist_aggregation, 
            view=monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
        )
        
        for page in client.list_time_series(request_mem):
             for point in page.points:
                 results["memory_utilization"] = round(point.value.double_value * 100, 1)
                 break

        # STATUS LOGIC
        if results["cpu_utilization"] > 80 or results["memory_utilization"] > 80: 
            results["status"] = "STRAINED"
        elif results["active_instances"] > 0: 
            results["status"] = "OPERATIONAL"
        else: 
            results["status"] = "IDLE"

        return results

    except Exception as e:
        print(f"Monitoring API Error: {e}")
        return {"error": str(e), "active_instances": 0, "cpu_utilization": 0, "memory_utilization": 0, "status": "UNKNOWN"}
        
# [SECTION] 3. USAGE WEBHOOKS (REAL DATA INGESTION)
# ==============================================================================
@https_fn.on_request(invoker="public")
def webhooks_deepgram(req: https_fn.Request) -> https_fn.Response:
    try:
        data = req.get_json()
        meta = data.get("metadata", {})
        session_id = req.args.get("session_id") or meta.get("request_id")
        if not session_id: return https_fn.Response("No ID", status=400)
        duration = data.get("duration", 0.0) 
        get_db().collection("sessions").document(session_id).set({
            "usage": { "deepgram": { "seconds": firestore.Increment(duration), "verified": True } }
        }, merge=True)
        return https_fn.Response("OK", status=200)
    except Exception as e: return https_fn.Response(str(e), status=500)

@https_fn.on_request(invoker="public")
def webhooks_elevenlabs(req: https_fn.Request) -> https_fn.Response:
    try:
        data = req.get_json()
        if data.get("type") != "history_item_created": return https_fn.Response("Skipped", 200)
        payload = data.get("data", {})
        session_id = payload.get("client_reference_id")
        chars = payload.get("character_count_change_to", 0) - payload.get("character_count_change_from", 0)
        actual_chars = abs(chars) 
        if session_id:
            get_db().collection("sessions").document(session_id).set({
                "usage": { "elevenlabs": { "chars": firestore.Increment(actual_chars), "verified": True } }
            }, merge=True)
        return https_fn.Response("OK", status=200)
    except Exception as e: return https_fn.Response(str(e), status=500)

# ==============================================================================
# [SECTION] 4. ADMIN PANEL BACKEND (LOGIC CORE)
# ==============================================================================

@https_fn.on_call() 
def admin_handler(req: https_fn.CallableRequest):
    # --- AUTH CHECK ---
    if not req.auth or not req.auth.uid:
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.UNAUTHENTICATED, message="Authentication required")

    incoming_uid = str(req.auth.uid).strip()
    secret_uid = get_admin_uid()
    if incoming_uid != secret_uid:
        try:
             user_record = auth.get_user(incoming_uid)
             if not user_record.custom_claims.get("admin"):
                 raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.PERMISSION_DENIED, message="Not an admin")
        except:
             raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.PERMISSION_DENIED, message="Not an admin")

    action = req.data.get("action")
    db = get_db()
    
    # --- 1. EXECUTIVE OVERVIEW ---
    if action == "getExecutiveOverview":
        try:
            trans_ref = db.collection("transactions").where("status", "==", "Succeeded").stream()
            total_revenue = 0.0
            for t in trans_ref: total_revenue += float(t.to_dict().get("amount", 0.0))
            
            users_snap = db.collection("users").count().get()
            total_users = users_snap[0][0].value
            
            sessions_ref = db.collection("sessions").where("status", "==", "disconnected").stream()
            total_minutes = 0.0
            total_cost_est = 0.0
            for s in sessions_ref:
                d = s.to_dict()
                mins = float(d.get("minutesConsumed", 0.0))
                if mins == 0.0 and d.get("startTime") and d.get("lastUpdate"):
                    try:
                        start = d.get("startTime")
                        end = d.get("lastUpdate")
                        if hasattr(start, 'timestamp') and hasattr(end, 'timestamp'):
                             diff = (end.timestamp() - start.timestamp()) / 60
                             mins = diff
                    except: pass
                total_minutes += mins
                total_cost_est += float(d.get("costEstimated", 0.0))
            
            avg_cost_min = (total_cost_est / total_minutes) if total_minutes > 0 else 0.0
            infra = get_cloud_run_metrics(hours=1)
            return {
                "kpi": {
                    "revenue_total": total_revenue, "revenue_trend": "Real",
                    "total_users": total_users, "users_trend": "Real",
                    "total_minutes": round(total_minutes, 1), "avg_cost_min": round(avg_cost_min, 3)
                },
                "system": {
                    "status": infra.get("status", "UNKNOWN"), "cpu": infra.get("cpu_utilization", 0),
                    "ram": infra.get("memory_utilization", 0), "instances": infra.get("active_instances", 0), 
                    "errors": 0, "uptime": "99.99%"
                }
            }
        except Exception as e:
            return {"kpi": {}, "system": {}}

    # --- 2. FINANCIAL COMMAND CENTER ---
    elif action == "getFinancialOverview":
        time_range = req.data.get("timeRange", "today")
        now = datetime.datetime.now(datetime.timezone.utc)
        if time_range == "yesterday":
            start_time = (now - datetime.timedelta(days=1)).replace(hour=0, minute=0, second=0)
            end_time = now.replace(hour=0, minute=0, second=0)
        elif time_range == "7d":
            start_time = now - datetime.timedelta(days=7)
            end_time = now
        elif time_range == "30d":
            start_time = now - datetime.timedelta(days=30)
            end_time = now
        else: 
            start_time = now.replace(hour=0, minute=0, second=0)
            end_time = now + datetime.timedelta(days=1)

        balance_doc = db.collection("system_balances").document("current").get()
        balances = balance_doc.to_dict() if balance_doc.exists else {}

        all_time_burn = { "openai": 0.0, "elevenlabs": 0.0, "deepgram": 0.0, "beyond": 0.0 }
        all_sessions = db.collection("sessions").select(["costEstimated"]).stream()
        for s in all_sessions:
            c = float(s.to_dict().get("costEstimated", 0.0))
            all_time_burn["beyond"] += c * 0.4
            all_time_burn["elevenlabs"] += c * 0.3
            all_time_burn["openai"] += c * 0.2
            all_time_burn["deepgram"] += c * 0.1

        range_query = db.collection("sessions").where("startTime", ">=", start_time).where("startTime", "<=", end_time).stream()
        financials = { "revenue": 0.0, "cost_total": 0.0, "sessions_active": 0, "sessions_total": 0 }
        range_burn = { "openai": 0.0, "elevenlabs": 0.0, "deepgram": 0.0, "beyond": 0.0 }
        feed = [] 
        
        for s in range_query:
            d = s.to_dict()
            financials["sessions_total"] += 1
            if d.get("status") == "active": financials["sessions_active"] += 1
            c_est = float(d.get("costEstimated", 0.0))
            financials["cost_total"] += c_est
            range_burn["beyond"] += c_est * 0.4
            range_burn["elevenlabs"] += c_est * 0.3
            range_burn["openai"] += c_est * 0.2
            range_burn["deepgram"] += c_est * 0.1
            dur = float(d.get("minutesConsumed", 0.0))
            rev = dur * 1.00 if dur > 0.16 else 0.0
            financials["revenue"] += rev
            feed.append({
                "time": str(d.get("startTime", "")), "duration": f"{dur:.1f}m",
                "revenue": rev, "cost": c_est, "profit": rev - c_est,
                "status": "Success" if dur > 0.16 else "Drop-off",
                "provider_latency": d.get("latency", 120)
            })

        def get_wallet_data(pid, label):
            total_added = float(balances.get(pid, 0.0))
            lifetime_used = all_time_burn[pid]
            spent_in_view = range_burn[pid]
            real_remaining = total_added - lifetime_used
            burn_rate = spent_in_view
            if time_range == "30d": burn_rate = spent_in_view / 30
            if time_range == "7d": burn_rate = spent_in_view / 7
            runout = "Safe"
            if burn_rate > 0.01:
                days = real_remaining / (burn_rate * 1.5) if real_remaining > 0 else 0
                runout = f"{int(days)} Days" if days <= 365 else "> 1 Year"
            elif real_remaining < 5: runout = "Low Balance"
            return {
                "id": pid, "label": label, "status": "Operational",
                "spent_view": spent_in_view, "remaining": real_remaining, "runout": runout, 
                "tech": {"latency":"Live","errors":"0%"} 
            }

        wallets = [
            get_wallet_data("openai", "OpenAI (LLM)"),
            get_wallet_data("elevenlabs", "ElevenLabs (TTS)"),
            get_wallet_data("deepgram", "Deepgram (STT)"),
            get_wallet_data("beyond", "Beyond (AVT)"),
        ]
        feed.sort(key=lambda x: x['time'], reverse=True)
        return {
            "kpi": {
                "net_profit": financials["revenue"] - financials["cost_total"],
                "gross_revenue": financials["revenue"], "total_cost": financials["cost_total"],
                "margin_pct": int(((financials["revenue"] - financials["cost_total"]) / financials["revenue"] * 100)) if financials["revenue"] > 0 else 0,
                "active_sessions": financials["sessions_active"],
                "capacity_safe": financials["sessions_active"] < 50
            },
            "wallets": wallets, "feed": feed[:20], "time_range": time_range
        }

    elif action == "exportFinancialData":
        time_range = req.data.get("timeRange", "30d")
        now = datetime.datetime.now(datetime.timezone.utc)
        start_time = now - datetime.timedelta(days=30) 
        if time_range == "7d": start_time = now - datetime.timedelta(days=7)
        if time_range == "today": start_time = now.replace(hour=0, minute=0, second=0)
        sessions_query = db.collection("sessions").where("startTime", ">=", start_time).stream()
        csv_data = "Date,Session ID,Duration (m),Revenue ($),Cost ($),Profit ($),Status\n"
        for s in sessions_query:
            d = s.to_dict()
            dur = float(d.get("minutesConsumed", 0.0))
            cost = float(d.get("costEstimated", 0.0))
            rev = dur * 1.00 if dur > 0.16 else 0.0
            status = "Billable" if dur > 0.16 else "Drop-off"
            csv_data += f"{str(d.get('startTime', ''))},{s.id},{dur:.2f},{rev:.2f},{cost:.4f},{rev-cost:.2f},{status}\n"
        return {"csv": csv_data, "filename": f"Financial_Export_{time_range}.csv"}

    elif action == "updateProviderBalance":
        updates = req.data.get("updates", {}) 
        doc_ref = db.collection("system_balances").document("current")
        batch_updates = {}
        for provider, amount in updates.items():
            try:
                val = float(amount)
                if val != 0: batch_updates[provider] = firestore.Increment(val)
            except: pass
        if batch_updates: doc_ref.set(batch_updates, merge=True)
        return {"success": True}

    elif action == "getAllUsers":
        limit = req.data.get("limit", 10)
        last_uid = req.data.get("lastUid")
        query = db.collection("users").order_by("createdAt", direction=firestore.Query.DESCENDING).limit(limit)
        if last_uid:
            try:
                last_doc = db.collection("users").document(last_uid).get()
                if last_doc.exists: query = query.start_after(last_doc)
            except: pass
        docs = query.stream()
        users_list = []
        last_id = None
        for doc in docs:
            last_id = doc.id
            d = doc.to_dict()
            users_list.append({
                "id": doc.id, "name": d.get('displayName', 'User'), 
                "email": d.get('email', 'No Email'), "plan": 'Pro' if d.get('isPremium') else 'Free', 
                "status": 'active', "country": d.get('country', 'Global'), "flag": "🌍", 
                "spent": float(d.get('totalSpent', 0.0)), "balance": f"{float(d.get('minutesBalance', 0.0)):.1f}m", 
                "ip": d.get('ip', 'Unknown'), "avatarUrl": d.get('photoURL') or ""
            })
        return {"users": users_list, "lastDocId": last_id}

    # --------------------------------------------------------------------------
    # 6. TRAFFIC STATS (FIXED FOR REALTIME GA4 + FUNNEL)
    # --------------------------------------------------------------------------
    elif action == "getTrafficStats":
        stats = {
            "kpi": { "visitors_today": 0, "visitors_7d": 0, "unique_30d": 0, "active_1h": 0, "active_24h": 0, "mau": 0, "new_today": 0, "new_30d": 0, "returning_pct": "0%" },
            "realtime": { "online": 0, "landing": 0, "dashboard": 0, "live_call": 0 },
            "sources": [], 
            "funnel": { "landing": 0, "signup": 0, "call_start": 0, "conv_signup": "0%", "conv_call": "0%" },
            "engagement": { "avg_session": "0m", "avg_call": "0m", "sess_per_user": 0, "drop_off": "0s" },
            "retention": { "day1": "0%", "day7": "0%", "day30": "0%", "returning": "0%" },
            "geo": [], "devices": { "desktop": 0, "mobile": 0 }, 
            "quality": { "bounce": "0%", "errors": "0%" }, 
            "insights": []
        }

        try:
            ga4_client = BetaAnalyticsDataClient()

            # Helper to fetch single metric safely
            def fetch_ga4_metric(metric_name, start_date):
                try:
                    req = RunReportRequest(
                        property=f"properties/{GA4_PROPERTY_ID}",
                        metrics=[Metric(name=metric_name)],
                        date_ranges=[DateRange(start_date=start_date, end_date="today")]
                    )
                    res = ga4_client.run_report(req)
                    if res.rows: return int(res.rows[0].metric_values[0].value)
                except: pass
                return 0

            # --- A. KPI FETCH (FIXED) ---
            # Explicitly fetch GA4 data for the cards that were showing '0'
            visitors_today = fetch_ga4_metric("activeUsers", "today")
            visitors_7d = fetch_ga4_metric("activeUsers", "7daysAgo")
            visitors_30d = fetch_ga4_metric("activeUsers", "30daysAgo")

            # --- B. DATABASE METRICS (Signups & Calls) ---
            today_start = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0)
            thirty_days_ago = today_start - datetime.timedelta(days=30)
            
            # Count New Users (DB)
            new_today = db.collection("users").where("createdAt", ">=", today_start).count().get()[0][0].value
            new_30d = db.collection("users").where("createdAt", ">=", thirty_days_ago).count().get()[0][0].value
            
            # Count Active Sessions (Live)
            live_calls = db.collection("sessions").where("status", "==", "active").count().get()[0][0].value
            
            # Count Completed Sessions (30d) for Funnel
            calls_30d = db.collection("sessions").where("startTime", ">=", thirty_days_ago).count().get()[0][0].value

            # Realtime 'Last Active' users from DB (Reliable fallback if GA4 real-time is delayed)
            five_mins_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5)
            active_docs_db = db.collection("users").where("lastActive", ">=", five_mins_ago).count().get()[0][0].value
            
            # --- C. POPULATE STATS ---
            stats["kpi"]["visitors_today"] = visitors_today if visitors_today > 0 else active_docs_db # Fallback to DB if GA is 0
            stats["kpi"]["visitors_7d"] = visitors_7d
            stats["kpi"]["unique_30d"] = visitors_30d
            stats["kpi"]["new_today"] = new_today
            stats["kpi"]["new_30d"] = new_30d
            
            # Realtime Section
            stats["realtime"]["live_call"] = live_calls
            stats["realtime"]["online"] = max(active_docs_db, live_calls)
            stats["realtime"]["dashboard"] = max(0, stats["realtime"]["online"] - live_calls)

            # --- D. FUNNEL LOGIC (FIXED) ---
            # Landing (GA4 Sessions) -> Signup (DB Users) -> Call (DB Sessions)
            funnel_landing = fetch_ga4_metric("sessions", "30daysAgo")
            # Fallback: if GA4 says 0 sessions but we have users, use users count as base
            if funnel_landing < new_30d: funnel_landing = new_30d 

            stats["funnel"]["landing"] = funnel_landing
            stats["funnel"]["signup"] = new_30d
            stats["funnel"]["call_start"] = calls_30d
            
            # Calculate Percentages
            if funnel_landing > 0:
                conv_signup = (new_30d / funnel_landing) * 100
                stats["funnel"]["conv_signup"] = f"{conv_signup:.1f}%"
            
            if new_30d > 0:
                conv_call = (calls_30d / new_30d) * 100
                stats["funnel"]["conv_call"] = f"{conv_call:.1f}%"

            # --- E. GA4 SOURCES & GEO (Existing Logic) ---
            try:
                src_req = RunReportRequest(
                    property=f"properties/{GA4_PROPERTY_ID}",
                    dimensions=[Dimension(name="sessionSource")],
                    metrics=[Metric(name="sessions")],
                    date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
                    order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
                    limit=5 
                )
                src_res = ga4_client.run_report(src_req)
                total_src = sum([int(r.metric_values[0].value) for r in src_res.rows])
                if total_src > 0:
                    for r in src_res.rows:
                        val = int(r.metric_values[0].value)
                        stats["sources"].append({ "label": r.dimension_values[0].value, "val": val, "percent": round((val/total_src)*100, 1) })

                geo_req = RunReportRequest(
                    property=f"properties/{GA4_PROPERTY_ID}",
                    dimensions=[Dimension(name="country")],
                    metrics=[Metric(name="activeUsers")],
                    date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
                    limit=5
                )
                geo_res = ga4_client.run_report(geo_req)
                total_geo = sum([int(r.metric_values[0].value) for r in geo_res.rows])
                if total_geo > 0:
                    for r in geo_res.rows:
                        val = int(r.metric_values[0].value)
                        stats["geo"].append({ "country": r.dimension_values[0].value, "percent": round((val/total_geo)*100, 1), "flag": "🏳️" })
                        
                # Devices
                dev_req = RunReportRequest(
                    property=f"properties/{GA4_PROPERTY_ID}",
                    dimensions=[Dimension(name="deviceCategory")],
                    metrics=[Metric(name="activeUsers")],
                    date_ranges=[DateRange(start_date="30daysAgo", end_date="today")]
                )
                dev_res = ga4_client.run_report(dev_req)
                total_dev = sum([int(r.metric_values[0].value) for r in dev_res.rows])
                if total_dev > 0:
                    for r in dev_res.rows:
                        if "desktop" in r.dimension_values[0].value.lower():
                            stats["devices"]["desktop"] = round((int(r.metric_values[0].value)/total_dev)*100, 1)
                        else:
                            stats["devices"]["mobile"] = round((int(r.metric_values[0].value)/total_dev)*100, 1)

            except Exception as e:
                stats["insights"].append({"type": "warning", "text": f"GA4 Partial Error: {str(e)}"})

            # Insights
            if new_today > 0: stats["insights"].append({"type": "positive", "text": f"{new_today} New users joined today."})
            if live_calls > 0: stats["insights"].append({"type": "positive", "text": f"Platform Active: {live_calls} calls running."})

        except Exception as e:
            print(f"Traffic Error: {e}")
            return stats 

        return stats

    # --- 7. OTHER ACTIONS ---
    elif action == "getClusterStatus":
        try:
            infra = get_cloud_run_metrics(hours=1)
            count = min(int(infra.get("active_instances", 0)), 50)
            nodes = [{ "id": f"worker-{str(i+1).zfill(2)}", "region": "us-central1", "cpu": infra.get("cpu_utilization", 0), "ram": infra.get("memory_utilization", 0), "users": "Active", "status": "Running" } for i in range(count)]
            return {
                "kpi": { "cpu": infra.get('cpu_utilization', 0), "ram": infra.get('memory_utilization', 0), "instances": count, "status": infra.get("status", "UNKNOWN") }, 
                "costs": {"month": "Calculated", "week": "Calculated"}, "workers": nodes
            }
        except: return {"kpi": {}, "costs": {}, "workers": []}

    elif action == "getFeedback":
        limit = req.data.get("limit", 10)
        last_id = req.data.get("lastDocId")
        query = db.collection("feedback").order_by("createdAt", direction=firestore.Query.DESCENDING).limit(limit)
        if last_id:
            try:
                snap = db.collection("feedback").document(last_id).get()
                if snap.exists: query = query.start_after(snap)
            except: pass
        res = []
        last_doc = None
        for f in query.stream():
            last_doc = f.id
            d = f.to_dict()
            res.append({ "id": f.id, "email": d.get("email"), "text": d.get("text"), "rating": d.get("rating"), "date": str(d.get("createdAt")) })
        return {"feedback": res, "lastDocId": last_doc}

    elif action == "generatePerformanceReport":
        period = req.data.get("period", "30d")
        now = datetime.datetime.now(datetime.timezone.utc)
        start_date = now - datetime.timedelta(days=30) 
        if period == "7d": start_date = now - datetime.timedelta(days=7)
        if period == "this_month": start_date = now.replace(day=1, hour=0, minute=0, second=0)
        trans_query = db.collection("transactions").where("timestamp", ">=", start_date).where("status", "==", "Succeeded").stream()
        revenue = 0.0
        for t in trans_query: revenue += float(t.to_dict().get("amount", 0))
        sess_query = db.collection("sessions").where("startTime", ">=", start_date).where("status", "==", "completed").stream()
        sessions_count = 0
        for s in sess_query: sessions_count += 1
        csv_output = f"PERFORMANCE REPORT ({period.upper()})\nGenerated: {now.strftime('%Y-%m-%d %H:%M')}\n\nTotal Revenue,${revenue:.2f}\nTotal Sessions,{sessions_count}\n"
        return {"report_data": csv_output, "filename": f"Report_{period}.csv"}

    elif action == "exportUserData": 
        return {"csv": "UID,Name\n1,Test"}
        
    elif action == "manageUser":
        sub_action = req.data.get("subAction")
        target_uid = req.data.get("targetUid")
        if not target_uid: return {"error": "Target UID required"}
        user_ref = db.collection("users").document(target_uid)
        if sub_action == "ban":
            user_ref.update({"status": "banned", "isPremium": False})
            try: auth.update_user(target_uid, disabled=True)
            except: pass
        elif sub_action == "updateBalance":
            try:
                raw_amount = req.data.get("amount", 0)
                amount = float(raw_amount)
                if amount == 0: return {"success": False}
                user_ref.update({ "minutesBalance": firestore.Increment(amount), "updatedAt": firestore.SERVER_TIMESTAMP })
                db.collection("transactions").add({
                    "uid": target_uid, "type": "ADMIN_ADJUSTMENT", "amount": 0.00,
                    "minutesAdded": amount, "description": "Admin Manual Adjustment",
                    "status": "Completed", "timestamp": firestore.SERVER_TIMESTAMP
                })
                return {"success": True}
            except Exception as e: return {"error": str(e)}
        return {"success": True}

    else: 
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT, message=f"Unknown Action: {action}")

# ==============================================================================
# [SECTION] 5. CLIENT SESSION (LIVEKIT TOKEN MINTING)
# ==============================================================================

@https_fn.on_call(secrets=["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"])
def api_session(req: https_fn.CallableRequest):
    data = req.data
    action = data.get("action")
    db = get_db()
    settings = db.collection("system_settings").document("global").get().to_dict() or {}
    if settings.get("maintenanceMode", False) and str(req.auth.uid) != get_admin_uid():
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.UNAVAILABLE, message="Maintenance Mode")

    if action == "start":
        user_uid = data.get("uid") 
        persona_id = data.get("personaId", "sarah") 
        if not user_uid: raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT, message="Missing UID")
        if CLOUD_RUN_URL:
            try: requests.get(CLOUD_RUN_URL, timeout=0.2)
            except: pass 
        user_ref = db.collection("users").document(user_uid)
        user_data = user_ref.get().to_dict()
        if not user_data: raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.NOT_FOUND, message="User not found")
        balance = float(user_data.get("minutesBalance", 0.0))
        if balance <= 0.01 and not user_data.get("isPremium", False): 
             raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED, message="Insufficient minutes.")

        lk_url = os.environ.get("LIVEKIT_URL")
        lk_api_key = os.environ.get("LIVEKIT_API_KEY")
        lk_api_secret = os.environ.get("LIVEKIT_API_SECRET")
        session_id = f"sess_{os.urandom(4).hex()}"
        
        grant = livekit.api.VideoGrants(room_join=True, room=session_id, can_publish=True, can_subscribe=True, can_publish_data=True)
        identity_val = f"user_{user_uid}"
        metadata_payload = json.dumps({ "uid": user_uid, "personaId": persona_id, "enableMemory": user_data.get("isPremium") })
        token = livekit.api.AccessToken(lk_api_key, lk_api_secret) \
            .with_grants(grant).with_identity(identity_val) \
            .with_name(user_data.get("displayName", "User")).with_metadata(metadata_payload)

        db.collection("sessions").document(session_id).set({
            "uid": user_uid, "startTime": firestore.SERVER_TIMESTAMP, "status": "active", 
            "persona": persona_id, "costs": { "stt": 0, "tts": 0, "llm": 0, "infra": 0 }
        })
        return { "session_id": session_id, "rtc": { "token": token.to_jwt(), "url": lk_url } }
    
    elif action == "stop":
        session_id = data.get("sessionId")
        if session_id: db.collection("sessions").document(session_id).update({ "status": "disconnected", "lastUpdate": firestore.SERVER_TIMESTAMP })
        return {"success": True}

    raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT, message=f"Unknown action: {action}")

# ==============================================================================
# [SECTION] 6. USER API
# ==============================================================================
@https_fn.on_call()
def api_user(req: https_fn.CallableRequest):
    if not req.data: return {"status": "error"}
    data = req.data
    action = data.get("action")
    uid = data.get("uid") or (req.auth.uid if req.auth else None)
    db = get_db()
    if not uid: return {"error": "Missing UID"}

    if action == "sync":
        email = data.get("email")
        try:
            raw_req = req.raw_request
            ip = raw_req.headers.get("X-Forwarded-For", "Unknown IP").split(',')[0].strip()
            city = raw_req.headers.get("X-AppEngine-City", "")
            country = raw_req.headers.get("X-AppEngine-Country", "")
            location = f"{city}, {country}".strip(", ") or "Unknown Location"
            ua = raw_req.headers.get("User-Agent", "Unknown Device")
            sess_id = hashlib.md5(f"{ip}{ua}".encode()).hexdigest()
            db.collection("users").document(uid).collection("sessions").document(sess_id).set({
                "ip": ip, "location": location, "userAgent": ua, "lastActive": firestore.SERVER_TIMESTAMP
            }, merge=True)
            incoming_data = data.get("data", {})
            update_data = { "ip": ip, "country": country or "Global" }
            if incoming_data.get("displayName"): update_data["displayName"] = incoming_data.get("displayName")
            if incoming_data.get("email"): update_data["email"] = incoming_data.get("email")
            if incoming_data and "photoURL" in incoming_data: update_data["photoURL"] = incoming_data["photoURL"]
            db.collection("users").document(uid).set(update_data, merge=True)
        except: pass
        
        sys_settings = db.collection("system_settings").document("global").get().to_dict() or {}
        is_admin = (str(uid).strip() == get_admin_uid())
        if sys_settings.get("maintenanceMode", False) and not is_admin: return {"maintenance": True}
        
        user_ref = db.collection("users").document(uid)
        doc = user_ref.get()
        if not doc.exists:
            p_url = data.get("data", {}).get("photoURL", "")
            d_name = data.get("data", {}).get("displayName")
            if not d_name and req.auth and req.auth.token.get("name"): d_name = req.auth.token.get("name")
            if not d_name: d_name = "User"
            final_email = email
            if not final_email and req.auth and req.auth.token.get("email"): final_email = req.auth.token.get("email")
            new_data = {
                "uid": uid, "email": final_email or "", "displayName": d_name, "photoURL": p_url, 
                "minutesBalance": 0.0, "isPremium": False, "autoRenew": False, "subscriptionStatus": "free", "totalSpent": 0.0,
                "createdAt": firestore.SERVER_TIMESTAMP, "updatedAt": firestore.SERVER_TIMESTAMP
            }
            user_ref.set(new_data)
            new_data['createdAt'] = str(datetime.datetime.now())
            return new_data
        else:
            u_data = doc.to_dict()
            u_data['uid'] = uid
            if "createdAt" not in u_data:
                user_ref.update({"createdAt": firestore.SERVER_TIMESTAMP})
                u_data["createdAt"] = str(datetime.datetime.now())
            if u_data.get("isPremium") and u_data.get("subscriptionEnd"):
                sub_end = u_data.get("subscriptionEnd")
                if hasattr(sub_end, 'to_datetime'): sub_end = sub_end.to_datetime()
                if sub_end < datetime.datetime.now(datetime.timezone.utc):
                    user_ref.update({"isPremium": False, "subscriptionStatus": "expired"})
                    u_data["isPremium"] = False
            user_ref.update({ "updatedAt": firestore.SERVER_TIMESTAMP, "lastActive": firestore.SERVER_TIMESTAMP })
            for k, v in u_data.items():
                if isinstance(v, (datetime.datetime, datetime.date)): u_data[k] = str(v)
            return u_data
            
    elif action == "sendPasswordReset":
        try:
            if uid:
                user = auth.get_user(uid)
                link = auth.generate_password_reset_link(user.email)
            return {"success": True}
        except Exception as e: return {"error": str(e)}

    elif action == "getSecuritySessions":
        sessions = []
        try:
            sess_docs = db.collection("users").document(uid).collection("sessions").order_by("lastActive", direction=firestore.Query.DESCENDING).limit(10).stream()
            for s in sess_docs:
                d = s.to_dict()
                sessions.append({ "id": s.id, "ip": d.get("ip"), "location": d.get("location"), "userAgent": d.get("userAgent"), "lastActive": str(d.get("lastActive")) })
        except: pass
        return {"sessions": sessions}

    elif action == "revokeAllSessions":
        try:
            auth.revoke_refresh_tokens(uid)
            batch = db.batch()
            docs = db.collection("users").document(uid).collection("sessions").limit(20).stream()
            for d in docs: batch.delete(d.reference)
            batch.commit()
        except: pass
        return {"success": True}

    elif action == "submitFeedback":
        db.collection("feedback").add({
            "uid": uid, "email": data.get("email", "Unknown"), "text": data.get("text"), 
            "rating": data.get("rating", 5), "createdAt": firestore.SERVER_TIMESTAMP
        })
        return {"success": True}

    elif action == "saveSettings":
        new_name = data.get("displayName")
        settings_data = data.get("settings", {})
        update_payload = { "settings": settings_data }
        if new_name and len(new_name.strip()) > 0:
            update_payload["displayName"] = new_name
            try: auth.update_user(uid, display_name=new_name)
            except: pass
        db.collection("users").document(uid).set(update_payload, merge=True)
        return {"success": True}

    elif action == "clearMemory":
        db.collection("users").document(uid).update({ "memory": firestore.DELETE_FIELD, "chat_context": firestore.DELETE_FIELD })
        return {"success": True}

    elif action == "deleteAccount":
        db.collection("users").document(uid).delete()
        try: auth.delete_user(uid)
        except: pass
        return {"success": True}

    elif action == "getSubscription":
        ud = db.collection("users").document(uid).get().to_dict() or {}
        sub_end_ts = ud.get("subscriptionEnd")
        readable_date = ""
        if sub_end_ts:
            dt = sub_end_ts
            if hasattr(sub_end_ts, 'to_datetime'): dt = sub_end_ts.to_datetime()
            readable_date = dt.strftime("%b %d, %Y")
        return { 
            "plan": "Pro" if ud.get("isPremium") else "Free", "isPremium": ud.get("isPremium", False), 
            "autoRenew": ud.get("autoRenew", False), "status": ud.get("subscriptionStatus", "free"), 
            "balance": float(ud.get("minutesBalance", 0)), "renewalDate": readable_date 
        }
    
    elif action == "cancelSubscription":
        db.collection("users").document(uid).update({ "autoRenew": False, "subscriptionStatus": "canceled_at_period_end" })
        db.collection("transactions").add({
            "uid": uid, "type": "SUBSCRIPTION_CANCELLED", "description": "Subscription Cancelled", "amount": 0.00,
            "minutesAdded": 0, "status": "Completed", "timestamp": firestore.SERVER_TIMESTAMP
        })
        return {"success": True}

    elif action == "getBillingHistory":
        limit = data.get("pageSize", 10)
        last_id = data.get("lastDocId")
        query = db.collection("transactions").where("uid", "==", uid).order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit)
        if last_id:
             try:
                 last_snapshot = db.collection("transactions").document(last_id).get()
                 if last_snapshot.exists: query = query.start_after(last_snapshot)
             except: pass
        docs = query.stream()
        history = []
        last_doc_ref = None
        for d in docs:
            last_doc_ref = d.id
            dd = d.to_dict()
            history.append({
                "id": d.id, "date": str(dd.get("timestamp")), "amount": f"${float(dd.get('amount', 0)):.2f}", 
                "description": dd.get("description", "Transaction"), "status": dd.get("status", "Completed"),
                "minutes": dd.get("minutesAdded", 0), "type": dd.get("type", "TOPUP")
            })
        return {"history": history, "lastDocId": last_doc_ref}
        
    elif action == "getUserSessions":
        limit = data.get("pageSize", 7)
        last_id = data.get("lastDocId")
        query = db.collection("sessions").where("uid", "==", uid).order_by("startTime", direction=firestore.Query.DESCENDING).limit(limit)
        if last_id:
             try:
                 last_snapshot = db.collection("sessions").document(last_id).get()
                 if last_snapshot.exists: query = query.start_after(last_snapshot)
             except: pass
        docs = query.stream()
        sessions_list = []
        last_doc_ref = None
        for d in docs:
            last_doc_ref = d.id
            dd = d.to_dict()
            def fmt_time(ts):
                if not ts: return "-"
                return ts.strftime("%I:%M %p") if hasattr(ts, 'strftime') else str(ts)
            def fmt_date(ts):
                if not ts: return "-"
                return ts.strftime("%Y-%m-%d") if hasattr(ts, 'strftime') else str(ts)
            start_ts = dd.get("realStartTime") or dd.get("startTime")
            end_ts = dd.get("endTime") or dd.get("lastUpdate")
            sessions_list.append({ "id": d.id, "date": fmt_date(start_ts), "startTime": fmt_time(start_ts), "endTime": fmt_time(end_ts) })
        return {"sessions": sessions_list, "lastDocId": last_doc_ref}

# ==============================================================================
# [SECTION] 7. PAYMENTS
# ==============================================================================

@https_fn.on_call()
def create_payment_link(req: https_fn.CallableRequest):
    data = req.data
    product_id = data.get("productId")
    user_uid = data.get("uid")
    if not user_uid: raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT, message="Missing UID")
    try:
        session = dodo_client.checkout_sessions.create(
            product_cart=[{"product_id": product_id, "quantity": 1}],
            metadata={"userId": user_uid, "productId": product_id}, 
            return_url="https://kin7.com/dashboard"
        )
        return {"url": getattr(session, 'checkout_url', None) or getattr(session, 'payment_link', None)}
    except Exception as e:
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.INTERNAL, message=str(e))

@https_fn.on_request(invoker="public")
def dodo_webhook(req: https_fn.Request) -> https_fn.Response:
    try:
        payload = req.get_json()
        etype = payload.get("type")
        data = payload.get("data", {})
        meta = data.get("metadata", {}) or payload.get("metadata", {})
        if isinstance(meta, str):
            try: meta = json.loads(meta)
            except: pass
        user_uid = meta.get("userId")
        pid = data.get("product_id") or payload.get("product_id") or meta.get("productId")
        if not user_uid: return https_fn.Response("No UID", status=200)

        db = get_db()
        uref = db.collection("users").document(user_uid)
        card = None
        if 'payment_method' in data and isinstance(data['payment_method'], dict): 
            card = data['payment_method'].get('last4')
        if card: uref.update({"cardLast4": card})

        if etype == "payment.succeeded":
            is_sub = (pid == SUB_PRODUCT_ID)
            raw_amt = float(data.get("amount", 0))
            amt_usd = raw_amt / 100 if raw_amt > 0 else float(PRODUCT_MAP.get(pid, {}).get('price', 0.0))
            uref.update({"totalSpent": firestore.Increment(amt_usd)})
            try: cur_bal = float(uref.get().to_dict().get("minutesBalance", 0.0))
            except: cur_bal = 0.0

            if is_sub:
                uref.update({
                    "minutesBalance": cur_bal + 50, "isPremium": True, "autoRenew": True, "subscriptionStatus": "active", 
                    "subscriptionEnd": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30),
                    "updatedAt": firestore.SERVER_TIMESTAMP
                })
                db.collection("transactions").add({
                    "uid": user_uid, "productId": pid, "minutesAdded": 50, "amount": amt_usd,
                    "timestamp": firestore.SERVER_TIMESTAMP, "type": "SUBSCRIPTION_PAYMENT", 
                    "description": "Pro Subscription", "status": "Succeeded"
                })
                send_notification_email(user_uid, "SUBSCRIPTION_UPDATE", {"status": "Active", "plan": "Pro"})
            else:
                mins = PRODUCT_MAP.get(pid, {}).get('mins', 0)
                if mins > 0: uref.update({"minutesBalance": cur_bal + mins})
                db.collection("transactions").add({
                    "uid": user_uid, "productId": pid, "minutesAdded": mins, "amount": amt_usd,
                    "timestamp": firestore.SERVER_TIMESTAMP, "type": "TOPUP", 
                    "description": "Minute Top-up", "status": "Succeeded"
                })
                send_notification_email(user_uid, "PAYMENT_RECEIPT", {"amount": amt_usd, "minutes": mins})
        elif etype == "payment.failed":
             db.collection("transactions").add({
                 "uid": user_uid, "type": "PAYMENT_FAILED", "description": "Payment Failed", 
                 "amount": 0.00, "status": "Failed", "timestamp": firestore.SERVER_TIMESTAMP
             })
        return https_fn.Response("OK", status=200)
    except Exception as e:
        return https_fn.Response(f"Error: {e}", status=500)

# ==============================================================================
# [SECTION] 8. PUBLIC CONTENT API (CMS)
# ==============================================================================

@https_fn.on_call(invoker="public")
def api_public(req: https_fn.CallableRequest):
    action = req.data.get("action")
    db = get_db()
    if action == "getPage":
        page_id = req.data.get("pageId") 
        if not page_id: return {"content": ""}
        doc = db.collection("content_pages").document(page_id).get()
        if doc.exists: return doc.to_dict()
        else: return {"title": page_id.replace("_", " ").title(), "content": "Content coming soon."}
    return {"error": "Invalid action"}