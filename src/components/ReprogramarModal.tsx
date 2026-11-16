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
    setBusy(true); setErr('')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="card w-full max-w-md space-y-3 border-amber-500" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-amber-400">Reprogramar partido</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:text-white"><X size={18} /></button>
        </div>

        <label className="block text-xs text-zinc-400">Nueva fecha y hora</label>
        <input className="input" type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} />

        <label className="block text-xs text-zinc-400">Cancha / Ubicación</label>
        <input className="input" placeholder="Nombre de la cancha" value={lugar} onChange={e => setLugar(e.target.value)} />

        <label className="block text-xs text-zinc-400">Link de Google Maps</label>
        <input className="input" placeholder="https://maps.google.com/..." value={maps} onChange={e => setMaps(e.target.value)} />

        <label className="block text-xs text-zinc-400">Precio total de la cancha</label>
        <input className="input" type="number" min={0} value={precio || ''} onChange={e => setPrecio(+e.target.value)} />

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm">¿Hay seña?</span>
          <button type="button" onClick={() => setSena(!sena)}
            className={`rounded-full px-5 py-1.5 text-sm font-bold ${sena ? 'bg-red-600' : 'bg-zinc-800'}`}>
            {sena ? 'Sí' : 'No'}
          </button>
        </div>

        {sena && (
          <input className="input" type="number" min={0} placeholder="Monto de la seña"
            value={montoSena || ''} onChange={e => setMontoSena(+e.target.value)} />
        )}

        {err && <p className="text-sm text-red-400">{err}</p>}

        <div className="flex gap-2 pt-2">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn-red flex-1" disabled={busy} onClick={guardar}>
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
