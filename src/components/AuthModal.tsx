import { useState } from 'react'
import { Lock, User, X } from 'lucide-react'
import { supabase, setMiSesion } from '../lib/supabase'

interface Props {
  onClose: () => void
  onSuccess?: (jugador: { id: string; nombre: string }) => void
}

export default function AuthModal({ onClose, onSuccess }: Props) {
  const [nombre, setNombre] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !pin.trim()) return setErr('Completá tu Nick y tu PIN / clave')
    setBusy(true)
    setErr('')
    const { data, error } = await supabase.rpc('entrar_jugador', {
      p_nombre: nombre.trim(),
      p_pin: pin.trim(),
    })
    setBusy(false)
    if (error || !data?.[0]) {
      return setErr(error?.message ?? 'No se pudo iniciar sesión')
    }
    const row = data[0]
    setMiSesion(row.id, row.nombre, row.token)
    onSuccess?.({ id: row.id, nombre: row.nombre })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[28px] border border-white/15 bg-zinc-950 p-6 shadow-[0_25px_70px_rgba(220,38,38,0.35)] space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">Cuenta de Jugador</span>
            <h3 className="text-xl font-black text-white">Entrar o Crear tu Nick</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-zinc-400">
          Si tu Nick no existe, se crea automáticamente con el PIN que elijas. Si ya existe, ingresá tu PIN para entrar.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1.5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <User size={13} className="text-red-400" /> Tu Nick / Apodo
            </span>
            <input
              className="input"
              placeholder="Ej: Levi"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              autoFocus
            />
          </label>

          <label className="block space-y-1.5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Lock size={13} className="text-red-400" /> PIN o Clave (mín. 3 caracteres)
            </span>
            <input
              className="input"
              type="password"
              placeholder="Ej: 1234"
              value={pin}
              onChange={e => setPin(e.target.value)}
            />
          </label>

          {err && <p className="rounded-xl bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300">{err}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn-ghost flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-red flex-1" disabled={busy}>
              {busy ? 'Verificando…' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
