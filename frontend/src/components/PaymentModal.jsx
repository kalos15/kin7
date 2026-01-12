import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';

export default function PaymentModal({ onClose, userId, isPremium }) {
  const [loading, setLoading] = useState(false);

  // Plans data - Exact text as requested, styled for the new Pro UI
  const plans = [
    { 
        label: "Quick Chat", 
        mins: "1 Minute", 
        price: isPremium ? "$0.70" : "$1.00", 
        id: isPremium ? "pdt_1YFyVRaE0uJScFZO0KffX" : "pdt_c74fHGZjxOdNiJj7sH6AA",
        tag: "Brief Check-in"
    },
    { 
        label: "Brief Spark", 
        mins: "3 Minutes", 
        price: isPremium ? "$2.10" : "$3.00", 
        id: isPremium ? "pdt_a27UokCuhb3XVdHg64F1s" : "pdt_Uax7d9XyeCatIS7XoRkew",
        tag: "Moment of clarity"
    },
    { 
        label: "Thoughtful Pause", 
        mins: "5 Minutes", 
        price: isPremium ? "$3.50" : "$5.00", 
        id: isPremium ? "pdt_VFTtAZcQldRULwwPNcjxL" : "pdt_mpHm9RZmDlJ0wnqp49zYH",
        tag: "Unpack a thought"
    },
    { 
        label: "Dive Deeper", 
        mins: "10 Minutes", 
        price: isPremium ? "$7.00" : "$10.00", 
        id: isPremium ? "pdt_V526bk2eHPpu3UCnblxa3" : "pdt_fL5tifug3sB8mIRa0vYel",
        tag: "Explore feelings"
    },
    { 
        label: "Full Therapy", 
        mins: "30 Minutes", 
        price: isPremium ? "$21.00" : "$30.00", 
        id: isPremium ? "pdt_RSW1JuLDhiGmjxxqbe1QG" : "pdt_DYYQCvpI3Sy1p056D9sKf",
        tag: "Complete Session"
    }
  ];

  const handleBuy = async (productId) => {
    if(!userId) { alert("Error: Missing User ID."); return; }
    setLoading(true);
    try {
        const createPaymentFn = httpsCallable(functions, 'create_payment_link');
        const res = await createPaymentFn({ productId: productId, uid: userId });
        
        if(res.data && res.data.url) {
            window.location.href = res.data.url;
        } else {
            alert("Payment setup failed.");
        }
    } catch(e) {
        alert("Error: " + (e.message || "Unknown error"));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="payment-modal-pro" onClick={e => e.stopPropagation()}>
         <button className="settings-close" onClick={onClose}>×</button>
         
         <div className="pm-header">
             <h2 className="pm-title">Top Up Balance</h2>
             <p className="pm-subtitle">
                 {isPremium ? 'Pro Rates Active (-30%)' : 'Standard Rates'}
             </p>
         </div>

         {loading ? (
             <div style={{padding:'40px', textAlign:'center', color:'#3b82f6', fontWeight:'600'}}>
                 Processing securely...
             </div>
         ) : (
             <div className="pm-list">
                 {plans.map((p, i) => (
                     <div key={i} className="pm-item" onClick={() => handleBuy(p.id)}>
                         <div className="pm-left">
                             <span className="pm-label">{p.label}</span>
                             <span className="pm-tag">{p.tag} • {p.mins}</span>
                         </div>
                         <div className="pm-right">
                             <span className="pm-price">{p.price}</span>
                         </div>
                     </div>
                 ))}
             </div>
         )}
         
         <div className="pm-footer">
             <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
             Secured by Dodo Payments. Instant delivery.
         </div>
      </div>
    </div>
  );
}