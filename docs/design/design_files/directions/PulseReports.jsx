// Pulse — Reports (full charts)
function PulseReports({ theme = 'dark' }) {
  const P = window.makePulse(theme), G = window.GAST;
  const uid = theme;
  const maxTrend = Math.max(...G.trend.map((t) => t.v));

  // donut (top 5 + other)
  const top = G.categories.slice(0, 5);
  const otherVal = G.categories.slice(5).reduce((s, c) => s + c.value, 0);
  const segs = [...top.map((c) => ({ name: c.name, value: c.value, hue: c.hue })), { name: 'Other', value: otherVal, hue: 230 }];
  const segTotal = segs.reduce((s, c) => s + c.value, 0);
  const R = 54, C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = segs.map((s) => { const frac = s.value / segTotal; const o = { ...s, frac, dash: frac * C, offset: -acc * C }; acc += frac; return o; });

  // area chart
  const W = 322, H = 110;
  const pts = G.trend.map((t, i) => [(i / (G.trend.length - 1)) * W, H - (t.v / maxTrend) * (H - 22) - 10]);
  const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  // top merchants
  const merchants = [
    { name: 'Trattoria Po', cat: 'Dining', amount: 112.50 },
    { name: 'Electric Co.', cat: 'Utilities', amount: 98.40 },
    { name: 'Whole Foods', cat: 'Groceries', amount: 84.20 },
    { name: 'Amazon', cat: 'Shopping', amount: 64.99 },
    { name: 'Trader Joe\u2019s', cat: 'Groceries', amount: 57.80 },
  ];
  const mMax = merchants[0].amount;
  const catHue = (n) => (G.categories.find((c) => c.name === n) || { hue: 230 }).hue;

  const compare = [{ m: 'May', v: G.lastMonth }, { m: 'Jun', v: G.thisMonth }];
  const cMax = Math.max(...compare.map((c) => c.v));

  return (
    <window.PulseShell tab="reports" theme={theme}>
      <div style={{ padding: '14px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Reports</h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '8px 13px', borderRadius: 20, background: P.glass, border: `1px solid ${P.stroke}`, color: P.text }}>
          Last 6 months <span style={{ opacity: 0.6 }}>▾</span>
        </div>
      </div>

      <div style={{ padding: '12px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* hero total */}
        <div style={P.card({ padding: '18px 22px', background: P.heroBg })}>
          <div style={{ fontSize: 12.5, color: P.dim }}>Spent this month</div>
          <div style={{ fontSize: 40, fontWeight: 700, marginTop: 4, lineHeight: 1, background: P.heroText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>${P.usd(G.thisMonth)}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: P.catSoft(190), color: P.v2, fontSize: 12.5, fontWeight: 600, padding: '5px 10px', borderRadius: 20 }}>↓ {Math.abs(G.deltaPct).toFixed(1)}%</span>
            <span style={{ fontSize: 12.5, color: P.dim }}>vs ${P.usd(G.lastMonth)} in May</span>
          </div>
        </div>

        {/* trend area */}
        <div style={P.card({ padding: '18px 20px 14px' })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Monthly trend</span>
            <span style={{ fontSize: 11.5, color: P.dim }}>outflow</span>
          </div>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`repArea-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P.v1} stopOpacity={P.light ? '0.30' : '0.45'} /><stop offset="100%" stopColor={P.v1} stopOpacity="0" /></linearGradient>
              <linearGradient id={`repLine-${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={P.v1} /><stop offset="100%" stopColor={P.v2} /></linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((g, i) => (<line key={i} x1="0" y1={H * g} x2={W} y2={H * g} stroke={P.grid} strokeWidth="1" />))}
            <path d={area} fill={`url(#repArea-${uid})`} />
            <path d={line} fill="none" stroke={`url(#repLine-${uid})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (<circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 2.4} fill={i === pts.length - 1 ? P.v2 : P.bg} stroke={P.v2} strokeWidth={i === pts.length - 1 ? 2 : 1.4} />))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {G.trend.map((t, i) => (<span key={i} style={{ fontSize: 9.5, color: i === G.trend.length - 1 ? P.v2 : P.dim }}>{t.m}</span>))}
          </div>
        </div>

        {/* this vs last */}
        <div style={P.card({ padding: '18px 20px' })}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>This month vs last</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, height: 120, paddingLeft: 4 }}>
            {compare.map((c, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>${P.usd(c.v, 0)}</span>
                <div style={{ width: '64%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 78 }}>
                  <div style={{ height: `${(c.v / cMax) * 100}%`, borderRadius: '10px 10px 0 0', background: i === 1 ? `linear-gradient(180deg, ${P.v1}, ${P.v2})` : P.barInactive }} />
                </div>
                <span style={{ fontSize: 11.5, color: i === 1 ? P.v2 : P.dim, fontWeight: 600 }}>{c.m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* donut by category */}
        <div style={P.card({ padding: '18px 20px' })}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>By category</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <svg width="136" height="136" viewBox="0 0 136 136" style={{ flexShrink: 0, filter: `drop-shadow(0 0 10px ${P.v1}55)` }}>
              <circle cx="68" cy="68" r={R} fill="none" stroke={P.track} strokeWidth="15" />
              {arcs.map((a, i) => (<circle key={i} cx="68" cy="68" r={R} fill="none" stroke={P.catColor(a.hue)} strokeWidth="15" strokeLinecap="round" strokeDasharray={`${Math.max(a.dash - 4, 0)} ${C}`} strokeDashoffset={a.offset} transform="rotate(-90 68 68)" />))}
              <text x="68" y="63" textAnchor="middle" fill={P.text} fontSize="21" fontWeight="700" fontFamily="Sora">${(segTotal / 1000).toFixed(1)}k</text>
              <text x="68" y="81" textAnchor="middle" fill={P.dim} fontSize="9.5" letterSpacing="0.1em">TOTAL</text>
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {arcs.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: P.catColor(a.hue), flexShrink: 0 }} />
                  <span style={{ flex: 1, color: P.text }}>{a.name}</span>
                  <span style={{ color: P.dim }}>{Math.round(a.frac * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* top merchants */}
        <div style={P.card({ padding: '8px 18px 12px' })}>
          <div style={{ fontSize: 14, fontWeight: 600, padding: '12px 0 6px' }}>Top merchants</div>
          {merchants.map((m, i) => {
            const hue = catHue(m.cat);
            return (
              <div key={i} style={{ padding: '10px 0', borderTop: i ? `1px solid ${P.stroke}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: P.faint, width: 14 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{m.name}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>${P.usd(m.amount)}</span>
                </div>
                <div style={{ height: 4, background: P.track, borderRadius: 3, marginLeft: 25, overflow: 'hidden' }}>
                  <div style={{ width: `${(m.amount / mMax) * 100}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${P.catColor(hue)}, ${P.catColor(hue + 18)})` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </window.PulseShell>
  );
}
window.PulseReports = PulseReports;
