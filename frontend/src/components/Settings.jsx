import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail } from 'firebase/auth'; 
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfUse } from './TermsOfUse';
import { CookiePolicy } from './CookiePolicy';
import { CrisisSupport } from './CrisisSupport';
import { functions, auth } from '../firebaseConfig';

// --- ICONS ---
const IconGeneral = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconAppearance = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.635m0 0A5.25 5.25 0 0110.054 6.75m9.963 4.743a5.25 5.25 0 00-2.584-3.15M10.054 6.75a5.25 5.25 0 019.963 4.743" /></svg>;
const IconBell = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
const IconLock = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;
const IconShield = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>;
const IconTrash = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const IconDownload = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;

const TABS = [
  { id: 'general', label: 'General', icon: <IconGeneral /> },
  { id: 'appearance', label: 'Appearance', icon: <IconAppearance /> },
  { id: 'notifications', label: 'Notifications', icon: <IconBell /> },
  { id: 'privacy', label: 'Privacy & Data', icon: <IconLock /> },
  { id: 'security', label: 'Security', icon: <IconShield /> },
  { id: 'account', label: 'Account', icon: <IconTrash />, danger: true },
];

const parseUserAgent = (ua) => {
    if (!ua) return { os: 'Unknown', browser: 'Device', text: 'Unknown Device' };
    let os = 'Device';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    return { os, text: os };
};

export default function Settings({ open, onClose, user, onLogout, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  const [viewPage, setViewPage] = useState(null);
  
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    theme: 'light', 
    emailAlerts: true,
    renewalAlerts: true,
    paymentReceipts: true
  });

  useEffect(() => {
    if(user) {
        setFormData(prev => ({
            ...prev,
            displayName: user.displayName || '',
            ...user.settings
        }));
    }
  }, [user]);

  // --- THEME LOGIC (AUTO / LIGHT / DARK) ---
  useEffect(() => {
      const applyTheme = () => {
          let themeToApply = formData.theme;

          if (formData.theme === 'system') {
              const hour = new Date().getHours();
              if (hour < 6 || hour >= 18) {
                  themeToApply = 'dark';
              } else {
                  themeToApply = 'light';
              }
          }

          document.body.classList.remove('dark-mode', 'light-mode');
          if (themeToApply === 'dark') {
              document.body.classList.add('dark-mode');
          } else {
              document.body.classList.add('light-mode');
          }
      };

      applyTheme();
      
      let interval;
      if (formData.theme === 'system') {
          interval = setInterval(applyTheme, 60000); 
      }
      return () => clearInterval(interval);

  }, [formData.theme]);

  // --- SECURITY SESSIONS ---
  useEffect(() => {
      if (activeTab === 'security' && user?.uid) {
          const fetchSessions = async () => {
              setLoadingSessions(true);
              try {
                  const fn = httpsCallable(functions, 'api_user');
                  const res = await fn({ action: 'getSecuritySessions', uid: user.uid });
                  setActiveSessions(res.data.sessions || []);
              } catch(e) { console.error(e); }
              setLoadingSessions(false);
          };
          fetchSessions();
      }
  }, [activeTab, user?.uid]);

  // --- SAVE HANDLER ---
  const handleSave = async () => {
    setLoading(true);
    setSaveStatus('');
    try {
        const userFn = httpsCallable(functions, 'api_user');
        await userFn({ 
            action: 'saveSettings', 
            uid: user.uid, 
            settings: formData,
            displayName: formData.displayName
        });

        if (onUpdateUser) {
            onUpdateUser({ 
                displayName: formData.displayName,
                settings: formData
            });
        }

        setSaveStatus('Saved');
        setTimeout(() => setSaveStatus(''), 2000);
    } catch(e) {
        setSaveStatus('Error');
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleToggle = (field) => {
      setFormData(prev => ({...prev, [field]: !prev[field]}));
  };

  const handleExportData = () => {
      const dataStr = JSON.stringify(user, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user_data_${user.uid}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDeleteAccount = async () => {
      if(!confirm("DANGER: This will permanently delete your account. This cannot be undone.")) return;
      try {
          const userFn = httpsCallable(functions, 'api_user');
          await userFn({ action: 'deleteAccount', uid: user.uid });
          onLogout();
      } catch(e) { alert(e.message); }
  };

  const handleLogOutAll = async () => {
      if(!confirm("Log out of all other devices?")) return;
      try {
          const userFn = httpsCallable(functions, 'api_user');
          await userFn({ action: 'revokeAllSessions', uid: user.uid });
          alert("Logged out of all devices.");
          setActiveSessions([]);
      } catch(e) { alert(e.message); }
  };

  const handleChangePassword = async () => {
      if(!confirm("Send a password reset email?")) return;
      try {
          if (user?.email) {
              await sendPasswordResetEmail(auth, user.email);
              alert(`Password reset email sent to ${user.email}. Check your inbox.`);
          } else {
              alert("Error: No email address found for this account.");
          }
      } catch(e) { 
          console.error(e);
          alert("Error sending email: " + e.message); 
      }
  };

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal-modern" onClick={(e) => e.stopPropagation()}>
        
        {/* SIDEBAR */}
        <div className="set-sidebar">
            <h2 className="set-title">Settings</h2>
            <div className="set-nav">
                {TABS.map(t => (
                    <button key={t.id} 
                        onClick={() => setActiveTab(t.id)}
                        className={`set-tab ${activeTab === t.id ? 'active' : ''} ${t.danger ? 'danger' : ''}`}
                    >
                        {t.icon} <span>{t.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* CONTENT */}
        <div className="set-content">
            <div className="set-header">
                <h3>{TABS.find(t=>t.id===activeTab).label}</h3>
                <button className="settings-close-btn" onClick={onClose}>×</button>
            </div>

            <div className="set-scroll-area">
                
                {activeTab === 'general' && (
                    <>
                        <div className="form-row">
                            <label>Display Name</label>
                            <input 
                                type="text" 
                                value={formData.displayName} 
                                onChange={e=>setFormData({...formData, displayName:e.target.value})} 
                                placeholder="Enter your name"
                            />
                        </div>
                        <div className="form-row">
                            <label>Email Address</label>
                            <input type="text" value={user?.email} disabled className="disabled" />
                        </div>
                    </>
                )}

                {activeTab === 'appearance' && (
                    <div className="form-row">
                        <label>Interface Theme</label>
                        <select value={formData.theme} onChange={e=>setFormData({...formData, theme:e.target.value})}>
                            <option value="light">Light Mode</option>
                            <option value="dark">Dark Mode</option>
                            <option value="system">System (Auto)</option>
                        </select>
                        <p className="section-desc" style={{marginTop:'10px'}}>
                            <strong>System:</strong> Automatically switches to Dark Mode between 6 PM and 6 AM.
                        </p>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <>
                        <p className="section-desc">Email notifications only.</p>
                        <div className="toggle-row">
                            <span>Subscription Updates</span>
                            <input type="checkbox" checked={formData.renewalAlerts} onChange={()=>handleToggle('renewalAlerts')} />
                        </div>
                        <div className="toggle-row">
                            <span>Payment Receipts</span>
                            <input type="checkbox" checked={formData.paymentReceipts} onChange={()=>handleToggle('paymentReceipts')} />
                        </div>
                    </>
                )}

                {activeTab === 'privacy' && (
                    <>
                        <div className="privacy-card">
                            <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'15px'}}>
                                <div style={{padding:'10px', background:'var(--bg-subtle)', borderRadius:'8px'}}><IconDownload /></div>
                                <div>
                                    <h4 style={{margin:0, fontSize:'1rem'}}>Export Your Data</h4>
                                    <p style={{margin:0, fontSize:'0.85rem', color:'var(--text-muted)'}}>Download a copy of your account information.</p>
                                </div>
                            </div>
                            <button className="btn-secondary" style={{width:'100%'}} onClick={handleExportData}>Download JSON</button>
                        </div>
                        
                        <div style={{marginTop:'30px', borderTop:'1px solid #eee', paddingTop:'20px'}}>
                            <h4 style={{fontSize:'0.9rem', marginBottom:'10px'}}>Legal Documents</h4>
                            <div style={{display:'flex', gap:'15px', fontSize:'0.85rem', color:'var(--primary)', cursor:'pointer'}}>
                                <span onClick={() => setViewPage('privacy_policy')}>Privacy Policy</span>
                                <span onClick={() => setViewPage('terms_of_use')}>Terms of Use</span>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'security' && (
                    <>
                        <div className="form-row">
                            <label>Active Sessions</label>
                            {loadingSessions ? (
                                <small>Loading...</small>
                            ) : activeSessions.length === 0 ? (
                                <div style={{padding:'20px', textAlign:'center', border:'1px dashed #ccc', borderRadius:'8px', color:'#777'}}>
                                    <small>No active sessions recorded.</small>
                                </div>
                            ) : (
                                <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                    {activeSessions.map((s, i) => {
                                        const parsed = parseUserAgent(s.userAgent);
                                        return (
                                            <div key={i} className="session-item">
                                                <div className="sess-icon">
                                                    {parsed.os === 'iOS' || parsed.os === 'Android' ? '📱' : '💻'}
                                                </div>
                                                <div className="sess-info">
                                                    <strong>{parsed.text}</strong>
                                                    <small>{s.location || 'Unknown Location'} • {s.ip}</small>
                                                    <div style={{fontSize:'0.7rem', color:'#aaa'}}>{s.lastActive}</div>
                                                </div>
                                                <span className="sess-status">Active</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="form-action" style={{marginTop:'20px'}}>
                            <button className="btn-secondary" onClick={handleLogOutAll}>Log Out All Devices</button>
                        </div>
                        <div className="form-action" style={{marginTop:'10px'}}>
                            <button className="btn-secondary" onClick={handleChangePassword}>Change Password</button>
                        </div>
                    </>
                )}

                {activeTab === 'account' && (
                    <>
                        <p style={{fontSize:'0.9rem', color:'var(--text-muted)', marginBottom:'20px'}}>
                            Deleting your account is permanent. All data will be wiped.
                        </p>
                        <div style={{textAlign:'right'}}>
                            <button className="btn-danger-text" onClick={handleDeleteAccount}>Delete Account</button>
                        </div>
                    </>
                )}
            </div>

            <div className="set-footer">
                <span className="save-status">{saveStatus}</span>
                <button className="btn-primary save-btn" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
        </div>
      </div>
      
      {viewPage && <PageViewerModal pageId={viewPage} onClose={() => setViewPage(null)} />}
    </div>
  );
}

const PageViewerModal = ({ pageId, onClose }) => {
    const Pages = {
        'privacy_policy': <PrivacyPolicy />,
        'terms_of_use': <TermsOfUse />,
        'cookie_policy': <CookiePolicy />,
        'crisis_support': <CrisisSupport />
    };

    if (!pageId || !Pages[pageId]) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'white', width: '100%', maxWidth: '700px',
                borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex', flexDirection: 'column', maxHeight: '85vh',
                position: 'relative', overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>

                <div style={{
                    padding: '16px 24px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#ffffff'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', textTransform:'capitalize' }}>
                        {pageId.replace('_', ' ')}
                    </h3>
                    <button onClick={onClose} style={{
                        background: '#f1f5f9', border: 'none', borderRadius: '8px',
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '1.2rem'
                    }}>&times;</button>
                </div>

                <div style={{ padding: '30px', overflowY: 'auto', lineHeight: '1.6', color: '#334155' }}>
                    {Pages[pageId]}
                </div>
            </div>
        </div>
    );
};