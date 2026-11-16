import { useEffect, useState } from 'react'
import { Crown, Minus, Plus, Camera } from 'lucide-react'
import { supabase, type Partido, type Inscripcion } from '../lib/supabase'

interface Props {
  partido: Partido; titulares: Inscripcion[]; yo: string | null
  token: string | null; onChange: () => void
}

export default function TercerTiempo({ partido, titulares, yo, token, onChange }: Props) {
  const esAdmin = !!token
  const [prog, setProg] = useState({ votaron: 0, total: titulares.length })
  const [miVoto, setMiVoto] = useState('')
  const [msg, setMsg] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const juega = !!yo && titulares.some(t => t.jugador_id === yo)

  useEffect(() => {
    const leer = () => supabase.rpc('progreso_mvp', { p_partido: partido.id }).then(({ data }) => {
      if (data?.[0]) setProg(data[0])
    })
    leer()
    if (partido.mvp_cerrado) return
    const t = setInterval(leer, 5000) // los votos son secretos: sin Realtime, se consulta el conteo
    return () => clearInterval(t)
  }, [partido.id, partido.mvp_cerrado, miVoto])

  async function contar(i: Inscripcion, campo: 'goles' | 'asistencias', d: number) {
    const goles = Math.max(0, i.goles + (campo === 'goles' ? d : 0))
    const asist = Math.max(0, i.asistencias + (campo === 'asistencias' ? d : 0))
    const { error } = await supabase.rpc('guardar_goles', {
      p_partido: partido.id, p_jugador: i.jugador_id, p_goles: goles, p_asist: asist })
    setMsg(error?.message ?? ''); onChange()
  }

  async function votar() {
    if (!yo || !miVoto) return
    const { error } = await supabase.rpc('votar_mvp', { p_partido: partido.id, p_votante: yo, p_votado: miVoto })
    setMsg(error?.message ?? ''); onChange()
  }

  async function cerrarUrna() {
    const { error } = await supabase.rpc('cerrar_urna_mvp', { p_partido: partido.id, p_token: token })
    setMsg(error?.message ?? ''); onChange()
  }

  async function subirFoto(file: File) {
    setSubiendo(true)
    const path = `fechas/${partido.id}-${Date.now()}.${file.name.split('.').pop()}`
    const up = await supabase.storage.from('mvp-premios').upload(path, file, { upsert: true })
    if (up.error) { setSubiendo(false); return setMsg(up.error.message) }
    const url = supabase.storage.from('mvp-premios').getPublicUrl(path).data.publicUrl
    const { error } = await supabase.rpc('set_mvp_imagen', { p_partido: partido.id, p_token: token, p_url: url })
    setSubiendo(false); setMsg(error?.message ?? ''); onChange()
  }

  const mvps = titulares.filter(t => t.es_mvp)
  const Counter = ({ i, campo }: { i: Inscripcion; campo: 'goles' | 'asistencias' }) => {
    const puede = i.jugador_id === yo || esAdmin
    return (
      <div className="flex items-center gap-2">
        <button disabled={!puede} onClick={() => contar(i, campo, -1)} className="rounded-lg bg-zinc-800 p-2 disabled:opacity-30"><Minus size={14} /></button>
        <b className="w-5 text-center">{i[campo]}</b>
        <button disabled={!puede} onClick={() => contar(i, campo, 1)} className="rounded-lg bg-red-600 p-2 disabled:opacity-30"><Plus size={14} /></button>
      </div>)
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="mb-1 font-bold">Tercer tiempo 🍻</h2>
        {partido.resultado_texto && <p className="mb-2 text-sm text-amber-300">Resultado: {partido.resultado_texto}</p>}
        <div className="mb-1 grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs text-zinc-400"><span /><span>Goles</span><span>Asist.</span></div>
        <ul className="space-y-1">
          {titulares.map(i => (
            <li key={i.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 rounded-lg bg-black/30 px-3 py-2">
              <span className="truncate">{i.jugadores?.nombre}</span>
              <Counter i={i} campo="goles" /><Counter i={i} campo="asistencias" />
            </li>))}
        </ul>
      </div>

      {!partido.mvp_cerrado ? (
        <div className="card space-y-3">
          <h2 className="font-bold">Votá al MVP 🤫</h2>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-red-600 transition-all" style={{ width: `${prog.total ? (prog.votaron / prog.total) * 100 : 0}%` }} /></div>
          <p className="text-sm text-zinc-300">Votaron {prog.votaron} de {prog.total}</p>
          {juega && (<>
            <select className="input" value={miVoto} onChange={e => setMiVoto(e.target.value)}>
              <option value="">Elegí a un jugador…</option>
              {titulares.filter(t => t.jugador_id !== yo).map(t => <option key={t.id} value={t.jugador_id}>{t.jugadores?.nombre}</option>)}
            </select>
            <button className="btn-red w-full" disabled={!miVoto} onClick={votar}>Votar</button></>)}
          {esAdmin && <button className="btn-ghost w-full" onClick={cerrarUrna}>Cerrar urna y revelar</button>}
        </div>
      ) : (
        <div className="rounded-3xl border-4 border-amber-400 bg-gradient-to-b from-amber-300/25 to-zinc-950 p-1 ring-2 ring-red-600">
          <div className="space-y-3 rounded-[20px] bg-zinc-950/80 p-4 text-center">
            <p className="text-xs font-bold tracking-widest text-amber-300">MVP DE LA FECHA {partido.numero_fecha ? `#${partido.numero_fecha}` : ''}</p>
            {partido.mvp_imagen_url
              ? <img src={partido.mvp_imagen_url} alt="MVP" className="mx-auto h-48 w-48 rounded-2xl border-2 border-amber-400 object-cover" />
              : <Crown size={72} className="mx-auto text-amber-400" />}
            <p className="text-2xl font-black">{mvps.map(m => m.jugadores?.nombre).join(' & ') || 'Sin MVP'}</p>
            {esAdmin && (
              <label className="btn-ghost inline-flex cursor-pointer items-center gap-2">
                <Camera size={16} />{subiendo ? 'Subiendo…' : partido.mvp_imagen_url ? 'Cambiar foto' : 'Subir foto honorífica'}
                <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && subirFoto(e.target.files[0])} />
              </label>)}
          </div>
        </div>)}
      {msg && <p className="text-sm text-red-400">{msg}</p>}
    </div>)
}
