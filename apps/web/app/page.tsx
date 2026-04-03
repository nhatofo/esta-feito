import Link from 'next/link';
import { SERVICE_CATEGORIES, APP_NAME, APP_TAGLINE } from '@esta-feito/shared';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-earth-100/60 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-display text-2xl font-bold text-brand-600">
            {APP_NAME}
          </span>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="btn-secondary text-sm">
              Entrar
            </Link>
            <Link href="/auth?register=1" className="btn-primary text-sm">
              Registar
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-earth-900 text-white">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 80% 20%, #b45309 0%, transparent 40%)' }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-36">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/30
                            text-brand-300 text-xs font-semibold px-3 py-1 rounded-full mb-6">
              🇲🇿 Tete · Maputo · Moçambique
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] mb-6">
              Serviços ao<br />
              <span className="text-brand-400">seu alcance</span>
            </h1>
            <p className="text-earth-100 text-lg md:text-xl leading-relaxed mb-10 max-w-lg">
              Contrate profissionais de confiança para canalização, limpeza,
              electricidade e mais — pague com M-Pesa ou eMola.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/auth?register=1&role=customer" className="btn-primary px-8 py-3 text-base">
                Publicar Trabalho
              </Link>
              <Link href="/auth?register=1&role=provider" className="btn-secondary px-8 py-3 text-base bg-white/10 border-white/20 text-white hover:bg-white/20">
                Sou Prestador
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl text-ink mb-3">O que precisa?</h2>
          <p className="text-muted text-lg">Profissionais verificados para cada serviço</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {SERVICE_CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/jobs?category=${cat.value}`}
              className="card p-5 flex flex-col items-center gap-3 text-center
                         hover:shadow-[var(--shadow-float)] hover:-translate-y-1
                         transition-all duration-200 group cursor-pointer"
            >
              <span className="text-4xl">{cat.icon}</span>
              <span className="text-sm font-semibold text-ink group-hover:text-brand-600 transition-colors">
                {cat.labelPt}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-earth-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display text-4xl text-center mb-14">Como funciona</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', icon: '📋', title: 'Publique o trabalho', desc: 'Descreva o que precisa, onde e quando.' },
              { step: '02', icon: '💬', title: 'Receba propostas', desc: 'Prestadores próximos enviam cotações.' },
              { step: '03', icon: '✅', title: 'Escolha e reserve', desc: 'Selecione o melhor prestador e confirme.' },
              { step: '04', icon: '💳', title: 'Pague facilmente', desc: 'M-Pesa, eMola ou dinheiro. Simples.' },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-brand-500 font-display text-6xl font-bold opacity-20 absolute -top-4 -left-2">
                  {item.step}
                </div>
                <div className="relative text-3xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-earth-100/70 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-earth-100 bg-white py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display text-xl font-bold text-brand-600">{APP_NAME}</span>
          <p className="text-muted text-sm">{APP_TAGLINE} — Tete &amp; Maputo, Moçambique</p>
          <p className="text-muted text-xs">© {new Date().getFullYear()} Esta Feito</p>
        </div>
      </footer>
    </main>
  );
}
