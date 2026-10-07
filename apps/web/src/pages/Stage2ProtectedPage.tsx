import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/button';

export function Stage2ProtectedPage() {
  const auth = useAuth();

  return (
    <main className="min-h-screen bg-[#F5F4F3] px-6 py-12">
      <section className="mx-auto max-w-3xl rounded-xl border border-[#D3E1F1] bg-white p-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#516988]">Stage 2</p>
        <h1 className="m-0 text-3xl font-semibold text-[#202A41]">Авторизация работает</h1>
        <p className="mt-4 text-base leading-7 text-[#516988]">
          Вы вошли как {auth.user?.firstName} {auth.user?.lastName} в «{auth.user?.library.name}».
          Полноценный Dashboard относится к Stage 3 и здесь не реализован.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => void auth.logout()}>Выйти</Button>
          <Button type="button" variant="outline" onClick={() => void auth.logoutAll()}>
            Выйти на всех устройствах
          </Button>
        </div>
      </section>
    </main>
  );
}
