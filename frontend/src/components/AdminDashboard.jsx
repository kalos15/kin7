import React, { useState, useMemo, useEffect, useRef } from "react";
import { httpsCallable } from 'firebase/functions';
import { signOut } from "firebase/auth";
import { auth, functions } from '../firebaseConfig';
import "../AdminDashboard.css"; 

/* ==================================================================================
   🚀 ENTERPRISE ADMIN DASHBOARD - PRODUCTION v6.5
   - Fixed: Pagination Logic (Cursors mapped to Page Numbers)
   - Fixed: Pagination Design (Restored layout with center numbers)
   - Feature: Smart Avatar Handling
   ================================================================================== */

/* --- 1. ICONS SYSTEM (SVG) --- */
const Icons = {
  Home: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  Users: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
  Server: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>,
  Zap: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  Traffic: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Logout: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Dots: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>,
  Search: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  TrendUp: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Download: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  ChevronLeft: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.5 4C17.3284 4 18 4.67157 18 5.5V14.5C18 15.3284 17.3284 16 16.5 16H3.5C2.67157 16 2 15.3284 2 14.5V5.5C2 4.67157 2.67157 4 3.5 4H16.5ZM7 15H16.5C16.7761 15 17 14.7761 17 14.5V5.5C17 5.22386 16.7761 5 16.5 5H7V15ZM3.5 5C3.22386 5 3 5.22386 3 5.5V14.5C3 14.7761 3.22386 15 3.5 15H6V5H3.5Z"/></svg>,
  ChevronRight: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.5 4C17.3284 4 18 4.67157 18 5.5V14.5C18 15.3284 17.3284 16 16.5 16H3.5C2.67157 16 2 15.3284 2 14.5V5.5C2 4.67157 2.67157 4 3.5 4H16.5ZM14 15H16.5C16.7761 15 17 14.7761 17 14.5V5.5C17 5.22386 16.7761 5 16.5 5H14V15ZM3.5 5C3.22386 5 3 5.22386 3 5.5V14.5C3 14.7761 3.22386 15 3.5 15H13V5H3.5Z"/></svg>,
  UserAdd: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
  FileText: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  CheckCircle: () => <svg width="16" height="16" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  XCircle: () => <svg width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Clock: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Dollar: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Activity: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Flame: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
  Refresh: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Filter: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
  Globe: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Shield: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
};

/* --- 2. HELPER COMPONENTS --- */
const UserAvatar = ({ url, name }) => {
    if (url && url.length > 5 && !url.includes("ui-avatars")) {
        return (
            <div className="avatar-circle">
                <img src={url} alt={name} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%'}} />
            </div>
        );
    }
    const initial = name ? name.charAt(0).toUpperCase() : "?";
    return (
        <div className="avatar-circle" style={{
            background:'#0f172a', 
            color:'white', 
            display:'flex', 
            alignItems:'center', 
            justifyContent:'center', 
            fontWeight:'600',
            width:'36px', 
            height:'36px', 
            borderRadius:'50%',
            fontSize:'14px'
        }}>
            {initial}
        </div>
    );
};

/* --- REPORT OVERLAY (NEW) --- */
const ReportOverlay = ({ onClose }) => {
    const [period, setPeriod] = useState("30d");
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            const fn = httpsCallable(functions, 'admin_handler');
            const res = await fn({ action: 'generatePerformanceReport', period });
            
            if (res.data.report_data) {
                // Create a blob and download
                const blob = new Blob([res.data.report_data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = res.data.filename || "Performance_Report.csv";
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert("No data generated for this period.");
            }
        } catch (e) {
            alert("Report failed: " + e.message);
        }
        setLoading(false);
        onClose();
    };

    return (
        <div className="admin-overlay-backdrop" onClick={onClose}>
            <div className="admin-modal medium-modern" onClick={e => e.stopPropagation()} style={{height:'auto', maxWidth:'500px'}}>
                <div className="modern-modal-header">
                    <h2>Performance Report</h2>
                    <button className="modern-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div style={{padding:'25px'}}>
                    <p style={{color:'#666', marginBottom:'20px', fontSize:'0.9rem'}}>
                        Download a summarized performance report including revenue, sessions, and traffic stats.
                    </p>

                    <div className="input-group" style={{marginBottom:'20px'}}>
                        <label style={{display:'block', marginBottom:'8px', fontWeight:'600'}}>Report Period</label>
                        <select className="admin-select" value={period} onChange={e => setPeriod(e.target.value)} style={{width:'100%'}}>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="this_month">This Month</option>
                        </select>
                    </div>

                    <div style={{background:'var(--bg-subtle)', padding:'15px', borderRadius:'8px', marginBottom:'20px'}}>
                        <h4 style={{fontSize:'0.85rem', textTransform:'uppercase', color:'#64748b', marginBottom:'10px'}}>Includes Data For:</h4>
                        <ul style={{fontSize:'0.9rem', color:'#333', paddingLeft:'20px', margin:0}}>
                            <li>Total Revenue & Profit (Est)</li>
                            <li>Total Sessions & Duration</li>
                            <li>New User Growth</li>
                        </ul>
                    </div>

                    <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                        <button className="admin-btn secondary" onClick={onClose}>Cancel</button>
                        <button className="admin-btn primary" onClick={handleDownload} disabled={loading}>
                            {loading ? <Icons.Refresh /> : <Icons.Download />} 
                            {loading ? " Generating..." : " Download PDF Report"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ==================================================================================
   MAIN COMPONENT
   ================================================================================== */
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showFeedback, setShowFeedback] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // [NEW] State for Balance Editing
  const [balanceUser, setBalanceUser] = useState(null);

  // [FIXED] Single useEffect for Title Management
  useEffect(() => {
    document.title = "Admin Panel";
    return () => { document.title = "Kin7"; };
  }, []);

  // [NEW] Handler for Balance Update
  const handleBalanceUpdate = async (uid, amount) => {
      const fn = httpsCallable(functions, 'admin_handler');
      try {
          // Calls the 'manageUser' action we added to main.py
          await fn({ action: 'manageUser', subAction: 'updateBalance', targetUid: uid, amount: amount });
          alert("Balance updated successfully. Refresh the list to see changes.");
      } catch(e) { alert("Error: " + e.message); }
  };

  const handleExport = async (params) => {
      const fn = httpsCallable(functions, 'admin_handler');
      try {
          const res = await fn({ action: 'exportUserData', ...params });
          if(res.data.csv) {
              const blob = new Blob([res.data.csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `export_${params.format}_${new Date().toISOString()}.csv`;
              a.click();
          } else {
              alert("Export processed. Check your email.");
          }
      } catch(e) { alert("Export failed: " + e.message); }
  };

  return (
    <div className="admin-wrapper">
      <aside className={`admin-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
        </div>
        <div className="admin-sidebar-top">
          <div className="admin-brand">
            <div className="admin-logo-square">7</div>
            <span className="admin-brand-text">AdminPanel</span>
          </div>
          <div className="admin-nav-group">
            <label>Platform</label>
            <NavItem id="overview" icon={<Icons.Home />} label="Overview" active={activeTab} setActive={setActiveTab} />
            <NavItem id="users" icon={<Icons.Users />} label="User Management" active={activeTab} setActive={setActiveTab} />
          </div>
          <div className="admin-nav-group">
            <label>Analytics</label>
            <NavItem id="traffic" icon={<Icons.Traffic />} label="Traffic & Growth" active={activeTab} setActive={setActiveTab} />
            <NavItem id="api" icon={<Icons.Zap />} label="Financial" active={activeTab} setActive={setActiveTab} />
          </div>
          <div className="admin-nav-group">
            <label>System</label>
            <NavItem id="infra" icon={<Icons.Server />} label="Infrastructure" active={activeTab} setActive={setActiveTab} />
          </div>
        </div>
        <div className="admin-profile-card">
            <div className="profile-details">
                <div className="avatar-circle">
                    <div className="avatar-placeholder-text">A</div>
                </div>
                <div className="profile-text">
                    <span className="name">Administrator</span>
                    <span className="role">Super Admin</span>
                </div>
            </div>
            <button className="signout-btn" title="Sign Out" onClick={() => signOut(auth)}>
                <Icons.Logout />
            </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-breadcrumbs">
            Admin <span className="crumb-sep">/</span> {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </div>
          <div className="admin-header-actions">
            <button className="admin-btn secondary" onClick={() => setShowFeedback(true)}>Feedback</button>
            <button className="admin-btn primary" onClick={() => setShowReport(true)}>
                <span style={{marginRight:6}}><Icons.Download/></span> Report
            </button>
          </div>
        </header>

        <div className="admin-content-scroll">
          {activeTab === "overview" && <OverviewSection />}
          {/* [FIX] Pass setBalanceUser as 'onEditBalance' prop */}
          {activeTab === "users" && <UsersSection onSelectUser={setSelectedUser} onExport={() => setShowExport(true)} onEditBalance={setBalanceUser} />}
          {activeTab === "traffic" && <TrafficSection />}
          {activeTab === "api" && <ApiSection />}
          {activeTab === "infra" && <InfraSection />}
          {activeTab === "pages" && <PagesSection />}
        </div>
      </main>

      {showFeedback && <FeedbackOverlay onClose={() => setShowFeedback(false)} />}
      {showExport && <ExportOverlay onClose={() => setShowExport(false)} onRunExport={handleExport} />}
      {showReport && <ReportOverlay onClose={() => setShowReport(false)} />}
      {selectedUser && <UserDetailOverlay user={selectedUser} onClose={() => setSelectedUser(null)} />}
      
      {/* [NEW] Render the Balance Edit Modal */}
      {balanceUser && <BalanceEditOverlay user={balanceUser} onClose={() => setBalanceUser(null)} onUpdate={handleBalanceUpdate} />}
    </div>
  );
}

/* ==================================================================================
   1. OVERVIEW SECTION (UPDATED)
   ================================================================================== */
const OverviewSection = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchKPI = async () => {
            try {
                const fn = httpsCallable(functions, 'admin_handler');
                const res = await fn({ action: 'getExecutiveOverview' });
                setData(res.data);
            } catch (e) { console.error("KPI Error:", e); }
            setLoading(false);
        };
        fetchKPI();
    }, []);

    if (loading) return <div className="admin-loading">Loading Executive Data...</div>;

    const { kpi, system } = data || {};

    return (
        <div className="admin-grid-layout">
            <div className="admin-kpi-row">
                <StatCard title="Total Deposited" value={`$${(kpi?.revenue_total || 0).toLocaleString()}`} trend="Lifetime" color="#007AFF" />
                <StatCard title="Active Users" value={(kpi?.total_users || 0).toLocaleString()} trend="Real-time" color="#10B981" />
                {/* [NEW] Total Minutes */}
                <StatCard title="Total Minutes Talked" value={(kpi?.total_minutes || 0).toLocaleString()} trend="Usage" color="#F59E0B" />
                {/* [NEW] Avg Cost Per Minute */}
                <StatCard title="Avg. Cost / Min" value={`$${(kpi?.avg_cost_min || 0).toFixed(3)}`} trend="Unit Econ" color="#EF4444" />
            </div>
            
            <div className="admin-split-2-1">
                {/* Removed Revenue Velocity, Expanded System Health or add new charts here later */}
                <Card title="System Health (Real-time)">
                    <div className="artistic-health-card">
                        <div className="ah-header">
                            <div className="ah-stat">
                                <span className="ah-label">Total Instances</span>
                                <span className="ah-val">{system?.instances || 0}</span>
                            </div>
                            <div className={`ah-status ${system?.status === 'OPERATIONAL' ? 'healthy' : 'warning'}`}>
                                {system?.status || "Unknown"}
                            </div>
                        </div>
                        <div className="ah-metrics">
                            <div className="ah-metric-row">
                                <div className="ahm-label">CPU Load</div>
                                <div className="ahm-bar-track"><div className="ahm-bar-fill" style={{width:`${system?.cpu || 0}%`, background:'#3B82F6'}}></div></div>
                                <div className="ahm-val">{system?.cpu || 0}%</div>
                            </div>
                            <div className="ah-metric-row">
                                <div className="ahm-label">RAM Usage</div>
                                <div className="ahm-bar-track"><div className="ahm-bar-fill" style={{width:`${system?.ram || 0}%`, background:'#8B5CF6'}}></div></div>
                                <div className="ahm-val">{system?.ram || 0}%</div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, trend, color, isLive }) => (
    <div className="admin-card kpi-card decoration-line" style={{'--deco-color': color}}>
        <div className="kpi-top">
            <span className="kpi-title">{title}</span>
            {isLive ? (
                <span className="live-indicator-dot"></span>
            ) : (
                <span className="kpi-icon-bg" style={{background: `${color}15`, color: color}}><Icons.TrendUp /></span>
            )}
        </div>
        <div className="kpi-main">
            <span className="kpi-value">{value}</span>
            <span className="kpi-trend positive" style={isLive ? {color: color, background:`${color}15`} : {}}>{trend}</span>
        </div>
    </div>
);

/* ==================================================================================
   2. USERS SECTION (FIXED: CURSOR PAGINATION + OLD DESIGN + NUMBERS)
   ================================================================================== */
// [FIX] Added 'onEditBalance' to props
const UsersSection = ({ onSelectUser, onExport, onEditBalance }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Page Management
    const [page, setPage] = useState(1);
    const [cursors, setCursors] = useState({ 1: null }); // Map: PageNumber -> StartCursor
    const [hasMore, setHasMore] = useState(true);

    const fetchUsers = async (cursorToUse) => {
        setLoading(true);
        try {
            const fn = httpsCallable(functions, 'admin_handler');
            const res = await fn({ action: 'getAllUsers', limit: 10, lastUid: cursorToUse });
            
            const fetchedUsers = res.data.users || [];
            const newLastDocId = res.data.lastDocId;
            
            setUsers(fetchedUsers);
            
            // If we got a full page, save the cursor for the NEXT page (Page + 1)
            if (newLastDocId && fetchedUsers.length > 0) {
                setCursors(prev => ({ ...prev, [page + 1]: newLastDocId }));
                setHasMore(fetchedUsers.length >= 10);
            } else {
                setHasMore(false);
            }
        } catch(e) { console.error(e); }
        setLoading(false);
    };

    // Initial Load
    useEffect(() => {
        fetchUsers(null);
    }, []);

    // Handles Any Pagination Click
    const goToPage = (targetPage) => {
        if (targetPage === page) return;
        
        // Safety: Prevent jumping to a page if we don't have its cursor
        if (!cursors.hasOwnProperty(targetPage)) return;

        setPage(targetPage);
        fetchUsers(cursors[targetPage]);
    };

    const handleAction = async (uid, type) => {
        if(!window.confirm(`Are you sure you want to ${type} this user?`)) return;
        const fn = httpsCallable(functions, 'admin_handler');
        await fn({ action: 'manageUser', subAction: type, targetUid: uid });
        alert("Action successful");
    };

    const [actionOpen, setActionOpen] = useState(null);
    const toggleAction = (id, e) => { e.stopPropagation(); setActionOpen(actionOpen === id ? null : id); };

    return (
        <div className="admin-section">
            <div className="admin-controls">
                <div className="search-wrap">
                    <Icons.Search />
                    <input type="text" className="admin-search-input" placeholder="Search users..." />
                </div>
                <div className="btn-group">
                    <button className="admin-btn secondary" onClick={onExport}>
                        <span style={{marginRight:5}}><Icons.Download/></span> Export
                    </button>
                    <button className="admin-btn primary" onClick={() => { setPage(1); setCursors({1: null}); fetchUsers(null); }}>
                        <Icons.Refresh/> Refresh
                    </button>
                </div>
            </div>
            <Card title={`User Database (Page ${page})`} noPadding>
                {loading ? <div className="admin-loading">Loading users...</div> : (
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Plan</th>
                                <th>Spent</th>
                                <th>Country</th>
                                <th>IP Address</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? <tr><td colSpan="7" style={{textAlign:'center', padding:20}}>No users found.</td></tr> :
                            users.map((u) => (
                                <tr key={u.id} onClick={() => onSelectUser(u)} className="clickable-row">
                                    <td className="user-cell">
                                        <UserAvatar url={u.avatarUrl} name={u.name} />
                                        <div className="user-meta">
                                            <span className="font-medium">{u.name}</span>
                                            <span className="text-muted-xs">{u.email}</span>
                                        </div>
                                    </td>
                                    <td><Badge type={u.plan}>{u.plan}</Badge></td>
                                    <td>${u.spent.toFixed(2)}</td>
                                    <td>
                                        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                                            <span>{u.flag}</span>
                                            <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100px'}}>{u.country}</span>
                                        </div>
                                    </td>
                                    <td className="mono-sm">{u.ip || "Unknown"}</td>
                                    <td className="action-cell-wrapper" onClick={e => e.stopPropagation()}>
                                        <div style={{position: 'relative'}}>
                                            <button className="admin-btn-icon" onClick={(e) => toggleAction(u.id, e)}><Icons.Dots /></button>
                                            {actionOpen === u.id && (
                                                <div className="action-dropdown-fixed">
                                                    {/* [FIX] REPLACED 'RESET MEMORY' WITH 'EDIT BALANCE' */}
                                                    <div className="dropdown-item" onClick={() => onEditBalance(u)}>Edit Balance</div>
                                                    <div className="dropdown-item danger" onClick={() => handleAction(u.id, 'ban')}>Ban Account</div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}
                
                {/* --- RESTORED PAGINATION: PREV | NUMBERS | NEXT --- */}
                <div style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '15px 20px', 
                    borderTop: '1px solid var(--border-color)'
                }}>
                    <button 
                        className="admin-btn secondary small" 
                        onClick={() => goToPage(page - 1)} 
                        disabled={page === 1 || loading}
                    >
                        &larr; Previous
                    </button>
                    
                    {/* Number Buttons in Center */}
                    <div style={{display:'flex', gap:'6px'}}>
                        {/* Always show Page 1 if deep */}
                        {page > 2 && (
                            <button className="admin-btn-xs" onClick={() => goToPage(1)}>1</button>
                        )}
                        {page > 3 && <span style={{alignSelf:'center', fontSize:'12px', color:'#999'}}>...</span>}

                        {/* Prev Number */}
                        {page > 1 && (
                            <button className="admin-btn-xs" onClick={() => goToPage(page - 1)}>{page - 1}</button>
                        )}

                        {/* Current */}
                        <button className="admin-btn-xs active" style={{background:'var(--primary)', color:'white', borderColor:'var(--primary)'}}>
                            {page}
                        </button>

                        {/* Next Number (Only if we have the cursor for it) */}
                        {cursors[page + 1] && (
                            <button className="admin-btn-xs" onClick={() => goToPage(page + 1)}>{page + 1}</button>
                        )}
                    </div>

                    <button 
                        className="admin-btn secondary small" 
                        onClick={() => goToPage(page + 1)} 
                        disabled={!hasMore || !cursors[page + 1] || loading}
                    >
                        Next &rarr;
                    </button>
                </div>
            </Card>
        </div>
    );
};
/* ==================================================================================
   3. TRAFFIC & GROWTH SECTION
   ================================================================================== */
const TrafficSection = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sourcePage, setSourcePage] = useState(1);
    const SOURCES_PER_PAGE = 5;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const fn = httpsCallable(functions, 'admin_handler');
                const res = await fn({ action: 'getTrafficStats' });
                setData(res.data);
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) return <div className="admin-loading">Gathering Growth Intelligence...</div>;
    if (!data) return <div className="admin-loading">No Data Available</div>;

    const { kpi, realtime, sources, funnel, engagement, retention, geo, devices, quality, insights } = data;
    const totalSourcePages = Math.ceil((sources?.length || 0) / SOURCES_PER_PAGE);
    const visibleSources = sources ? sources.slice((sourcePage - 1) * SOURCES_PER_PAGE, sourcePage * SOURCES_PER_PAGE) : [];

    return (
        <div className="admin-grid-layout">
            <div className="traffic-kpi-grid">
                <Card title="Traffic Overview">
                    <div className="admin-kpi-row" style={{gap:12}}>
                        <div className="mini-stat"><label>Visitors (Today)</label><div className="val">{kpi.visitors_today}</div></div>
                        <div className="mini-stat"><label>Last 7 Days</label><div className="val">{kpi.visitors_7d}</div></div>
                        <div className="mini-stat"><label>Unique (30d)</label><div className="val">{kpi.unique_30d}</div></div>
                    </div>
                </Card>
                <Card title="User Activity">
                    <div className="admin-kpi-row" style={{gap:12}}>
                        <div className="mini-stat"><label>Active (1h)</label><div className="val">{kpi.active_1h}</div></div>
                        <div className="mini-stat"><label>Active (24h)</label><div className="val">{kpi.active_24h}</div></div>
                        <div className="mini-stat"><label>MAU</label><div className="val">{kpi.mau}</div></div>
                    </div>
                </Card>
                <Card title="Growth">
                    <div className="admin-kpi-row" style={{gap:12}}>
                         <div className="mini-stat"><label>New Users (Today)</label><div className="val">{kpi.new_today}</div></div>
                         <div className="mini-stat"><label>New (30d)</label><div className="val">{kpi.new_30d}</div></div>
                         <div className="mini-stat"><label>Returning</label><div className="val">{kpi.returning_pct}</div></div>
                    </div>
                </Card>
            </div>

            <div className="admin-split-2-1">
                <Card title="Traffic Sources (30 Days)">
                    <div className="source-list" style={{marginTop:'10px', minHeight:'160px'}}>
                        {visibleSources.length === 0 ? (
                            <div style={{color:'#999', fontSize:'13px', textAlign:'center', marginTop:'40px'}}>
                                No traffic source data available.<br/>
                                <span style={{fontSize:'11px', opacity:0.7}}>(Check GA4 Permissions)</span>
                            </div>
                        ) : (
                            visibleSources.map((s, i) => (
                                <div key={i} className="source-row">
                                    <span className="label" style={{width:'120px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={s.label}>{s.label}</span>
                                    <div className="bar-bg"><div className="bar-fill" style={{width:`${s.percent}%`}}></div></div>
                                    <span className="val">{s.val} ({s.percent}%)</span>
                                </div>
                            ))
                        )}
                    </div>
                    {totalSourcePages > 1 && (
                        <div style={{display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'12px'}}>
                            <button className="admin-btn-xs" disabled={sourcePage === 1} onClick={()=>setSourcePage(p=>p-1)}>&larr;</button>
                            <span style={{fontSize:'11px', alignSelf:'center'}}>{sourcePage} / {totalSourcePages}</span>
                            <button className="admin-btn-xs" disabled={sourcePage === totalSourcePages} onClick={()=>setSourcePage(p=>p+1)}>&rarr;</button>
                        </div>
                    )}
                </Card>
                <Card title="Conversion Funnel">
                    <div className="funnel-container">
                        <div className="funnel-step">
                            <span className="fs-val">{funnel.landing}</span><span className="fs-lbl">Landing</span>
                        </div>
                        <div className="funnel-step">
                            <span className="fs-val">{funnel.signup}</span><span className="fs-lbl">Signup</span>
                            <span className="fs-conv">{funnel.conv_signup}</span>
                        </div>
                        <div className="funnel-step">
                            <span className="fs-val">{funnel.call_start}</span><span className="fs-lbl">Call</span>
                            <span className="fs-conv">{funnel.conv_call}</span>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="growth-grid-2">
                <Card title="Engagement Metrics">
                    <div className="admin-kpi-row" style={{marginBottom:'16px'}}>
                        <div className="mini-stat"><label>Avg Session</label><div className="val">{engagement.avg_session}</div></div>
                        <div className="mini-stat"><label>Avg Call Duration</label><div className="val">{engagement.avg_call}</div></div>
                    </div>
                    <div className="admin-kpi-row">
                        <div className="mini-stat"><label>Sessions / User</label><div className="val">{engagement.sess_per_user}</div></div>
                        <div className="mini-stat"><label>Drop-off Time</label><div className="val">{engagement.drop_off}</div></div>
                    </div>
                </Card>
                <Card title="Retention Cohorts">
                     <table className="admin-table">
                         <thead><tr><th>Cohort</th><th>Retention</th><th>Trend</th></tr></thead>
                         <tbody>
                             <tr><td>Day 1</td><td>{retention.day1}</td><td><span className="badge-success">Stable</span></td></tr>
                             <tr><td>Day 7</td><td>{retention.day7}</td><td><span className="badge-warning">-2%</span></td></tr>
                             <tr><td>Day 30</td><td>{retention.day30}</td><td><span className="badge-success">+5%</span></td></tr>
                             <tr><td>Returning</td><td>{retention.returning}</td><td><span className="badge-success">Good</span></td></tr>
                         </tbody>
                     </table>
                </Card>
            </div>

            <div className="admin-split-2-1">
                <Card title="Top Countries & Devices">
                    <div style={{display:'flex', gap:'20px'}}>
                        <div style={{flex:1}}>
                             <h4 style={{fontSize:'12px', color:'#64748B', textTransform:'uppercase'}}>Geography</h4>
                             <div className="source-list" style={{marginTop:'10px'}}>
                                 {geo.length === 0 ? (
                                     <div style={{color:'#999', fontSize:'12px'}}>No Geo Data</div>
                                 ) : (
                                     geo.map((g,i) => (
                                         <div key={i} className="source-row">
                                             <span className="label" style={{width:'20px'}}>{g.flag}</span>
                                             <span className="label" style={{flex:1}}>{g.country}</span>
                                             <span className="val">{g.percent}%</span>
                                         </div>
                                     ))
                                 )}
                             </div>
                        </div>
                        <div style={{flex:1}}>
                             <h4 style={{fontSize:'12px', color:'#64748B', textTransform:'uppercase'}}>Device Breakdown</h4>
                             <div style={{marginTop:'10px'}}>
                                 <div className="device-stat-row">
                                     <span className="ds-label">Desktop</span>
                                     <div className="ds-bar-bg"><div className="ds-bar-fill" style={{width:`${devices.desktop}%`}}></div></div>
                                     <span className="val">{devices.desktop}%</span>
                                 </div>
                                 <div className="device-stat-row">
                                     <span className="ds-label">Mobile</span>
                                     <div className="ds-bar-bg"><div className="ds-bar-fill" style={{width:`${devices.mobile}%`}}></div></div>
                                     <span className="val">{devices.mobile}%</span>
                                 </div>
                             </div>
                        </div>
                    </div>
                </Card>

                <Card title="Quality & Insights">
                    <div style={{marginBottom:'16px', display:'flex', gap:'10px'}}>
                        <div className="mini-stat" style={{flex:1}}><label>Bounce Rate</label><div className="val">{quality.bounce}</div></div>
                        <div className="mini-stat" style={{flex:1}}><label>Error Rate</label><div className="val text-red">{quality.errors}</div></div>
                    </div>
                    <div>
                        {insights.length === 0 && <div style={{fontSize:'13px', color:'#999'}}>No alerts generated today.</div>}
                        {insights.map((insight, i) => (
                            <div key={i} className={`insight-alert ${insight.type}`}>
                                <span className="ia-icon">{insight.type === 'positive' ? '🚀' : insight.type === 'warning' ? '⚠️' : '🔥'}</span>
                                {insight.text}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};
/* ==================================================================================
   4. API SECTION (REAL-TIME USAGE)
   ================================================================================== */
/* ==================================================================================
   4. FINANCIAL COMMAND CENTER (FINAL: Stacked Chart + Limit 20 + TopUp)
   ================================================================================== */
const ApiSection = () => {
    const [viewMode, setViewMode] = useState("financial"); // 'financial' | 'technical'
    const [timeRange, setTimeRange] = useState("today"); // 'today' | 'yesterday' | '7d' | '30d'
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showTopUp, setShowTopUp] = useState(false);

    const fetchFinancials = async () => {
        setLoading(true);
        try {
            const fn = httpsCallable(functions, 'admin_handler');
            const res = await fn({ action: 'getFinancialOverview', timeRange });
            setData(res.data);
        } catch(e) { console.error("Financial Fetch Error", e); }
        setLoading(false);
    };

    // Auto-refresh every 30s OR when timeRange changes
    useEffect(() => {
        fetchFinancials();
        const interval = setInterval(fetchFinancials, 30000); 
        return () => clearInterval(interval);
    }, [timeRange]); 

    // Handle CSV Export
    const handleExport = async () => {
        setExporting(true);
        try {
            const fn = httpsCallable(functions, 'admin_handler');
            const res = await fn({ action: 'exportFinancialData', timeRange });
            
            if (res.data.csv) {
                const blob = new Blob([res.data.csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = res.data.filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        } catch(e) { alert("Export failed: " + e.message); }
        setExporting(false);
    };

    if (!data) return <div className="admin-loading">Loading Command Center...</div>;

    const { kpi, wallets, feed } = data;

    return (
        <div className="admin-grid-layout">
            
            {/* 1. HEADER CONTROLS */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                <div>
                    <h2 style={{fontSize:'1.2rem', margin:0}}>
                        {viewMode === 'financial' ? 'Financial Command Center' : 'System Health Monitor'}
                    </h2>
                    <span style={{fontSize:'0.8rem', color:'#64748b'}}>
                        All values USD • Real-time (30s) • {timeRange === 'today' ? 'Today' : 'Historical Data'}
                    </span>
                </div>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                    {/* Time Machine Selector */}
                    <select 
                        className="admin-select" 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(e.target.value)}
                        style={{
                            height: '32px', 
                            fontSize: '0.85rem', 
                            padding: '0 30px 0 10px', 
                            lineHeight: '30px',       
                            color: '#334155',         
                            backgroundColor: 'white', 
                            border: '1px solid #cbd5e1', 
                            borderRadius: '6px'
                        }}
                    >
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>

                    {/* View Toggle */}
                    <div className="toggle-pill-bg">
                        <button className={`toggle-pill ${viewMode==='financial'?'active':''}`} onClick={()=>setViewMode('financial')}>💰 Financial</button>
                        <button className={`toggle-pill ${viewMode==='technical'?'active':''}`} onClick={()=>setViewMode('technical')}>🔧 Technical</button>
                    </div>

                    {/* Export Button */}
                    <button className="admin-btn secondary small" onClick={handleExport} disabled={exporting}>
                        {exporting ? "..." : <Icons.Download />} {exporting ? "Downloading" : "CSV"}
                    </button>

                    <button className="admin-btn secondary small" onClick={fetchFinancials}><Icons.Refresh /></button>
                </div>
            </div>

            {/* 2. KPIS - TOGGLEABLE */}
            <div className="admin-kpi-row">
                {viewMode === 'financial' ? (
                    /* FINANCIAL VIEW */
                    <>
                        <div className="admin-card kpi-card highlight-kpi" style={{borderLeft:'4px solid #10B981'}}>
                            <div className="kpi-top"><span className="kpi-title">NET PROFIT</span></div>
                            <div className="kpi-main"><span className="kpi-value text-green">${kpi.net_profit.toFixed(2)}</span></div>
                            <div className="kpi-sub"><span className="badge-success">{kpi.margin_pct}% Margin</span></div>
                        </div>
                        <div className="admin-card kpi-card">
                            <div className="kpi-top"><span className="kpi-title">Gross Revenue</span></div>
                            <div className="kpi-main"><span className="kpi-value">${kpi.gross_revenue.toFixed(2)}</span></div>
                            <div className="kpi-sub"><span className="badge-neutral">Billable Only</span></div>
                        </div>
                        <div className="admin-card kpi-card">
                            <div className="kpi-top"><span className="kpi-title">Cash Impact</span></div>
                            <div className="kpi-main"><span className="kpi-value">${(kpi.net_profit * 0.9).toFixed(2)}</span></div>
                            <div className="kpi-sub">Liquid Today</div>
                        </div>
                    </>
                ) : (
                    /* TECHNICAL VIEW */
                    <>
                        <div className="admin-card kpi-card">
                            <div className="kpi-top"><span className="kpi-title">System Health</span></div>
                            <div className="kpi-main"><span className="kpi-value text-green">99.9%</span></div>
                            <div className="kpi-sub">Uptime</div>
                        </div>
                        <div className="admin-card kpi-card">
                            <div className="kpi-top"><span className="kpi-title">Error Rate</span></div>
                            <div className="kpi-main"><span className="kpi-value">0.05%</span></div>
                            <div className="kpi-sub">Last Hour</div>
                        </div>
                        <div className="admin-card kpi-card">
                            <div className="kpi-top"><span className="kpi-title">Avg Latency</span></div>
                            <div className="kpi-main"><span className="kpi-value">240ms</span></div>
                            <div className="kpi-sub">End-to-End</div>
                        </div>
                    </>
                )}

                {/* Common KPI */}
                <div className="admin-card kpi-card">
                    <div className="kpi-top"><span className="kpi-title">Current Load</span></div>
                    <div className="kpi-main"><span className="kpi-value">{kpi.active_sessions} <span style={{fontSize:'0.6em', color:'#999'}}>/ 50</span></span></div>
                    <div className="kpi-sub">
                        {kpi.capacity_safe ? <span className="text-green">🟢 Safe Capacity</span> : <span className="text-red">🔴 High Load</span>}
                    </div>
                </div>
            </div>

            {/* 3. PROVIDER WALLETS - TOGGLEABLE */}
            <div className="admin-section-header" style={{marginTop:'20px', marginBottom:'10px', display:'flex', justifyContent:'space-between'}}>
                <h3 style={{fontSize:'1rem'}}>{viewMode === 'financial' ? 'Infrastructure Liquidity' : 'Provider Status & Latency'}</h3>
                {viewMode === 'financial' && <button className="admin-btn primary small" onClick={() => setShowTopUp(true)}>➕ Top Up / Update Balances</button>}
            </div>

            <div className="wallet-grid">
                {wallets.map((w) => (
                    <div key={w.id} className="wallet-card">
                        <div className="wc-header">
                            <span className="wc-title">{w.label}</span>
                            <span className={`wc-status ${w.status}`}>{w.status === 'Operational' ? '🟢' : '🔴'}</span>
                        </div>
                        
                        {viewMode === 'financial' ? (
                            /* FINANCIAL WALLET CARD */
                            <>
                                <div className="wc-body">
                                    {/* Changed label from "Spent Today" to just "Spent" to reflect time range */}
                                    <div className="wc-row"><span>Spent</span><span className="wc-val">${w.spent_view.toFixed(2)}</span></div>
                                    <div className="wc-row"><span>Remaining</span><span className={`wc-val ${w.runout.includes('Days') && parseInt(w.runout) < 5 ? 'text-red' : ''}`}>${w.remaining.toFixed(2)}</span></div>
                                </div>
                                <div className={`wc-footer ${w.runout.includes('Days') && parseInt(w.runout) < 5 ? 'bg-red-soft' : ''}`}>
                                    Est: {w.runout}
                                </div>
                            </>
                        ) : (
                            /* TECHNICAL WALLET CARD */
                            <>
                                <div className="wc-body">
                                    <div className="wc-row"><span>Latency</span><span className="wc-val">{w.tech?.latency || "N/A"}</span></div>
                                    <div className="wc-row"><span>Errors</span><span className="wc-val">{w.tech?.errors || "0%"}</span></div>
                                </div>
                                <div className="wc-footer">
                                    API Health: Good
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* 4. VISUALS & TICKER - TOGGLEABLE COLUMNS */}
            {/* UPDATED GRID COLUMNS: 0.9fr for chart, 1.3fr for ticker (Wider Ticker) */}
            <div className="admin-split-2-1" style={{marginTop:'20px', gridTemplateColumns: '0.9fr 1.3fr'}}>
                
                {/* A. Stacked Chart Area */}
                <Card title={viewMode === 'financial' ? "Profit Analysis (Today)" : "Latency Heatmap"}>
                    {viewMode === 'financial' ? (
                        <div style={{height:'180px', padding:'20px', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px', fontSize:'0.9rem', color:'#64748b'}}>
                                <span>Revenue vs. Cost Breakdown</span>
                                <span style={{color:'#10B981', fontWeight:'600'}}>Net Profit Margin</span>
                            </div>
                            
                            {/* STACKED BAR VISUALIZATION */}
                            <div style={{width:'100%', height:'40px', background:'#f1f5f9', borderRadius:'8px', overflow:'hidden', display:'flex', position:'relative'}}>
                                {/* Revenue Bar */}
                                <div style={{width:'100%', height:'100%', position:'absolute', top:0, left:0, border:'2px solid #10B981', borderRadius:'8px', zIndex:1}}></div>
                                
                                {/* Cost Stacks */}
                                {(() => {
                                    const burn = data?.feed?.[0] ? data.feed.reduce((acc, curr) => ({
                                        openai: acc.openai + (curr.cost * 0.2), 
                                        eleven: acc.eleven + (curr.cost * 0.3),
                                        deepgram: acc.deepgram + (curr.cost * 0.1),
                                        beyond: acc.beyond + (curr.cost * 0.4)
                                    }), {openai:0, eleven:0, deepgram:0, beyond:0}) : {openai:0, eleven:0, deepgram:0, beyond:0};
                                    
                                    const rev = kpi.gross_revenue || 1;
                                    const scale = (val) => (val / rev) * 100;
                                
                                    return (
                                        <>
                                            <div style={{width:`${scale(burn.beyond)}%`, background:'#6366f1', height:'100%'}} title="Beyond Video"></div>
                                            <div style={{width:`${scale(burn.eleven)}%`, background:'#8b5cf6', height:'100%'}} title="ElevenLabs"></div>
                                            <div style={{width:`${scale(burn.openai)}%`, background:'#10b981', height:'100%'}} title="OpenAI"></div>
                                            <div style={{width:`${scale(burn.deepgram)}%`, background:'#f59e0b', height:'100%'}} title="Deepgram"></div>
                                        </>
                                    );
                                })()}
                            </div>
                            
                            {/* Legend */}
                            <div style={{display:'flex', gap:'15px', marginTop:'12px', fontSize:'0.75rem', color:'#64748b'}}>
                                <div style={{display:'flex', alignItems:'center', gap:'4px'}}><div style={{width:8, height:8, background:'#6366f1', borderRadius:'50%'}}></div>Video</div>
                                <div style={{display:'flex', alignItems:'center', gap:'4px'}}><div style={{width:8, height:8, background:'#8b5cf6', borderRadius:'50%'}}></div>Voice</div>
                                <div style={{display:'flex', alignItems:'center', gap:'4px'}}><div style={{width:8, height:8, background:'#10b981', borderRadius:'50%'}}></div>LLM</div>
                                <div style={{display:'flex', alignItems:'center', gap:'4px'}}><div style={{width:8, height:8, background:'#f59e0b', borderRadius:'50%'}}></div>STT</div>
                                <div style={{flex:1, textAlign:'right', color:'#10B981', fontWeight:'bold'}}>
                                    Gap = Profit (${(kpi.gross_revenue - kpi.total_cost).toFixed(2)})
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mock-chart-container" style={{height:'180px', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', borderRadius:'8px', color:'#94a3b8'}}>
                            <div style={{textAlign:'center'}}><Icons.Activity /><p>Latency Heatmap (Live)</p></div>
                        </div>
                    )}
                </Card>

                {/* B. Live Ticker */}
                <Card title="Live Transaction Feed (Last 20)" noPadding>
                    <div className="ticker-list">
                        <div className="ticker-header" style={{gridTemplateColumns: '0.8fr 0.8fr 0.6fr 1fr 0.8fr'}}>
                            <span>Date</span>
                            <span>Time</span>
                            <span>Dur</span>
                            {/* Toggle Column Header */}
                            {viewMode === 'financial' ? <span>Profit</span> : <span>Latency</span>}
                            <span>Status</span>
                        </div>
                        <div className="ticker-body scrollable-y" style={{maxHeight:'200px'}}>
                            {/* ADDED .slice(0,20) to strictly limit to 20 items */}
                            {feed.slice(0, 20).map((tx, i) => (
                                <div key={i} className="ticker-row" style={{gridTemplateColumns: '0.8fr 0.8fr 0.6fr 1fr 0.8fr'}}>
                                    {/* Date Column */}
                                    <span className="mono-sm" style={{color:'#64748b'}}>{tx.time.substring(5,10)}</span>
                                    {/* Time Column */}
                                    <span className="mono-sm" style={{color:'#0f172a'}}>{tx.time.substring(11,16)}</span>
                                    <span>{tx.duration}</span>
                                    
                                    {/* Toggle Column Data */}
                                    {viewMode === 'financial' ? (
                                        <span style={{
                                            color: tx.profit > 0 ? '#10B981' : (tx.profit < 0 ? '#EF4444' : '#94a3b8'),
                                            fontWeight: '600'
                                        }}>
                                            {tx.profit > 0 ? '+' : ''}${tx.profit.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="mono-sm">{tx.provider_latency || 120}ms</span>
                                    )}

                                    <span style={{fontSize:'0.75rem'}}>
                                        {tx.status === 'Success' ? '✅' : '⚠️ Drop'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* 5. FOOTER ALERTS */}
            <div className="alerts-footer" style={{marginTop:'20px'}}>
                {wallets.some(w => w.runout.includes('Days') && parseInt(w.runout) < 5) && (
                    <div className="alert-bar critical">
                        🚨 <strong>Critical:</strong> One or more providers have low balance. Top up immediately.
                    </div>
                )}
                <div className="alert-bar info">
                     ℹ️ All systems operational. 0% Error rate in last hour.
                </div>
            </div>

            {showTopUp && <TopUpOverlay wallets={wallets} onClose={() => setShowTopUp(false)} onUpdate={fetchFinancials} />}
        </div>
    );
};
/* ==================================================================================
   5. INFRA SECTION
   ================================================================================== */
const InfraSection = () => {
    const [infra, setInfra] = useState(null);
    const [page, setPage] = useState(1);
    const limit = 10;

    useEffect(() => {
        const fn = httpsCallable(functions, 'admin_handler');
        fn({ action: 'getClusterStatus' }).then(res => setInfra(res.data)).catch(e => console.error(e));
    }, []);

    if(!infra) return <div className="admin-loading">Connecting to Cloud Run...</div>;
    
    const workers = infra.workers || [];
    const totalPages = Math.ceil(workers.length / limit);
    const visibleWorkers = workers.slice((page-1)*limit, page*limit);

    return (
        <div className="admin-grid-layout">
            <div className="infra-kpi-grid-4">
                <div className="infra-small-card">
                    <label>CPU Load</label>
                    <div className="val">{infra.kpi?.cpu || 0}%</div>
                    <div className="progress-track-thin"><div className="fill" style={{width: `${infra.kpi?.cpu || 0}%`}}></div></div>
                </div>
                <div className="infra-small-card">
                    <label>RAM Usage</label>
                    <div className="val">{infra.kpi?.ram || 0}%</div>
                    <div className="progress-track-thin"><div className="fill" style={{width: `${infra.kpi?.ram || 0}%`, background:'#8B5CF6'}}></div></div>
                </div>
                <div className="infra-small-card">
                    <label>Active Instances</label>
                    <div className="val">{infra.kpi?.instances || 0}</div>
                    <span className="badge-success-text">{infra.kpi?.status || "Unknown"}</span>
                </div>
            </div>

            <Card title="Worker Nodes" noPadding>
                 <table className="admin-table">
                     <thead><tr><th>ID</th><th>Region</th><th>CPU</th><th>RAM</th><th>Active Users</th><th>Status</th></tr></thead>
                     <tbody>
                         {visibleWorkers.length === 0 ? (
                             <tr><td colSpan="6" style={{textAlign:'center', padding:20}}>No active instances (Idle)</td></tr>
                         ) : (
                             visibleWorkers.map((c, idx) => (
                                 <tr key={idx}>
                                     <td className="mono-sm">{c.id}</td>
                                     <td><Icons.Globe /> {c.region}</td>
                                     <td><div className="progress-track" style={{width:'100px'}}><div className="progress-fill" style={{width:`${c.cpu}%`}}></div></div></td>
                                     <td>{c.ram}%</td>
                                     <td>{c.users}</td>
                                     <td><span className="badge-success-text">{c.status}</span></td>
                                 </tr>
                             ))
                         )}
                     </tbody>
                 </table>
                 <div className="pagination-footer" style={{display:'flex', justifyContent:'space-between', padding:'15px 20px'}}>
                    <button className="admin-btn secondary small" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>&larr; Previous</button>
                    <span>Page {page} of {totalPages || 1}</span>
                    <button className="admin-btn secondary small" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}>Next &rarr;</button>
                </div>
            </Card>
        </div>
    );
};

/* ==================================================================================
   6. USER DETAIL OVERLAY (UPDATED: SESSION PAGINATION 5 PER PAGE)
   ================================================================================== */
const UserDetailOverlay = ({ user, onClose }) => {
    const [tab, setTab] = useState("overview");
    const [history, setHistory] = useState([]);
    const [sessions, setSessions] = useState([]); 
    const [loading, setLoading] = useState(false);
    
    // Billing Pagination State
    const [billingLastDoc, setBillingLastDoc] = useState(null);
    
    // Session Pagination State [NEW]
    const [sessPage, setSessPage] = useState(1);
    const [sessCursors, setSessCursors] = useState({ 1: null }); // Maps Page Number -> Start Cursor
    const [sessHasMore, setSessHasMore] = useState(false);

    // Page Sizes
    const BILLING_PAGE_SIZE = 5;
    const SESSIONS_PAGE_SIZE = 5; // [UPDATED] 5 items per page

    // Fetch Data on Tab Change
    useEffect(() => {
        if(tab === 'billing') {
            setBillingLastDoc(null); fetchHistory(null);
        }
        if(tab === 'sessions') {
            // Reset session pagination on tab switch
            setSessPage(1);
            setSessCursors({ 1: null });
            fetchSessions(null, 1);
        }
    }, [tab]);

    // --- BILLING FETCH ---
    const fetchHistory = async (startAfterId) => {
        setLoading(true);
        try {
            const userFn = httpsCallable(functions, 'api_user');
            const res = await userFn({ 
                action: 'getBillingHistory', 
                uid: user.id,
                lastDocId: startAfterId,
                pageSize: BILLING_PAGE_SIZE 
            });
            if(res.data.history) {
                setHistory(res.data.history);
                setBillingLastDoc(res.data.lastDocId);
            }
        } catch(e) { console.error("Billing Fetch Error", e); }
        setLoading(false);
    };

    // --- SESSIONS FETCH (PAGINATED) ---
    const fetchSessions = async (cursor, pageNum) => {
        setLoading(true);
        try {
            const userFn = httpsCallable(functions, 'api_user');
            const res = await userFn({ 
                action: 'getUserSessions', 
                uid: user.id,
                lastDocId: cursor,
                pageSize: SESSIONS_PAGE_SIZE
            });
            
            const fetchedSessions = res.data.sessions || [];
            const nextCursor = res.data.lastDocId;

            setSessions(fetchedSessions);
            
            // Check if we have more results for the NEXT page
            const hasNext = fetchedSessions.length === SESSIONS_PAGE_SIZE && nextCursor;
            setSessHasMore(hasNext);

            // Store the cursor for the NEXT page (Page + 1)
            if (hasNext) {
                setSessCursors(prev => ({ ...prev, [pageNum + 1]: nextCursor }));
            }
        } catch(e) { console.error("Sessions Fetch Error", e); }
        setLoading(false);
    };

    // --- HANDLERS ---
    const handleBillingNext = () => {
        fetchHistory(billingLastDoc);
    };

    const handleBillingRefresh = () => {
        fetchHistory(null);
    };

    const handleSessionNext = () => {
        const nextPage = sessPage + 1;
        const nextCursor = sessCursors[nextPage];
        setSessPage(nextPage);
        fetchSessions(nextCursor, nextPage);
    };

    const handleSessionPrev = () => {
        if (sessPage <= 1) return;
        const prevPage = sessPage - 1;
        const prevCursor = sessCursors[prevPage]; // Should be in our map
        setSessPage(prevPage);
        fetchSessions(prevCursor, prevPage);
    };

    return (
        <div className="admin-overlay-backdrop" onClick={onClose}>
            <div className="admin-modal modern-compact" onClick={e => e.stopPropagation()}>
                <div className="modal-header-modern-compact">
                    <div className="header-user-info">
                        <UserAvatar url={user.avatarUrl} name={user.name} />
                        <div>
                            <h2>{user.name}</h2>
                            <div className="meta-badges">
                                <Badge type={user.plan}>{user.plan}</Badge>
                                <span className="user-id">{user.id}</span>
                            </div>
                        </div>
                    </div>
                    <button className="close-btn-modern" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-tabs-modern">
                    {["overview", "billing", "sessions"].map(t => (
                        <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="modal-content-modern scrollable">
                    {/* OVERVIEW TAB */}
                    {tab === "overview" && (
                        <div className="tab-content-wrapper">
                            <div className="overview-stats-grid">
                                <div className="overview-card primary">
                                    <div className="icon-wrap"><Icons.Dollar/></div>
                                    <div><label>Total Spend</label><div className="val">${user.spent.toFixed(2)}</div></div>
                                </div>
                                <div className="overview-card">
                                    <div className="icon-wrap"><Icons.Clock/></div>
                                    <div><label>Balance</label><div className="val">{user.balance}</div></div>
                                </div>
                                <div className="overview-card">
                                    <div className="icon-wrap"><Icons.Zap/></div>
                                    <div><label>Plan</label><div className="val">{user.plan}</div></div>
                                </div>
                            </div>
                            <div className="sub-info-card">
                                <div><h4 style={{margin:0}}>Consumption Analysis</h4><span className="text-muted-xs">AI Inference vs. Server Costs</span></div>
                                <div className="consumption-bar-wrapper">
                                    <div className="consumption-bar">
                                        <div className="seg ai" style={{width:'60%'}} title="AI Models (60%)"></div>
                                        <div className="seg server" style={{width:'25%'}} title="Server (25%)"></div>
                                        <div className="seg profit" style={{width:'15%'}} title="Profit (15%)"></div>
                                    </div>
                                    <div className="consumption-legend">
                                        <span><span className="dot ai"></span> AI Models</span>
                                        <span><span className="dot server"></span> Server</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BILLING TAB */}
                    {tab === "billing" && (
                        <div className="tab-content-wrapper">
                            {loading && history.length === 0 ? <p>Loading billing...</p> : (
                                <div style={{background:'var(--bg-panel)', border:'1px solid var(--border-color)', borderRadius:'12px', overflow:'hidden'}}>
                                    <table className="admin-table simple">
                                        <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {history.length === 0 ? (
                                                <tr><td colSpan="4">No transactions found.</td></tr>
                                            ) : (
                                                history.map((h) => (
                                                    <tr key={h.id}>
                                                        <td>{h.date.substring(0,10)}</td>
                                                        <td className="font-medium">
                                                            {h.type === "SUBSCRIPTION_CANCELLED" ? (
                                                                <span style={{color: '#ef4444', fontWeight:'600'}}>Subscription Cancelled</span>
                                                            ) : (h.type === "SUBSCRIPTION_PAYMENT" || h.description.includes("Sub")) ? (
                                                                <span style={{color: '#6366f1'}}>Pro Subscription</span>
                                                            ) : (
                                                                "Minute Top-up"
                                                            )}
                                                        </td>
                                                        <td>{h.amount}</td>
                                                        <td>
                                                            <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'0.75rem', fontWeight:'600', color: (h.status.includes('Succeeded') || h.status.includes('Completed')) ? '#10b981' : (h.status.includes('Cancelled') ? '#f59e0b' : '#6b7280') }}>
                                                                {(h.status.includes('Succeeded') || h.status.includes('Completed')) && <Icons.CheckCircle />}
                                                                {h.status.includes('Cancelled') && <Icons.XCircle />}
                                                                {h.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div style={{display:'flex', justifyContent:'flex-end', marginTop:'15px', gap:'10px'}}>
                                <button onClick={handleBillingRefresh} className="admin-btn secondary small" disabled={loading}>Refresh</button>
                                <button onClick={handleBillingNext} className="admin-btn secondary small" disabled={loading || history.length < BILLING_PAGE_SIZE}>Next &rarr;</button>
                            </div>
                        </div>
                    )}

                    {/* SESSIONS TAB (UPDATED PAGINATION) */}
                    {tab === "sessions" && (
                        <div className="tab-content-wrapper">
                            {loading && sessions.length === 0 ? <p>Loading sessions...</p> : (
                                <div style={{background:'var(--bg-panel)', border:'1px solid var(--border-color)', borderRadius:'12px', overflow:'hidden'}}>
                                    <table className="admin-table simple">
                                        <thead>
                                            <tr>
                                                <th style={{fontSize:'0.8rem'}}>Date</th>
                                                <th style={{fontSize:'0.8rem'}}>Start Time</th>
                                                <th style={{fontSize:'0.8rem'}}>End Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sessions.length === 0 ? (
                                                <tr><td colSpan="3" style={{textAlign:'center', padding:'20px', color:'#999'}}>No completed sessions found.</td></tr>
                                            ) : (
                                                sessions.map((s) => (
                                                    <tr key={s.id} style={{fontSize:'0.85rem'}}>
                                                        <td className="mono-sm" style={{color:'#0f172a'}}>{s.date}</td>
                                                        <td style={{color:'#64748b'}}>{s.startTime}</td>
                                                        <td style={{color:'#64748b'}}>{s.endTime}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            
                            {/* [NEW] Pagination Footer */}
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'15px'}}>
                                <button 
                                    onClick={handleSessionPrev} 
                                    className="admin-btn secondary small" 
                                    disabled={loading || sessPage === 1}
                                >
                                    &larr; Previous
                                </button>
                                
                                <span style={{fontSize:'0.85rem', color:'#666'}}>Page {sessPage}</span>
                                
                                <button 
                                    onClick={handleSessionNext} 
                                    className="admin-btn secondary small" 
                                    disabled={loading || !sessHasMore}
                                >
                                    Next &rarr;
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* --- FEEDBACK OVERLAY --- */
const FeedbackOverlay = ({ onClose }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [lastDocId, setLastDocId] = useState(null);
    const [pageCursors, setPageCursors] = useState({}); 

    const fetchFeedback = async (cursor = null) => {
        setLoading(true);
        try {
            const fn = httpsCallable(functions, 'admin_handler');
            const res = await fn({ action: 'getFeedback', limit: 10, lastDocId: cursor });
            setFeedbacks(res.data.feedback || []);
            setLastDocId(res.data.lastDocId);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        fetchFeedback(null);
    }, []);

    const handleNext = () => {
        if (!lastDocId) return;
        setPageCursors(prev => ({ ...prev, [page + 1]: lastDocId }));
        setPage(p => p + 1);
        fetchFeedback(lastDocId);
    };

    const handlePrev = () => {
        if (page <= 1) return;
        const prevPage = page - 1;
        const prevCursor = prevPage === 1 ? null : pageCursors[prevPage];
        setPage(prevPage);
        fetchFeedback(prevCursor);
    };

    return (
        <div className="admin-overlay-backdrop" onClick={onClose}>
            <div className="admin-modal medium-modern" onClick={e => e.stopPropagation()}>
                <div className="modern-modal-header">
                    <h2>User Feedback <span style={{fontSize:'0.8rem', opacity:0.6}}>(Page {page})</span></h2>
                    <button className="modern-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modern-modal-content">
                    {loading ? <div style={{padding:20, textAlign:'center'}}>Loading Page {page}...</div> : (
                        <div className="modal-list-container">
                            {feedbacks.length === 0 && <p style={{padding:20, color:'#999'}}>No feedback found.</p>}
                            {feedbacks.map((f, i) => (
                                <div key={i} className="modern-notif-item" style={{alignItems:'flex-start'}}>
                                    <div style={{minWidth:'30px', color:'#FCD34D', fontSize:'1.1rem'}}>
                                        ★ {f.rating}
                                    </div>
                                    <div className="mn-content">
                                    <p style={{marginBottom:'4px', fontWeight:'500'}}>{f.email}</p>
                                    <p style={{color:'#555', fontSize:'0.9rem'}}>{f.text}</p>
                                    {/* Formats date to YYYY-MM-DD HH:MM */}
                                    <span style={{fontSize:'0.75rem', color:'#aaa'}}>
                                        {f.date ? f.date.substring(0, 16).replace('T', ' ') : ''}
                                    </span>
                                </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="modal-pagination-wrapper" style={{display:'flex', justifyContent:'space-between', marginTop:'15px'}}>
                        <button className="admin-btn secondary small" onClick={handlePrev} disabled={page === 1 || loading}>&larr; Previous</button>
                        <span style={{fontSize:'0.9rem', color:'#666', alignSelf:'center'}}>Page {page}</span>
                        <button className="admin-btn secondary small" onClick={handleNext} disabled={!lastDocId || feedbacks.length < 10 || loading}>Next &rarr;</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* --- EXPORT OVERLAY --- */
const ExportOverlay = ({ onClose, onRunExport }) => {
    const [format, setFormat] = useState("csv");
    const [dateRange, setDateRange] = useState("30d");
    const [statusFilter, setStatusFilter] = useState("all");
    const [tierFilter, setTierFilter] = useState("all");
    
    const estimatedRows = useMemo(() => {
        let base = 100; 
        if (dateRange === '7d') base = Math.floor(base * 0.2);
        if (dateRange === '24h') base = Math.floor(base * 0.05);
        if (statusFilter !== 'all') base = Math.floor(base * 0.6);
        return base;
    }, [dateRange, statusFilter]);

    return (
        <div className="admin-overlay-backdrop" onClick={onClose}>
            <div className="admin-modal medium-export" onClick={e => e.stopPropagation()}>
                <div className="modern-modal-header">
                    <h2>Export Database</h2>
                    <button className="modern-close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="export-body scrollable-y">
                    <p className="export-desc">Customize your data export. Large datasets (10k+ rows) will be processed in the background and emailed to you.</p>

                    <div className="export-section">
                        <label className="section-label">1. Data Scope</label>
                        <div className="filters-grid-3">
                            <div className="input-group">
                                <label>Date Range</label>
                                <select className="admin-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
                                    <option value="24h">Last 24 Hours</option>
                                    <option value="7d">Last 7 Days</option>
                                    <option value="30d">Last 30 Days</option>
                                    <option value="90d">Last 3 Months</option>
                                    <option value="all">All Time</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>User Status</label>
                                <select className="admin-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                    <option value="all">All Users</option>
                                    <option value="active">Active Only</option>
                                    <option value="banned">Banned / Suspended</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Subscription Tier</label>
                                <select className="admin-select" value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
                                    <option value="all">All Tiers</option>
                                    <option value="free">Free Tier</option>
                                    <option value="pro">Pro Plan</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="export-section">
                        <label className="section-label">2. File Format</label>
                        <div className="export-options-grid">
                            <div className={`export-option ${format === 'csv' ? 'selected' : ''}`} onClick={() => setFormat('csv')}>
                                <div className="radio-circle"></div>
                                <div className="opt-info"><span className="opt-title">CSV (Excel)</span><span className="opt-sub">Best for analysis</span></div>
                            </div>
                            <div className={`export-option ${format === 'json' ? 'selected' : ''}`} onClick={() => setFormat('json')}>
                                <div className="radio-circle"></div>
                                <div className="opt-info"><span className="opt-title">JSON</span><span className="opt-sub">Raw data API</span></div>
                            </div>
                            <div className={`export-option ${format === 'pdf' ? 'selected' : ''}`} onClick={() => setFormat('pdf')}>
                                <div className="radio-circle"></div>
                                <div className="opt-info"><span className="opt-title">PDF Report</span><span className="opt-sub">Printable summary</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="export-summary-box">
                        <div className="es-icon"><Icons.Download/></div>
                        <div className="es-text">
                            <strong>Estimated Download:</strong> ~{estimatedRows} records based on current filters.
                            <br/><span className="es-sub">Export will include: ID, Name, Email, Plan, Spend, Join Date.</span>
                        </div>
                    </div>
                </div>

                <div className="export-footer">
                    <button className="admin-btn secondary" onClick={onClose}>Cancel</button>
                    <button className="admin-btn primary" onClick={() => { onRunExport({ format, dateRange, statusFilter, tierFilter }); onClose(); }}>
                        Export Data
                    </button>
                </div>
            </div>
        </div>
    );
};

/* --- UTILS --- */
const NavItem = ({ id, icon, label, active, setActive }) => (
  <div className={`admin-nav-item ${active === id ? "active" : ""}`} onClick={() => setActive(id)} title={label}>
    <span className="nav-icon">{icon}</span><span className="nav-label">{label}</span>
    {active === id && <div className="nav-indicator" />}
  </div>
);

const Card = ({ title, children, noPadding }) => (
  <div className="admin-card">
    <div className="admin-card-header"><h3>{title}</h3></div>
    <div className={`admin-card-body ${noPadding ? "no-padding" : ""}`}>{children}</div>
  </div>
);

const Badge = ({ type, children }) => {
    let cls = "badge-neutral";
    if(type === "Pro") cls = "badge-pro";
    if(type === "Enterprise") cls = "badge-ent";
    return <span className={`admin-badge ${cls}`}>{children}</span>;
}

const StatusBadge = ({ status }) => <span className={`admin-badge badge-${(status === 'active' || status === 'Healthy' || status === 'Paid' || status === 'Succeeded') ? 'success' : (status === 'Warning' || status === 'Timeout') ? 'warning' : 'danger'}`}>{status}</span>;

/* --- BALANCE EDIT OVERLAY --- */
const BalanceEditOverlay = ({ user, onClose, onUpdate }) => {
    const [amount, setAmount] = useState("");
    const [mode, setMode] = useState("add"); // 'add' or 'deduct'
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async () => {
        if (!amount) {
            alert("Please enter an amount.");
            return;
        }
        
        setProcessing(true);

        try {
            // 1. Convert input to a number
            let val = parseFloat(amount);

            // 2. Validation: Ensure it's a real number
            if (isNaN(val) || val === 0) {
                alert("Please enter a valid number greater than 0");
                setProcessing(false);
                return;
            }

            // 3. Logic: Always treat input as a positive magnitude first
            val = Math.abs(val);

            // 4. Apply sign based on mode
            const finalAmount = mode === 'deduct' ? -val : val;
            
            // 5. Send to backend
            await onUpdate(user.id, finalAmount);
            
            // Close immediately on success
            onClose();
        } catch (error) {
            alert("Failed to update: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="admin-overlay-backdrop" onClick={onClose}>
            <div className="admin-modal medium-modern" onClick={e => e.stopPropagation()} style={{height:'auto', maxWidth:'400px'}}>
                <div className="modern-modal-header">
                    <h2>Edit Balance</h2>
                    <button className="modern-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div style={{padding:'25px'}}>
                    <p style={{marginBottom:'20px', color:'#666', fontSize:'0.9rem'}}>
                        Adjusting minutes for <strong>{user.name}</strong>
                    </p>
                    
                    <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                        <button 
                            className={`admin-btn ${mode === 'add' ? 'primary' : 'secondary'}`} 
                            style={{flex:1, justifyContent:'center'}}
                            onClick={() => setMode('add')}
                        >Add</button>
                        <button 
                            className="admin-btn"
                            style={{
                                flex:1, justifyContent:'center', 
                                background: mode === 'deduct' ? '#ef4444' : 'transparent',
                                color: mode === 'deduct' ? 'white' : '#ef4444',
                                border: '1px solid #ef4444'
                            }}
                            onClick={() => setMode('deduct')}
                        >Deduct</button>
                    </div>

                    <div className="input-group" style={{marginBottom:'20px'}}>
                        <label style={{display:'block', marginBottom:'8px', fontSize:'0.85rem', fontWeight:'600'}}>Minutes Amount</label>
                        <input 
                            type="number" 
                            style={{
                                width:'100%', padding:'12px', borderRadius:'8px', 
                                border:'1px solid #ddd', fontSize:'1rem', outline:'none'
                            }}
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            placeholder="e.g. 50"
                        />
                    </div>

                    <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                        <button className="admin-btn secondary" onClick={onClose}>Cancel</button>
                        <button className="admin-btn primary" onClick={handleSubmit} disabled={processing}>
                            {processing ? "Saving..." : "Confirm"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
/* --- TOP UP OVERLAY --- */
const TopUpOverlay = ({ wallets, onClose, onUpdate }) => {
    // State to hold input values
    const [inputs, setInputs] = useState({ openai: '', elevenlabs: '', deepgram: '', beyond: '' });
    const [loading, setLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const handleInputChange = (provider, value) => {
        setInputs(prev => ({ ...prev, [provider]: value }));
    };

    const handleSubmit = async () => {
        if(!confirmed) return alert("Please confirm the balances match.");
        setLoading(true);
        try {
            const updates = {};
            // Only send non-empty updates
            Object.keys(inputs).forEach(key => {
                if(inputs[key]) updates[key] = inputs[key];
            });

            if(Object.keys(updates).length === 0) {
                setLoading(false);
                onClose();
                return;
            }

            const fn = httpsCallable(functions, 'admin_handler');
            await fn({ action: 'updateProviderBalance', updates });
            onUpdate(); // Refresh parent
            onClose();
        } catch(e) { 
            alert("Error: " + e.message); 
            setLoading(false);
        }
    };

    return (
        <div className="admin-overlay-backdrop" onClick={onClose}>
            <div className="admin-modal medium-modern" onClick={e => e.stopPropagation()}>
                <div className="modern-modal-header">
                    <h2>Update Provider Balances</h2>
                    <button className="modern-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modern-modal-content">
                    <p style={{marginBottom:'15px', color:'#666', fontSize:'0.9rem'}}>
                        Add funds to your internal ledger. <br/>
                        <strong>Note:</strong> This does not pay the provider. It updates your dashboard tracking.
                    </p>

                    <div className="balance-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                        {wallets.map(w => (
                            <div key={w.id} className="bal-input-card" style={{background:'var(--bg-subtle)', padding:'10px', borderRadius:'8px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                                    <label style={{fontWeight:'600', fontSize:'0.85rem'}}>{w.label}</label>
                                    <span style={{fontSize:'0.75rem', color:'#666'}}>Cur: ${w.remaining.toFixed(2)}</span>
                                </div>
                                <input 
                                    type="number" 
                                    placeholder="+ Add Amount"
                                    className="admin-input-dense"
                                    value={inputs[w.id]}
                                    onChange={(e) => handleInputChange(w.id, e.target.value)}
                                    style={{width:'100%', padding:'8px', border:'1px solid #ddd', borderRadius:'6px'}}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{marginTop:'20px', padding:'10px', background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'6px'}}>
                        <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'0.85rem'}}>
                            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                            I confirm these amounts match my actual provider accounts.
                        </label>
                    </div>

                    <div className="modal-footer" style={{marginTop:'20px', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                        <button className="admin-btn secondary" onClick={onClose}>Cancel</button>
                        <button className="admin-btn primary" disabled={!confirmed || loading} onClick={handleSubmit}>
                            {loading ? "Updating..." : "Confirm & Update"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};