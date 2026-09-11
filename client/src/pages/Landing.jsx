import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function goHome(e) {
    e.preventDefault();
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="home-page" id="top">
      <nav className={`home-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="home-nav-brand">
          <BrandMark />
          <span>ReturnShield <span style={{ color: 'var(--teal)' }}>AI</span></span>
        </div>

        <div className="home-nav-links">
          <a href="#top" onClick={goHome}>Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#stats">Why Us</a>
        </div>

        <div className="home-nav-actions">
          <button type="button" className="btn-ghost nav-outline-btn" onClick={() => navigate('/signup')}>Sign Up</button>
          <button type="button" className="btn-primary home-nav-cta" onClick={() => navigate('/login')}>Sign In</button>
        </div>

        <button
          type="button"
          className="home-nav-toggle"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </nav>

      <div className={`home-mobile-menu${menuOpen ? ' open' : ''}`}>
        <a href="#top" onClick={goHome}>Home</a>
        <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
        <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
        <a href="#stats" onClick={() => setMenuOpen(false)}>Why Us</a>
        <button type="button" className="btn-ghost" onClick={() => { setMenuOpen(false); navigate('/signup'); }}>Sign Up</button>
        <button type="button" className="btn-primary" onClick={() => { setMenuOpen(false); navigate('/login'); }}>Sign In</button>
      </div>

      {/* HERO */}
      <div className="home-hero">
        <div className="home-hero-content">
          <div className="home-hero-badge">AI-Powered Return Protection</div>
          <h1>Smart returns.<br /><span className="hero-accent">Safer commerce.</span></h1>
          <p>
            ReturnShield AI analyzes every return claim in real time — detecting fraud, assessing risk,
            and protecting your bottom line while giving honest customers a frictionless experience.
          </p>
          <div className="home-hero-buttons">
            <button type="button" className="btn-primary btn-hero-primary" onClick={() => navigate('/signup')}>Get Started Free</button>
            <a href="#how-it-works" className="btn-ghost">See How It Works</a>
          </div>
          <div className="home-hero-trust">
            <div className="trust-item">
              <CheckIcon />
              <span>No setup fees</span>
            </div>
            <div className="trust-item">
              <CheckIcon />
              <span>Real-time risk scoring</span>
            </div>
            <div className="trust-item">
              <CheckIcon />
              <span>Trusted by 500+ retailers</span>
            </div>
          </div>
        </div>

        <div className="home-hero-visual">
          <div className="hero-dashboard-card">
            <div className="hero-dash-header">
              <div className="hero-dash-dots"><span /><span /><span /></div>
              <span className="hero-dash-title">ReturnShield Dashboard</span>
            </div>
            <div className="hero-dash-body">
              <div className="hero-dash-stat">
                <span className="hero-dash-label">Total Returns</span>
                <span className="hero-dash-value">142</span>
              </div>
              <div className="hero-dash-stat">
                <span className="hero-dash-label">Fraud Detected</span>
                <span className="hero-dash-value" style={{ color: 'var(--error)' }}>7</span>
              </div>
              <div className="hero-dash-stat">
                <span className="hero-dash-label">Auto-Approved</span>
                <span className="hero-dash-value" style={{ color: 'var(--success)' }}>98</span>
              </div>
              <div className="hero-risk-row">
                <div className="hero-risk-info">
                  <span>RET-10215 — Boat Speaker</span>
                  <span className="risk-badge risk-error">High Risk</span>
                </div>
                <div className="hero-risk-bar"><div className="hero-risk-fill" style={{ width: '88%', background: 'var(--error)' }} /></div>
              </div>
              <div className="hero-risk-row">
                <div className="hero-risk-info">
                  <span>RET-10210 — Nike Air Force 1</span>
                  <span className="risk-badge risk-warning">Medium Risk</span>
                </div>
                <div className="hero-risk-bar"><div className="hero-risk-fill" style={{ width: '52%', background: 'var(--warning)' }} /></div>
              </div>
              <div className="hero-risk-row">
                <div className="hero-risk-info">
                  <span>RET-10198 — Logitech Mouse</span>
                  <span className="risk-badge risk-success">Low Risk</span>
                </div>
                <div className="hero-risk-bar"><div className="hero-risk-fill" style={{ width: '18%', background: 'var(--success)' }} /></div>
              </div>
            </div>
          </div>
          <div className="hero-floating-card hero-floating-1">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L4 6 L4 12 C4 17 12 22 12 22 C12 22 20 17 20 12 L20 6 Z" />
              <path d="M9 12 L11 14 L15 10" />
            </svg>
            <div><strong>Fraud Blocked</strong><span>₹12,400 saved</span></div>
          </div>
          <div className="hero-floating-card hero-floating-2">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13 L9 17 L19 7" />
            </svg>
            <div><strong>Auto-Approved</strong><span>Refund in 2 mins</span></div>
          </div>
        </div>
      </div>

      {/* LOGO STRIP */}
      <div className="home-logo-strip">
        <p>Trusted by leading retailers across India</p>
        <div className="home-logos">
          <span>ShopMart</span><span>RetailHub</span><span>TrendKart</span><span>BazaarLive</span><span>MegaStore</span>
        </div>
      </div>

      {/* SHOWCASE */}
      <div className="home-showcase">
        <img
          src="https://images.pexels.com/photos/6169055/pexels-photo-6169055.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Packages ready for shipping at warehouse"
        />
        <div className="home-showcase-overlay">
          <span className="home-section-tag">Built for Modern Retail</span>
          <h2>From claim to resolution in minutes</h2>
          <p>ReturnShield AI streamlines the entire return lifecycle — so your customers get instant refunds and you get protection from fraud.</p>
        </div>
      </div>

      {/* FEATURES */}
      <div className="home-section" id="features">
        <div className="home-section-header">
          <span className="home-section-tag">Features</span>
          <h2>Everything you need to manage returns intelligently</h2>
          <p>From AI risk scoring to automated refunds, ReturnShield handles the entire return lifecycle so you can focus on growth.</p>
        </div>
        <div className="home-features-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div
                className={`feature-icon ${f.iconClass}`}
                style={f.iconStyle || undefined}
              >{f.icon}</div>
              <div className="feature-image">
                <img src={f.image} alt={f.alt} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="home-section home-how-section" id="how-it-works">
        <div className="home-section-header">
          <span className="home-section-tag">How It Works</span>
          <h2>Three steps to smarter returns</h2>
          <p>From claim to resolution in minutes — not days.</p>
        </div>
        <div className="home-steps">
          {STEPS.map((s, i) => (
            <div key={s.title} style={{ display: 'contents' }}>
              <div className="home-step">
                <div className="home-step-image">
                  <img src={s.image} alt={s.alt} />
                </div>
                <div className="home-step-number">{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
              {i < STEPS.length - 1 ? <div className="home-step-connector" /> : null}
            </div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="home-section home-stats-section" id="stats">
        <div className="home-section-header">
          <span className="home-section-tag">Why ReturnShield</span>
          <h2>The numbers speak for themselves</h2>
        </div>
        <div className="home-stats-grid">
          {[
            ['94%', 'Fraud detection accuracy'],
            ['2 min', 'Average auto-approval time'],
            ['₹4.8Cr+', 'Fraud losses prevented'],
            ['500+', 'Retailers protected']
          ].map(([v, l]) => (
            <div className="home-stat" key={l}>
              <span className="home-stat-value">{v}</span>
              <span className="home-stat-label">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="home-footer">
        <div className="home-footer-content">
          <div className="home-footer-brand">
            <div className="home-nav-brand">
              <BrandMark size={32} />
              <span>ReturnShield <span style={{ color: 'var(--teal)' }}>AI</span></span>
            </div>
            <p>AI-powered return risk assessment for safer online retail.</p>
          </div>
          <div className="home-footer-links">
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#top" onClick={goHome}>Home</a>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#stats">Why Us</a>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <Link to="/signup">Sign Up</Link>
              <Link to="/login">Sign In</Link>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#top">Privacy Policy</a>
              <a href="#top">Terms of Service</a>
              <a href="#top">Security</a>
            </div>
          </div>
        </div>
        <div className="home-footer-bottom">
          <p>© 2026 ReturnShield AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function BrandMark({ size = 36 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="40" height="40" rx="10" fill="#0D2B4E" />
      <path d="M16 20 L24 28 L32 20" stroke="#14B8A6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 12 L24 28" stroke="#14B8A6" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 36 L36 36" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13 L9 17 L19 7" />
    </svg>
  );
}

const FEATURES = [
  {
    title: 'AI Risk Scoring',
    text: 'Every return claim is analyzed in real time using machine learning models trained on millions of return patterns.',
    iconClass: 'teal',
    image: 'https://images.pexels.com/photos/577210/pexels-photo-577210.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    alt: 'AI data analytics dashboard',
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 L4 6 L4 12 C4 17 12 22 12 22 C12 22 20 17 20 12 L20 6 Z" />
        <path d="M9 12 L11 14 L15 10" />
      </svg>
    )
  },
  {
    title: 'Instant Refunds',
    text: 'Low-risk claims are auto-approved and refunded within minutes, delighting honest customers with zero friction.',
    iconClass: 'navy',
    image: 'https://images.pexels.com/photos/34577/pexels-photo.jpg?auto=compress&cs=tinysrgb&h=400&w=600',
    alt: 'Online payment with credit card',
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7 L12 12 L16 14" />
      </svg>
    )
  },
  {
    title: 'Evidence Verification',
    text: 'Customers upload photos of damaged or wrong items. Our AI validates the evidence before approval.',
    iconClass: 'green',
    image: 'https://images.pexels.com/photos/6170188/pexels-photo-6170188.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    alt: 'Sorting parcels in logistics office',
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7 L12 3 L21 7 L21 17 L12 21 L3 17 Z" />
        <path d="M3 7 L12 11 L21 7" />
        <path d="M12 11 L12 21" />
      </svg>
    )
  },
  {
    title: 'Fraud Detection',
    text: 'Detect serial returners, fake claims, and policy abuse before they cost you money — with 94% accuracy.',
    iconClass: '',
    iconStyle: { background: 'var(--error-soft)', color: 'var(--error)' },
    image: 'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    alt: 'Financial data bar chart',
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 L2 22 L22 22 Z" />
        <path d="M12 9 L12 15" />
        <path d="M12 18 L12 18.5" />
      </svg>
    )
  },
  {
    title: 'Pickup Management',
    text: 'Assign and track return pickups with delivery partners. Real-time status updates from doorstep to warehouse.',
    iconClass: 'navy',
    image: 'https://images.pexels.com/photos/4391470/pexels-photo-4391470.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    alt: 'Delivery van loaded with boxes',
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 3 L15 3 L15 13 L1 13 Z" />
        <path d="M15 7 L20 7 L23 10 L23 13 L15 13" />
        <circle cx="5.5" cy="17.5" r="2.5" />
        <circle cx="18.5" cy="17.5" r="2.5" />
      </svg>
    )
  },
  {
    title: 'Analytics Dashboard',
    text: 'Track return rates, refund amounts, fraud trends, and processing times — all in one intuitive dashboard.',
    iconClass: 'teal',
    image: 'https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    alt: 'Analytics dashboard on tablet',
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3 L21 3 L21 21 L3 21 Z" />
        <path d="M7 17 L7 10" />
        <path d="M12 17 L12 7" />
        <path d="M17 17 L17 13" />
      </svg>
    )
  }
];

const STEPS = [
  {
    title: 'Customer Files Claim',
    text: 'The customer selects their order, picks a reason, uploads evidence photos, and describes the issue — all in a guided flow.',
    image: 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
    alt: 'Customer shopping online'
  },
  {
    title: 'AI Assesses Risk',
    text: 'ReturnShield AI analyzes the claim — checking customer history, evidence authenticity, and fraud signals — in seconds.',
    image: 'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
    alt: 'Business analyst reviewing data'
  },
  {
    title: 'Auto-Resolve or Review',
    text: 'Low-risk claims are auto-approved and refunded instantly. High-risk claims are flagged for admin review with full context.',
    image: 'https://images.pexels.com/photos/6169129/pexels-photo-6169129.jpeg?auto=compress&cs=tinysrgb&h=300&w=300',
    alt: 'Courier delivering packages'
  }
];
