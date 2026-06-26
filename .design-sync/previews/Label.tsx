import { Label, Input } from 'gastapp-ui';

export function Default() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', display: 'flex', flexDirection: 'column', gap: '6px', width: '280px' }}>
      <Label htmlFor="demo-input">Amount</Label>
      <Input id="demo-input" placeholder="0.00" />
    </div>
  );
}

export function FormGroup() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', display: 'flex', flexDirection: 'column', gap: '16px', width: '320px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Grocery store" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" placeholder="Weekly groceries" />
      </div>
    </div>
  );
}
