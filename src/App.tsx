import { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Trophy, User, LogOut } from 'lucide-react'
import Crear from './pages/Crear'
import Stats from './pages/Stats'
import Sala from './pages/Sala'
import AuthModal from './components/AuthModal'
import { getMiJugador, getMiNombre, clearMiSesion } from './lib/supabase'

export default function App() {
  const { pathname } = useLocation()
  const [yoId, setYoId] = useState<string | null>(getMiJugador())
  const [yoNombre, setYoNombre] = useState<string | null>(getMiNombre())
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    const sync = () => {
      setYoId(getMiJugador())
      setYoNombre(getMiNombre())
    }
    window.addEventListener('fulbito-auth-change', sync)
    return () => window.removeEventListener('fulbito-auth-change', sync)
  }, [])

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

          <nav className="flex items-center gap-2 sm:gap-3 text-sm">
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

            {yoId && yoNombre ? (
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                <User size={14} className="text-red-400" />
                <span className="max-w-[100px] truncate">{yoNombre}</span>
                <button
                  type="button"
                  title="Cerrar sesión"
                  onClick={clearMiSesion}
                  className="ml-1 rounded-lg p-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-300"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-2 text-xs font-black text-red-600 shadow transition hover:bg-zinc-100"
              >
                <User size={14} />
                <span>Entrar</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

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
