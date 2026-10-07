import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AuthApiError } from '../auth/auth-api';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/button';

const loginSchema = z.object({
  email: z.string().trim().email('Введите корректный email.'),
  password: z.string().min(8, 'Пароль должен содержать не менее 8 символов.'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (auth.status === 'bootstrapping') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F4F3] px-6">
        <p className="text-sm text-[#516988]">Проверяем сессию…</p>
      </main>
    );
  }

  if (auth.status === 'authenticated') return <Navigate to="/staff/dashboard" replace />;

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      await auth.login(values.email, values.password);
      const state = location.state as { from?: string } | null;
      void navigate(state?.from?.startsWith('/staff/') === true ? state.from : '/staff/dashboard', {
        replace: true,
      });
    } catch (error) {
      setServerError(
        error instanceof AuthApiError ? error.message : 'Не удалось войти. Попробуйте ещё раз.',
      );
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#F5F4F3] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#D3E1F1] bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-7 text-center">
          <p className="m-0 text-3xl font-semibold text-[#202A41]">Читай!</p>
          <h1 className="mt-4 text-xl font-semibold text-[#202A41]">Вход для сотрудников</h1>
          <p className="mt-2 text-sm leading-6 text-[#516988]">Используйте рабочий email и пароль.</p>
        </div>

        <form className="space-y-5" onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
          <label className="block text-sm font-medium text-[#202A41]">
            Email
            <input
              {...register('email')}
              type="email"
              autoComplete="username"
              className="mt-2 w-full rounded-lg border border-[#B9CBE1] px-3 py-2.5 outline-none focus:border-[#516988] focus:ring-2 focus:ring-[#D3E1F1]"
            />
            {errors.email && <span className="mt-1 block text-xs text-red-700">{errors.email.message}</span>}
          </label>

          <label className="block text-sm font-medium text-[#202A41]">
            Пароль
            <span className="relative mt-2 block">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="w-full rounded-lg border border-[#B9CBE1] px-3 py-2.5 pr-11 outline-none focus:border-[#516988] focus:ring-2 focus:ring-[#D3E1F1]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[#516988]"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
            {errors.password && <span className="mt-1 block text-xs text-red-700">{errors.password.message}</span>}
          </label>

          {serverError && (
            <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Входим…' : 'Войти'}
          </Button>

          <p className="text-center text-xs leading-5 text-[#71839B]">
            Восстановление пароля и приглашения подготовлены архитектурно и будут подключены к соответствующему flow.
          </p>
        </form>
      </section>
    </main>
  );
}
