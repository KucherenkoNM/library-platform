import { ExternalLink } from 'lucide-react';
import { Button } from './components/ui/button';
import { webEnv } from './config/env';

export function App() {
  const apiOrigin = new URL(webEnv.VITE_API_URL).origin;

  return (
    <main className="min-h-screen bg-[#F5F4F3] px-6 py-12">
      <section className="mx-auto max-w-3xl rounded-xl border border-[#D3E1F1] bg-white p-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#516988]">
          Этап 0
        </p>
        <h1 className="m-0 text-3xl font-semibold text-[#202A41]">Читай!</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#516988]">
          Каркас Library Management Platform запущен. Функциональные экраны и бизнес-логика
          добавляются только по порядку из implementation-plan.md.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <a href={`${apiOrigin}/health/live`} target="_blank" rel="noreferrer">
              API health
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`${apiOrigin}/api/docs`} target="_blank" rel="noreferrer">
              Swagger
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}
