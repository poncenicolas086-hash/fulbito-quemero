import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Copy, MapPin, Calendar, Users, Shield } from 'lucide-react'
import VotarStats from '../components/VotarStats'
import TercerTiempo from '../components/TercerTiempo'
import Versus from '../components/Versus'
import ReprogramarModal from '../components/ReprogramarModal'
import { supabase, getAdminToken, setAdminToken, getMiJugador, setMiJugador,
  type Partido, type Inscripcion, type Jugador } from '../lib/supabase'

const BADGE: Record<string, string> = {
  abierto: 'bg-emerald-600', reprogramado: 'bg-amber-500 text-black',
  confirmado: 'bg-red-600', finalizado: 'bg-zinc-600', cancelado: 'bg-zinc-800 text-zinc-400' }

export default function Sala() {
  const { id = '' } = useParams()
  const [qs] = useSearchParams()
  const [partido, setPartido] = useState<Partido | null>(null)
  const [insc, setInsc] = useState<Inscripcion[]>([])
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [yo, setYo] = useState<string | null>(getMiJugador())
  const [reprog, setReprog] = useState(false)

  useEffect(() => { const t = qs.get('admin'); if (t) setAdminToken(id, t) }, [id, qs])
  const token = getAdminToken(id)
  const esAdmin = !!token

  const cargar = useCallback(async () => {
    const [p, i, j] = await Promise.all([
      supabase.from('partidos').select('*').eq('id', id).single(),
      supabase.from('inscripciones').select('*, jugadores(id,nombre)').eq('partido_id', id).order('orden_llegada'),
      supabase.from('jugadores').select('*').order('nombre')])
    if (p.data) setPartido(p.data as Partido)
    setInsc((i.data ?? []) as Inscripcion[]); setJugadores((j.data ?? []) as Jugador[])
  }, [id])

  useEffect(() => {
    cargar()
    const ch = supabase.channel(`sala-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inscripciones', filter: `partido_id=eq.${id}` }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos', filter: `id=eq.${id}` }, cargar)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, cargar])

  const titulares = useMemo(() => insc.slice(0, partido?.cupo_maximo ?? 0), [insc, partido])
  const suplentes = useMemo(() => insc.slice(partido?.cupo_maximo ?? 0), [insc, partido])
  const anotados = new Set(insc.map(i => i.jugador_id))
  const sugeridos = jugadores.filter(j => q && j.nombre.toLowerCase().includes(q.trim().toLowerCase()))
  const existeExacto = jugadores.some(j => j.nombre.trim().toLowerCase() === q.trim().toLowerCase())

  async function anotar(jid: string) {
    if (anotados.has(jid)) return setMsg('Ya está anotado')
    const { error } = await supabase.from('inscripciones').insert({ partido_id: id, jugador_id: jid })
    if (error) return setMsg(error.message)
    setMiJugador(jid); setYo(jid); setQ(''); setMsg('')
  }
  async function crearYAnotar() {
    const nombre = q.trim(); if (!nombre) return
    const { data, error } = await supabase.from('jugadores').insert({ nombre }).select().single()
    if (error) return setMsg(error.code === '23505' ? 'Ese nombre ya existe, elegilo de la lista' : error.message)
    setJugadores(p => [...p, data as Jugador]); anotar(data.id)
  }
  const bajar = async (iid: string) => { await supabase.from('inscripciones').delete().eq('id', iid) }
  const rpc = async (fn: string, args: object = {}) => {
    const { error } = await supabase.rpc(fn, { p_partido: id, p_token: token, ...args })
    setMsg(error ? error.message : ''); cargar()
  }
  const copiar = (t: string) => navigator.clipboard.writeText(t)
  const base = `${location.origin}/partido/${id}`

  if (!partido) return <p className="py-10 text-center text-zinc-400">Cargando…</p>
  const abierta = partido.estado === 'abierto' || partido.estado === 'reprogramado'
  const llenos = titulares.length >= partido.cupo_maximo

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${BADGE[partido.estado]}`}>{partido.estado}</span>
          {partido.numero_fecha && <b className="text-amber-400">Fecha #{partido.numero_fecha}</b>}
        </div>
        <p className="flex items-center gap-2"><Calendar size={16} className="text-red-500" />
          {new Date(partido.fecha_hora).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}</p>
        <p className="flex items-center gap-2"><MapPin size={16} className="text-red-500" />
          {partido.link_maps ? <a className="underline" href={partido.link_maps} target="_blank" rel="noreferrer">{partido.ubicacion || 'Ver mapa'}</a> : partido.ubicacion}</p>
        <p className="flex items-center gap-2"><Users size={16} className="text-red-500" />
          {titulares.length}/{partido.cupo_maximo} titulares · {partido.formato}</p>
        <button className="btn-ghost w-full" onClick={() => copiar(base)}><Copy className="mr-2 inline" size={16} />Copiar link para jugadores</button>
      </div>

      {esAdmin && (
        <div className="card space-y-2 border-red-600">
          <p className="flex items-center gap-2 font-bold text-red-500"><Shield size={16} />Organizador</p>
          <button className="btn-ghost w-full" onClick={() => copiar(`${base}?admin=${token}`)}>Copiar link de organizador</button>
          {abierta && <>
            <button className="btn-red w-full" onClick={() => rpc('confirmar_partido')}>Confirmar partido</button>
            <button className="btn-ghost w-full" disabled={!llenos} onClick={() => rpc('armar_equipos')}>Armar equipos equilibrados</button>
            <button className="btn-ghost w-full text-amber-400" onClick={() => setReprog(true)}>Reprogramar fecha / cancha</button>
            <button className="btn-ghost w-full text-zinc-300" onClick={() => confirm('¿Cancelar el partido?') && rpc('cancelar_partido')}>Cancelar</button>
          </>}
          {partido.estado === 'confirmado' && <>
            <button className="btn-red w-full" onClick={() => rpc('finalizar_partido', { p_resultado: prompt('Resultado (opcional)') ?? '' })}>Finalizar partido</button>
            <button className="btn-ghost w-full text-amber-400" onClick={() => setReprog(true)}>Reprogramar fecha / cancha</button>
          </>}
        </div>)}

      {reprog && (
        <ReprogramarModal
          partido={partido}
          token={token}
          onClose={() => setReprog(false)}
          onSaved={cargar}
        />
      )}

      {abierta && (
        <div className="card space-y-2">
          <input className="input" placeholder="Buscá tu nombre o creá uno" value={q} onChange={e => setQ(e.target.value)} />
          {sugeridos.map(j => (
            <button key={j.id} disabled={anotados.has(j.id)} onClick={() => anotar(j.id)}
              className="btn-ghost w-full text-left">{j.nombre}{anotados.has(j.id) && ' ✓'}</button>))}
          {q.trim() && !existeExacto && <button className="btn-red w-full" onClick={crearYAnotar}>Crear “{q.trim()}” y anotarme</button>}
          {msg && <p className="text-sm text-red-400">{msg}</p>}
        </div>)}

      <Versus partidoId={id} titulares={titulares} />
      {(partido.estado === 'confirmado' || partido.estado === 'finalizado') &&
        <TercerTiempo partido={partido} titulares={titulares} yo={yo} token={token} onChange={cargar} />}
      {abierta && yo && anotados.has(yo) && <VotarStats partidoId={id} yo={yo} jugadores={insc} />}

      <Lista titulo="Titulares" items={titulares} yo={yo} esAdmin={esAdmin} abierta={abierta} onBajar={bajar} />
      {suplentes.length > 0 && <Lista titulo="Suplentes" items={suplentes} yo={yo} esAdmin={esAdmin} abierta={abierta} onBajar={bajar} />}
    </div>
  )
}

function Lista({ titulo, items, yo, esAdmin, abierta, onBajar }: {
  titulo: string; items: Inscripcion[]; yo: string | null; esAdmin: boolean; abierta: boolean; onBajar: (id: string) => void }) {
  return (
    <div className="card">
      <h2 className="mb-2 font-bold">{titulo} ({items.length})</h2>
      <ul className="space-y-1">
        {items.map((i, n) => (
          <li key={i.id} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
            <span>{n + 1}. {i.jugadores?.nombre}
              {i.equipo && <b className={`ml-2 text-xs ${i.equipo === 'A' ? 'text-sky-400' : 'text-rose-400'}`}>Equipo {i.equipo}</b>}</span>
            {abierta && (i.jugador_id === yo || esAdmin) &&
              <button className="text-xs text-red-400" onClick={() => onBajar(i.id)}>Bajarme</button>}
          </li>))}
      </ul>
    </div>)
}
