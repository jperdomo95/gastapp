// Pulse — Desktop Categories. Donut overview + 3-column category card grid.
function PulseDesktopCategories({ theme = 'dark' }) {
  const P = window.makePulse(theme), G = window.GAST;
  const usd = (n, d = 2) => P.usd(n, d);
  const card = (extra) => P.card(Object.assign({ borderRadius: 18 }, extra));
  const cardTitle = { fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' };
  const max = Math.max(...G.categories.map((c) => c.value));

  // donut over all categories
  const R = 60, C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = G.categories.map((c) => { const frac = c.value / G.catTotal; const o = { ...c, frac, dash: frac * C, offset: -acc * C }; acc += frac; return o; });

  const actions = (
    <>
      <window.PulseDeskChip theme={theme}>{G.monthShort} <span style={{ opacity: 0.6 }}>▾</span></window.PulseDeskChip>
      <window.PulseDeskPrimary theme={theme}><span style={{ fontSize: 18, fontWeight: 300 }}>+</span> New category</window.PulseDeskPrimary>
    </>
  );

  return (
    <window.PulseDesktopShell theme={theme} active="Categories" title="Categories" subtitle={`${G.categories.length} categories · $${usd(G.catTotal)} this month`} actions={actions}>
      {/* overview row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18, marginBottom: 18 }}>
        <div style={card({ padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 24 })}>
          <svg width="156" height="156" viewBox="0 0 156 156" style={{ flexShrink: 0, filter: `drop-shadow(0 0 12px ${P.glowA})` }}>
            <circle cx="78" cy="78" r={R} fill="none" stroke={P.track} strokeWidth="16" />
            {arcs.map((a, i) => (<circle key={i} cx="78" cy="78" r={R} fill="none" stroke={P.catColor(a.hue)} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${Math.max(a.dash - 5, 0)} ${C}`} strokeDashoffset={a.offset} transform="rotate(-90 78 78)" />))}
            <text x="78" y="73" textAnchor="middle" fill={P.text} fontSize="25" fontWeight="700" fontFamily="Sora">${(G.catTotal / 1000).toFixed(1)}k</text>
            <text x="78" y="93" textAnchor="middle" fill={P.dim} fontSize="10" letterSpacing="0.1em">TOTAL</text>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ ...cardTitle, marginBottom: 4 }}>Spending split</div>
            <div style={{ fontSize: 12.5, color: P.dim, marginBottom: 14 }}>Share of total this month</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 18px' }}>
              {G.categories.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: P.catColor(c.hue), flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ color: P.dim, fontWeight: 600 }}>{Math.round((c.value / G.catTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* quick highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {[
            { k: 'Biggest category', v: 'Groceries', s: '$642 · 23%', hue: 145 },
            { k: 'Most frequent', v: 'Groceries', s: '14 entries', hue: 145 },
            { k: 'Fastest growing', v: 'Dining', s: '+18% vs May', hue: 28 },
            { k: 'Avg / category', v: `$${usd(G.catTotal / G.categories.length, 0)}`, s: 'this month', hue: 200 },
          ].map((h, i) => (
            <div key={i} style={card({ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' })}>
              <div style={{ fontSize: 12, color: P.dim }}>{h.k}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: P.catColor(h.hue) }} />
                <span style={{ fontSize: 19, fontWeight: 700 }}>{h.v}</span>
              </div>
              <div style={{ fontSize: 12, color: P.faint, marginTop: 5 }}>{h.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* category grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {G.categories.map((c, i) => {
          const pct = Math.round((c.value / G.catTotal) * 100);
          return (
            <div key={i} style={card({ padding: '20px 22px' })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: P.catSoft(c.hue), color: P.catTint(c.hue), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>{c.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: P.dim, marginTop: 2 }}>{c.count} entries</div>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: P.dim, fontWeight: 600 }}>{pct}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 18 }}>
                <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>${usd(c.value, 0)}</span>
                <span style={{ fontSize: 12, color: P.faint }}>spent</span>
              </div>
              <div style={{ height: 6, background: P.track, borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ width: `${(c.value / max) * 100}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${P.catColor(c.hue)}, ${P.catColor(c.hue + 18)})` }} />
              </div>
            </div>
          );
        })}
        {/* add-new tile */}
        <div style={{ borderRadius: 18, border: `1.5px dashed ${P.stroke}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: P.dim, minHeight: 150 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: P.glass, border: `1px solid ${P.stroke}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 300, color: P.v2 }}>+</div>
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>New category</span>
        </div>
      </div>
    </window.PulseDesktopShell>
  );
}
window.PulseDesktopCategories = PulseDesktopCategories;
