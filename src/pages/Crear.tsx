import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, setAdminToken } from '../lib/supabase'

const FORMATOS: Record<string, number> = { F5: 10, F6: 12, F7: 14, F8: 16 }
const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export default function Crear() {
  const nav = useNavigate()
  const [formato, setFormato] = useState('F7')
  const [custom, setCustom] = useState(10)
  const [fecha, setFecha] = useState('')
  const [lugar, setLugar] = useState('')
  const [maps, setMaps] = useState('')
  const [precio, setPrecio] = useState(0)
  const [sena, setSena] = useState(false)
  const [montoSena, setMontoSena] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const cupo = formato === 'CUSTOM' ? custom : FORMATOS[formato]
  const total = cupo > 0 ? precio / cupo : 0
  const senaPP = cupo > 0 ? montoSena / cupo : 0

  async function crear() {
    if (!fecha) return setErr('Elegí fecha y hora')
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('crear_partido', {
      p_formato: formato, p_cupo: cupo, p_fecha: new Date(fecha).toISOString(),
      p_ubicacion: lugar, p_maps: maps, p_precio: precio,
      p_sena: sena, p_monto_sena: sena ? montoSena : null })
    setBusy(false)
    if (error || !data?.[0]) return setErr(error?.message ?? 'Error al crear')
    setAdminToken(data[0].id, data[0].admin_token)
    nav(`/partido/${data[0].id}`)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Armá el partido ⚽</h1>
      <div className="card space-y-3">
        <div className="grid grid-cols-5 gap-2">
          {[...Object.keys(FORMATOS), 'CUSTOM'].map(f => (
            <button key={f} onClick={() => setFormato(f)}
              className={`rounded-xl py-3 text-sm font-bold ${formato === f ? 'bg-red-600' : 'bg-zinc-800'}`}>
              {f === 'CUSTOM' ? 'Otro' : f}
            </button>))}
        </div>
        {formato === 'CUSTOM'
          ? <input className="input" type="number" min={2} value={custom}
              onChange={e => setCustom(+e.target.value)} placeholder="Cupo" />
          : <p className="text-sm text-zinc-400">Cupo: {cupo} jugadores</p>}
        <input className="input" type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} />
        <input className="input" placeholder="Nombre de la cancha" value={lugar} onChange={e => setLugar(e.target.value)} />
        <input className="input" placeholder="Link de Google Maps" value={maps} onChange={e => setMaps(e.target.value)} />
      </div>

      <div className="card space-y-3">
        <label className="text-sm text-zinc-300">Precio total de la cancha</label>
        <input className="input" type="number" min={0} value={precio || ''} onChange={e => setPrecio(+e.target.value)} />
        <div className="flex items-center justify-between">
          <span>¿Hay seña?</span>
          <button onClick={() => setSena(!sena)}
            className={`rounded-full px-5 py-2 font-bold ${sena ? 'bg-red-600' : 'bg-zinc-800'}`}>{sena ? 'Sí' : 'No'}</button>
        </div>
        {sena && <input className="input" type="number" min={0} placeholder="Monto de la seña"
          value={montoSena || ''} onChange={e => setMontoSena(+e.target.value)} />}
        <div className="rounded-xl bg-black/40 p-3 text-sm space-y-1">
          {sena ? (<>
            <div className="flex justify-between"><span>Seña por cabeza</span><b>{money(senaPP)}</b></div>
            <div className="flex justify-between"><span>Resto en cancha</span><b>{money(total - senaPP)}</b></div>
          </>) : null}
          <div className="flex justify-between text-base"><span>Total por cabeza</span><b className="text-red-500">{money(total)}</b></div>
        </div>
      </div>
      {err && <p className="text-red-400 text-sm">{err}</p>}
      <button className="btn-red w-full text-lg" disabled={busy} onClick={crear}>
        {busy ? 'Creando…' : 'Crear partido'}</button>
    </div>
  )
}
