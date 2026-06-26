// Pulse — Desktop Expenses. Wide grouped table + right rail (summary + by-category).
function PulseDesktopExpenses({ theme = 'dark' }) {
  const P = window.makePulse(theme), G = window.GAST;
  const usd = (n, d = 2) => P.usd(n, d);
  const catHue = (n) => (G.categories.find((c) => c.name === n) || { hue: 230 }).hue;
  const monthTotal = G.ledger.flatMap((d) => d.items).reduce((s, i) => s + Math.abs(i.amount), 0);
  const card = (extra) => P.card(Object.assign({ borderRadius: 18 }, extra));
  const cardTitle = { fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' };

  const chips = [
    { label: 'All time' },
    { label: 'This month', active: true },
    { label: 'Category', caret: true },
    { label: 'Sort: Newest', caret: true },
  ];
  const top = G.categories.slice(0, 6);
  const maxCat = Math.max(...top.map((c) => c.value));

  const actions = (
    <>
      <window.PulseDeskChip theme={theme} width={200}><span style={{ fontSize: 15 }}>⌕</span> Search expenses</window.PulseDeskChip>
      <window.PulseDeskPrimary theme={theme}><span style={{ fontSize: 18, fontWeight: 300 }}>+</span> New expense</window.PulseDeskPrimary>
    </>
  );

  return (
    <window.PulseDesktopShell theme={theme} active="Expenses" title="Expenses" subtitle={`${G.entries} entries · ${G.monthLabel}`} actions={actions}>
      {/* filter chips */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 18 }}>
        {chips.map((c, i) => (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 11,
            background: c.active ? `linear-gradient(135deg, ${P.v1}, ${P.v2})` : P.glass,
            border: `1px solid ${c.active ? 'transparent' : P.stroke}`,
            boxShadow: c.active ? 'none' : P.cardShadow,
            color: c.active ? '#fff' : P.text,
          }}>{c.label}{c.caret && <span style={{ opacity: 0.6 }}>▾</span>}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* grouped table */}
        <div style={card({ padding: '8px 8px 12px' })}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 0.9fr 0.7fr', padding: '14px 16px 10px', fontSize: 11, color: P.faint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            <span>Merchant</span><span>Category</span><span>Date</span><span style={{ textAlign: 'right' }}>Amount</span>
          </div>
          {G.ledger.map((day, di) => (
            <div key={di}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 16px 8px', background: P.light ? 'rgba(24,26,46,0.025)' : 'rgba(255,255,255,0.025)', borderTop: `1px solid ${P.stroke}` }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: P.dim }}>{day.group}</span>
                <span style={{ fontSize: 11.5, color: P.faint }}>{day.date} · −${usd(day.items.reduce((s, i) => s + Math.abs(i.amount), 0))}</span>
              </div>
              {day.items.map((r, ri) => {
                const hue = catHue(r.cat);
                return (
                  <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 0.9fr 0.7fr', alignItems: 'center', padding: '10px 16px', borderTop: `1px solid ${P.stroke}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, background: P.catSoft(hue), color: P.catTint(hue), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{r.name[0]}</div>
                      <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    </div>
                    <span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: P.catSoft(hue), color: P.catTint(hue), fontSize: 12.5, fontWeight: 500 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: P.catColor(hue) }} />{r.cat}
                      </span>
                    </span>
                    <span style={{ fontSize: 13, color: P.dim }}>{r.date}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>−${usd(Math.abs(r.amount))}</span>
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 6px', borderTop: `1px solid ${P.stroke}` }}>
            <span style={{ fontSize: 12.5, color: P.dim }}>Showing 1–11 of {G.entries}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {['‹', '1', '2', '3', '›'].map((p, i) => (
                <div key={i} style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, background: p === '1' ? `linear-gradient(135deg, ${P.v1}, ${P.v2})` : P.glass, color: p === '1' ? '#fff' : P.dim, border: `1px solid ${p === '1' ? 'transparent' : P.stroke}` }}>{p}</div>
              ))}
            </div>
          </div>
        </div>

        {/* right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={card({ padding: '20px 24px', background: P.heroBg })}>
            <div style={{ fontSize: 13, color: P.dim }}>This month</div>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 5, lineHeight: 1, background: P.heroText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>${usd(monthTotal)}</div>
            <div style={{ display: 'flex', gap: 22, marginTop: 16 }}>
              <div>
                <div style={{ fontSize: 11.5, color: P.dim }}>Entries</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{G.entries}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: P.dim }}>Avg / day</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>${G.avgPerDay.toFixed(0)}</div>
              </div>
            </div>
          </div>

          <div style={card({ padding: '20px 24px' })}>
            <div style={{ ...cardTitle, marginBottom: 16 }}>By category</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {top.map((c, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: P.catColor(c.hue), flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <span style={{ color: P.dim, fontWeight: 600 }}>${usd(c.value, 0)}</span>
                  </div>
                  <div style={{ height: 5, background: P.track, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(c.value / maxCat) * 100}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${P.catColor(c.hue)}, ${P.catColor(c.hue + 18)})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </window.PulseDesktopShell>
  );
}
window.PulseDesktopExpenses = PulseDesktopExpenses;
