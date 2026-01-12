import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from './firebaseConfig';

// --- NEW IMPORTS FOR LOTTIE ---
import Lottie from 'lottie-react';
import loadingAnimation from './loading.json'; 

// 1. Import Global Styles (Fonts, Reset, Variables)
import './App.css'; 

// 2. Components
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import Dashboard from './components/Dashboard'; 
import AdminLogin from './components/AdminLogin';
import User from './components/User'; // Unified Login/Register Modal

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  
  // Auth Modal State (Controls the User.jsx overlay)
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- PASSWORD RESET STATE ---
  const [resetCode, setResetCode] = useState(null);

  // Strict Path Check
  const isAdminPath = window.location.pathname.startsWith('/admin');

  // 1. CHECK URL FOR RESET CODE (RUNS ONCE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    
    // If the URL contains reset params, capture the code
    if (mode === 'resetPassword' && oobCode) {
        setResetCode(oobCode);
    }
  }, []);

  // 2. AUTH LISTENER
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setAuthChecking(true);
      
      if (u) {
          try {
            // --- CRITICAL: Force Token Refresh to get latest Claims ---
            const tokenResult = await u.getIdTokenResult(true);
            const isAdmin = !!tokenResult.claims.admin;
            const isBanned = tokenResult.claims.banned === true;

            if (isBanned) {
                await signOut(auth);
                alert("Your account has been suspended.");
                setUser(null);
            } else {
                // Attach custom admin flag to user object for easy access
                u.isAdmin = isAdmin;
                setUser(u);
            }
          } catch (e) {
            console.error("Claims Check Failed:", e);
            setUser(u); // Fallback: Log them in, dashboard will handle restriction
          }
      } else {
          setUser(null);
      }
      
      setAuthChecking(false);
      
      // Artificial Delay for Animation smoothness (optional)
      setTimeout(() => setLoading(false), 2000); 
    });

    return () => unsub();
  }, []);

  // --- LOADING SCREEN (CENTERED) ---
  if (loading || authChecking) {
      return (
          <div style={{
              position: 'fixed',
              top: 0, left: 0,
              width: '100vw', height: '100vh',
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              background: '#ffffff',
              zIndex: 99999
          }}>
              <div style={{ width: '150px', height: '150px' }}>
                  <Lottie animationData={loadingAnimation} loop={true} />
              </div>
          </div>
      );
  }

  // --- MAINTENANCE MODE ---
  if (maintenance && !isAdminPath) {
      return (
          <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#000', color:'#fff'}}>
              <h1>System Under Maintenance</h1>
          </div>
      );
  }

  // --- [NEW] PASSWORD RESET FLOW (INTERCEPT) ---
  // If we found a reset code in the URL, show this INSTEAD of the dashboard
  if (resetCode) {
      return (
          <PasswordResetFlow 
              oobCode={resetCode} 
              onCancel={() => { 
                  setResetCode(null); 
                  window.history.replaceState(null, '', window.location.pathname); // Clean URL
                  window.location.href = '/'; 
              }} 
          />
      );
  }

  // --- ADMIN ROUTING (STRICT) ---
  if (isAdminPath) {
      if (!user) return <AdminLogin onLoginSuccess={() => window.location.reload()} />;
      
      // DOUBLE CHECK: Explicit Admin Flag
      if (user.isAdmin !== true) {
          return (
              <div style={{
                  height:'100vh', 
                  display:'flex', 
                  alignItems:'center', 
                  justifyContent:'center', 
                  flexDirection:'column', 
                  background:'#09090b', 
                  color:'white'
              }}>
                  <h1 style={{fontSize:'2rem', marginBottom:'10px'}}>403 Forbidden</h1>
                  <p style={{color:'#a1a1aa', marginBottom:'20px'}}>Your account does not have administrative privileges.</p>
                  <button className="btn-secondary" onClick={() => window.location.href = '/'}>Return Home</button>
              </div>
          );
      }
      return <AdminDashboard />;
  }

  // --- USER ROUTING ---
  if (!user) {
      return (
          <>
            {/* Pass onAuth to LandingPage so buttons trigger the modal */}
            <LandingPage onAuth={() => setShowAuthModal(true)} />
            
            {/* Conditionally render the Unified Auth Modal */}
            {showAuthModal && <User onClose={() => setShowAuthModal(false)} />}
          </>
      );
  }
  
  // If Logged In -> Dashboard
  return <Dashboard user={user} onLogout={() => signOut(auth)} />;
}

/* ==================================================================================
   [NEW COMPONENT] PASSWORD RESET FLOW (RESPONSIVE + VERIFICATION CHECK)
   ================================================================================== */
const PasswordResetFlow = ({ oobCode, onCancel }) => {
    // STATUS: 'verifying' -> 'valid' | 'invalid' -> 'success'
    const [status, setStatus] = useState('verifying'); 
    const [newPass, setNewPass] = useState("");
    const [loading, setLoading] = useState(false);

    // --- STEP 1: VERIFY LINK ON LOAD ---
    useEffect(() => {
        const verifyLink = async () => {
            try {
                await verifyPasswordResetCode(auth, oobCode);
                setStatus('valid');
            } catch (error) {
                console.error("Invalid or expired link", error);
                setStatus('invalid');
            }
        };
        verifyLink();
    }, [oobCode]);

    const handleReset = async (e) => {
        e.preventDefault();
        if (newPass.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }
        setLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode, newPass);
            setStatus('success');
            setTimeout(() => {
                // Clear query params and go home
                window.location.href = "/"; 
            }, 3000);
        } catch(err) {
            alert("Error: " + err.message);
            setLoading(false);
        }
    };

    // --- RENDER: VERIFYING ---
    if (status === 'verifying') {
        return (
            <div style={{
                height:'100vh', width:'100vw', display:'flex', justifyContent:'center', alignItems:'center', 
                background:'#f8fafc'
            }}>
                <div style={{color:'#64748b'}}>Verifying secure link...</div>
            </div>
        );
    }

    // --- RENDER: INVALID / EXPIRED ---
    if (status === 'invalid') {
        return (
            <div style={{
                height:'100vh', width:'100vw', display:'flex', justifyContent:'center', alignItems:'center', 
                background:'#f8fafc', padding: '20px'
            }}>
                <div style={{
                    background:'white', padding:'40px', borderRadius:'24px', 
                    textAlign:'center', maxWidth:'400px', width:'100%',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{
                        width:'64px', height:'64px', background:'#FEF2F2', borderRadius:'50%', 
                        display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px auto',
                        color:'#EF4444'
                    }}>
                        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <h2 style={{color:'#0f172a', marginBottom:'10px', fontSize:'1.5rem', fontWeight:'700'}}>Link Expired</h2>
                    <p style={{color:'#64748b', marginBottom:'24px'}}>This password reset link has already been used or is invalid. Please request a new one.</p>
                    <button onClick={onCancel} style={{
                        width:'100%', padding:'14px', background:'#0f172a', color:'white', 
                        borderRadius:'12px', border:'none', fontWeight:'600', cursor:'pointer', fontSize:'1rem'
                    }}>
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    // --- RENDER: SUCCESS ---
    if (status === 'success') {
        return (
            <div style={{
                height:'100vh', width:'100vw', display:'flex', justifyContent:'center', alignItems:'center', 
                background:'#f8fafc', padding: '20px'
            }}>
                <div style={{
                    background:'white', padding:'40px', borderRadius:'24px', 
                    textAlign:'center', maxWidth:'400px', width:'100%',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{
                        width:'64px', height:'64px', background:'#ECFDF5', borderRadius:'50%', 
                        display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px auto',
                        color:'#10B981'
                    }}>
                        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <h2 style={{color:'#0f172a', marginBottom:'10px', fontSize:'1.5rem', fontWeight:'700'}}>Success!</h2>
                    <p style={{color:'#64748b', marginBottom:'20px'}}>Your password has been updated successfully.</p>
                    <p style={{fontSize:'0.9rem', color:'#94a3b8'}}>Redirecting to login...</p>
                </div>
            </div>
        );
    }

    // --- RENDER: FORM (VALID LINK) ---
    return (
        <div style={{
            height:'100vh', width:'100vw',
            display:'flex', justifyContent:'center', alignItems:'center', 
            background:'#f8fafc', // Light modern background
            fontFamily:'sans-serif',
            padding: '20px' // Padding for mobile
        }}>
            <div style={{
                background:'white', 
                padding:'40px', 
                borderRadius:'24px', 
                width:'100%', 
                maxWidth:'420px', // Slightly wider for web comfort
                boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.02)'
            }}>
                <div style={{textAlign:'center', marginBottom:'30px'}}>
                    <div style={{
                        width:'50px', height:'50px', background:'#EFF6FF', borderRadius:'12px',
                        display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:'16px',
                        color:'#2563EB'
                    }}>
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                    </div>
                    <h2 style={{margin:0, color:'#0f172a', fontSize:'1.5rem', fontWeight:'700'}}>Reset Password</h2>
                    <p style={{marginTop:'8px', color:'#64748b', fontSize:'0.95rem'}}>
                        Choose a new password for your account.
                    </p>
                </div>
                
                <form onSubmit={handleReset}>
                    <div style={{marginBottom:'24px'}}>
                        <label style={{display:'block', marginBottom:'8px', color:'#334155', fontSize:'0.9rem', fontWeight:'600'}}>New Password</label>
                        <input 
                            type="password" 
                            placeholder="Min. 6 characters" 
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            style={{
                                width:'100%', padding:'14px', borderRadius:'12px', 
                                border:'1px solid #e2e8f0', fontSize:'1rem', outline:'none',
                                color: '#0f172a', background: '#ffffff',
                                transition: 'border-color 0.2s',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            required 
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{
                            width:'100%', padding:'14px', background:'#0f172a', color:'white', 
                            borderRadius:'12px', border:'none', fontWeight:'600', cursor:'pointer', fontSize:'1rem',
                            opacity: loading ? 0.7 : 1, transition: '0.2s',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
                        }}
                    >
                        {loading ? "Updating..." : "Update Password"}
                    </button>
                </form>
                <button 
                    onClick={onCancel} 
                    style={{
                        marginTop:'20px', background:'none', border:'none', 
                        color:'#64748b', cursor:'pointer', width:'100%', 
                        fontSize:'0.9rem', fontWeight:'500',
                        padding: '8px', borderRadius: '8px'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};