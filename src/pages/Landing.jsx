import React, { useState, useEffect } from 'react';

function Landing({ onRoleSelect, onNavigate }) {
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const toggleFAQ = (index) => setExpandedFAQ(expandedFAQ === index ? null : index);

  const goRegister = (role) => {
    localStorage.setItem('registerRole', role);
    setMobileMenuOpen(false);
    onNavigate && onNavigate('register');
  };

  const goLogin = (role) => {
    if (role) localStorage.setItem('loginRole', role);
    setMobileMenuOpen(false);
    onNavigate && onNavigate('login');
  };

  const handleNavClick = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const capabilities = [
    { k: 'Real-time attendance', d: 'Check-ins update live on your dashboard as guests arrive.' },
    { k: 'QR & pass check-in', d: 'Scan a code or enter a pass ID — registration in seconds.' },
    { k: 'Photos to Google Drive', d: 'Guest photos upload straight into the organiser’s own Drive folder.' },
    { k: 'Email reminders', d: 'Send event details and passes to confirmed attendees in one step.' },
    { k: 'Live analytics', d: 'Attendance rates, guest data and event performance at a glance.' },
    { k: 'Shared gallery', d: 'Everyone relives the event through one organised collection.' }
  ];

  const steps = [
    { t: 'Create the event', d: 'Add date, time, venue and capacity. A unique QR pass is generated instantly.' },
    { t: 'Invite the guests', d: 'Share QR passes and email invites so attendees join in a single tap.' },
    { t: 'Track and capture', d: 'Check guests in live and collect their photos directly to your Drive.' }
  ];

  const faqs = [
    { q: 'How do I create an event?', a: "Sign up as an organiser, choose ‘Create Event’, add the details (date, time, location, capacity), and a unique QR pass is generated for your attendees." },
    { q: 'How do attendees join events?', a: 'Attendees register, find the event, and join using the event pass ID or by scanning its QR code — it takes seconds.' },
    { q: 'Is attendance tracking automatic?', a: 'Yes. When a guest scans the QR code or enters their pass ID at check-in, attendance is recorded in real time.' },
    { q: 'What happens to event photos?', a: "Photos uploaded by guests are sent straight to the organiser’s Google Drive folder and organised into a gallery attendees can view." },
    { q: 'Is my data secure?', a: 'All data is encrypted and securely stored. Attendee information is never shared with third parties.' }
  ];

  return (
    <div className="landing-page">
      <header className={`lp-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-container lp-bar">
          <a href="#top" className="lp-wordmark" onClick={() => handleNavClick('top')}>
            Event<span>Flow</span>
          </a>
          <nav className="lp-nav">
            <a href="#top" onClick={() => handleNavClick('top')}>Home</a>
            <a href="#features" onClick={() => handleNavClick('features')}>Capabilities</a>
            <a href="#process" onClick={() => handleNavClick('process')}>Process</a>
            <a href="#faq" onClick={() => handleNavClick('faq')}>Questions</a>
          </nav>
          <div className="lp-bar-actions">
            <button className="lp-link-btn" onClick={() => goLogin()}>Sign in</button>
            <button className="lp-link-btn" onClick={() => goRegister('attendee')}>Join an event</button>
            <button className="lp-btn lp-btn-solid" onClick={() => goRegister('organizer')}>Get started</button>
            <button
              className={`lp-burger ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <span></span><span></span>
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="lp-sheet" onClick={() => setMobileMenuOpen(false)}>
          <div className="lp-sheet-inner" onClick={(e) => e.stopPropagation()}>
            <a href="#top" onClick={() => handleNavClick('top')}>Home</a>
            <a href="#features" onClick={() => handleNavClick('features')}>Capabilities</a>
            <a href="#process" onClick={() => handleNavClick('process')}>Process</a>
            <a href="#faq" onClick={() => handleNavClick('faq')}>Questions</a>
            <div className="lp-sheet-actions">
              <button className="lp-btn lp-btn-solid" onClick={() => goRegister('organizer')}>Get started</button>
              <button className="lp-btn lp-btn-line" onClick={() => goRegister('attendee')}>Join an event</button>
              <button className="lp-btn lp-btn-line" onClick={() => goLogin('organizer')}>Organizer sign in</button>
              <button className="lp-btn lp-btn-line" onClick={() => goLogin('attendee')}>Attendee sign in</button>
            </div>
          </div>
        </div>
      )}

      <main id="top">
        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-container">
            <div className="lp-hero-grid">
              <div className="lp-hero-main">
                <p className="lp-eyebrow"><span className="lp-idx">01</span> Event management platform</p>
                <h1 className="lp-display">
                  Events, attendance and photos — handled with intent.
                </h1>
                <p className="lp-lead">
                  EventFlow gives organisers a calm, precise way to run an event: real-time
                  check-in, and every guest photo delivered straight to your own Google Drive.
                </p>
                <div className="lp-hero-actions">
                  <button className="lp-btn lp-btn-solid lp-btn-lg" onClick={() => goRegister('organizer')}>
                    Start organising
                  </button>
                  <button className="lp-arrow-btn" onClick={() => goRegister('attendee')}>
                    Join an event <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>

              <aside className="lp-hero-panel">
                <div className="lp-panel-head">
                  <span className="lp-panel-label">At a glance</span>
                  <span className="lp-panel-tag">Platform</span>
                </div>
                <dl>
                  <div className="lp-meta-row">
                    <dt>For</dt>
                    <dd>Organisers &amp; guests</dd>
                  </div>
                  <div className="lp-meta-row">
                    <dt>Check-in</dt>
                    <dd>QR code &amp; pass ID</dd>
                  </div>
                  <div className="lp-meta-row">
                    <dt>Photos</dt>
                    <dd>Direct to Google Drive</dd>
                  </div>
                  <div className="lp-meta-row">
                    <dt>Built for</dt>
                    <dd>Desktop · Tablet · Mobile</dd>
                  </div>
                </dl>
                <div className="lp-panel-foot">
                  <span className="lp-panel-pass">PASS</span>
                  <span className="lp-panel-code">EVF · 7K2Q</span>
                  <span className="lp-panel-qr" aria-hidden="true"></span>
                </div>
              </aside>
            </div>
          </div>

          <div className="lp-container">
            <div className="lp-value-strip">
              <div className="lp-value">
                <span className="lp-value-k">Real-time</span>
                <span className="lp-value-d">Live check-in as guests arrive</span>
              </div>
              <div className="lp-value">
                <span className="lp-value-k">Your Drive</span>
                <span className="lp-value-d">Photos land in your own folder</span>
              </div>
              <div className="lp-value">
                <span className="lp-value-k">Every screen</span>
                <span className="lp-value-d">Desktop, tablet and mobile</span>
              </div>
              <div className="lp-value">
                <span className="lp-value-k">No clutter</span>
                <span className="lp-value-d">One calm, considered workflow</span>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="features" className="lp-section lp-soft">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-eyebrow"><span className="lp-idx">02</span> Capabilities</p>
              <h2 className="lp-h2">Everything an event needs, nothing it doesn’t.</h2>
            </div>

            <div className="lp-cap-list">
              {capabilities.map((c, i) => (
                <div className="lp-cap-row" key={c.k}>
                  <span className="lp-cap-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="lp-cap-title">{c.k}</h3>
                  <p className="lp-cap-desc">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process */}
        <section id="process" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-eyebrow"><span className="lp-idx">03</span> Process</p>
              <h2 className="lp-h2">From first invite to final photo.</h2>
            </div>

            <div className="lp-steps">
              {steps.map((s, i) => (
                <div className="lp-step" key={s.t}>
                  <div className="lp-step-num">{String(i + 1).padStart(2, '0')}</div>
                  <h3 className="lp-step-title">{s.t}</h3>
                  <p className="lp-step-desc">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="lp-section lp-soft">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-eyebrow"><span className="lp-idx">04</span> Questions</p>
              <h2 className="lp-h2">Answers, before you ask.</h2>
            </div>

            <div className="lp-faq">
              {faqs.map((f, i) => (
                <div className={`lp-faq-row ${expandedFAQ === i ? 'open' : ''}`} key={i}>
                  <button className="lp-faq-q" onClick={() => toggleFAQ(i)}>
                    <span>{f.q}</span>
                    <span className="lp-faq-sign">{expandedFAQ === i ? '−' : '+'}</span>
                  </button>
                  <div className="lp-faq-a-wrap" style={{ maxHeight: expandedFAQ === i ? '260px' : '0' }}>
                    <p className="lp-faq-a">{f.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-cta">
          <div className="lp-container">
            <div className="lp-cta-inner">
              <h2 className="lp-cta-title">Host your next event with EventFlow.</h2>
              <p className="lp-cta-desc">Manage RSVPs, attendance and photos in one considered place.</p>
              <div className="lp-cta-actions">
                <button className="lp-btn lp-btn-light lp-btn-lg" onClick={() => goRegister('organizer')}>
                  Create your account
                </button>
                <button className="lp-arrow-btn light" onClick={() => goRegister('attendee')}>
                  Join an event <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="lp-footer">
          <div className="lp-container lp-footer-grid">
            <div className="lp-footer-brand">
              <a href="#top" className="lp-wordmark" onClick={() => handleNavClick('top')}>Event<span>Flow</span></a>
              <p>Event management, attendance tracking and photo galleries — for every screen.</p>
            </div>
            <div className="lp-footer-col">
              <h4>Platform</h4>
              <a href="#features" onClick={() => handleNavClick('features')}>Capabilities</a>
              <a href="#process" onClick={() => handleNavClick('process')}>Process</a>
              <a href="#faq" onClick={() => handleNavClick('faq')}>Questions</a>
            </div>
            <div className="lp-footer-col">
              <h4>Account</h4>
              <a href="#top" onClick={() => goRegister('organizer')}>Get started</a>
              <a href="#top" onClick={() => goRegister('attendee')}>Join an event</a>
              <a href="#top" onClick={() => goLogin('organizer')}>Organizer sign in</a>
              <a href="#top" onClick={() => goLogin('attendee')}>Attendee sign in</a>
            </div>
            <div className="lp-footer-col">
              <h4>Legal</h4>
              <a href="#top" onClick={() => handleNavClick('top')}>Privacy</a>
              <a href="#top" onClick={() => handleNavClick('top')}>Terms</a>
            </div>
          </div>
          <div className="lp-container lp-footer-bottom">
            <span>© 2026 EventFlow</span>
            <span>All rights reserved.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default Landing;
