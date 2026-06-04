import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate } from 'react-router-dom';
import { loginSchema, type LoginDto } from '@gastapp/types';
import { useLogin } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const apiBase = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api`;

export function LoginPage() {
  const login = useLogin();
  const user = useAuthStore((s) => s.user);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
  });

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-brand">GastApp</h1>
        <p className="mb-6 text-sm text-neutral-500">Sign in to your account</p>
        <form className="space-y-4" onSubmit={handleSubmit((dto) => login.mutate(dto))}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>
          {login.error && (
            <p className="text-sm text-red-600">Invalid credentials</p>
          )}
          <Button type="submit" disabled={login.isPending} className="w-full">
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <div className="my-4 flex items-center gap-2 text-xs text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200" /> OR <div className="h-px flex-1 bg-neutral-200" />
        </div>
        <Button variant="secondary" className="w-full" asChild>
          <a href={`${apiBase}/auth/google`}>Continue with Google</a>
        </Button>
        <p className="mt-6 text-center text-sm text-neutral-500">
          No account?{' '}
          <Link to="/register" className="text-brand hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
