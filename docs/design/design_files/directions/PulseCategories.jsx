// Pulse — Categories (manage + per-category spend)
function PulseCategories({ theme = 'dark' }) {
  const P = window.makePulse(theme), G = window.GAST;
  const max = Math.max(...G.categories.map((c) => c.value));

  return (
    <window.PulseShell tab="cats" theme={theme}>
      <div style={{ padding: '14px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Categories</h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '8px 13px', borderRadius: 20, background: `linear-gradient(135deg, ${P.v1}, ${P.v2})`, color: '#fff' }}>
          <span style={{ fontSize: 16, fontWeight: 300 }}>+</span> New
        </div>
      </div>

      <div style={{ padding: '4px 20px 0', fontSize: 12.5, color: P.dim }}>
        {G.categories.length} categories · ${P.usd(G.catTotal)} this month
      </div>

      <div style={{ padding: '14px 20px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {G.categories.map((c, i) => {
          const pct = Math.round((c.value / G.catTotal) * 100);
          return (
            <div key={i} style={P.card({ padding: '15px 15px 16px' })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, borderRadius: 13, background: P.catSoft(c.hue), color: P.catTint(c.hue), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{c.name[0]}</div>
                <span style={{ fontSize: 11.5, color: P.dim }}>{pct}%</span>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 12 }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: P.dim, marginTop: 2 }}>{c.count} entries</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 10 }}>${P.usd(c.value, 0)}</div>
              <div style={{ height: 4, background: P.track, borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ width: `${(c.value / max) * 100}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${P.catColor(c.hue)}, ${P.catColor(c.hue + 18)})` }} />
              </div>
            </div>
          );
        })}
      </div>
    </window.PulseShell>
  );
}
window.PulseCategories = PulseCategories;
