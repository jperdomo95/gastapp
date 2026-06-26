import { Card } from 'gastapp-ui';

export function Default() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a' }}>
      <Card style={{ padding: '20px' }}>
        <p style={{ color: '#8a8db0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>This month</p>
        <p style={{ color: '#eef0ff', fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>$1,284.50</p>
      </Card>
    </div>
  );
}

export function Hero() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a' }}>
      <Card hero style={{ padding: '20px' }}>
        <p style={{ color: '#8a8db0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total spent</p>
        <p className="gradient-hero-text" style={{ fontSize: '40px', fontWeight: 700, marginTop: '4px' }}>$4,832.17</p>
        <p style={{ color: '#22d3ee', fontSize: '12px', marginTop: '8px' }}>↓ 12% vs last month</p>
      </Card>
    </div>
  );
}
