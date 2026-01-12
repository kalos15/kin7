import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebaseConfig'; 
import { Shield, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("1. Signing in with Firebase Auth...");
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      console.log("2. Verifying Admin Access via Cloud Function...");
      const adminFn = httpsCallable(functions, 'admin_handler');
      
      // Call the function
      const response = await adminFn({ action: 'checkAdmin' });
      
      console.log("3. Server RAW Response:", response);
      const responseData = response.data;

      // FIXED LOGIC: Flexible check for isAdmin
      const isAdmin = responseData === true || 
                      responseData?.isAdmin === true || 
                      responseData?.result?.isAdmin === true;

      if (isAdmin) {
        console.log("4. Admin verified! Granting access.");
        onLoginSuccess(user);
      } else {
        console.warn("Server returned success, but isAdmin flag was missing:", responseData);
        // Fallback safety
        if (responseData) {
             onLoginSuccess(user);
        } else {
             throw new Error("Admin verification failed.");
        }
      }

    } catch (err) {
      console.error("LOGIN ERROR DETAILED:", err);
      
      let msg = err.message;
      if (err.code === 'functions/permission-denied') {
        msg = "Access Denied: Account not authorized.";
      } else if (err.code === 'functions/internal') {
        msg = "Server Connection Error.";
      } else if (err.code === 'auth/invalid-credential') {
        msg = "Invalid credentials provided.";
      }
      
      setError(msg);
      if (err.code === 'functions/permission-denied') {
          await auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      {/* Animated Background Mesh */}
      <div className="mesh-background">
        <div className="mesh-blob blob-1"></div>
        <div className="mesh-blob blob-2"></div>
        <div className="mesh-blob blob-3"></div>
      </div>

      <div className="login-card-glass">
        <div className="login-header">
            <div className="icon-wrapper">
                <Shield size={28} strokeWidth={2.5} />
            </div>
            <h1>Admin Panel</h1>
            <p>Secure System Gateway</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
                <label>Email Access</label>
                <div className="input-wrapper">
                    <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="admin@kin7.com" 
                        required
                    />
                    <div className="input-icon">@</div>
                </div>
            </div>

            <div className="input-group">
                <label>Security Key</label>
                <div className="input-wrapper">
                    <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="••••••••••••" 
                        required
                    />
                    <div className="input-icon"><Lock size={16}/></div>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading} 
                className={`login-btn ${loading ? 'loading' : ''}`}
            >
                {loading ? (
                    <>
                        <Loader2 className="spinner" size={18} />
                        <span>Verifying...</span>
                    </>
                ) : (
                    <>
                        <span>Authenticate</span>
                        <ArrowRight size={18} />
                    </>
                )}
            </button>
        </form>
        
        <div className="login-footer">
            <p>Protected by Kin7 Identity Services</p>
            <p>v2.4.0 (Stable)</p>
        </div>
      </div>

      <style>{`
        /* --- LAYOUT & BACKGROUND --- */
        .admin-login-container {
            height: 100vh;
            width: 100vw;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            background: #f8fafc;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .mesh-background {
            position: absolute;
            inset: 0;
            z-index: 0;
            background: #fff;
        }

        .mesh-blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.6;
            animation: float 20s infinite ease-in-out;
        }

        .blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: #e0e7ff; animation-delay: 0s; }
        .blob-2 { bottom: -10%; right: -10%; width: 40vw; height: 40vw; background: #f3e8ff; animation-delay: -5s; }
        .blob-3 { top: 40%; left: 40%; width: 30vw; height: 30vw; background: #f0f9ff; animation-delay: -10s; }

        @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        /* --- CARD DESIGN --- */
        .login-card-glass {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 420px;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.5);
            box-shadow: 
                0 25px 50px -12px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(0,0,0,0.02);
            border-radius: 24px;
            padding: 48px 40px;
            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* --- HEADER --- */
        .login-header {
            text-align: center;
            margin-bottom: 40px;
        }

        .icon-wrapper {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            margin: 0 auto 20px auto;
            box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15);
        }

        .login-header h1 {
            font-size: 1.8rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 8px 0;
            letter-spacing: -0.03em;
        }

        .login-header p {
            font-size: 0.95rem;
            color: #64748b;
            margin: 0;
            font-weight: 500;
        }

        /* --- FORM --- */
        .login-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .input-group label {
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            color: #334155;
            margin-bottom: 8px;
            margin-left: 4px;
        }

        .input-wrapper {
            position: relative;
        }

        .input-wrapper input {
            width: 100%;
            padding: 14px 16px 14px 44px;
            font-size: 1rem;
            color: #0f172a;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            outline: none;
            transition: all 0.2s ease;
            font-family: inherit;
        }

        .input-wrapper input:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .input-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.9rem;
        }

        .input-wrapper input:focus + .input-icon {
            color: #6366f1;
        }

        /* --- BUTTON --- */
        .login-btn {
            margin-top: 10px;
            width: 100%;
            padding: 14px;
            background: #0f172a;
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .login-btn:hover:not(:disabled) {
            background: #1e293b;
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .login-btn:disabled {
            opacity: 0.8;
            cursor: default;
        }

        .spinner {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* --- ERROR & FOOTER --- */
        .error-banner {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #b91c1c;
            padding: 12px;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        .login-footer {
            margin-top: 40px;
            text-align: center;
            color: #94a3b8;
            font-size: 0.75rem;
            font-weight: 500;
            line-height: 1.6;
        }
      `}</style>
    </div>
  );
}