import { useEffect, useState } from 'react'
import { Crown, Camera, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase, type Partido, type Inscripcion } from '../lib/supabase'

interface Fila { jugador_id: string; nombre: string; partidos: number; goles: number; asistencias: number; puntos: number; mvps: number }
const medalla = (n: number) => ['🥇', '🥈', '🥉'][n] ?? `${n + 1}.`

export default function Stats() {
  const [vista, setVista] = useState<'fecha' | 'anual'>('fecha')
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(['fecha', 'anual'] as const).map(v => (
          <button key={v} onClick={() => setVista(v)}
            className={`rounded-xl py-3 font-bold ${vista === v ? 'bg-red-600' : 'bg-zinc-800'}`}>
            {v === 'fecha' ? 'Por fecha' : 'Tabla anual'}</button>))}
      </div>
      {vista === 'fecha' ? <PorFecha /> : <Anual />}
    </div>)
}

function PorFecha() {
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [i, setI] = useState(0)
  const [insc, setInsc] = useState<Inscripcion[]>([])

  useEffect(() => {
    supabase.from('partidos').select('*').in('estado', ['confirmado', 'finalizado'])
      .not('numero_fecha', 'is', null).order('numero_fecha')
      .then(({ data }) => { const p = (data ?? []) as Partido[]; setPartidos(p); setI(Math.max(p.length - 1, 0)) })
  }, [])
  const p = partidos[i]
  useEffect(() => {
    if (!p) return
    supabase.from('inscripciones').select('*, jugadores(id,nombre)').eq('partido_id', p.id).order('orden_llegada')
      .then(({ data }) => setInsc(((data ?? []) as Inscripcion[]).slice(0, p.cupo_maximo)))
  }, [p?.id])

  if (!p) return <p className="py-10 text-center text-zinc-400">Todavía no hay fechas confirmadas.</p>
  const mvps = insc.filter(x => x.es_mvp)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="btn-ghost p-3" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft size={18} /></button>
        <div className="text-center"><b className="text-lg">Fecha #{p.numero_fecha}</b>
          <div className="text-xs text-zinc-400">{new Date(p.fecha_hora).toLocaleDateString('es-AR')}</div></div>
        <button className="btn-ghost p-3" disabled={i === partidos.length - 1} onClick={() => setI(i + 1)}><ChevronRight size={18} /></button>
      </div>
      {p.mvp_cerrado && mvps.length > 0 && (
        <div className="rounded-3xl border-4 border-amber-400 bg-gradient-to-b from-amber-300/25 to-zinc-950 p-4 text-center ring-2 ring-red-600">
          <p className="text-xs font-bold tracking-widest text-amber-300">MVP DE LA FECHA</p>
          {p.mvp_imagen_url ? <img src={p.mvp_imagen_url} alt="MVP" className="mx-auto my-2 h-32 w-32 rounded-2xl object-cover" />
            : <Crown size={56} className="mx-auto my-2 text-amber-400" />}
          <p className="text-xl font-black">{mvps.map(m => m.jugadores?.nombre).join(' & ')}</p>
        </div>)}
      {p.resultado_texto && <p className="text-center text-sm text-amber-300">{p.resultado_texto}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-zinc-400"><tr><th className="text-left">Jugador</th><th>Eq</th><th>G</th><th>A</th><th>Pts</th></tr></thead>
          <tbody>
            {[...insc].sort((a, b) => b.puntos_mvp_fecha - a.puntos_mvp_fecha).map(x => (
              <tr key={x.id} className="border-t border-white/5 text-center">
                <td className="py-2 text-left">{x.jugadores?.nombre}{x.es_mvp && ' 👑'}</td>
                <td className={x.equipo === 'A' ? 'text-sky-400' : 'text-rose-400'}>{x.equipo ?? '–'}</td>
                <td>{x.goles}</td><td>{x.asistencias}</td><td className="font-bold text-amber-300">{x.puntos_mvp_fecha}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>)
}

function Anual() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [tab, setTab] = useState<'mvp' | 'goles' | 'asist'>('mvp')
  const [filas, setFilas] = useState<Fila[]>([])
  const [foto, setFoto] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const cargar = () => {
    supabase.rpc('ranking_anual', { p_anio: anio }).then(({ data }) => setFilas((data ?? []) as Fila[]))
    supabase.from('premios_anuales').select('imagen_url').eq('anio', anio).maybeSingle()
      .then(({ data }) => setFoto(data?.imagen_url ?? null))
  }
  useEffect(cargar, [anio])

  const lider = filas[0]
  const orden = tab === 'mvp' ? filas
    : [...filas].sort((a, b) => tab === 'goles' ? b.goles - a.goles : b.asistencias - a.asistencias)
  const valor = (f: Fila) => tab === 'mvp' ? f.puntos : tab === 'goles' ? f.goles : f.asistencias
  const prom = (f: Fila) => ((tab === 'goles' ? f.goles : f.asistencias) / Math.max(f.partidos, 1)).toFixed(2)

  async function subir(file: File) {
    if (!lider) return
    const path = `anual/${anio}-${Date.now()}.${file.name.split('.').pop()}`
    const up = await supabase.storage.from('mvp-premios').upload(path, file, { upsert: true })
    if (up.error) return setMsg(up.error.message)
    const url = supabase.storage.from('mvp-premios').getPublicUrl(path).data.publicUrl
    const { error } = await supabase.from('premios_anuales').upsert({ anio, jugador_id: lider.jugador_id, imagen_url: url }, { onConflict: 'anio' })
    setMsg(error?.message ?? ''); cargar()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="btn-ghost p-3" onClick={() => setAnio(anio - 1)}><ChevronLeft size={18} /></button>
        <b className="text-xl">{anio}</b>
        <button className="btn-ghost p-3" onClick={() => setAnio(anio + 1)}><ChevronRight size={18} /></button>
      </div>
      {lider ? (
        <div className="rounded-3xl border-4 border-amber-400 bg-gradient-to-b from-amber-300/25 to-zinc-950 p-4 text-center ring-2 ring-red-600">
          <p className="text-xs font-bold tracking-widest text-amber-300">CUADRO DE HONOR · MVP {anio}</p>
          {foto ? <img src={foto} alt="MVP del año" className="mx-auto my-2 h-36 w-36 rounded-2xl object-cover" />
            : <Crown size={64} className="mx-auto my-2 text-amber-400" />}
          <p className="text-2xl font-black">{lider.nombre}</p>
          <p className="text-sm text-zinc-300">{lider.puntos} pts · {lider.partidos} fechas</p>
          <label className="btn-ghost mt-2 inline-flex cursor-pointer items-center gap-2 text-sm">
            <Camera size={14} />Adjuntar foto del año
            <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && subir(e.target.files[0])} /></label>
          {msg && <p className="text-xs text-red-400">{msg}</p>}
        </div>) : <p className="py-6 text-center text-zinc-400">Sin partidos en {anio}.</p>}

      <div className="grid grid-cols-3 gap-2 text-sm">
        {([['mvp', 'Ranking MVP'], ['goles', 'Goleadores'], ['asist', 'Asistidores']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-xl py-2 font-bold ${tab === k ? 'bg-red-600' : 'bg-zinc-800'}`}>{l}</button>))}
      </div>
      <div className="card">
        <ul className="space-y-1">
          {orden.map((f, n) => (
            <li key={f.jugador_id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${n < 3 ? 'bg-amber-400/10' : 'bg-black/30'}`}>
              <span><span className="mr-2 inline-block w-6">{medalla(n)}</span>{f.nombre}</span>
              <span className="text-right"><b className="text-amber-300">{valor(f)}</b>
                <span className="ml-2 text-xs text-zinc-400">{tab === 'mvp' ? `${f.mvps} MVP` : `${prom(f)}/partido`}</span></span>
            </li>))}
        </ul>
      </div>
    </div>)
}
