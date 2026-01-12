import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfUse } from './TermsOfUse';
import { CookiePolicy } from './CookiePolicy';
import { CrisisSupport } from './CrisisSupport';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import '../LandingPage.css';

// --- VIDEO ASSETS ---
import aiVideo from './ai.mp4';
import maleVideo from './ml.mp4'; 

// --- ICONS ---
const IconShield = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconBrain = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>;
const IconClock = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const IconLock = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>;
const IconCheck = () => <svg width="20" height="20" fill="none" stroke="#10b981" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>;
const IconStar = () => <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;

export default function LandingPage({ onAuth }) {
  const [faq1, setFaq1] = useState(false);
  const [faq2, setFaq2] = useState(false);
  const [faq3, setFaq3] = useState(false);
  const [faq4, setFaq4] = useState(false);
  const [faq5, setFaq5] = useState(false);
  const [faq6, setFaq6] = useState(false);
  
  // PAGE VIEWER STATE
  const [viewPage, setViewPage] = useState(null);
  
  // SCROLL HANDLER
  const scrollToFaq = () => {
    const element = document.getElementById('faq-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-wrapper">
      
      {/* 1. NAVBAR */}
      <nav className="glass-panel" style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 5%', height: '70px', borderBottom: '1px solid rgba(0,0,0,0.03)', background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(16px)' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>
          Kin<span className="text-gradient">7</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onAuth} className="btn-primary">Start Free Session</button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header className="hero-section">
        <video 
            className="hero-video-bg"
            src={aiVideo} 
            autoPlay 
            loop 
            muted 
            playsInline 
        />
        <div className="hero-overlay"></div>

        <motion.div 
            className="hero-content"
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.8 }} 
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '100px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)', color: '#6366f1', marginBottom: '20px', fontSize: '12px', fontWeight: '600', letterSpacing: '0.03em' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1' }}></span>
            AI-POWERED CBT
          </div>
          
          <h1 className="hero-title">
            Talk to someone <br/> who <span className="text-gradient">never judges.</span>
          </h1>
          
          <p className="hero-desc">
            Instant access to a hyper-realistic AI therapist. Voice-to-voice, real-time, and strictly confidential.
          </p>

          <div className="hero-btns">
            <button onClick={onAuth} className="btn-primary">Start Free Session</button>
            <button onClick={scrollToFaq} className="btn-secondary">How it works</button>
          </div>
        </motion.div>
      </header>

      {/* 3. VALUE PROPOSITION */}
      <section className="section-standard">
        <div className="value-grid">
            <div className="value-item">
                <div className="value-icon-box"><IconClock /></div>
                <h3 className="value-title">Always Available</h3>
                <p className="value-desc">Instant support anytime. No appointments.</p>
            </div>
            <div className="value-item">
                <div className="value-icon-box"><IconShield /></div>
                <h3 className="value-title">Judgment-Free</h3>
                <p className="value-desc">Listens with unlimited patience, never judges.</p>
            </div>
            <div className="value-item">
                <div className="value-icon-box"><IconBrain /></div>
                <h3 className="value-title">Real Conversation</h3>
                <p className="value-desc">Natural voice sessions with emotional AI.</p>
            </div>
            <div className="value-item">
                <div className="value-icon-box" style={{color:'#10b981', background:'#ecfdf5'}}><IconLock /></div>
                <h3 className="value-title">Privacy Priority</h3>
                <p className="value-desc">Bank-level encryption. Never stored.</p>
            </div>
        </div>
      </section>

	  
	   {/* 6. FEATURES */}
      <section className="section-standard">
        <div className="section-header">
            <h2 className="section-title">
                Everything you need for <span className="text-gradient">mental clarity.</span>
            </h2>
            <p className="section-desc">Advanced features designed for a seamless therapeutic experience.</p>
        </div>
        
        <div className="features-grid">
            <div className="feature-card">
                <h4 className="feature-title">Real-Time Voice</h4>
                <p className="feature-desc">Speak naturally. The AI responds instantly.</p>
            </div>
            <div className="feature-card">
                <h4 className="feature-title">Hyper-Realistic</h4>
                <p className="feature-desc">Human-like presence that feels familiar.</p>
            </div>
            <div className="feature-card">
                <h4 className="feature-title">Fast Recognition</h4>
                <p className="feature-desc">Accurate capture using leading AI.</p>
            </div>
            <div className="feature-card">
                <h4 className="feature-title">Smart Summaries</h4>
                <p className="feature-desc">Get personalized recaps and advice.</p>
            </div>
            <div className="feature-card">
                <h4 className="feature-title">Totally Secure</h4>
                <p className="feature-desc">No human sees or hears your chats.</p>
            </div>
            <div className="feature-card">
                <h4 className="feature-title">Personalized</h4>
                <p className="feature-desc">AI adapts to your tone over time.</p>
            </div>
        </div>
      </section>

      {/* 5. PRICING */}
      <section className="section-standard">
          <div className="section-header">
              <h2 className="section-title">Simple Pricing</h2>
              <p className="section-desc">Choose the plan that fits your journey.</p>
          </div>
          <div className="pricing-grid">
              <div className="pricing-card">
                  <div className="price-header">
                      <div className="plan-name">Free Starter</div>
                      <div className="plan-price">$0</div>
                      <div className="plan-period">Forever</div>
                  </div>
                  <ul className="feature-list-price">
                      <li className="price-li"> Overage Cost: $1.00/min</li>
                      <li className="price-li"> AI Memory: Session Only</li>
                      <li className="price-li"> Response Speed: Standard Latency</li>
                  </ul>
                  <button onClick={onAuth} className="btn-secondary" style={{width:'100%', marginTop:'auto', fontSize:'0.9rem'}}>Get Started</button>
              </div>

              <div className="pricing-card pro">
                  <div className="price-header">
                      <div className="plan-name">Persona Pro</div>
                      <div className="plan-price">$29<span style={{fontSize:'1rem', fontWeight:'500'}}>/mo</span></div>
                      <div className="plan-period">Billed monthly</div>
                  </div>
                  <ul className="feature-list-price">
                      <li className="price-li"> 50 Minutes Included Monthly</li>
                      <li className="price-li"> GPT-5.2 Cognitive Engine</li>
                      <li className="price-li"> Hyper-Realistic Persona Behavior</li>
                      <li className="price-li"> Premium Voice Engine (v3)</li>
                      <li className="price-li"> Turbo Response Speed</li>
                      <li className="price-li"> Long-Term AI Memory</li>
                      <li className="price-li"> Discounted Overage 30% off</li>
                      <li className="price-li"> Priority 24/7 Support</li>
                  </ul>
                  <button onClick={onAuth} className="btn-primary" style={{width:'100%', marginTop:'auto', justifyContent:'center', fontSize:'0.9rem'}}>Upgrade to Pro</button>
              </div>
          </div>
      </section>

           {/* 4. SCIENCE */}
      <section className="science-section">
        <div className="split-layout">
            <div className="science-content">
                <h2 className="science-title">
                    Built on proven <br/><span className="text-gradient">therapy methods.</span>
                </h2>
                <p className="science-desc">
                    Our AI doesn't just chat; it's trained on principles of Cognitive Behavioral Therapy (CBT) to help you navigate emotions effectively.
                </p>
                <ul className="science-list">
                    <li className="science-item"><IconCheck /> CBT-inspired guidance</li>
                    <li className="science-item"><IconCheck /> Emotional reasoning & empathy</li>
                    <li className="science-item"><IconCheck /> Anxiety & stress reduction tools</li>
                </ul>
            </div>
            
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                 <div className="glow-orb"></div>
                 <div className="listening-card">
                     <div className="avatar-video-circle">
                        <video 
                            src={maleVideo} 
                            autoPlay 
                            muted 
                            loop 
                            playsInline 
                        />
                     </div>
                     <div style={{ marginBottom: '16px' }}>
                        <div className="typing-indicator" style={{ marginBottom: '10px' }}>
                            <span></span><span></span><span></span>
                        </div>
                        <p style={{ fontWeight: '700', color: '#0f172a', fontSize: '1rem' }}>Listening...</p>
                     </div>
                     <div>
                        <small style={{ display: 'block', color: '#64748b', marginBottom: '4px', fontSize: '0.85rem' }}>Meet Your AI Companion</small>
                        <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>Available 24/7. Fully Private.</span>
                     </div>
                 </div>
            </div>
        </div>
      </section>

      {/* 7. TESTIMONIALS */}
      <section className="section-standard" style={{background:'#f8fafc', borderRadius:'24px'}}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>Stories from our community</h2>
        <div className="testimonials-grid">
            <div className="testimonial-card">
                <div className="stars-row">
                    <IconStar/><IconStar/><IconStar/><IconStar/><IconStar/>
                </div>
                <p className="quote-text">"Helped me during 3AM panic attacks when no one else was awake. It's calming to know someone is always there."</p>
                <span className="quote-author">— Maya, 27</span>
            </div>
            <div className="testimonial-card">
                <div className="stars-row">
                    <IconStar/><IconStar/><IconStar/><IconStar/><IconStar/>
                </div>
                <p className="quote-text">"Feels more comfortable than talking to a real person. Zero anxiety about being judged."</p>
                <span className="quote-author">— Daniel, 34</span>
            </div>
            <div className="testimonial-card">
                <div className="stars-row">
                    <IconStar/><IconStar/><IconStar/><IconStar/><IconStar/>
                </div>
                <p className="quote-text">"The avatar is surprisingly natural. It feels like a real connection, but safer."</p>
                <span className="quote-author">— Sofia, 29</span>
            </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section id="faq-section" className="section-standard">
          <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>Frequently Asked Questions</h2>
          <div className="faq-list">
              
              {/* Q1 */}
              <div className="faq-item" onClick={() => setFaq1(!faq1)}>
                  <div className="faq-question">
                      What is Kin7 designed for?
                      <span style={{ color: '#94a3b8' }}>{faq1 ? '−' : '+'}</span>
                  </div>
                  {faq1 && <div className="faq-answer">Kin7 is an AI powered conversational platform designed to provide structured, private, and judgment free support through real time voice interactions. It is intended for reflection, emotional clarity, and guided conversation not for medical or clinical care.</div>}
              </div>

              {/* Q2 */}
              <div className="faq-item" onClick={() => setFaq2(!faq2)}>
                  <div className="faq-question">
                      Is Kin7 a replacement for professional care?
                      <span style={{ color: '#94a3b8' }}>{faq2 ? '−' : '+'}</span>
                  </div>
                  {faq2 && <div className="faq-answer">No. Kin7 is not a replacement for licensed professionals or emergency services. It is a self-guided support experience intended to complement not substitute professional help when needed.</div>}
              </div>

              {/* Q3 */}
              <div className="faq-item" onClick={() => setFaq3(!faq3)}>
                  <div className="faq-question">
                      How does Kin7 handle emergency situations?
                      <span style={{ color: '#94a3b8' }}>{faq3 ? '−' : '+'}</span>
                  </div>
                  {faq3 && <div className="faq-answer">
                      Kin7 is not intended for emergency or crisis situations. If you are experiencing immediate danger or severe distress, please contact local emergency services or refer to our <span onClick={(e) => { e.stopPropagation(); setViewPage('crisis_support'); }} style={{color:'#6366f1', cursor:'pointer', fontWeight:'600', textDecoration:'underline'}}>Crisis Support</span> page for immediate resources and regional assistance.
                  </div>}
              </div>

              {/* Q4 */}
              <div className="faq-item" onClick={() => setFaq4(!faq4)}>
                  <div className="faq-question">
                      Is my voice or conversation data stored?
                      <span style={{ color: '#94a3b8' }}>{faq4 ? '−' : '+'}</span>
                  </div>
                  {faq4 && <div className="faq-answer">No voice, video, or conversation data is stored. Audio is processed in real time to generate responses and is immediately discarded. Kin7 does not retain recordings, transcripts, or session content.</div>}
              </div>

              {/* Q5 */}
              <div className="faq-item" onClick={() => setFaq5(!faq5)}>
                  <div className="faq-question">
                      Can I access or delete my data?
                      <span style={{ color: '#94a3b8' }}>{faq5 ? '−' : '+'}</span>
                  </div>
                  {faq5 && <div className="faq-answer">Yes. Users retain full control over their data. You may review, export, or permanently delete your account and session data at any time from your account settings.</div>}
              </div>

              {/* Q6 */}
              <div className="faq-item" onClick={() => setFaq6(!faq6)}>
                  <div className="faq-question">
                      How is privacy and security handled?
                      <span style={{ color: '#94a3b8' }}>{faq6 ? '−' : '+'}</span>
                  </div>
                  {faq6 && <div className="faq-answer">Kin7 uses industry standard encryption and secure infrastructure to protect all interactions. No human moderators review live sessions, and privacy is enforced by design.</div>}
              </div>

          </div>
      </section>

      {/* 9. CTA */}
      <section className="cta-section">
          <h2 className="cta-title">Ready to talk?</h2>
          <p className="cta-desc">Start your first session in seconds. No credit card required for trial.</p>
          <button onClick={onAuth} className="btn-primary" style={{ padding: '14px 40px', fontSize: '1rem', borderRadius: '12px' }}>Start Free Session</button>
      </section>

      {/* 10. FOOTER - UPDATED WITH CLICK HANDLERS */}
      <footer className="footer-section">
          <div className="footer-links">
              <span className="footer-link" onClick={() => setViewPage('privacy_policy')}>Privacy Policy</span>
              <span className="footer-link" onClick={() => setViewPage('terms_of_use')}>Terms of Use</span>
              <span className="footer-link" onClick={() => setViewPage('cookie_policy')}>Cookie Policy</span>
              <span className="footer-link" onClick={() => setViewPage('crisis_support')}>Crisis Support</span>
          </div>
          <p>&copy; 2025 Kin7 AI. All rights reserved.</p>
      </footer>

      {/* PAGE VIEWER COMPONENT RENDER */}
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