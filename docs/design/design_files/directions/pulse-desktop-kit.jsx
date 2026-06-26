// Pulse — shared Desktop chrome. Sidebar (nav + budget + user) + topbar.
// Theme-aware. Screens pass their active nav id, title/subtitle, topbar
// actions, and body. Keeps every desktop screen visually consistent.
// window.PulseDesktopShell + a few small topbar helpers.

window.PulseDesktopShell = function PulseDesktopShell({ theme = 'dark', active = 'Dashboard', title, subtitle, actions, children, height = 1090, contentStyle }) {
  const P = window.makePulse(theme), G = window.GAST;
  const usd = (n, d = 2) => P.usd(n, d);
  const budgetLeft = G.budget - G.thisMonth;

  const navItems = [
    { i: '◧', label: 'Dashboard' },
    { i: '≣', label: 'Expenses' },
    { i: '◍', label: 'Categories' },
    { i: '◔', label: 'Reports' },
    { i: '⚙', label: 'Settings' },
  ];

  return (
    <div style={{ width: 1440, height, background: P.bg, color: P.text, fontFamily: P.font, display: 'flex', overflow: 'hidden', position: 'relative' }}>
      {/* ambient glow */}
      <div style={{ position: 'absolute', top: -140, right: 80, width: 420, height: 420, background: `radial-gradient(circle, ${P.glowA}, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      {/* sidebar */}
      <aside style={{ width: 248, flexShrink: 0, borderRight: `1px solid ${P.stroke}`, background: P.light ? '#ffffff' : 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', padding: '26px 18px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 8px 4px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: `linear-gradient(135deg, ${P.v1}, ${P.v2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, color: '#fff' }}>P</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Pulse</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 28 }}>
          {navItems.map((n, i) => {
            const on = n.label === active;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 12,
                fontSize: 14, fontWeight: on ? 600 : 500,
                color: on ? (P.light ? P.v1 : '#fff') : P.dim,
                background: on ? (P.light ? P.catSoft(265) : 'rgba(255,255,255,0.06)') : 'transparent',
                border: `1px solid ${on && !P.light ? P.stroke : 'transparent'}`,
              }}>
                <span style={{ fontSize: 17, width: 20, textAlign: 'center', color: on ? P.v2 : P.dim }}>{n.i}</span>
                {n.label}
              </div>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={P.card({ padding: '14px 15px', borderRadius: 18, marginBottom: 12 })}>
          <div style={{ fontSize: 11.5, color: P.dim }}>Budget left</div>
          <div style={{ fontSize: 19, fontWeight: 700, marginTop: 3 }}>${usd(budgetLeft, 0)}</div>
          <div style={{ height: 5, background: P.track, borderRadius: 3, marginTop: 9, overflow: 'hidden' }}>
            <div style={{ width: `${(G.thisMonth / G.budget) * 100}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${P.v1}, ${P.v2})` }} />
          </div>
          <div style={{ fontSize: 10.5, color: P.faint, marginTop: 7 }}>${usd(G.thisMonth, 0)} of ${usd(G.budget, 0)}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 8px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: P.catSoft(265), color: P.catTint(265), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{G.user[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{G.user} Bianchi</div>
            <div style={{ fontSize: 11.5, color: P.dim }}>Pro plan</div>
          </div>
          <span style={{ color: P.dim, fontSize: 15 }}>⌄</span>
        </div>
      </aside>

      {/* main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px 18px', borderBottom: `1px solid ${P.stroke}` }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{title}</h1>
            {subtitle && <div style={{ fontSize: 13, color: P.dim, marginTop: 3 }}>{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{actions}</div>
        </div>

        <div style={Object.assign({ flex: 1, overflow: 'hidden', padding: '22px 32px 28px' }, contentStyle)}>
          {children}
        </div>
      </main>
    </div>
  );
};

// Topbar action helpers (shared look) ───────────────────────────
window.PulseDeskChip = function PulseDeskChip({ theme, children, width }) {
  const P = window.makePulse(theme);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 14px', borderRadius: 12, background: P.glass, border: `1px solid ${P.stroke}`, boxShadow: P.cardShadow, color: P.dim, fontSize: 13.5, fontWeight: 500, width }}>
      {children}
    </div>
  );
};
window.PulseDeskPrimary = function PulseDeskPrimary({ theme, children }) {
  const P = window.makePulse(theme);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 18px', borderRadius: 12, background: `linear-gradient(135deg, ${P.v1}, ${P.v2})`, color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: `0 8px 20px ${P.v1}44` }}>
      {children}
    </div>
  );
};
