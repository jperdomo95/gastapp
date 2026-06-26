// Pulse — Expenses (list + filters)
function PulseExpenses({ theme = 'dark' }) {
  const P = window.makePulse(theme), G = window.GAST;
  const chips = [
    { label: 'All time', active: false },
    { label: 'This month', active: true },
    { label: 'Category', caret: true },
    { label: 'Sort: Newest', caret: true },
  ];
  const catHue = (name) => (G.categories.find((c) => c.name === name) || { hue: 230 }).hue;
  const monthTotal = G.ledger.flatMap((d) => d.items).reduce((s, i) => s + Math.abs(i.amount), 0);

  return (
    <window.PulseShell tab="list" theme={theme}>
      <div style={{ padding: '14px 20px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Expenses</h1>
          <div style={{ width: 40, height: 40, borderRadius: 13, border: `1px solid ${P.stroke}`, background: P.glass, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.dim, fontSize: 17 }}>⌕</div>
        </div>
      </div>

      {/* summary strip */}
      <div style={{ padding: '6px 20px 0' }}>
        <div style={{ ...P.card({ padding: '14px 18px', background: `linear-gradient(135deg, rgba(124,92,255,0.18), rgba(34,211,238,0.06))` }), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11.5, color: P.dim }}>This month</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>${P.usd(monthTotal)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11.5, color: P.dim }}>Entries</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{G.entries}</div>
          </div>
        </div>
      </div>

      {/* filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 20px 6px', overflow: 'hidden' }}>
        {chips.map((c, i) => (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            fontSize: 12.5, fontWeight: 500, padding: '7px 12px', borderRadius: 20,
            background: c.active ? `linear-gradient(135deg, ${P.v1}, ${P.v2})` : P.glass,
            border: `1px solid ${c.active ? 'transparent' : P.stroke}`,
            boxShadow: c.active ? 'none' : P.cardShadow,
            color: c.active ? '#fff' : P.text,
          }}>
            {c.label}{c.caret && <span style={{ opacity: 0.6 }}>▾</span>}
          </div>
        ))}
      </div>

      {/* grouped ledger */}
      <div style={{ padding: '8px 20px 8px' }}>
        {G.ledger.map((day, di) => (
          <div key={di} style={{ marginTop: di ? 18 : 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 8px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: P.dim }}>{day.group}</span>
              <span style={{ fontSize: 11, color: P.faint }}>
                {day.date} · −${P.usd(day.items.reduce((s, i) => s + Math.abs(i.amount), 0))}
              </span>
            </div>
            <div style={P.card({ padding: '4px 16px' })}>
              {day.items.map((r, ri) => {
                const hue = catHue(r.cat);
                return (
                  <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: ri ? `1px solid ${P.stroke}` : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: P.catSoft(hue), color: P.catTint(hue), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{r.name[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                      <div style={{ fontSize: 11.5, color: P.dim }}>{r.cat}</div>
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>−${P.usd(Math.abs(r.amount))}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ textAlign: 'center', padding: '18px 0 6px', fontSize: 12.5, color: P.dim }}>Showing 1–11 of {G.entries}</div>
      </div>
    </window.PulseShell>
  );
}
window.PulseExpenses = PulseExpenses;
