// Pulse — Desktop Add Expense. Centered modal dialog over the dimmed dashboard.
function PulseDesktopAdd({ theme = 'dark' }) {
  const P = window.makePulse(theme), G = window.GAST;
  const amount = '48.50';
  const selectedCat = 'Health';
  const field = { background: P.glass, border: `1px solid ${P.stroke}`, borderRadius: 12, padding: '12px 14px', boxShadow: P.cardShadow };

  return (
    <div style={{ width: 1440, height: 1090, position: 'relative', overflow: 'hidden', fontFamily: P.font }}>
      {/* dashboard behind, dimmed + blurred */}
      <div style={{ position: 'absolute', inset: 0, filter: 'blur(3px)', transform: 'scale(1.01)', opacity: 0.6 }}>
        <window.PulseDesktop theme={theme} />
      </div>
      {/* scrim */}
      <div style={{ position: 'absolute', inset: 0, background: P.scrim, backdropFilter: 'blur(2px)' }} />

      {/* modal */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 540, background: P.light ? '#ffffff' : P.bgSoft, color: P.text, border: `1px solid ${P.stroke}`, borderRadius: 24, boxShadow: P.light ? '0 40px 100px rgba(24,26,46,0.28)' : '0 40px 100px rgba(0,0,0,0.6)', padding: '26px 30px 28px', overflow: 'hidden' }}>
        {/* glow accent */}
        <div style={{ position: 'absolute', top: -80, right: -60, width: 220, height: 220, background: `radial-gradient(circle, ${P.glowA}, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>New expense</div>
            <div style={{ fontSize: 12.5, color: P.dim, marginTop: 2 }}>Record a transaction</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: P.glass, border: `1px solid ${P.stroke}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.dim, fontSize: 15 }}>✕</div>
        </div>

        {/* amount */}
        <div style={{ marginTop: 22, padding: '20px 22px', borderRadius: 18, background: P.heroBg, border: `1px solid ${P.stroke}`, textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: 11.5, color: P.dim, letterSpacing: '0.06em', fontWeight: 600 }}>AMOUNT</div>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, lineHeight: 1, background: P.heroText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ${amount}<span style={{ WebkitTextFillColor: P.v2, marginLeft: 2, fontWeight: 300 }}>|</span>
          </div>
        </div>

        {/* category */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: P.dim, marginBottom: 10 }}>Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {G.categories.slice(0, 6).map((c, i) => {
              const on = c.name === selectedCat;
              return (
                <div key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, padding: '9px 14px', borderRadius: 11,
                  background: on ? P.catSoft(c.hue) : P.glass,
                  border: `1px solid ${on ? P.catColor(c.hue) : P.stroke}`,
                  color: on ? P.catTint(c.hue) : P.text,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: P.catColor(c.hue) }} />{c.name}
                </div>
              );
            })}
          </div>
        </div>

        {/* date + note */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12, marginTop: 22 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: P.dim, marginBottom: 8 }}>Date</div>
            <div style={{ ...field, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Today, Jun 20</span>
              <span style={{ color: P.dim, fontSize: 14 }}>▾</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: P.dim, marginBottom: 8 }}>Note</div>
            <div style={{ ...field }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: P.dim }}>City Pharmacy</span>
            </div>
          </div>
        </div>

        {/* actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
          <div style={{ flex: 1, height: 50, borderRadius: 14, background: P.glass, border: `1px solid ${P.stroke}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: P.dim }}>Cancel</div>
          <div style={{ flex: 2, height: 50, borderRadius: 14, background: `linear-gradient(135deg, ${P.v1}, ${P.v2})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, boxShadow: `0 10px 26px ${P.v1}55` }}>Add expense</div>
        </div>
      </div>
    </div>
  );
}
window.PulseDesktopAdd = PulseDesktopAdd;
