import { ConfirmDialog } from 'gastapp-ui';

export function Delete() {
  return (
    <div style={{ position: 'relative', width: '480px', height: '280px', background: '#0a0b1a' }}>
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title='Delete "Transport"?'
        description="This permanently removes the category."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {}}
      />
    </div>
  );
}

export function WithChildren() {
  return (
    <div style={{ position: 'relative', width: '480px', height: '360px', background: '#0a0b1a' }}>
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title='Delete "Food & Dining"?'
        description="This category has 24 expenses. Pick a category to move them to first."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {}}
      >
        <div style={{ color: '#8a8db0', fontSize: '13px', padding: '8px 0' }}>
          Move expenses to: <span style={{ color: '#22d3ee' }}>Groceries</span>
        </div>
      </ConfirmDialog>
    </div>
  );
}
