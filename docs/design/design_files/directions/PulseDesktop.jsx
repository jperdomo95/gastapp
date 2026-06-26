// Pulse — Desktop Dashboard. Uses PulseDesktopShell; multi-column grid.
function PulseDesktop({ theme = 'dark' }) {
  const P = window.makePulse(theme), G = window.GAST;
  const usd = (n, d = 2) => P.usd(n, d);
  const uid = `d-${theme}`;

  const maxTrend = Math.max(...G.trend.map((t) => t.v));
  const top = G.categories.slice(0, 5);
  const otherVal = G.categories.slice(5).reduce((s, c) => s + c.value, 0);
  const segs = [...top.map((c) => ({ name: c.name, value: c.value, hue: c.hue })), { name: 'Other', value: otherVal, hue: 230 }];
  const segTotal = segs.reduce((s, c) => s + c.value, 0);
  const R = 60, C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = segs.map((s) => { const frac = s.value / segTotal; const o = { ...s, frac, dash: frac * C, offset: -acc * C }; acc += frac; return o; });

  const TW = 600, TH = 200;
  const pts = G.trend.map((t, i) => [(i / (G.trend.length - 1)) * TW, TH - (t.v / maxTrend) * (TH - 34) - 16]);
  const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${line} L${TW},${TH} L0,${TH} Z`;

  const merchants = [
    { name: 'Trattoria Po', cat: 'Dining', amount: 112.50 },
    { name: 'Electric Co.', cat: 'Utilities', amount: 98.40 },
    { name: 'Whole Foods', cat: 'Groceries', amount: 84.20 },
    { name: 'Amazon', cat: 'Shopping', amount: 64.99 },
  ];
  const mMax = merchants[0].amount;
  const catHue = (n) => (G.categories.find((c) => c.name === n) || { hue: 230 }).hue;
  const ledgerFlat = G.ledger.flatMap((d) => d.items.map((i) => ({ ...i, group: d.group, date: d.date })));

  const card = (extra) => P.card(Object.assign({ borderRadius: 18 }, extra));
  const cardTitle = { fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' };

  const actions = (
    <>
      <window.PulseDeskChip theme={theme} width={200}><span style={{ fontSize: 15 }}>⌕</span> Search expenses</window.PulseDeskChip>
      <window.PulseDeskChip theme={theme}>Last 6 months <span style={{ opacity: 0.6 }}>▾</span></window.PulseDeskChip>
      <window.PulseDeskPrimary theme={theme}><span style={{ fontSize: 18, fontWeight: 300 }}>+</span> New expense</window.PulseDeskPrimary>
    </>
  );

  return (
    <window.PulseDesktopShell theme={theme} active="Dashboard" title="Dashboard" subtitle={`Welcome back, ${G.user} · ${G.monthLabel}`} actions={actions}>
      {/* stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 18 }}>
        <div style={card({ padding: '20px 24px', background: P.heroBg })}>
          <div style={{ fontSize: 13, color: P.dim }}>Spent this month</div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, lineHeight: 1, background: P.heroText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>${usd(G.thisMonth)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: P.catSoft(190), color: P.v2, fontSize: 12.5, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>↓ {Math.abs(G.deltaPct).toFixed(1)}%</span>
            <span style={{ fontSize: 12.5, color: P.dim }}>vs ${usd(G.lastMonth, 0)} in May</span>
          </div>
        </div>
        {[{ k: 'Avg / day', v: `$${G.avgPerDay.toFixed(0)}`, s: 'across 30 days' }, { k: 'Entries', v: G.entries, s: 'this month' }, { k: 'Categories', v: G.categories.length, s: 'tracked' }].map((s, i) => (
          <div key={i} style={card({ padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' })}>
            <div style={{ fontSize: 13, color: P.dim }}>{s.k}</div>
            <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6, letterSpacing: '-0.01em' }}>{s.v}</div>
            <div style={{ fontSize: 11.5, color: P.faint, marginTop: 4 }}>{s.s}</div>
          </div>
        ))}
      </div>

      {/* main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, marginTop: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={card({ padding: '20px 24px 16px' })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={cardTitle}>Monthly trend</span>
              <span style={{ fontSize: 12, color: P.dim }}>outflow · 6 months</span>
            </div>
            <svg width="100%" viewBox={`0 0 ${TW} ${TH}`} preserveAspectRatio="none" style={{ display: 'block', height: 200, overflow: 'visible' }}>
              <defs>
                <linearGradient id={`dtArea-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P.v1} stopOpacity={P.light ? '0.28' : '0.42'} /><stop offset="100%" stopColor={P.v1} stopOpacity="0" /></linearGradient>
                <linearGradient id={`dtLine-${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={P.v1} /><stop offset="100%" stopColor={P.v2} /></linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((g, i) => (<line key={i} x1="0" y1={TH * g} x2={TW} y2={TH * g} stroke={P.grid} strokeWidth="1" />))}
              <path d={area} fill={`url(#dtArea-${uid})`} />
              <path d={line} fill="none" stroke={`url(#dtLine-${uid})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => (<circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 3} fill={i === pts.length - 1 ? P.v2 : P.bg} stroke={P.v2} strokeWidth={i === pts.length - 1 ? 2.5 : 1.6} />))}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {G.trend.map((t, i) => (<span key={i} style={{ fontSize: 11, color: i === G.trend.length - 1 ? P.v2 : P.dim, fontWeight: i === G.trend.length - 1 ? 600 : 400 }}>{t.m}</span>))}
            </div>
          </div>

          <div style={card({ padding: '18px 8px 10px' })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 16px 14px' }}>
              <span style={cardTitle}>Recent transactions</span>
              <span style={{ fontSize: 12.5, color: P.v2, fontWeight: 500 }}>View all →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 0.8fr', padding: '0 16px 8px', fontSize: 11, color: P.faint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              <span>Merchant</span><span>Category</span><span>Date</span><span style={{ textAlign: 'right' }}>Amount</span>
            </div>
            {ledgerFlat.slice(0, 7).map((r, i) => {
              const hue = catHue(r.cat);
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 0.8fr', alignItems: 'center', padding: '11px 16px', borderTop: `1px solid ${P.stroke}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 11, background: P.catSoft(hue), color: P.catTint(hue), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{r.name[0]}</div>
                    <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  </div>
                  <span style={{ fontSize: 12.5 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: P.catSoft(hue), color: P.catTint(hue), fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: P.catColor(hue) }} />{r.cat}
                    </span>
                  </span>
                  <span style={{ fontSize: 13, color: P.dim }}>{r.group} · {r.date}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>−${usd(Math.abs(r.amount))}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={card({ padding: '20px 24px' })}>
            <div style={{ ...cardTitle, marginBottom: 14 }}>By category</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <svg width="148" height="148" viewBox="0 0 148 148" style={{ flexShrink: 0, filter: `drop-shadow(0 0 12px ${P.glowA})` }}>
                <circle cx="74" cy="74" r={R} fill="none" stroke={P.track} strokeWidth="16" />
                {arcs.map((a, i) => (<circle key={i} cx="74" cy="74" r={R} fill="none" stroke={P.catColor(a.hue)} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${Math.max(a.dash - 5, 0)} ${C}`} strokeDashoffset={a.offset} transform="rotate(-90 74 74)" />))}
                <text x="74" y="69" textAnchor="middle" fill={P.text} fontSize="24" fontWeight="700" fontFamily="Sora">${(segTotal / 1000).toFixed(1)}k</text>
                <text x="74" y="88" textAnchor="middle" fill={P.dim} fontSize="10" letterSpacing="0.1em">TOTAL</text>
              </svg>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {arcs.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: P.catColor(a.hue), flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{a.name}</span>
                    <span style={{ color: P.dim, fontWeight: 600 }}>{Math.round(a.frac * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={card({ padding: '20px 24px' })}>
            <div style={{ ...cardTitle, marginBottom: 16 }}>This month vs last</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, height: 130, paddingLeft: 4 }}>
              {[{ m: 'May', v: G.lastMonth }, { m: 'Jun', v: G.thisMonth }].map((c, i) => {
                const cMax = Math.max(G.lastMonth, G.thisMonth);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>${usd(c.v, 0)}</span>
                    <div style={{ width: '58%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 84 }}>
                      <div style={{ height: `${(c.v / cMax) * 100}%`, borderRadius: '12px 12px 0 0', background: i === 1 ? `linear-gradient(180deg, ${P.v1}, ${P.v2})` : P.barInactive }} />
                    </div>
                    <span style={{ fontSize: 12, color: i === 1 ? P.v2 : P.dim, fontWeight: 600 }}>{c.m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={card({ padding: '18px 24px 14px' })}>
            <div style={{ ...cardTitle, marginBottom: 6 }}>Top merchants</div>
            {merchants.map((m, i) => {
              const hue = catHue(m.cat);
              return (
                <div key={i} style={{ padding: '11px 0', borderTop: i ? `1px solid ${P.stroke}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: P.faint, width: 12 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{m.name}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>${usd(m.amount)}</span>
                  </div>
                  <div style={{ height: 5, background: P.track, borderRadius: 3, marginLeft: 23, overflow: 'hidden' }}>
                    <div style={{ width: `${(m.amount / mMax) * 100}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${P.catColor(hue)}, ${P.catColor(hue + 18)})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </window.PulseDesktopShell>
  );
}
window.PulseDesktop = PulseDesktop;
