import React, { useState, useEffect } from 'react';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    updateProfile,
    sendPasswordResetEmail
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfUse } from './TermsOfUse';
import { CookiePolicy } from './CookiePolicy';
import { CrisisSupport } from './CrisisSupport';
import { auth, googleProvider, functions } from '../firebaseConfig';
import femVideo from './fem.mp4'; 
import '../LandingPage.css';

// --- ICONS ---
const IconGoogle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const IconEye = ({ visible, onClick }) => (
    <div onClick={onClick} style={{cursor:'pointer', color:'#9ca3af', display:'flex', alignItems:'center'}}>
        {visible ? (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
        ) : (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        )}
    </div>
);

// --- SOCIAL ICONS ---
const Socials = {
    Twitter: () => <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>,
    Instagram: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
    Github: () => <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>,
    Youtube: () => <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    Discord: () => <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/></svg>
};

export default function User({ onClose, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  // Form Data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Page Viewer State
  const [viewPage, setViewPage] = useState(null);

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
        if (mode === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
        } else if (mode === 'register') {
            if (!agreed) throw new Error("You must agree to the Terms of Service.");
            const res = await createUserWithEmailAndPassword(auth, email, password);
            if (name) await updateProfile(res.user, { displayName: name });
            window.location.reload(); 
        } else if (mode === 'forgot') {
            await sendPasswordResetEmail(auth, email);
            setSuccessMsg("Reset link sent to your email.");
            setLoading(false);
            return;
        }
    } catch (err) {
        let msg = "Authentication failed.";
        if (err.message.includes("agree")) msg = err.message;
        else if (err.code === 'auth/email-already-in-use') msg = "This email is already registered.";
        else if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
        else if (err.code === 'auth/user-not-found') msg = "No account found with this email.";
        else if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
        else if (err.code === 'auth/invalid-email') msg = "Please enter a valid email address.";
        setError(msg);
    } finally {
        if (mode !== 'forgot') setLoading(false);
    }
  };

  return (
    <div className="auth-fullscreen-container">
        
        {/* GLOBAL CLOSE BUTTON - FIXED Position */}
        <button className="auth-global-close" onClick={onClose} title="Close">
            &times;
        </button>

        {/* PAGE CONTENT WRAPPER */}
        <div className="auth-page-content">
            
            {/* 1. SPLIT VIEW SECTION (Video + Form) */}
            <div className="auth-split-section">
                
                {/* LEFT PANEL: VIDEO */}
                <div className="auth-left-panel">
                    <video 
                        src={femVideo} 
                        autoPlay 
                        muted 
                        loop 
                        playsInline 
                        className="auth-video-bg"
                    />
                </div>

                {/* RIGHT PANEL: FORM */}
                <div className="auth-right-panel">
                    <div className="auth-form-wrapper">
                        {/* KIN7 LOGO */}
                        <div className="auth-logo-header">
                            K i n<span style={{fontWeight:'300'}}> 7</span>
                        </div>

                        {mode !== 'forgot' && (
                            <>
                                <div className="auth-social-section">
                                    <label>Express login via Google</label>
                                    <button onClick={handleGoogle} className="btn-google-express">
                                        <span>Google</span>
                                        <IconGoogle />
                                    </button>
                                </div>

                                <div className="auth-divider">
                                    <span>OR</span>
                                </div>
                            </>
                        )}

                        {/* TABS */}
                        {mode !== 'forgot' && (
                            <div className="auth-tabs">
                                <div 
                                    className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                                    onClick={() => { setMode('login'); setError(''); }}
                                >
                                    Log in
                                </div>
                                <div 
                                    className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                                    onClick={() => { setMode('register'); setError(''); }}
                                >
                                    Sign up
                                </div>
                            </div>
                        )}

                        {mode === 'forgot' && (
                            <div className="auth-header-forgot">
                                <h2>Reset Password</h2>
                                <p onClick={() => setMode('login')}>&larr; Back to login</p>
                            </div>
                        )}

                        {error && <div className="auth-error-banner">{error}</div>}
                        {successMsg && <div className="auth-success-banner">{successMsg}</div>}

                        <form onSubmit={handleSubmit} className="auth-main-form">
                            {mode === 'register' && (
                                <div className="auth-input-group">
                                    <input 
                                        type="text" 
                                        placeholder="Full Name"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <div className="auth-input-group">
                                <input 
                                    type="email" 
                                    placeholder={mode === 'register' ? "Email address" : "Email or username"}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {mode !== 'forgot' && (
                                <div className="auth-input-group">
                                    <input 
                                        type={showPass ? "text" : "password"} 
                                        placeholder="Password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                    <div className="auth-pass-toggle">
                                        <IconEye visible={showPass} onClick={() => setShowPass(!showPass)} />
                                    </div>
                                </div>
                            )}

                            {mode === 'register' && (
                                <div className="auth-terms-check">
                                    <input 
                                        type="checkbox" 
                                        id="terms" 
                                        checked={agreed} 
                                        onChange={e => setAgreed(e.target.checked)} 
                                    />
                                    <label htmlFor="terms">
                                        I agree to the{' '}
                                        <span onClick={() => setViewPage('terms_of_use')}>Terms of Service</span>
                                        {' '}and{' '}
                                        <span onClick={() => setViewPage('privacy_policy')}>Privacy Policy</span>
                                    </label>
                                </div>
                            )}

                            <button type="submit" className="btn-auth-submit" disabled={loading}>
                                {loading ? "Processing..." : (mode === 'login' ? "Log in" : (mode === 'register' ? "Sign up" : "Send Reset Link"))}
                            </button>
                        </form>

                        {mode === 'login' && (
                            <div className="auth-footer-link">
                                <span onClick={() => setMode('forgot')}>Forgot password?</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. BIG ARTISTIC FOOTER (Correct Spacing + Icon Alignment) */}
            <div className="auth-footer-artistic" style={{ padding: '60px 40px 20px 40px' }}>
                <div className="footer-blur-blob"></div>
                <div className="afa-container">
                    <div className="afa-top">
                        {/* REMOVED SPACES HERE to fix mobile spacing issue, controlled by CSS now */}
                        <span className="afa-logo">K I N 7</span>
                    </div>
                    {/* Aligned Icons to Top of Text Row */}
                    <div className="afa-bottom" style={{ alignItems: 'flex-start' }}>
                        <div className="afa-left">
                            <p className="copyright-text">© 2025 Kin7, Inc. All rights reserved.</p>
                            <p className="trademark-text">AI Voice Intelligence tailored for emotional clarity.</p>
                            <div className="afa-links">
                                <span onClick={() => setViewPage('terms_of_use')}>Terms of Service</span>
                                <span onClick={() => setViewPage('privacy_policy')}>Privacy Policy</span>
                            </div>
                        </div>
                        <div className="afa-right">
                            <div className="afa-socials">
                                <a href="#" title="Youtube"><Socials.Youtube/></a>
                                <a href="#" title="Twitter"><Socials.Twitter/></a>
                                <a href="#" title="Instagram"><Socials.Instagram/></a>
                                <a href="#" title="Github"><Socials.Github/></a>
                                <a href="#" title="Discord"><Socials.Discord/></a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        {/* Page Viewer for Terms/Privacy */}
        {viewPage && <PageViewerModal pageId={viewPage} onClose={() => setViewPage(null)} />}
    </div>
  );
}

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