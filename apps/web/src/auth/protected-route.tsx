import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'bootstrapping') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F4F3] px-6">
        <p className="text-sm text-[#516988]">Проверяем сессию…</p>
      </main>
    );
  }

  if (auth.status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
