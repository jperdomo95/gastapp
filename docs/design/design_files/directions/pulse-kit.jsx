// Shared Pulse design tokens + helpers. Now THEMEABLE: makePulse('dark'|'light')
// returns a full token object (palette + helpers) for that mode. window.PULSE
// stays the dark default so older code keeps working unchanged.
// Plain global, loaded before the babel screen scripts.

window.makePulse = function makePulse(mode = 'dark') {
  const light = mode === 'light';

  const v1 = light ? '#6f54ff' : '#7c5cff'; // violet
  const v2 = light ? '#0fb6d6' : '#22d3ee'; // cyan

  const P = {
    mode,
    light,
    bg:      light ? '#f4f5fb' : '#0a0b1a',
    bgSoft:  light ? '#ffffff' : '#10122a',
    text:    light ? '#181a2e' : '#eef0ff',
    dim:     light ? '#6c7090' : '#8a8db0',
    faint:   light ? '#a2a5c0' : '#5d6086',
    glass:   light ? '#ffffff' : 'rgba(255,255,255,0.045)',
    glassHi: light ? '#ffffff' : 'rgba(255,255,255,0.08)',
    stroke:  light ? 'rgba(24,26,46,0.08)' : 'rgba(255,255,255,0.08)',
    v1, v2,

    // surfaces / rails
    track:       light ? 'rgba(24,26,46,0.07)' : 'rgba(255,255,255,0.06)',
    grid:        light ? 'rgba(24,26,46,0.06)' : 'rgba(255,255,255,0.05)',
    barInactive: light ? 'rgba(24,26,46,0.10)' : 'rgba(255,255,255,0.12)',
    navBg:       light ? 'rgba(255,255,255,0.82)' : 'rgba(18,19,38,0.72)',
    sheetBg:     light ? 'rgba(255,255,255,0.96)' : 'rgba(16,18,40,0.92)',
    scrim:       light ? 'rgba(20,22,45,0.34)' : 'rgba(5,6,16,0.62)',
    handle:      light ? 'rgba(24,26,46,0.18)' : 'rgba(255,255,255,0.18)',

    // ambient glow colors (paired with radial-gradient)
    glowA: light ? `${v1}26` : `${v1}55`,
    glowB: light ? `${v2}1f` : `${v2}33`,

    // hero card surface + gradient amount text
    heroBg:   light
      ? 'linear-gradient(135deg, rgba(111,84,255,0.13), rgba(15,182,214,0.06))'
      : 'linear-gradient(135deg, rgba(124,92,255,0.20), rgba(34,211,238,0.08))',
    heroText: light
      ? `linear-gradient(100deg, ${v1}, ${v2})`
      : `linear-gradient(100deg, #eef0ff, ${v2})`,

    cardShadow: light
      ? '0 8px 24px rgba(24,26,46,0.06), 0 1px 2px rgba(24,26,46,0.04)'
      : 'none',

    font: "'Sora', sans-serif",

    usd(n, dec = 2) {
      return Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    },
    catColor(hue) { return light ? `hsl(${hue} 68% 47%)` : `hsl(${hue} 85% 65%)`; },
    catSoft(hue)  { return light ? `hsl(${hue} 70% 52% / 0.12)` : `hsl(${hue} 70% 60% / 0.18)`; },
    catTint(hue)  { return light ? `hsl(${hue} 62% 40%)` : `hsl(${hue} 85% 72%)`; },

    // a fresh card style object (so callers can spread + override safely)
    card(extra) {
      return Object.assign({
        background: light ? '#ffffff' : 'rgba(255,255,255,0.045)',
        border: `1px solid ${light ? 'rgba(24,26,46,0.08)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 22,
        backdropFilter: light ? 'none' : 'blur(12px)',
        boxShadow: light ? '0 8px 24px rgba(24,26,46,0.06), 0 1px 2px rgba(24,26,46,0.04)' : 'none',
      }, extra || {});
    },
  };
  return P;
};

// Dark default — keeps any older references to window.PULSE working.
window.PULSE = window.makePulse('dark');

// Reusable 390-wide phone shell: status bar + ambient glows + your content.
// children render inside the scroll body; `tab` highlights the active nav item;
// pass tab="none" to omit the bottom bar (e.g. modal screens). `theme` switches palette.
window.PulseShell = function PulseShell({ children, tab = 'home', glow = true, theme = 'dark' }) {
  const P = window.makePulse(theme);
  const tabs = [
    { id: 'home', i: '◧' },
    { id: 'list', i: '≣' },
    { id: 'add', i: '+', plus: true },
    { id: 'cats', i: '◍' },
    { id: 'reports', i: '◔' },
  ];
  return (
    <div style={{ width: 390, background: P.bg, color: P.text, fontFamily: P.font, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 844 }}>
      {glow && <>
        <div style={{ position: 'absolute', top: -90, right: -70, width: 240, height: 240, background: `radial-gradient(circle, ${P.glowA}, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 240, left: -90, width: 220, height: 220, background: `radial-gradient(circle, ${P.glowB}, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />
      </>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0', fontSize: 12, color: P.dim, position: 'relative' }}>
        <span style={{ fontWeight: 600 }}>9:41</span>
        <span>5G ▮▮▮</span>
      </div>

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {tab !== 'none' && (
        <div style={{ position: 'sticky', bottom: 0, padding: '10px 14px 16px', background: `linear-gradient(180deg, transparent, ${P.bg} 38%)`, position: 'relative', zIndex: 3 }}>
          <div style={{ height: 62, borderRadius: 22, background: P.navBg, border: `1px solid ${P.stroke}`, backdropFilter: 'blur(16px)', boxShadow: P.cardShadow, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px' }}>
            {tabs.map((t) => (
              t.plus ? (
                <div key={t.id} style={{ width: 46, height: 46, borderRadius: 16, background: `linear-gradient(135deg, ${P.v1}, ${P.v2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 300, color: '#fff', boxShadow: `0 6px 18px ${P.v1}66` }}>+</div>
              ) : (
                <div key={t.id} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, color: t.id === tab ? P.v2 : P.dim }}>{t.i}</div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
