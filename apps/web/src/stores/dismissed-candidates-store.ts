import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Recurring-charge suggestions the user said are not subscriptions (rent, a
 * regular transfer…). Per browser only — dismissing is a display preference,
 * not data worth a table.
 */
interface DismissedCandidatesState {
  keys: string[];
  dismiss: (key: string) => void;
  restoreAll: () => void;
}

export const useDismissedCandidatesStore = create<DismissedCandidatesState>()(
  persist(
    (set, get) => ({
      keys: [],
      dismiss: (key) => {
        if (!get().keys.includes(key)) set({ keys: [...get().keys, key] });
      },
      restoreAll: () => set({ keys: [] }),
    }),
    { name: 'gastapp-dismissed-recurring' },
  ),
);
