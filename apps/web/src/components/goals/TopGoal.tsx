import { Link } from 'react-router-dom';
import { useGoals } from '@/hooks/use-goals';
import { Card } from '@/components/ui/card';
import { GoalProgress } from './GoalProgress';

/** Dashboard card for the first savings goal not reached yet. */
export function TopGoal() {
  const { data: goals } = useGoals();
  const goal = goals?.find((g) => g.progress.steps.some((s) => !s.reached)) ?? goals?.[0];
  if (!goal) return null;
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-pulse-text">{goal.name}</p>
        <Link to="/savings" className="text-xs text-pulse-faint hover:text-pulse-text hover:underline">
          Savings →
        </Link>
      </div>
      <GoalProgress goal={goal} compact />
    </Card>
  );
}
