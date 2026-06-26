import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate } from 'react-router-dom';
import { registerSchema, type RegisterDto } from '@gastapp/types';
import { useRegister } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export function RegisterPage() {
  const reg = useRegister();
  const user = useAuthStore((s) => s.user);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterDto>({
    resolver: zodResolver(registerSchema),
  });

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-pulse-bg p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="pulse-glow-a absolute inset-0" />
        <div className="pulse-glow-b absolute inset-0" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="gradient-hero-text text-3xl font-bold tracking-tight">Pulse</span>
          <p className="mt-1 text-sm text-pulse-dim">Create your account</p>
        </div>

        <Card className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit((dto) => reg.mutate(dto))}>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>
            {reg.error && <p className="text-sm text-red-400">Could not register. Email may already be in use.</p>}
            <Button type="submit" disabled={reg.isPending} className="w-full">
              {reg.isPending ? 'Creating…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-pulse-dim">
            Have an account?{' '}
            <Link to="/login" className="text-pulse-v2 hover:underline">Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
