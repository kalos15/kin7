import React, { useState, useRef, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import '../Dashboard.css'; 
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfUse } from './TermsOfUse';
import { CookiePolicy } from './CookiePolicy';
import { CrisisSupport } from './CrisisSupport';
import { 
    startAvatarSession, 
    stopAvatarSession, 
    toggleMic, 
    setSessionVolume 
} from '../services/heygenService'; 
import PaymentModal from './PaymentModal';
import Settings from './Settings'; 
import Subscription from './Subscription';
import { motion, AnimatePresence } from 'framer-motion';

// --- VIDEO IMPORTS ---
import femVideo from './fem.mp4';
import maleVideo from './ml.mp4';

// --- ICONS ---
const IconSidebar = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16.5 4C17.3284 4 18 4.67157 18 5.5V14.5C18 15.3284 17.3284 16 16.5 16H3.5C2.67157 16 2 15.3284 2 14.5V5.5C2 4.67157 2.67157 4 3.5 4H16.5ZM7 15H16.5C16.7761 15 17 14.7761 17 14.5V5.5C17 5.22386 16.7761 5 16.5 5H7V15ZM3.5 5C3.22386 5 3 5.22386 3 5.5V14.5C3 14.7761 3.22386 15 3.5 15H6V5H3.5Z"/></svg>;
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="5.5" width="15" height="11" rx="2.5" fill="currentColor"/><rect x="6.5" y="3.5" width="7" height="3" rx="1.5" fill="currentColor"/><circle cx="10" cy="11" r="3.2" fill="#3B82F6"/><circle cx="10" cy="11" r="1.6" fill="white" opacity="0.85"/></svg>;
const IconSubscription = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M15.8198 7C16.6885 7.00025 17.3624 7.73158 17.3178 8.57617L17.2993 8.74707L16.1332 15.7471C16.0126 16.4699 15.3865 16.9996 14.6538 17H5.34711C4.6142 16.9998 3.98833 16.47 3.86762 15.7471L2.7016 8.74707C2.54922 7.83277 3.25418 7 4.18109 7H15.8198ZM4.18109 8C3.87216 8 3.63722 8.27731 3.68793 8.58203L4.85394 15.582C4.89413 15.8229 5.10291 15.9998 5.34711 16H14.6538C14.8978 15.9996 15.1068 15.8228 15.1469 15.582L16.3129 8.58203L16.3188 8.46973C16.3036 8.21259 16.0899 8.00023 15.8198 8H4.18109Z"></path></svg>;
const IconChevronSelector = () => <svg width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M181.66,170.34a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-48-48a8,8,0,0,1,11.32-11.32L128,212.69l42.34-42.35A8,8,0,0,1,181.66,170.34Zm-96-84.68L128,43.31l42.34,42.35a8,8,0,0,0,11.32-11.32l-48-48a8,8,0,0,0-11.32,0l-48,48A8,8,0,0,0,85.66,85.66Z"></path></svg>;
const IconMic = ({active}) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "black" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const IconHangup = () => <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6 12 6s8.66 2.36 11.71 5.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>;
const IconCheck = () => <svg width="16" height="16" fill="none" stroke="#10b981" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const IconVolume = ({muted}) => muted ? 
    <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg> : 
    <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>;

// --- MENU ICONS ---
const IconSettings = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconGlobe = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>;
const IconHelp = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5h.008v.008H12v-.008z" /></svg>;
const IconArrowUp = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>;
const IconInfo = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>;
const IconLogout = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>;
const IconArrowRight = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;

// --- FULLSCREEN ICONS (Updated Bigger Size) ---
const IconMaximize = () => <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>;
const IconMinimize = () => <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" /></svg>;


export default function Dashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('home'); 
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionReady, setSessionReady] = useState(false); 
  const [micActive, setMicActive] = useState(true);
  const [userData, setUserData] = useState(user); 
  
  // Session State
  const [timerStr, setTimerStr] = useState("00:00");
  const [sessionBalance, setSessionBalance] = useState(user?.minutesBalance || 0);
  
  // [FIXED] Volume state defaults to 50% (0-100 scale)
  const [volume, setVolume] = useState(50); 
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  // UI State
  const [showPayment, setShowPayment] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showClarityModal, setShowClarityModal] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // HELP MODAL STATE
  const [showHelpModal, setShowHelpModal] = useState(false);

  // PAGE VIEWER STATE
  const [viewPage, setViewPage] = useState(null);

  const [activeSubMenu, setActiveSubMenu] = useState(null); 

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  
  // [NEW] Ref for Video Container (for Fullscreen)
  const videoContainerRef = useRef(null);
  
  useEffect(() => { 
      if(window.location.pathname === '/subscription') setCurrentView('subscription');
  }, []);

  const fetchUserData = async () => {
    if(!user?.uid) return;
    try {
        const userFn = httpsCallable(functions, 'api_user');
        const res = await userFn({ action: 'sync', uid: user.uid, email: user.email });
        if (res.data) setUserData(res.data);
    } catch (e) { console.error("Sync failed:", e); }
  };

  useEffect(() => {
    if(user?.uid) {
        fetchUserData();
        const interval = setInterval(fetchUserData, 10000); 
        return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
      if(!sessionActive) {
          setSessionBalance(userData.minutesBalance);
      }
  }, [userData.minutesBalance, sessionActive]);

  // [NEW] GESTURE + FULLSCREEN LOGIC
  useEffect(() => {
    if (!sessionReady || !videoContainerRef.current) return;

    const el = videoContainerRef.current;
    
    // 1. Gesture Logic
    let initialDist = 0;

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            initialDist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2) {
            const currentDist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );

            // Pinch IN (Shrink) -> Exit Fullscreen
            if (initialDist > currentDist + 50) { 
                if (document.fullscreenElement || document.webkitFullscreenElement) {
                   exitImmersiveMode();
                }
            }
            // Pinch OUT (Expand) -> Enter Fullscreen
            else if (currentDist > initialDist + 50) {
                enterImmersiveMode();
            }
        }
    };

    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchmove', handleTouchMove);

    return () => {
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMove);
    };
  }, [sessionReady]);

  const enterImmersiveMode = async () => {
    const el = videoContainerRef.current;
    if (!el) return;
    try {
        if (el.requestFullscreen) {
            await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
            await el.webkitRequestFullscreen();
        }
    } catch (err) { console.log(err); }
  };

  const exitImmersiveMode = async () => {
    try {
        if (document.exitFullscreen) {
            await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            await document.webkitExitFullscreen();
        }
    } catch (err) { console.log(err); }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        exitImmersiveMode();
    } else {
        enterImmersiveMode();
    }
  };

  const handleUpgradeClick = async () => {
      const fn = httpsCallable(functions, 'create_payment_link');
      try {
          const res = await fn({ productId: "pdt_A7SyzDwkFIv2eOqI755gx", uid: userData.uid, type: "checkout" });
          if(res.data.url) window.location.href = res.data.url;
      } catch(e) { alert("Error: "+e.message); }
  };

  const handlePersonaClick = (personaId) => {
      const balance = userData.minutesBalance || 0;
      if (balance < 0.2 && !userData.isPremium) {
          setShowClarityModal(true);
          return;
      }
      handleStartSession(personaId);
  };

  const handleStartSession = async (personaId) => {
      setSidebarOpen(false); 
      setSessionActive(true); 
      setSessionReady(false); 
      setTimerStr("00:00");
      setSessionBalance(userData.minutesBalance || 0);
      
      try {
          await startAvatarSession(
              userData.uid,
              personaId, 
              videoRef, 
              audioRef, 
              () => {}, 
              () => {
                  setSessionReady(true);
              },
              () => { handleEndSession(true); },
              (timeString, elapsedSeconds) => { 
                  setTimerStr(timeString);
                  const newBal = Math.max(0, (userData.minutesBalance || 0) - (elapsedSeconds / 60));
                  setSessionBalance(newBal);
              }
          );
      } catch (e) {
          alert("Session Failed: " + (e.message || "Unknown error"));
          setSessionActive(false);
      }
  };

  const handleEndSession = async (isExternalEnd = false) => {
      if (!isExternalEnd) {
         await stopAvatarSession(); 
      }
      setSessionActive(false);
      setSessionReady(false);
      setTimerStr("00:00");
      setTimeout(() => fetchUserData(), 3000); 
  };

  // [FIXED] Volume Handler
  const handleVolumeChange = (e) => {
      const newVol = Number(e.target.value); // 0-100
      setVolume(newVol);
      // Convert to 0.0-1.0 for the HeyGen API
      setSessionVolume(newVol / 100);
  };

  const toggleMute = () => {
      const newVol = volume > 0 ? 0 : 50; // Restore to 50% if unmuting
      setVolume(newVol);
      setSessionVolume(newVol / 100);
  };

  const toggleMicrophone = async () => {
      const newState = !micActive;
      setMicActive(newState);
      await toggleMic(newState);
  };

  const closeUserMenu = () => {
      setShowUserMenu(false);
      setActiveSubMenu(null);
  };

  const formatTimeBalance = (num) => {
      const safeNum = Math.max(0, Number(num || 0));
      const m = Math.floor(safeNum);
      const s = Math.floor((safeNum - m) * 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderMainContent = () => {
      if(currentView === 'subscription') return <Subscription user={userData} onUpgrade={() => setShowUpgradeOverlay(true)} />;
      
      const formattedBalance = formatTimeBalance(userData.minutesBalance);
      const isPro = userData.isPremium;
      const isCancelled = isPro && !userData.autoRenew; 

      return (
          <div className="main-content">
             <div className="welcome-badge" onClick={() => !isPro && setShowUpgradeOverlay(true)}>
                 <span>{isPro ? (isCancelled ? 'Pro (Ends Soon)' : 'Pro Plan Active') : 'Free Plan'}</span>
                 {!isPro && <span style={{color:'var(--primary)'}}>Upgrade →</span>}
             </div>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lobster&display=swap');
</style>

<h1 style={{ 
    fontSize: '2.5rem', 
    marginBottom: '10px', 
    fontFamily: 'var(--font-serif)', 
    color: '#0f172a' 
}}>
  Welcome back,{' '}
  <span style={{
    fontFamily: '"Lobster", sans-serif', 
    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent',
    fontWeight: '400',
    paddingRight: '0.2em' /* FIX: Adds small space so the last letter isn't cut off */
  }}>
    {userData.displayName?.split(' ')[0]}
  </span>
</h1>
             <p style={{ marginBottom: '50px', color: 'var(--text-muted)' }}>Who would you like to speak with today?</p>
             
             <div className="persona-grid">
                <div className="persona-item" onClick={() => handlePersonaClick('sarah')}>
                    <div className="p-video-wrap"><video src={femVideo} autoPlay muted loop playsInline /></div>
                    <div className="p-title">Sarah</div>
                </div>
                <div className="persona-item" onClick={() => handlePersonaClick('male_01')}>
                    <div className="p-video-wrap"><video src={maleVideo} autoPlay muted loop playsInline /></div>
                    <div className="p-title">David</div>
                </div>
             </div>

             <div className="dashboard-info-widget">
                 <div className="di-stat">
                     <div className="di-label">
                        Available balance 
                        <span style={{ fontSize: '0.75em', fontWeight: '400', opacity: 0.7, marginLeft: '5px' }}>
                            (Minutes:Seconds)
                        </span>
                     </div>
                     <div className="di-value">{formattedBalance}</div>
                 </div>
                 
                 <button className="btn-buy-modern" onClick={() => setShowPayment(true)}>
                     <IconPlus /> <span>Buy Minutes</span>
                 </button>
             </div>
          </div>
      );
  };

  return (
    <div className="dashboard-layout">
      {!sessionActive && (
          <button className="sidebar-toggle-btn mobile-only" onClick={() => setSidebarOpen(true)}>
             <IconSidebar />
          </button>
      )}

      <div className={`sidebar-overlay ${sidebarOpen || showUserMenu ? 'open' : ''}`} onClick={() => { setSidebarOpen(false); closeUserMenu(); }} />

      <aside className={`claude-sidebar ${sidebarOpen ? 'open' : ''}`}>
           <div className="sidebar-header" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: sidebarOpen ? 'flex-end' : 'center',
                flexDirection: sidebarOpen ? 'row' : 'column',
                height: sidebarOpen ? '60px' : 'auto',
                padding: sidebarOpen ? '16px 12px' : '20px 0',
                gap: sidebarOpen ? '0' : '15px',
                position: 'relative'
           }}>
               <div style={{ 
                   fontSize: sidebarOpen ? '1.4rem' : '1.8rem', 
                   fontWeight: '700', 
                   color: '#0f172a',
                   lineHeight: 1,
                   pointerEvents: 'none',
                   position: sidebarOpen ? 'absolute' : 'static',
                   width: sidebarOpen ? '100%' : 'auto',
                   left: 0,
                   textAlign: 'center',
                   zIndex: 0
               }}>
                   {sidebarOpen ? (
                       <>Kin<span className="text-gradient">7</span></>
                   ) : (
                       <span className="text-gradient">7</span>
                   )}
               </div>
               
               <button 
                   onClick={() => setSidebarOpen(!sidebarOpen)} 
                   className="sidebar-collapse-btn"
                   style={{ position: 'relative', zIndex: 10 }}
               >
                   <IconSidebar />
               </button>
           </div>
           
           <div className="sidebar-content">
               <button className="new-chat-btn" onClick={() => { setCurrentView('home'); setSidebarOpen(false); }}>
                   <div className="new-chat-icon"><IconPlus /></div>
                   <span className="new-chat-text">Start Session</span>
               </button>

               <div className="nav-list">
                   <button className={`nav-item ${currentView === 'subscription' ? 'active' : ''}`} onClick={() => { setCurrentView('subscription'); setSidebarOpen(false); }}>
                       <div className="nav-icon"><IconSubscription /></div>
                       <span className="nav-text">Subscription</span>
                   </button>
               </div>
           </div>

           <div className="sidebar-footer">
               {showUserMenu && (
                   <div className="popover-menu" onClick={(e) => e.stopPropagation()}>
                       <div className="pop-header">{user?.email}</div>
                       <div className="pop-item" onClick={() => { setShowSettingsModal(true); closeUserMenu(); }}>
                           <div className="pop-label"><IconSettings /> Settings</div>
                       </div>
                       
                      
                       
                       {/* [FIXED] GET HELP - TRIGGER MODAL PROPERLY */}
                       <div className="pop-item" onClick={() => { setShowHelpModal(true); closeUserMenu(); }}>
                           <div className="pop-label"><IconHelp /> Get help</div>
                       </div>

                       <div className="pop-divider"></div>
					   
					   <div className="pop-item" onClick={() => setShowFeedback(true)}>
					       <div className="pop-label">
						       <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
					           Send Feedback
						   </div>
					   </div>
					   
                       {!userData.isPremium && (
                           <div className="pop-item" onClick={() => { setShowUpgradeOverlay(true); closeUserMenu(); }}>
                               <div className="pop-label"><IconArrowUp /> Upgrade plan</div>
                           </div>
                       )}
                       
                       {/* UPDATED LEARN MORE SUBMENU */}
                       <div className="pop-item" onClick={() => setActiveSubMenu(activeSubMenu === 'learn_more' ? null : 'learn_more')} style={{position:'relative'}}>
                           <div className="pop-label"><IconInfo /> Learn more</div>
                           <IconArrowRight />
                           {activeSubMenu === 'learn_more' && (
                               <div className="pop-submenu">
                                   <div className="pop-item" onClick={() => setViewPage('terms_of_use')}>Terms of Use</div>
                                   <div className="pop-item" onClick={() => setViewPage('privacy_policy')}>Privacy Policy</div>
                                   <div className="pop-item" onClick={() => setViewPage('cookie_policy')}>Cookie Policy</div>
                                   <div className="pop-item" onClick={() => setViewPage('crisis_support')}>Crisis Support</div>
                               </div>
                           )}
                       </div>
                       
                       <div className="pop-divider"></div>
                       <div className="pop-item" onClick={onLogout}><div className="pop-label"><IconLogout /> Log out</div></div>
                   </div>
               )}

               <button className="user-profile-btn" onClick={() => showUserMenu ? closeUserMenu() : setShowUserMenu(true)}>
                   <div className="user-avatar">
                       {userData.photoURL && userData.photoURL.length > 5 ? (
                           <img src={userData.photoURL} alt="Profile" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} />
                       ) : (
                           <div style={{width:'100%', height:'100%', background:'#0f172a', color:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700'}}>
                               {userData.displayName ? userData.displayName.charAt(0).toUpperCase() : (userData.email ? userData.email.charAt(0).toUpperCase() : 'U')}
                           </div>
                       )}
                   </div>
                   <div className="user-info-stack">
                       <span className="user-name">{userData.displayName || 'User'}</span>
                       <span className="user-plan">{userData.isPremium ? 'Pro plan' : 'Free plan'}</span>
                   </div>
                   <div className="user-chevron"><IconChevronSelector /></div>
               </button>
           </div>
      </aside>

      <main style={{flex:1, position:'relative'}}>
        {renderMainContent()}
        
        {showClarityModal && (
            <div className="settings-overlay" onClick={() => setShowClarityModal(false)}>
                <div className="clarity-modal" onClick={e => e.stopPropagation()}>
                    <h2 style={{fontFamily:'var(--font-serif)', marginBottom:'10px'}}>You don't have minutes yet</h2>
                    <p style={{color:'var(--text-muted)', marginBottom:'20px'}}>Start a session instantly by topping up your balance.</p>
                    <div className="clarity-actions">
                        <button className="btn-primary" onClick={() => { setShowClarityModal(false); setShowPayment(true); }}>Buy Minutes</button>
                        <button className="btn-secondary" onClick={() => { setShowClarityModal(false); setShowUpgradeOverlay(true); }}>Upgrade to Pro</button>
                    </div>
                </div>
            </div>
        )}

        <AnimatePresence>
            {sessionActive && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="video-overlay"
                    ref={videoContainerRef} // [NEW] Ref for fullscreen
                >
                    {/* [NEW] Gesture Hints */}
                    <div className="gesture-hint">
                         <div className="arrow-up"></div>
                         <div className="arrow-down"></div>
                    </div>
                    
                    {/* [NEW] Top Right Fullscreen Button */}
                    <div className="video-top-bar">
                         <button className="btn-icon-glass" onClick={toggleFullscreen}>
                             <IconMaximize />
                         </button>
                    </div>

                    <video ref={videoRef} autoPlay playsInline className="video-stream" style={{ opacity: sessionReady ? 1 : 0 }} />
                    <audio ref={audioRef} autoPlay playsInline />

                    {!sessionReady && (<div className="loading-overlay" style={{position:'absolute', inset:0, background:'#000'}}><div className="spinner"></div></div>)}

                    <div className="session-controls">
                         {/* 1. Buy Minutes */}
<button className="btn-buy-minutes-session" onClick={() => setShowPayment(true)}>
    {/* This text shows on Desktop */}
    <span className="buy-text-desktop">Buy Minutes</span>
    {/* This Icon shows on Mobile */}
    <span className="buy-icon-mobile">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
    </span>
</button>

                         {/* 3. Volume Slider */}
<div 
    className="volume-wrapper" 
    onMouseEnter={() => setShowVolumeSlider(true)} 
    onMouseLeave={() => setShowVolumeSlider(false)}
>
    {showVolumeSlider && (
        <div className="volume-slider-popup">
            <input 
                type="range" 
                min="0" max="100" step="1" // [FIXED] 0 to 100
                value={volume} 
                onChange={handleVolumeChange}
                className="vol-range"
            />
        </div>
    )}
    <button className="ctrl-btn" onClick={toggleMute}>
        {volume === 0 ? (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
        ) : (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 9.114a9 9 0 010 12.772m-2.25-9.59a5.25 5.25 0 010 6.332M10.5 5.25l-5.25 4.5H3v8.25h2.25l5.25 4.5V5.25z" /></svg>
        )}
    </button>
</div>

                         <button className={`ctrl-btn ${!micActive ? 'off' : ''} ${micActive ? 'mic-pulse' : ''}`} onClick={toggleMicrophone}>
                            <IconMic active={micActive} />
                         </button>

                         <button className="ctrl-btn hangup" onClick={() => handleEndSession(false)}>
                            <IconHangup />
                         </button>

                         <div className="session-timer-display">
                             <div className="time-pill">{timerStr}</div>
                             <div style={{color:'rgba(255,255,255,0.6)', fontSize:'0.75rem', marginTop:'4px'}}>
                                 Bal: {formatTimeBalance(sessionBalance)}
                             </div>
                         </div>
                    </div>
                    
                    {/* [FIXED] Render Payment Modal INSIDE video overlay when session is active */}
                    {showPayment && (
                        <div style={{position: 'absolute', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <PaymentModal userId={userData.uid} isPremium={userData.isPremium} onClose={() => { setShowPayment(false); fetchUserData(); }} />
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* [FIXED] Render Payment Modal OUTSIDE only when session is NOT active */}
        {!sessionActive && showPayment && (
            <PaymentModal userId={userData.uid} isPremium={userData.isPremium} onClose={() => { setShowPayment(false); fetchUserData(); }} />
        )}
        
        <Settings 
            open={showSettingsModal} 
            onClose={() => setShowSettingsModal(false)} 
            user={userData} 
            onLogout={onLogout}
            onUpdateUser={(updatedData) => setUserData(prev => ({ ...prev, ...updatedData }))} 
        />
        
        {showUpgradeOverlay && (
          <div className="settings-overlay" onClick={() => setShowUpgradeOverlay(false)}>
              <div className="upgrade-modal" onClick={e => e.stopPropagation()}>
                  
                  <h2>Upgrade to Persona Pro</h2>
                  <p className="sub-head">AI conversations that feel truly human.</p>
                  
                  <div className="upgrade-feature-list">
                      <div className="upgrade-feature-item">
                          <IconCheck /> <span><strong>50 Minutes Included Monthly</strong></span>
                      </div>
                      <div className="upgrade-feature-item">
                          <IconCheck /> <span><strong>GPT-5.2 Cognitive Engine</strong> – advanced reasoning & emotional intelligence</span>
                      </div>
                      <div className="upgrade-feature-item">
                          <IconCheck /> <span><strong>Hyper-Realistic Persona Behavior</strong> – tone, emotion & natural interruptions</span>
                      </div>
                      <div className="upgrade-feature-item">
                          <IconCheck /> <span><strong>Premium Voice Engine (v3)</strong> – human-like speech and expression</span>
                      </div>
                      <div className="upgrade-feature-item">
                          <IconCheck /> <span><strong>Turbo Response Speed</strong> – priority GPU, ultra-low latency</span>
                      </div>
                      <div className="upgrade-feature-item">
                          <IconCheck /> <span><strong>Long-Term AI Memory</strong> – remembers you across sessions</span>
                      </div>
                      <div className="upgrade-feature-item">
                          <IconCheck /> <span><strong>Discounted Overage</strong> – 30% off ($0.70 / min)</span>
                      </div>
                      <div className="upgrade-feature-item">
                          <IconCheck /> <span><strong>Priority 24/7 Support</strong></span>
                      </div>
                  </div>
                  
                  <button onClick={handleUpgradeClick} className="upgrade-btn-artistic">
                      Upgrade for $29/mo
                  </button>
                  <p className="unlock-text">Unlock the full Pro experience.</p>
              </div>
          </div>
      )}

      {showFeedback && (
          <UserFeedbackModal onClose={() => setShowFeedback(false)} user={userData} />
      )}
      
      {/* [FIXED] ARTISTIC HELP MODAL (Centering Forced for Mobile) */}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
      
      {/* PAGE VIEWER COMPONENT RENDER */}
      {viewPage && <PageViewerModal pageId={viewPage} onClose={() => setViewPage(null)} />}

      </main>
    </div>
  );
}

/* --- FEEDBACK COMPONENT --- */
const UserFeedbackModal = ({ onClose, user }) => {
    const [rating, setRating] = useState(5);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);

    const handleSubmit = async () => {
        if(!text.trim()) return;
        setSending(true);
        try {
            const fn = httpsCallable(functions, 'api_user');
            await fn({ action: 'submitFeedback', uid: user.uid, email: user.email, text, rating });
            alert("Thanks for your feedback!");
            onClose();
        } catch(e) {
            console.error(e);
            alert("Error sending feedback.");
        }
        setSending(false);
    };

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="feedback-modal-modern" onClick={e => e.stopPropagation()}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                    <h3 style={{margin:0, fontSize:'1.1rem', fontWeight:'700'}}>Your Feedback</h3>
                    <button onClick={onClose} style={{background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#999'}}>&times;</button>
                </div>

                <div style={{display:'flex', gap:'8px', marginBottom:'20px', justifyContent:'center'}}>
                    {[1,2,3,4,5].map(star => (
                        <svg 
                            key={star} 
                            onClick={() => setRating(star)}
                            width="28" height="28" 
                            fill={star <= rating ? "#FCD34D" : "none"} 
                            stroke={star <= rating ? "#FCD34D" : "#E5E7EB"} 
                            strokeWidth="2" 
                            viewBox="0 0 24 24"
                            style={{cursor:'pointer', transition:'0.2s'}}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    ))}
                </div>

                <textarea 
                    placeholder="Tell us what you think..." 
                    value={text}
                    onChange={e => setText(e.target.value)}
                    style={{
                        width:'100%', height:'100px', padding:'12px', borderRadius:'12px', 
                        border:'1px solid #eee', background:'#f9fafb', fontSize:'0.9rem', 
                        resize:'none', outline:'none', marginBottom:'20px', fontFamily:'inherit'
                    }}
                />

                <button 
                    onClick={handleSubmit} 
                    disabled={sending}
                    style={{
                        width:'100%', padding:'12px', borderRadius:'12px', border:'none',
                        background: sending ? '#ccc' : '#000', color:'#fff', fontWeight:'600',
                        cursor: sending ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                        boxShadow: 'none'
                    }}
                >
                    {sending ? "Sending..." : "Send Feedback"}
                    {!sending && <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" /></svg>}
                </button>
            </div>
            <style>{`
                .feedback-modal-modern {
                    background: #fff; width: 360px; padding: 30px; border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.08); border: 1px solid #f3f4f6;
                }
            `}</style>
        </div>
    );
};

/* ==================================================================================
   [FIXED] ARTISTIC HELP MODAL (Center Forced on Mobile)
   ================================================================================== */
const HelpModal = ({ onClose }) => (
    <div className="settings-overlay" onClick={onClose} style={{
        zIndex:20000, 
        background:'rgba(255,255,255,0.1)', 
        backdropFilter:'blur(8px)',
        // [CRITICAL] OVERRIDE CSS FLEX-END FOR MOBILE
        display: 'flex',
        alignItems: 'center', 
        justifyContent: 'center'
    }}>
        <div 
            onClick={e => e.stopPropagation()} 
            style={{
                background:'#ffffff', 
                padding:'40px', 
                borderRadius:'24px', 
                maxWidth:'400px', 
                width:'85%', // Optimized for mobile width
                boxShadow:'0 20px 80px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.03)',
                textAlign:'center',
                position:'relative',
                overflow:'hidden',
                display:'flex',
                flexDirection:'column',
                alignItems:'center',
                gap:'16px'
            }}
        >
            {/* Artistic Glow Blob */}
            <div style={{
                position:'absolute', top:'-50%', left:'-50%', width:'200%', height:'200%',
                background:'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.06), transparent 60%)',
                pointerEvents:'none', zIndex:0
            }} />

            <div style={{
                width:'64px', height:'64px', borderRadius:'50%', background:'#F8FAFC', 
                color:'#0F172A', display:'flex', alignItems:'center', justifyContent:'center',
                marginBottom:'8px', position:'relative', zIndex:1
            }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" /></svg>
            </div>

            <h2 style={{margin:0, fontSize:'1.5rem', fontWeight:'700', color:'#0f172a', position:'relative', zIndex:1, fontFamily:'var(--font-serif)'}}>
                How can we help?
            </h2>
            
            <p style={{margin:0, fontSize:'0.95rem', color:'#64748b', lineHeight:'1.6', position:'relative', zIndex:1}}>
                We are dedicated to providing you with the best experience. If you encounter issues or have questions, please reach out directly.
            </p>

            <div style={{
                marginTop:'16px', background:'#F1F5F9', padding:'16px 24px', borderRadius:'12px',
                width:'100%', position:'relative', zIndex:1
            }}>
                <div style={{fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.05em', color:'#94a3b8', fontWeight:'600', marginBottom:'4px'}}>
                    Support Email
                </div>
                <div style={{fontSize:'1.1rem', fontWeight:'500', color:'#0f172a', userSelect:'all'}}>
                    support@kin7.ai
                </div>
            </div>

            <p style={{margin:'8px 0 0 0', fontSize:'0.8rem', color:'#cbd5e1', position:'relative', zIndex:1}}>
                Tap outside to close
            </p>
        </div>
    </div>
);

/* ==================================================================================
   3. PROFESSIONAL PAGE VIEWER COMPONENT (REPLACE THIS IN ALL FILES)
   ================================================================================== */
const PageViewerModal = ({ pageId, onClose }) => {
    // Map IDs to Components
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

                {/* Header */}
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

                {/* Content Container */}
                <div style={{ padding: '30px', overflowY: 'auto', lineHeight: '1.6', color: '#334155' }}>
                    {Pages[pageId]}
                </div>
            </div>
        </div>
    );
};