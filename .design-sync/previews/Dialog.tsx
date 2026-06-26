import { Dialog, DialogContent, DialogClose, Button, Input, Label } from 'gastapp-ui';

export function NewExpense() {
  return (
    <div style={{ position: 'relative', width: '560px', height: '480px', background: '#0a0b1a' }}>
      <Dialog open>
        <DialogContent title="New expense">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Label>Description</Label>
              <Input placeholder="Grocery store" defaultValue="Whole Foods" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Label>Amount</Label>
              <Input placeholder="0.00" defaultValue="84.32" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Label>Date</Label>
              <Input type="date" defaultValue="2026-06-25" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button variant="primary">Add expense</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
