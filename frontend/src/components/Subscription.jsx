import React, { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';

/* --- ICONS --- */
const IconCheck = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const IconCreditCard = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
const IconCheckCircle = () => <svg width="16" height="16" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconXCircle = () => <svg width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconRefresh = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>;

export default function Subscription({ user, onUpgrade }) {
  const [subData, setSubData] = useState(null);
  
  // PAGINATION STATE
  const [billingHistory, setBillingHistory] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [page, setPage] = useState(1);
  const [lastDocId, setLastDocId] = useState(null); 
  const [pageCursors, setPageCursors] = useState({}); 

  const [showManage, setShowManage] = useState(false);
  const [showResubscribeOverlay, setShowResubscribeOverlay] = useState(false); 
  const [canceling, setCanceling] = useState(false);

  // --- FETCH HISTORY PAGE ---
  const fetchHistoryPage = async (cursor = null) => {
      if(!user?.uid) return;
      setHistoryLoading(true);
      try {
          const fn = httpsCallable(functions, 'api_user');
          const res = await fn({ 
              action: 'getBillingHistory', 
              uid: user.uid, 
              pageSize: 10,
              lastDocId: cursor 
          });
          
          setBillingHistory(res.data.history || []);
          setLastDocId(res.data.lastDocId);
      } catch(e) { console.error("History Load Error", e); }
      setHistoryLoading(false);
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    const fetchSub = async () => {
      if(!user?.uid) return;
      try {
        const userFn = httpsCallable(functions, 'api_user');
        const res = await userFn({ action: 'getSubscription', uid: user.uid });
        setSubData(res.data);
        await fetchHistoryPage(null);
      } catch (e) { 
          console.error("Subscription load error:", e); 
      } finally { 
          setLoading(false); 
      }
    };
    fetchSub();
  }, [user?.uid]);

  // --- PAGINATION HANDLERS ---
  const handleNext = () => {
      if(!lastDocId) return;
      setPageCursors(prev => ({ ...prev, [page + 1]: lastDocId }));
      setPage(p => p + 1);
      fetchHistoryPage(lastDocId);
  };

  const handlePrev = () => {
      if(page <= 1) return;
      const prevPage = page - 1;
      const prevCursor = prevPage === 1 ? null : pageCursors[prevPage];
      setPage(prevPage);
      fetchHistoryPage(prevCursor);
  };

  // --- ACTIONS ---
  const handleCancelSubscription = async () => {
      if(!confirm("Are you sure? You will retain Pro benefits until your current billing period ends.")) return;
      setCanceling(true);
      try {
          const userFn = httpsCallable(functions, 'api_user');
          await userFn({ action: 'cancelSubscription', uid: user.uid });
          
          alert("Subscription cancelled. You remain Pro until the end of the period.");
          
          // Update local state to reflect cancellation immediately
          setSubData(prev => ({ ...prev, autoRenew: false, status: 'canceled_at_period_end' }));
          setShowManage(false);
          
          // Refresh the history table to show the new "Subscription Cancelled" row
          await fetchHistoryPage(null);
          
      } catch(e) { 
          alert(e.message); 
      } finally { 
          setCanceling(false); 
      }
  };

  if (loading) return <div style={{padding:'60px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.9rem'}}>Loading subscription details...</div>;
  if (!subData) return <div style={{padding:'60px', textAlign:'center', color:'var(--text-muted)'}}>Unable to load subscription info.</div>;

  return (
    <div style={{
        width: '100%', 
        minHeight: '100vh',
        overflowY: 'auto', 
        position: 'relative',
        background: 'var(--bg-app)',
        color: 'var(--text-main)'
    }}>
        {/* INJECTED STYLES FOR OVERLAY */}
        <style>{`
            /* --- LAYOUT UTILS --- */
            .upgrade-overlay { 
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.65); backdrop-filter: blur(10px); 
                z-index: 1000; display: flex; align-items: center; justify-content: center; 
                animation: fadeIn 0.25s ease-out; 
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

            /* --- UPGRADE OVERLAY STYLE (WHITE/SOFT GRAY PRO) --- */
            .upgrade-modal { 
                background: #ffffff;
                color: #1e293b;
                width: 90%; 
                max-width: 480px; 
                border-radius: 24px; 
                padding: 40px; 
                position: relative; 
                box-shadow: 0 20px 60px -12px rgba(0, 0, 0, 0.15); 
                border: 1px solid #f1f5f9;
                text-align: left; 
                overflow: hidden;
                font-family: 'Inter', system-ui, sans-serif;
                animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .upgrade-modal::before {
                content: '';
                position: absolute;
                top: -60px; right: -60px;
                width: 180px; height: 180px;
                background: radial-gradient(circle, rgba(226, 232, 240, 0.5) 0%, rgba(255,255,255,0) 70%);
                z-index: 0;
                pointer-events: none;
            }

            .upgrade-modal h2 { font-size: 1.6rem; font-weight: 800; margin-bottom: 6px; color: #0f172a; letter-spacing: -0.5px; position: relative; z-index: 1; }
            .upgrade-modal p.sub-head { color: #64748b; font-size: 0.95rem; margin-bottom: 24px; font-weight: 500; position: relative; z-index: 1; }

            .upgrade-feature-list { margin: 20px 0 30px 0; display: flex; flex-direction: column; gap: 12px; position: relative; z-index: 1; }
            .upgrade-feature-item { display: flex; align-items: flex-start; gap: 12px; font-size: 0.9rem; color: #334155; line-height: 1.5; }
            .upgrade-feature-item svg { color: #10b981; flex-shrink: 0; margin-top: 3px; width: 16px; height: 16px; }

            .upgrade-btn-artistic {
                width: 100%;
                padding: 14px;
                background: #0f172a;
                border: none;
                border-radius: 12px;
                color: white;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
                transition: transform 0.2s, box-shadow 0.2s;
                position: relative; z-index: 1;
                display: flex; justify-content: center; align-items: center; gap: 8px;
            }
            .upgrade-btn-artistic:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2); background: #1e293b; }
            .unlock-text { text-align: center; font-size: 0.8rem; color: #94a3b8; margin-top: 12px; font-weight: 500; }

            /* Close Button */
            .close-btn { position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 24px; color: #cbd5e1; cursor: pointer; z-index: 10; transition: color 0.2s; }
            .close-btn:hover { color: #0f172a; }
        `}</style>

        <div className="subscription-container" style={{padding: '40px 5%', maxWidth:'800px', margin:'0 auto', paddingBottom: '120px'}}> 
        
          <h2 style={{fontSize:'1.8rem', marginBottom:'30px', fontWeight:'700', letterSpacing:'-0.02em', color:'var(--text-main)'}}>
              Subscription & Billing
          </h2>

          {/* PLAN CARD */}
          <div className="plan-details-card" style={{ display:'flex', flexWrap:'wrap', gap:'20px', justifyContent:'space-between', alignItems:'center', padding:'30px', borderRadius:'16px', background:'var(--bg-panel)', border:'1px solid var(--border-color)', boxShadow:'var(--shadow-sm)' }}>
              <div>
                  <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px'}}>
                      <h3 style={{fontSize:'1.4rem', fontWeight:'700', margin:0}}>{subData.plan} Plan</h3>
                      <span style={{ fontSize:'0.75rem', padding:'4px 10px', borderRadius:'100px', background: subData.isPremium ? (subData.autoRenew ? '#dcfce7' : '#fff7ed') : '#f3f4f6', color: subData.isPremium ? (subData.autoRenew ? '#166534' : '#c2410c') : '#6b7280', fontWeight:'600', border:'1px solid rgba(0,0,0,0.05)' }}>
                          {subData.status.toUpperCase().replace(/_/g, " ")}
                      </span>
                  </div>
                  <div style={{fontSize:'0.95rem', color:'var(--text-muted)'}}>
                      {subData.isPremium 
                        ? (subData.autoRenew 
                            ? `Next billing: ${subData.renewalDate || 'Calculating...'}` 
                            : `Plan expires on: ${subData.renewalDate || 'End of period'}`)
                        : "Upgrade to unlock long-term memory, emotional intelligence & priority support."}
                  </div>
              </div>
              <div>
                  {/* BUTTONS LOGIC */}
                  {!subData.isPremium ? (
                      <button className="btn-primary" onClick={onUpgrade} style={{fontSize:'0.95rem', padding:'12px 28px'}}>Upgrade to Pro</button>
                  ) : (
                      <div style={{display:'flex', gap:'10px'}}>
                          {/* If Cancelled (AutoRenew OFF) -> Show Resubscribe */}
                          {!subData.autoRenew && (
                              <button 
                                className="btn-primary" 
                                onClick={() => setShowResubscribeOverlay(true)} 
                                style={{fontSize:'0.95rem', padding:'12px 20px', background:'#4f46e5', display:'inline-flex', alignItems:'center', gap:'8px'}}
                              >
                                <IconRefresh /> Resubscribe
                              </button>
                          )}
                          {/* Always Show Manage for Pro Users */}
                          <button className="btn-secondary" onClick={() => setShowManage(true)} style={{fontSize:'0.9rem'}}>Manage</button>
                      </div>
                  )}
              </div>
          </div>

          {/* BILLING HISTORY */}
          <div style={{marginTop:'50px'}}>
              <h3 style={{fontSize:'1.1rem', fontWeight:'600', marginBottom:'20px', color:'var(--text-main)'}}>Billing History</h3>
              <div style={{background:'var(--bg-panel)', border:'1px solid var(--border-color)', borderRadius:'12px', overflow:'hidden'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.9rem'}}>
                      <thead style={{background:'var(--bg-subtle)', borderBottom:'1px solid var(--border-color)'}}>
                          <tr>
                              <th style={{textAlign:'left', padding:'16px 24px', color:'var(--text-muted)', fontWeight:'600', fontSize:'0.8rem'}}>DATE</th>
                              <th style={{textAlign:'left', padding:'16px 24px', color:'var(--text-muted)', fontWeight:'600', fontSize:'0.8rem'}}>DESCRIPTION</th>
                              <th style={{textAlign:'left', padding:'16px 24px', color:'var(--text-muted)', fontWeight:'600', fontSize:'0.8rem'}}>AMOUNT</th>
                              <th style={{textAlign:'right', padding:'16px 24px', color:'var(--text-muted)', fontWeight:'600', fontSize:'0.8rem'}}>STATUS</th>
                          </tr>
                      </thead>
                      <tbody>
  {historyLoading ? (
      <tr><td colSpan="4" style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>Loading history...</td></tr>
  ) : billingHistory.length === 0 ? (
      <tr><td colSpan="4" style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>No payment history found.</td></tr>
  ) : (
      billingHistory.map((h) => (
          <tr key={h.id} style={{borderBottom:'1px solid var(--border-color)'}}>
              <td style={{padding:'16px 24px', color:'var(--text-main)'}}>
                  <div style={{fontWeight:'500'}}>{new Date(h.date).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'})}</div>
                  <div style={{fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'4px'}}>{new Date(h.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
              </td>
              <td style={{padding:'16px 24px'}}>
                  <div style={{color:'var(--text-main)', fontWeight:'500'}}>
                      {/* 1. Main Title: Checks for Payment OR Cancelled to show "Pro Subscription" */}
                      {(h.type === "SUBSCRIPTION_PAYMENT" || h.type === "SUBSCRIPTION_CANCELLED" || h.description.includes("Sub") || h.description.includes("Pro")) 
                          ? <span style={{color: '#6366f1'}}>Pro Subscription</span>
                          : "Minute Top-up"
                      }
                  </div>
                  
                  {/* 2. Minutes Subtitle (Existing) */}
                  {h.minutes > 0 && <div style={{fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'4px'}}>+{h.minutes} Minutes Added</div>}

                  {/* 3. Cancelled Subtitle (New - Small Red Text) */}
                  {h.type === "SUBSCRIPTION_CANCELLED" && (
                      <div style={{fontSize:'0.8rem', color:'#ef4444', marginTop:'4px'}}>Cancelled</div>
                  )}
              </td>
              <td style={{padding:'16px 24px', color:'var(--text-main)', fontWeight:'600'}}>{h.amount}</td>
              <td style={{padding:'16px 24px', textAlign:'right'}}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', fontSize:'0.8rem', fontWeight:'600', padding:'4px 10px', borderRadius:'100px', background: (h.status.includes('Succeeded') || h.status.includes('Completed')) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: (h.status.includes('Succeeded') || h.status.includes('Completed')) ? '#10b981' : '#ef4444' }}>{h.status}</span>
              </td>
          </tr>
      ))
  )}
</tbody>
                  </table>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'20px', padding:'0 5px'}}>
                   <button onClick={handlePrev} disabled={page === 1 || historyLoading} className="btn-secondary" style={{opacity: page===1 ? 0.5 : 1, cursor: page===1 ? 'default' : 'pointer'}}>Previous</button>
                   <span style={{fontSize:'0.9rem', color:'var(--text-muted)'}}>Page {page}</span>
                   <button onClick={handleNext} disabled={!lastDocId || billingHistory.length < 10 || historyLoading} className="btn-secondary" style={{opacity: (!lastDocId) ? 0.5 : 1, cursor: (!lastDocId) ? 'default' : 'pointer'}}>Next</button>
              </div>
          </div>

          {/* MANAGE OVERLAY */}
          {showManage && (
              <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100}} onClick={() => setShowManage(false)}>
                  <div onClick={e => e.stopPropagation()} style={{background:'var(--bg-panel)', color:'var(--text-main)', border:'1px solid var(--border-color)', borderRadius:'16px', padding:'30px', boxShadow:'0 20px 50px rgba(0,0,0,0.15)', width:'100%', maxWidth:'400px'}}>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                          <h3 style={{fontSize:'1.2rem', fontWeight:'700', margin:0}}>Manage Subscription</h3>
                          <button onClick={() => setShowManage(false)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'var(--text-muted)'}}>×</button>
                      </div>
                      <div style={{padding:'16px', background:'var(--bg-subtle)', borderRadius:'10px', marginBottom:'24px', display:'flex', alignItems:'center', gap:'16px'}}>
                          <div style={{padding:'10px', background:'#fff', borderRadius:'8px', border:'1px solid var(--border-color)', display:'flex'}}><IconCreditCard /></div>
                          <div>
                              <div style={{fontSize:'0.95rem', fontWeight:'600'}}>{subData.cardLast4 && subData.cardLast4 !== '••••' ? `•••• •••• •••• ${subData.cardLast4}` : 'Card on file'}</div>
                              <div style={{fontSize:'0.85rem', color:'var(--text-muted)', marginTop:'4px'}}>{subData.renewalDate}</div>
                          </div>
                      </div>
                      {subData.autoRenew ? (
                          <>
                            <button onClick={handleCancelSubscription} className="btn-secondary" style={{width:'100%', justifyContent:'center', padding:'12px', color:'#ef4444', borderColor:'#ef4444', background:'rgba(239, 68, 68, 0.05)', fontWeight:'600'}} disabled={canceling}>{canceling ? "Processing..." : "Cancel Subscription"}</button>
                            <p style={{fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'16px', textAlign:'center', lineHeight:'1.5'}}>Your benefits will remain active until the end of the current billing cycle.</p>
                          </>
                      ) : (
                          <div style={{textAlign:'center', fontSize:'0.9rem', color:'var(--text-muted)', background:'rgba(0,0,0,0.03)', padding:'15px', borderRadius:'8px'}}>Auto-renewal is <strong>OFF</strong>.<br/>Your plan will downgrade to Free on <br/>{subData.renewalDate ? subData.renewalDate.replace("Expires ", "") : "end of period"}.</div>
                      )}
                  </div>
              </div>
          )}

          {/* RESUBSCRIBE OVERLAY (ARTISTIC - TRIGGERS PAYMENT) */}
          {showResubscribeOverlay && (
              <div className="upgrade-overlay" onClick={() => setShowResubscribeOverlay(false)}>
                  <div className="upgrade-modal" onClick={e => e.stopPropagation()}>
                      <button className="close-btn" onClick={() => setShowResubscribeOverlay(false)}>×</button>
                      
                      <h2>Upgrade to Persona Pro</h2>
                      <p className="sub-head">AI conversations that feel truly human.</p>
                      
                      <div className="upgrade-feature-list">
                          <div className="upgrade-feature-item"><IconCheck /> <span><strong>50 Minutes Included Monthly</strong></span></div>
                          <div className="upgrade-feature-item"><IconCheck /> <span><strong>GPT-5.2 Cognitive Engine</strong> – advanced reasoning & emotional intelligence</span></div>
                          <div className="upgrade-feature-item"><IconCheck /> <span><strong>Hyper-Realistic Persona Behavior</strong> – tone, emotion & natural interruptions</span></div>
                          <div className="upgrade-feature-item"><IconCheck /> <span><strong>Premium Voice Engine (v3)</strong> – human-like speech and expression</span></div>
                          <div className="upgrade-feature-item"><IconCheck /> <span><strong>Turbo Response Speed</strong> – priority GPU, ultra-low latency</span></div>
                          <div className="upgrade-feature-item"><IconCheck /> <span><strong>Long-Term AI Memory</strong> – remembers you across sessions</span></div>
                          <div className="upgrade-feature-item"><IconCheck /> <span><strong>Discounted Overage</strong> – 30% off ($0.70 / min)</span></div>
                          <div className="upgrade-feature-item"><IconCheck /> <span><strong>Priority 24/7 Support</strong></span></div>
                      </div>
                      
                      {/* THIS BUTTON NOW CALLS THE PAYMENT LINK (onUpgrade) */}
                      <button onClick={onUpgrade} className="upgrade-btn-artistic">
                          Upgrade for $29/mo
                      </button>
                      <p className="unlock-text">Unlock the full Pro experience.</p>
                  </div>
              </div>
          )}
        </div>
    </div>
  );
}