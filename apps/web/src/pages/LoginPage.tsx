import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate } from 'react-router-dom';
import { loginSchema, type LoginDto } from '@gastapp/types';
import { useLogin } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { API_BASE, GOOGLE_AUTH_ENABLED } from '@/lib/env';

export function LoginPage() {
  const login = useLogin();
  const user = useAuthStore((s) => s.user);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
  });

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-pulse-bg p-4">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="pulse-glow-a absolute inset-0" />
        <div className="pulse-glow-b absolute inset-0" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="gradient-hero-text text-3xl font-bold tracking-tight">Pulse</span>
          <p className="mt-1 text-sm text-pulse-dim">Sign in to your account</p>
        </div>

        <Card className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit((dto) => login.mutate(dto))}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>
            {login.error && <p className="text-sm text-red-400">Invalid credentials</p>}
            <Button type="submit" disabled={login.isPending} className="w-full">
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {GOOGLE_AUTH_ENABLED && (
            <>
              <div className="my-4 flex items-center gap-2 text-xs text-pulse-faint">
                <div className="h-px flex-1 bg-pulse-stroke" /> OR <div className="h-px flex-1 bg-pulse-stroke" />
              </div>
              <Button variant="secondary" className="w-full" asChild>
                <a href={`${API_BASE}/auth/google`}>Continue with Google</a>
              </Button>
            </>
          )}

          <p className="mt-6 text-center text-sm text-pulse-dim">
            No account?{' '}
            <Link to="/register" className="text-pulse-v2 hover:underline">Create one</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
