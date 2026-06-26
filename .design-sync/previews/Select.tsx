import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'gastapp-ui';

export function Default() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', width: '280px' }}>
      <Select defaultValue="food">
        <SelectTrigger>
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="food">Food & Dining</SelectItem>
          <SelectItem value="transport">Transport</SelectItem>
          <SelectItem value="housing">Housing</SelectItem>
          <SelectItem value="groceries">Groceries</SelectItem>
          <SelectItem value="health">Health</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function Placeholder() {
  return (
    <div style={{ padding: '24px', background: '#0a0b1a', width: '280px' }}>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick a category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="food">Food & Dining</SelectItem>
          <SelectItem value="transport">Transport</SelectItem>
          <SelectItem value="housing">Housing</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
