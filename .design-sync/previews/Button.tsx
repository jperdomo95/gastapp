import { Button } from 'gastapp-ui';

export function Primary() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <Button variant="primary" size="sm">Small</Button>
      <Button variant="primary" size="md">Medium</Button>
      <Button variant="primary" size="lg">Large</Button>
      <Button variant="primary" disabled>Disabled</Button>
    </div>
  );
}

export function Secondary() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <Button variant="secondary">Secondary</Button>
      <Button variant="secondary" disabled>Disabled</Button>
    </div>
  );
}

export function Ghost() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Button variant="ghost">Ghost</Button>
    </div>
  );
}

export function Danger() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Button variant="danger">Delete account</Button>
    </div>
  );
}
