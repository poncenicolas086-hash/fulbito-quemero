import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Crown, Trophy } from 'lucide-react'
import Crear from './pages/Crear'
import Stats from './pages/Stats'
import Sala from './pages/Sala'

export default function App() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen text-slate-100">
      {/* Franja superior albirroja */}
      <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-white to-red-600" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3 font-black tracking-tight text-white group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 p-1.5 shadow-[0_0_20px_rgba(220,38,38,0.45)] ring-2 ring-red-500 transition group-hover:scale-105">
              <img src="/favicon.png" alt="Fulbito Quemero" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="text-lg tracking-tight">
                FULBITO <span className="text-red-500">QUEMERO</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
                Blanco y Rojo · Amateur
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4 text-sm">
            <Link
              to="/"
              className={`rounded-2xl px-3.5 py-2 font-semibold transition ${
                pathname === '/'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-zinc-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              Inicio
            </Link>
            <Link
              to="/stats"
              className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 font-semibold transition ${
                pathname === '/stats'
                  ? 'bg-red-600 text-white shadow-[0_8px_20px_rgba(220,38,38,0.35)]'
                  : 'border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20'
              }`}
            >
              <Trophy size={15} className="text-amber-300" />
              <span>Tablas</span>
            </Link>
            <span className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white md:inline-flex">
              <Crown size={13} className="text-red-500" />
              En vivo
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Crear />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/partido/:id" element={<Sala />} />
        </Routes>
      </main>
    </div>
  )
}
