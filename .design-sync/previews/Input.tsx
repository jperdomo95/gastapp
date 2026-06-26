import { Input } from 'gastapp-ui';

export function Default() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', width: '320px' }}>
      <Input placeholder="Enter amount" />
    </div>
  );
}

export function Filled() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', width: '320px' }}>
      <Input defaultValue="Grocery store" />
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', width: '320px' }}>
      <Input value="Locked value" disabled />
    </div>
  );
}

export function WithType() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', display: 'flex', flexDirection: 'column', gap: '12px', width: '320px' }}>
      <Input type="email" placeholder="you@example.com" />
      <Input type="password" placeholder="Password" />
      <Input type="date" />
    </div>
  );
}
