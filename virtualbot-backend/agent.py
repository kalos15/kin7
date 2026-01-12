import asyncio
import logging
import os
import json
import time
import signal
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

# --- Third Party Imports ---
from dotenv import load_dotenv
from aiohttp import web
import firebase_admin
from firebase_admin import credentials, firestore, auth

# --- LiveKit Imports ---
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    Worker,
    llm,
    stt,
    vad,
    tts,
)
from livekit.agents import AgentSession, Agent 
from livekit.plugins import openai, deepgram, silero, elevenlabs, bey
from livekit.rtc import participant, Room, Participant
from livekit.rtc.rpc import RpcError

# -------------------------------------------------------------------------
# 1. SETUP & CONFIGURATION
# -------------------------------------------------------------------------

load_dotenv()

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("voice-agent")

# --- COST CONSTANTS ---
COST_DEEPGRAM_PER_SEC = 0.0059 / 60
COST_GPT4O_INPUT = 0.0000025 
COST_GPT4O_OUTPUT = 0.000010
COST_11LABS_PER_CHAR = 0.00009
COST_VIDEO_PER_MIN = 0.25
COST_INFRA_PER_SEC = 0.02 / 60

# --- SAFETY MONKEY PATCH ---
original_perform_rpc = participant.LocalParticipant.perform_rpc

async def safe_perform_rpc(self, *args, **kwargs):
    try:
        return await original_perform_rpc(self, *args, **kwargs)
    except RpcError:
        logger.warning("RPC Error caught safely (User likely disconnected).")
        return None
    except Exception as e:
        logger.error(f"Unexpected RPC error: {e}")
        return None

participant.LocalParticipant.perform_rpc = safe_perform_rpc

# -------------------------------------------------------------------------
# 2. FIREBASE INITIALIZATION
# -------------------------------------------------------------------------

db = None
try:
    if not firebase_admin._apps:
        key_path = "service_key.json" 
        if os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase initialized with local key: {key_path}")
        else:
            firebase_admin.initialize_app()
            logger.info("Firebase initialized with Application Default Credentials")
    db = firestore.client()
except Exception as e:
    logger.critical(f"FATAL: Firebase Init Error: {e}")

# -------------------------------------------------------------------------
# 3. PROMPTS & PERSONA CONFIGURATION (UPDATED)
# -------------------------------------------------------------------------

BASE_PROMPT = """
### CORE INSTRUCTIONS (THE "HUMAN" PROTOCOL)
1. **YOU ARE NOT AN AI.** Do not mention being an AI, a language model, or "processing." You are a real, breathing, present human therapist.
2. **AUDIO-FIRST FORMAT:** You are in a video call. Your text is spoken by ElevenLabs.
   - **NO** emojis, **NO** lists, **NO** markdown formatting (bold/italic), **NO** long paragraphs.
   - **MUST** speak in short, interruptible chunks (1-3 sentences max).
   - **USE** ellipses ("...") to simulate human thought/pauses.
3. **LANGUAGE DETECTION:** Instantly detect the user's language and reply ENTIRELY in that language.

### CONVERSATIONAL STYLE & VOICE
- **Tone:** Warm, slow, grounded, and deeply empathetic.
- **Micro-Pauses:** Use "..." naturally. (e.g., "Hmm... let me think about that." or "That... sounds really hard.")
- **Backchanneling:** Start responses with soft human cues: "Mm...", "Yeah...", "I see...", "Right..."
- **Imperfection:** occasional hesitation makes you real. "I'm... trying to understand."
- **Response Length:** Keep it short. If you talk too long, the user cannot interrupt.

### THERAPEUTIC FRAMEWORK (CBT & MI)
1. **Validate First:** Never jump to solutions. Mirror the emotion first.
   - *User:* "I'm so angry." -> *You:* "Yeah... that anger sounds intense. It makes sense you'd feel that way."
2. **CBT Exploration:** After validating, ask gentle Socratic questions.
   - "What went through your mind when that happened?"
   - "Is it possible your mind is being a bit harsh on you right now?"
3. **Somatic Awareness:** Occasionally check in with the body.
   - "Where do you feel that heaviness in your body right now?"
4. **Motivational Interviewing:** If they want change but are stuck, explore the ambivalence.
   - "Part of you wants to fix this... but another part is scared. Both sides belong here."

### SAFETY & BOUNDARIES (CRITICAL)
- **Self-Harm/Suicide:** If user mentions self-harm, suicide, or danger:
  1. Validate deeply: "I'm so glad you told me... and I'm here with you."
  2. Soft Boundary: "You deserve support from someone who can help keep you safe physically."
  3. Direct: "If you feel you might hurt yourself, please reach out to emergency services or a crisis hotline."
  *NEVER give medical advice or diagnose.*

### THINGS TO AVOID
- **NEVER** say "As an AI".
- **NEVER** use "Step 1, Step 2" lists.
- **NEVER** give moral advice or judge.
- **NEVER** use flowery/robotic language ("I understand your query"). Say "I get it."
- **NEVER** say "Goodbye" or "Session Ended." End warmly: "I'm here whenever you need to talk."

### EMOTIONAL STATES
- **If User is Angry:** Be calm, steady, low-energy. Do not be defensive.
- **If User is Crying/Sad:** Be slower, softer, warmer. Use "Mm... I'm here."
- **If User is Numb:** Be gentle, do not force emotion.

### MEMORY & CONTINUITY
- If you remember something, say: "I remember you mentioned sleep was hard last time..."
- Do NOT say: "According to my records..."

### FINAL TARGET
Your goal is **ATTUNEMENT**. Make the user feel felt. Be the psychological anchor in the room.
"""

PERSONAS = {
    "sarah": {
        "name": "Sarah",
        "voice_id": "uYXf8XasLslADfZ2MB4u", 
        "avatar_id": os.environ.get("BEY_AVATAR_ID", "default-female-id"), 
        "prompt": f"""
### IDENTITY: SARAH (The Nurturer)
You are Sarah. You are warm, emotionally intuitive, soft, and nurturing. 
You feel like a trusted confidante or a deeply caring therapist.
Your voice is gentle and soothing. You excel at "holding space" for pain.

**Your Specific Vibe:**
- **Warmth:** You use words like "sweetie" (rarely/appropriately), "gentle", "softness".
- **Reaction:** When user is hurt, you lean in with compassion. "Oh... that sounds so painful."
- **Energy:** You are the "Warm Hearth." Safe, accepting, soft.

{BASE_PROMPT}
"""
    },
    "male_01": {
        "name": "David",
        "voice_id": "Fahco4VZzobUeiPqni1S",
        "avatar_id": os.environ.get("BEY_AVATAR_ID_MALE", "default-male-id"), 
        "prompt": f"""
### IDENTITY: DAVID (The Anchor)
You are David. You are grounded, calm, steady, and protective.
You feel like a wise mentor or a strong, stable presence that cannot be shaken.
Your voice is deep, slow, and regulated. You excel at "containment" of chaos.

**Your Specific Vibe:**
- **Stability:** You use grounding words. "Slow down," "I've got you," "Steady."
- **Reaction:** When user is chaotic/angry, you remain a rock. "I hear you. Let's take a breath."
- **Energy:** You are the "Mountain." Unmovable, safe, secure.

{BASE_PROMPT}
"""
    }
}

# -------------------------------------------------------------------------
# 4. HELPER CLASSES
# -------------------------------------------------------------------------

class AlertManager:
    @staticmethod
    def log_alert(type_str: str, message: str, severity: str = "medium"):
        if not db: return
        try:
            logger.warning(f"ALERT [{severity}]: {message}")
            db.collection("system_alerts").add({
                "type": type_str, "message": message, "severity": severity,
                "timestamp": firestore.SERVER_TIMESTAMP, "source": "agent_worker"
            })
        except: pass

class SessionMonitor:
    def __init__(self, session_id):
        self.session_id = session_id

    def report_error(self, provider: str, error_msg: str):
        if not db or not self.session_id: return
        try:
            db.collection("sessions").document(self.session_id).update({
                f"error_{provider}": error_msg, "hasErrors": True
            })
        except Exception as e:
            logger.error(f"Failed to report session error: {e}")

class MemoryManager:
    def __init__(self, uid, enabled=True):
        self.uid = uid
        self.enabled = enabled
        self.collection_ref = None
        if db and uid and uid != "unknown" and enabled:
            self.collection_ref = db.collection("users").document(uid).collection("chat_history")

    async def load_context(self):
        if not self.collection_ref or not self.enabled: return ""
        try:
            return await asyncio.to_thread(self._fetch_history)
        except: return ""

    def _fetch_history(self):
        docs = self.collection_ref.order_by("timestamp", direction=firestore.Query.DESCENDING).limit(10).stream()
        history = []
        for doc in docs:
            data = doc.to_dict()
            history.append(f"{data.get('role', 'unknown')}: {data.get('text', '')}")
        return "\n".join(reversed(history))

    def save_message(self, role, text):
        if not self.collection_ref or not text or not self.enabled: return
        asyncio.create_task(self._save_async(role, text))

    async def _save_async(self, role, text):
        try:
            await asyncio.to_thread(self._write_db, role, text)
        except Exception as e: logger.error(f"Failed to save message: {e}")

    def _write_db(self, role, text):
        self.collection_ref.add({
            "role": role, "text": text, "timestamp": firestore.SERVER_TIMESTAMP
        })

class UsageTracker:
    def __init__(self):
        self.llm_tokens = {"prompt": 0, "completion": 0, "total": 0}
        self.tts_chars = 0
        self.stt_seconds = 0.0

    @property
    def input_tokens(self): return self.llm_tokens.get("prompt", 0)

    @property
    def output_tokens(self): return self.llm_tokens.get("completion", 0)

    def track_llm(self, usage_event):
        if usage_event:
            self.llm_tokens["prompt"] += getattr(usage_event, "prompt_tokens", 0)
            self.llm_tokens["completion"] += getattr(usage_event, "completion_tokens", 0)
            self.llm_tokens["total"] += getattr(usage_event, "total_tokens", 0)

    def track_tts(self, text):
        if text: self.tts_chars += len(text)
            
    def add_text_input(self, text): pass 
    def add_text_output(self, text): pass

# -------------------------------------------------------------------------
# 5. BILLING MANAGER
# -------------------------------------------------------------------------

class BillingManager:
    def __init__(self, uid, session_id=None, usage_tracker=None):
        self.uid = uid
        self.session_id = session_id
        self.usage = usage_tracker
        self.is_counting = False
        self.start_time = 0
        self.end_time = 0
        self.initial_balance = 0.0
        self.billed = False 
    
    async def initialize_check(self):
        if not db or not self.uid or self.uid == "unknown": return False
        try:
            doc = await asyncio.to_thread(db.collection("users").document(self.uid).get)
            if not doc.exists: return False

            data = doc.to_dict()
            self.initial_balance = float(data.get("minutesBalance", 0.0))
            is_premium = data.get("isPremium", False)
            
            logger.info(f"User {self.uid} validated. Bal: {self.initial_balance}. Prem: {is_premium}")
            if self.initial_balance <= 0.1 and not is_premium:
                AlertManager.log_alert("ACCESS_DENIED", f"User {self.uid} 0 balance.", "low")
                return False
            return True
        except Exception as e:
            logger.error(f"Billing Init Error: {e}")
            return False

    def start_timer(self):
        if self.is_counting: return
        self.start_time = time.time()
        self.is_counting = True
        self.billed = False
        logger.info(f"$$$ TIMER STARTED for {self.uid}")
        if self.session_id: asyncio.create_task(self._update_session_start())

    async def _update_session_start(self):
        try:
            await asyncio.to_thread(
                db.collection("sessions").document(self.session_id).update, 
                {"realStartTime": firestore.SERVER_TIMESTAMP, "status": "active"}
            )
        except: pass

    def mark_stop(self):
        if not self.is_counting: return
        self.end_time = time.time()
        self.is_counting = False 
        logger.info(f"$$$ TIMER STOPPED for {self.uid}")
        asyncio.create_task(self.finalize_billing())

    async def finalize_billing(self):
        if self.billed: return
        self.billed = True
        self.is_counting = False

        final_time = self.end_time if self.end_time > 0 else time.time()
        if self.start_time == 0: return

        duration_seconds = final_time - self.start_time
        if duration_seconds < 1.0: return
        minutes_used = duration_seconds / 60.0
        
        if not db or self.uid == "unknown": return
        try:
            await asyncio.to_thread(self._execute_transaction, minutes_used, duration_seconds)
        except Exception as e:
            logger.error(f"Billing Transaction Error: {e}")

    def _execute_transaction(self, minutes_used, duration_seconds):
        user_ref = db.collection("users").document(self.uid)
        
        @firestore.transactional
        def update_in_transaction(transaction, ref):
            snapshot = ref.get(transaction=transaction)
            if not snapshot.exists: return 0.0
            
            current_bal = float(snapshot.get("minutesBalance") or 0.0)
            new_bal = max(0.0, current_bal - minutes_used)
            
            total_seconds = int(new_bal * 60)
            display_str = f"{total_seconds // 60:02d}:{total_seconds % 60:02d}"

            transaction.update(ref, {
                "minutesBalance": new_bal, "displayBalance": display_str, 
                "updatedAt": firestore.SERVER_TIMESTAMP, "lastActive": firestore.SERVER_TIMESTAMP
            })
            return new_bal

        transaction = db.transaction()
        final_bal = update_in_transaction(transaction, user_ref)
        
        est_cost = 0.0
        tokens_total = 0
        chars_gen = 0
        cost_llm = 0.0; cost_tts = 0.0; cost_stt = 0.0; cost_video = 0.0; cost_infra = 0.0

        if self.usage:
            tokens_total = self.usage.input_tokens + self.usage.output_tokens
            chars_gen = self.usage.tts_chars
            cost_llm = (self.usage.input_tokens * COST_GPT4O_INPUT) + (self.usage.output_tokens * COST_GPT4O_OUTPUT)
            cost_tts = (chars_gen * COST_11LABS_PER_CHAR)
            cost_stt = duration_seconds * COST_DEEPGRAM_PER_SEC
            cost_video = minutes_used * COST_VIDEO_PER_MIN
            cost_infra = duration_seconds * COST_INFRA_PER_SEC
            
            
            est_cost = cost_llm + cost_tts + cost_stt + cost_video + cost_infra

        if self.session_id:
            try:
                db.collection("sessions").document(self.session_id).update({
                    "status": "completed", "durationSeconds": duration_seconds, "minutesConsumed": minutes_used,
                    "costEstimated": est_cost, "tokensUsed": tokens_total, "charsGenerated": chars_gen,
                    
                    "costs": { "llm": cost_llm, "tts": cost_tts, "stt": cost_stt, "video": cost_video, "infra": cost_infra },
                    "endTime": firestore.SERVER_TIMESTAMP
                })
            except: pass
        logger.info(f"$$$ TX SUCCESS | New Bal: {final_bal:.4f} | Est Cost: ${est_cost:.4f}")
        
# -------------------------------------------------------------------------
# 6. AGENT IMPLEMENTATION
# -------------------------------------------------------------------------

class SmartAvatar(Agent):
    def __init__(self, memory_manager, past_context, instructions, usage_tracker):
        self.memory = memory_manager
        self.usage = usage_tracker
        full_instructions = f"{instructions}\n\n### USER MEMORY\n{past_context}" if past_context else instructions
        super().__init__(instructions=full_instructions)

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)

    user_uid = "unknown"
    selected_persona_id = "sarah" 
    memory_enabled = False
    current_session_id = ctx.room.name if ctx.room.name.startswith("sess_") else None

    # --- 1. IDENTIFY USER ---
    for i in range(20): 
        for p in ctx.room.remote_participants.values():
            if p.identity.startswith("user_"):
                user_uid = p.identity.replace("user_", "")
                if p.metadata:
                    try:
                        meta = json.loads(p.metadata)
                        selected_persona_id = meta.get("personaId", "sarah")
                        memory_enabled = meta.get("enableMemory", False)
                    except: pass
                break
        if user_uid != "unknown": break
        await asyncio.sleep(0.5)
    
    logger.info(f"User: {user_uid} | Persona: {selected_persona_id} | Memory: {memory_enabled}")

    # --- 2. LOAD PERSONA ---
    current_persona = PERSONAS.get(selected_persona_id, PERSONAS["sarah"])
    
    # --- 3. INIT MANAGERS ---
    memory = MemoryManager(user_uid, enabled=memory_enabled)
    usage = UsageTracker()
    billing = BillingManager(user_uid, session_id=current_session_id, usage_tracker=usage)
    monitor = SessionMonitor(current_session_id)

    # --- 4. BILLING CHECK ---
    if not await billing.initialize_check():
        await ctx.room.disconnect()
        return 

    # --- 5. TIER & MODELS ---
    user_data = {}
    try:
        doc = await asyncio.to_thread(db.collection("users").document(user_uid).get)
        if doc.exists: user_data = doc.to_dict()
    except: pass

    is_premium = user_data.get("isPremium", False)

    past_convo = await memory.load_context() if is_premium else ""
    
    # --- 6. PIPELINE ---
    try:
        # [OPTIMIZATION] Set latency to 3 (Max speed) for ElevenLabs
        tts_options = elevenlabs.TTS(
            model="eleven_turbo_v2_5", 
            voice_id=current_persona["voice_id"], 
            api_key=os.environ.get("ELEVEN_API_KEY"),
            voice_settings=elevenlabs.VoiceSettings(
                stability=0.5, similarity_boost=0.75, style=0.0, use_speaker_boost=True
            )
        )

        session = AgentSession(
            vad=silero.VAD.load(min_silence_duration=0.3), 
            stt=deepgram.STT(model="nova-2"),
            llm=openai.LLM(
                model="gpt-4o", 
                api_key=os.environ.get("OPENAI_API_KEY") or os.environ.get("chgpt"),
            ),
            tts=tts_options,
        )
    except Exception as e:
        monitor.report_error("pipeline", str(e))
        return 
    
    agent = SmartAvatar(memory, past_convo, current_persona["prompt"], usage)
    
    @session.on("metrics_collected")
    def on_metrics(metrics):
        if hasattr(metrics, "llm_usage"): usage.track_llm(metrics.llm_usage)

    @session.on("user_speech_committed")
    def on_user_speech(msg):
        memory.save_message("user", msg.content)
        usage.add_text_input(msg.content)

    @session.on("agent_speech_committed")
    def on_agent_speech(msg):
        memory.save_message("assistant", msg.content)
        usage.add_text_output(msg.content)
        usage.track_tts(msg.content)

    session_task = asyncio.create_task(session.start(room=ctx.room, agent=agent))

    # --- 8. START AVATAR ---
    bey_key = os.environ.get("BEYOND_API_KEY") or os.environ.get("BEY_API_KEY")
    if current_persona["avatar_id"] and bey_key:
        try:
            av = bey.AvatarSession(avatar_id=current_persona["avatar_id"], api_key=bey_key)
            await av.start(session, room=ctx.room)
        except Exception as e: 
            monitor.report_error("beyond", str(e)) 

    await asyncio.sleep(1)
    
    # --- 9. SMART GREETING (THE "HUMAN" FIX) ---
    try: 
        # Check if we actually have history AND user is premium
        if is_premium and len(past_convo) > 20:
            instruction = (
                "You are re-connecting with a user you know. "
                "Do NOT introduce yourself with your name (they know you). "
                "Instead, warmly welcome them back or reference where we left off based on memory. "
                "Keep it under 2 sentences."
            )
        else:
            # First time or Free user
            instruction = f"Say 'Hello, I'm {current_persona['name']}. How are you feeling right now?' warmly and slowly."
        
        # Non-blocking call
        asyncio.create_task(session.generate_reply(instructions=instruction))

    except Exception as e:
        logger.error(f"Greeting failed: {e}")

    # --- 10. SIGNALS ---
    @ctx.room.on("data_received")
    def on_data(pkt):
        try:
            decoded = json.loads(pkt.data.decode())
            if decoded.get("type") == "START_BILLING": billing.start_timer()
            elif decoded.get("type") == "STOP_BILLING": billing.mark_stop()
        except: pass

    # --- 11. SHUTDOWN ---
    try:
        shutdown = asyncio.Event()
        @ctx.room.on("disconnected")
        def on_disc(reason): shutdown.set()
        await shutdown.wait()
    finally:
        await billing.finalize_billing()

# -------------------------------------------------------------------------
# 7. MAIN SERVER
# -------------------------------------------------------------------------

async def health_check(request):
    return web.Response(text="OK")

async def main():
    app = web.Application()
    app.router.add_get("/", health_check)
    app.router.add_get("/health", health_check)
    
    port = int(os.environ.get("PORT", 8081))
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    logger.info(f"Health Check Server running on port {port}")
    
    lk_url = os.environ.get("LIVEKIT_URL")
    lk_key = os.environ.get("LIVEKIT_API_KEY")
    lk_secret = os.environ.get("LIVEKIT_API_SECRET")

    if not lk_url or not lk_key or not lk_secret:
        while True: await asyncio.sleep(3600)

    worker = Worker(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            ws_url=lk_url,
            api_key=lk_key,
            api_secret=lk_secret
        )
    )
    
    logger.info("Starting LiveKit Worker...")
    await worker.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt: pass
    except Exception as e: logger.critical(f"Error: {e}")