// Direction B — "PULSE": neon fintech. Deep midnight (or light) + glassmorphism,
// electric violet→cyan gradient, glowing donut + gradient area chart, bottom tab bar.
// Theme-aware: pass theme="light" for the light variant.
function DirectionNeon({ theme = 'dark' }) {
  const G = window.GAST;
  const P = window.makePulse(theme);
  const usd = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const { bg, text, dim, glass, stroke, v1, v2 } = P;

  const maxTrend = Math.max(...G.trend.map((t) => t.v));

  // donut: top 5 categories + "Other"
  const top = G.categories.slice(0, 5);
  const otherVal = G.categories.slice(5).reduce((s, c) => s + c.value, 0);
  const segs = [...top.map((c) => ({ name: c.name, value: c.value, hue: c.hue })), { name: 'Other', value: otherVal, hue: 230 }];
  const segTotal = segs.reduce((s, c) => s + c.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = segs.map((s) => {
    const frac = s.value / segTotal;
    const seg = { ...s, frac, dash: frac * C, offset: -acc * C };
    acc += frac;
    return seg;
  });

  // gradient area chart path
  const W = 322, H = 88;
  const pts = G.trend.map((t, i) => [(i / (G.trend.length - 1)) * W, H - (t.v / maxTrend) * (H - 14) - 6]);
  const linePath = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;

  const uid = theme; // unique gradient ids per theme so dark+light coexist on canvas

  const wrap = {
    width: 390, height: 1250, background: bg, color: text, position: 'relative', overflow: 'hidden',
    fontFamily: "'Sora', sans-serif", display: 'flex', flexDirection: 'column',
  };
  const card = P.card();

  const catColor = (hue) => P.catColor(hue);
  const maxCat = Math.max(...top.map((c) => c.value));

  return (
    <div style={wrap}>
      {/* ambient glows */}
      <div style={{ position: 'absolute', top: -90, right: -70, width: 240, height: 240, background: `radial-gradient(circle, ${P.glowA}, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 220, left: -90, width: 220, height: 220, background: `radial-gradient(circle, ${P.glowB}, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />

      {/* status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0', fontSize: 12, color: dim, position: 'relative' }}>
        <span style={{ fontWeight: 600 }}>9:41</span>
        <span>5G ▮▮▮</span>
      </div>

      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 6px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 13, background: `linear-gradient(135deg, ${v1}, ${v2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff' }}>M</div>
          <div>
            <div style={{ fontSize: 12, color: dim }}>Welcome back</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{G.user}</div>
          </div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${stroke}`, background: glass, boxShadow: P.cardShadow, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dim, fontSize: 16 }}>◔</div>
      </div>

      <div style={{ padding: '12px 20px 0', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
        {/* hero balance card */}
        <div style={{ ...card, padding: '20px 22px', background: P.heroBg }}>
          <div style={{ fontSize: 12.5, color: dim, letterSpacing: '0.02em' }}>Spent this month</div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, lineHeight: 1, background: P.heroText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ${usd(G.thisMonth)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: P.catSoft(190), color: v2, fontSize: 12.5, fontWeight: 600, padding: '5px 10px', borderRadius: 20 }}>↓ {Math.abs(G.deltaPct).toFixed(1)}%</span>
            <span style={{ fontSize: 12.5, color: dim }}>less than May</span>
          </div>
        </div>

        {/* quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[{ k: 'Avg / day', v: `$${G.avgPerDay.toFixed(0)}` }, { k: 'Entries', v: G.entries }].map((s, i) => (
            <div key={i} style={{ ...card, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: dim }}>{s.k}</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* by category — donut + ranked top spent */}
        <div style={{ ...card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>By category</span>
            <span style={{ fontSize: 11.5, color: dim }}>Top spent</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <svg width="132" height="132" viewBox="0 0 132 132" style={{ flexShrink: 0, filter: `drop-shadow(0 0 10px ${P.glowA})` }}>
              <circle cx="66" cy="66" r={R} fill="none" stroke={P.track} strokeWidth="14" />
              {arcs.map((a, i) => (
                <circle key={i} cx="66" cy="66" r={R} fill="none"
                  stroke={catColor(a.hue)} strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={`${Math.max(a.dash - 4, 0)} ${C}`}
                  strokeDashoffset={a.offset}
                  transform="rotate(-90 66 66)" />
              ))}
              <text x="66" y="61" textAnchor="middle" fill={text} fontSize="20" fontWeight="700" fontFamily="Sora">${(segTotal / 1000).toFixed(1)}k</text>
              <text x="66" y="79" textAnchor="middle" fill={dim} fontSize="9.5" letterSpacing="0.1em">TOTAL</text>
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {top.map((c, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, marginBottom: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: catColor(c.hue), flexShrink: 0 }} />
                    <span style={{ flex: 1, color: text }}>{c.name}</span>
                    <span style={{ color: dim, fontWeight: 600 }}>${c.value}</span>
                  </div>
                  <div style={{ height: 4, background: P.track, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(c.value / maxCat) * 100}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${catColor(c.hue)}, ${catColor(c.hue + 18)})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* gradient area trend */}
        <div style={{ ...card, padding: '18px 20px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Monthly trend</span>
            <span style={{ fontSize: 11.5, color: dim }}>6 months</span>
          </div>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`pulseArea-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={v1} stopOpacity={P.light ? '0.30' : '0.45'} />
                <stop offset="100%" stopColor={v1} stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`pulseLine-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={v1} />
                <stop offset="100%" stopColor={v2} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#pulseArea-${uid})`} />
            <path d={linePath} fill="none" stroke={`url(#pulseLine-${uid})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => i === pts.length - 1 && (
              <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={v2} stroke={bg} strokeWidth="2" />
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {G.trend.map((t, i) => (
              <span key={i} style={{ fontSize: 9.5, color: i === G.trend.length - 1 ? v2 : dim }}>{t.m}</span>
            ))}
          </div>
        </div>

        {/* recent */}
        <div style={{ ...card, padding: '8px 18px 12px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, padding: '12px 0 6px' }}>Recent</div>
          {G.recent.map((r, i) => {
            const cat = G.categories.find((c) => c.name === r.cat) || { hue: 230 };
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i ? `1px solid ${stroke}` : 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, background: P.catSoft(cat.hue), color: P.catTint(cat.hue), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{r.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: dim }}>{r.cat} · {r.when}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>−${usd(Math.abs(r.amount))}</div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 78 }} />
      </div>

      {/* bottom tab bar */}
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 16, height: 62, borderRadius: 22, background: P.navBg, border: `1px solid ${stroke}`, backdropFilter: 'blur(16px)', boxShadow: P.cardShadow, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px' }}>
        {[{ i: '◧', a: true }, { i: '≣' }, { i: '+', plus: true }, { i: '◍' }, { i: '◔' }].map((t, i) => (
          t.plus ? (
            <div key={i} style={{ width: 46, height: 46, borderRadius: 16, background: `linear-gradient(135deg, ${v1}, ${v2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 300, color: '#fff', boxShadow: `0 6px 18px ${v1}66` }}>+</div>
          ) : (
            <div key={i} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, color: t.a ? v2 : dim }}>{t.i}</div>
          )
        ))}
      </div>
    </div>
  );
}
window.DirectionNeon = DirectionNeon;
