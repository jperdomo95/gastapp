import { Chip } from 'gastapp-ui';

export function States() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Chip active>This month</Chip>
      <Chip>All time</Chip>
      <Chip>Last 3 months</Chip>
    </div>
  );
}

export function CategoryFilter() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Chip active>Food</Chip>
      <Chip>Transport</Chip>
      <Chip>Housing</Chip>
      <Chip>Entertainment</Chip>
    </div>
  );
}
