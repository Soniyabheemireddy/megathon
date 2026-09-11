export function AuthBrand() {
  return (
    <div className="brand">
      <div className="brand-logo">
        <svg viewBox="0 0 48 48" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#0D2B4E" />
          <path d="M16 20 L24 28 L32 20" stroke="#14B8A6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 12 L24 28" stroke="#14B8A6" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M12 36 L36 36" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="brand-name">ReturnShield <span className="brand-ai">AI</span></span>
      </div>
    </div>
  );
}

export function AuthIllustration() {
  return (
    <div className="login-illustration">
      <div className="illu-card illu-card-1">
        <div className="illu-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7 L12 3 L21 7 L21 17 L12 21 L3 17 Z" />
            <path d="M3 7 L12 11 L21 7" />
            <path d="M12 11 L12 21" />
          </svg>
        </div>
        <span>Package Scanned</span>
        <span className="illu-badge" style={{ color: '#14B8A6' }}>✓ Verified</span>
      </div>
      <div className="illu-card illu-card-2">
        <div className="illu-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#0D2B4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L4 6 L4 12 C4 17 12 22 12 22 C12 22 20 17 20 12 L20 6 Z" />
            <path d="M9 12 L11 14 L15 10" />
          </svg>
        </div>
        <span>Risk Analyzed</span>
        <span className="illu-badge" style={{ color: '#0D2B4E' }}>AI Shield</span>
      </div>
      <div className="illu-card illu-card-3">
        <div className="illu-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7 L12 12 L16 14" />
          </svg>
        </div>
        <span>Fast Refund</span>
        <span className="illu-badge" style={{ color: '#14B8A6' }}>₹ Instant</span>
      </div>
    </div>
  );
}
