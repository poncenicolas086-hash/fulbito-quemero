import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase, type Partido } from '../lib/supabase'

interface Props {
  partido: Partido
  token: string | null
  onClose: () => void
  onSaved: () => void
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export default function ReprogramarModal({ partido, token, onClose, onSaved }: Props) {
  const [fecha, setFecha] = useState(toLocalInput(partido.fecha_hora))
  const [lugar, setLugar] = useState(partido.ubicacion ?? '')
  const [maps, setMaps] = useState(partido.link_maps ?? '')
  const [precio, setPrecio] = useState(Number(partido.precio_cancha ?? 0))
  const [sena, setSena] = useState(Boolean(partido.tiene_sena))
  const [montoSena, setMontoSena] = useState(Number(partido.monto_sena ?? 0))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function guardar() {
    if (!fecha) return setErr('Elegí la nueva fecha y hora')
    setBusy(true)
    setErr('')
    const { error } = await supabase.rpc('reprogramar_partido', {
      p_partido: partido.id,
      p_token: token,
      p_fecha: new Date(fecha).toISOString(),
      p_ubicacion: lugar,
      p_maps: maps,
      p_precio: precio,
      p_sena: sena,
      p_monto: sena ? montoSena : null,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[28px] border border-white/15 bg-zinc-950 p-6 shadow-[0_25px_70px_rgba(220,38,38,0.35)] space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">Organizador</span>
            <h3 className="text-xl font-black text-white">Reprogramar partido</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <span>Nueva fecha y hora</span>
            <input className="input" type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} />
          </label>

          <label className="block space-y-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <span>Cancha / Ubicación</span>
            <input
              className="input"
              placeholder="Nombre de la cancha"
              value={lugar}
              onChange={e => setLugar(e.target.value)}
            />
          </label>

          <label className="block space-y-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <span>Link de Google Maps</span>
            <input
              className="input"
              placeholder="https://maps.google.com/..."
              value={maps}
              onChange={e => setMaps(e.target.value)}
            />
          </label>

          <label className="block space-y-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <span>Precio total de la cancha</span>
            <input
              className="input"
              type="number"
              min={0}
              value={precio || ''}
              onChange={e => setPrecio(+e.target.value)}
            />
          </label>

          <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-zinc-900/70 p-3 text-sm">
            <span className="font-semibold text-white">¿Hay seña?</span>
            <button
              type="button"
              onClick={() => setSena(!sena)}
              className={`flex h-7 w-14 items-center rounded-full px-1 transition ${
                sena ? 'justify-end bg-red-600' : 'justify-start bg-zinc-800'
              }`}
            >
              <span className="h-5 w-5 rounded-full bg-white" />
            </button>
          </div>

          {sena && (
            <input
              className="input"
              type="number"
              min={0}
              placeholder="Monto de la seña"
              value={montoSena || ''}
              onChange={e => setMontoSena(+e.target.value)}
            />
          )}

          {err && <p className="text-sm font-medium text-red-400">{err}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-ghost flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn-red flex-1" disabled={busy} onClick={guardar}>
              {busy ? 'Guardando…' : 'Guardar reprogramación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
