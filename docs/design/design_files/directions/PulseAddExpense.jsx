// Pulse — Add expense (modal sheet rising over a dimmed dashboard)
function PulseAddExpense({ theme = 'dark' }) {
  const P = window.makePulse(theme), G = window.GAST;
  const amount = '48.50';
  const selectedCat = 'Health';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

  return (
    <div style={{ width: 390, height: 844, background: P.bg, color: P.text, fontFamily: P.font, position: 'relative', overflow: 'hidden' }}>
      {/* dimmed dashboard behind */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, filter: 'blur(1px)' }}>
        <div style={{ position: 'absolute', top: -90, right: -70, width: 240, height: 240, background: `radial-gradient(circle, ${P.glowA}, transparent 70%)`, filter: 'blur(20px)' }} />
        <div style={{ padding: '46px 20px 0' }}>
          <div style={{ fontSize: 12, color: P.dim }}>Welcome back</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{G.user}</div>
          <div style={{ ...P.card({ padding: '20px 22px', background: P.heroBg }) }}>
            <div style={{ fontSize: 12.5, color: P.dim }}>Spent this month</div>
            <div style={{ fontSize: 44, fontWeight: 700, marginTop: 6 }}>${P.usd(G.thisMonth)}</div>
          </div>
        </div>
      </div>
      {/* scrim */}
      <div style={{ position: 'absolute', inset: 0, background: P.scrim }} />

      {/* status bar */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0', fontSize: 12, color: P.dim }}>
        <span style={{ fontWeight: 600 }}>9:41</span>
        <span>5G ▮▮▮</span>
      </div>

      {/* bottom sheet */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 660, background: P.sheetBg, backdropFilter: 'blur(20px)', borderTop: `1px solid ${P.stroke}`, borderRadius: '28px 28px 0 0', padding: '12px 22px 24px', boxShadow: P.light ? '0 -20px 60px rgba(24,26,46,0.18)' : '0 -20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 3, background: P.handle, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>New expense</span>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: P.glass, border: `1px solid ${P.stroke}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.dim, fontSize: 14 }}>✕</div>
        </div>

        {/* amount display */}
        <div style={{ textAlign: 'center', padding: '22px 0 6px' }}>
          <div style={{ fontSize: 12.5, color: P.dim, letterSpacing: '0.04em' }}>AMOUNT</div>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, background: P.heroText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ${amount}<span style={{ WebkitTextFillColor: P.v2, marginLeft: 2, fontWeight: 300 }}>|</span>
          </div>
        </div>

        {/* category chips */}
        <div style={{ display: 'flex', gap: 8, overflow: 'hidden', padding: '6px 0 4px' }}>
          {G.categories.slice(0, 5).map((c, i) => {
            const on = c.name === selectedCat;
            return (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 500,
                padding: '7px 12px', borderRadius: 20,
                background: on ? P.catSoft(c.hue) : P.glass,
                border: `1px solid ${on ? P.catColor(c.hue) : P.stroke}`,
                color: on ? P.catTint(c.hue) : P.text,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: P.catColor(c.hue) }} />{c.name}
              </div>
            );
          })}
        </div>

        {/* date + note */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <div style={{ ...P.card({ padding: '11px 14px', borderRadius: 14 }), flex: 1 }}>
            <div style={{ fontSize: 10.5, color: P.dim }}>DATE</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 3 }}>Today, Jun 20</div>
          </div>
          <div style={{ ...P.card({ padding: '11px 14px', borderRadius: 14 }), flex: 1.3 }}>
            <div style={{ fontSize: 10.5, color: P.dim }}>NOTE</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 3, color: P.dim }}>City Pharmacy</div>
          </div>
        </div>

        {/* keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 16 }}>
          {keys.map((k) => (
            <div key={k} style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, fontWeight: 500, color: k === '⌫' ? P.dim : P.text, borderRadius: 12 }}>{k}</div>
          ))}
        </div>

        {/* submit */}
        <div style={{ height: 52, borderRadius: 16, marginTop: 12, background: `linear-gradient(135deg, ${P.v1}, ${P.v2})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, boxShadow: `0 8px 22px ${P.v1}55` }}>
          Add expense
        </div>
      </div>
    </div>
  );
}
window.PulseAddExpense = PulseAddExpense;
