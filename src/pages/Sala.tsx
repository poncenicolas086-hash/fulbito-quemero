import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Copy, MapPinned, CalendarDays, Users, ShieldCheck, Check, Sparkles, UserMinus } from 'lucide-react'
import VotarStats from '../components/VotarStats'
import TercerTiempo from '../components/TercerTiempo'
import Versus from '../components/Versus'
import ReprogramarModal from '../components/ReprogramarModal'
import {
  supabase,
  PARTIDO_COLS,
  getAdminToken,
  setAdminToken,
  getMiJugador,
  setMiJugador,
  type Partido,
  type Inscripcion,
  type Jugador,
} from '../lib/supabase'

const statusColor: Record<Partido['estado'], string> = {
  abierto: 'bg-white text-red-600 ring-1 ring-white',
  reprogramado: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40',
  confirmado: 'bg-red-600 text-white ring-1 ring-red-400',
  finalizado: 'bg-white/10 text-white ring-1 ring-white/30',
  cancelado: 'bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700',
}

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

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
  const [copied, setCopied] = useState<'player' | 'admin' | null>(null)

  useEffect(() => {
    const t = qs.get('admin')
    if (t) setAdminToken(id, t)
  }, [id, qs])
  const token = getAdminToken(id)
  const esAdmin = !!token

  const cargar = useCallback(async () => {
    const [p, i, j] = await Promise.all([
      supabase.from('partidos').select(PARTIDO_COLS).eq('id', id).single(),
      supabase.from('inscripciones').select('*, jugadores(id,nombre)').eq('partido_id', id).order('orden_llegada'),
      supabase.from('jugadores').select('*').order('nombre'),
    ])
    if (p.data) setPartido(p.data as unknown as Partido)
    setInsc((i.data ?? []) as Inscripcion[])
    setJugadores((j.data ?? []) as Jugador[])
  }, [id])

  useEffect(() => {
    cargar()
    const ch = supabase
      .channel(`sala-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inscripciones', filter: `partido_id=eq.${id}` }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos', filter: `id=eq.${id}` }, cargar)
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
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
    setMiJugador(jid)
    setYo(jid)
    setQ('')
    setMsg('')
  }

  async function crearYAnotar() {
    const nombre = q.trim()
    if (!nombre) return
    const { data, error } = await supabase.from('jugadores').insert({ nombre }).select().single()
    if (error) return setMsg(error.code === '23505' ? 'Ese nombre ya existe, elegilo de la lista' : error.message)
    setJugadores(p => [...p, data as Jugador])
    anotar(data.id)
  }

  const bajar = async (iid: string) => {
    await supabase.from('inscripciones').delete().eq('id', iid)
  }

  const rpc = async (fn: string, args: object = {}) => {
    const { error } = await supabase.rpc(fn, { p_partido: id, p_token: token, ...args })
    setMsg(error ? error.message : '')
    cargar()
  }

  const copiar = (t: string, tipo: 'player' | 'admin') => {
    navigator.clipboard.writeText(t)
    setCopied(tipo)
    setTimeout(() => setCopied(null), 2000)
  }

  const base = `${location.origin}/partido/${id}`

  if (!partido) {
    return (
      <div className="card py-16 text-center">
        <p className="text-lg font-bold text-zinc-300">Cargando sala del partido…</p>
      </div>
    )
  }

  const abierta = partido.estado === 'abierto' || partido.estado === 'reprogramado'
  const llenos = titulares.length >= partido.cupo_maximo
  const costoCabeza = partido.cupo_maximo > 0 ? partido.precio_cancha / partido.cupo_maximo : 0

  return (
    <div className="space-y-6">
      {/* Cabecera de Sala estilo fulbiquemero */}
      <section className="card-white overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/15 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.26em] text-red-300">
              <ShieldCheck size={15} className="text-red-400" />
              Fechas y control · Sala en vivo
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              {partido.ubicacion || 'Partido Quemero'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-wider ${statusColor[partido.estado]}`}>
              {partido.estado}
            </span>
            {partido.numero_fecha && (
              <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3.5 py-1 text-xs font-black uppercase text-amber-300">
                Fecha #{partido.numero_fecha}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          {/* Info y métricas del partido */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/15 bg-zinc-950/75 p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">Formato</div>
                <div className="mt-1.5 text-2xl font-black text-white">{partido.formato}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-zinc-950/75 p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Titulares</div>
                <div className="mt-1.5 text-2xl font-black text-white">
                  {titulares.length}<span className="text-zinc-500">/{partido.cupo_maximo}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-zinc-950/75 p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">Por cabeza</div>
                <div className="mt-1.5 text-2xl font-black text-white">{money(costoCabeza)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-zinc-950/75 p-4 space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm font-bold capitalize text-white">
                <CalendarDays size={18} className="text-red-500 shrink-0" />
                <span>{new Date(partido.fecha_hora).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm text-zinc-300">
                <div className="flex items-center gap-2.5">
                  <MapPinned size={18} className="text-white shrink-0" />
                  <span>{partido.ubicacion || 'Cancha a confirmar'}</span>
                </div>
                {partido.link_maps && (
                  <a
                    href={partido.link_maps}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-red-600/20 px-3 py-1 text-xs font-bold text-red-300 ring-1 ring-red-500/40 hover:bg-red-600/30"
                  >
                    Abrir Mapa ↗
                  </a>
                )}
              </div>
              {partido.tiene_sena && partido.monto_sena ? (
                <div className="border-t border-white/10 pt-2 text-xs text-zinc-300 flex justify-between">
                  <span>Cancha total: <b className="text-white">{money(partido.precio_cancha)}</b></span>
                  <span>Seña total: <b className="text-red-300">{money(partido.monto_sena)}</b></span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Panel de links y Organizador */}
          <div className="rounded-3xl border border-white/15 bg-zinc-950/80 p-4 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black uppercase tracking-wider text-white">Compartir y Control</h3>
                {esAdmin && (
                  <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                    Organizador
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => copiar(base, 'player')}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
                >
                  <span>{copied === 'player' ? '¡Link de jugadores copiado!' : 'Copiar link para jugadores'}</span>
                  {copied === 'player' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </button>

                {esAdmin && (
                  <button
                    type="button"
                    onClick={() => copiar(`${base}?admin=${token}`, 'admin')}
                    className="flex w-full items-center justify-between rounded-2xl border border-red-500/40 bg-red-500/15 px-3.5 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/25"
                  >
                    <span>{copied === 'admin' ? '¡Link de admin copiado!' : 'Copiar link de organizador'}</span>
                    {copied === 'admin' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                )}
              </div>
            </div>

            {esAdmin && (
              <div className="space-y-2 border-t border-white/10 pt-3">
                {abierta && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className="btn-red py-2.5 text-xs" onClick={() => rpc('confirmar_partido')}>
                        Confirmar fecha
                      </button>
                      <button
                        type="button"
                        className="btn-white py-2.5 text-xs"
                        disabled={!llenos}
                        title={!llenos ? 'Completá el cupo de titulares para armar equipos' : ''}
                        onClick={() => rpc('armar_equipos')}
                      >
                        <Sparkles size={14} /> Armar equipos
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className="btn-ghost py-2 text-xs text-amber-300" onClick={() => setReprog(true)}>
                        Reprogramar
                      </button>
                      <button
                        type="button"
                        className="btn-ghost py-2 text-xs text-zinc-400 hover:text-red-300"
                        onClick={() => confirm('¿Cancelar el partido?') && rpc('cancelar_partido')}
                      >
                        Cancelar partido
                      </button>
                    </div>
                  </>
                )}
                {partido.estado === 'confirmado' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="btn-red py-2.5 text-xs"
                        onClick={() => rpc('finalizar_partido', { p_resultado: prompt('Resultado (ej: Rojo 6 - 5 Blanco)') ?? '' })}
                      >
                        Finalizar partido
                      </button>
                      <button type="button" className="btn-ghost py-2.5 text-xs text-amber-300" onClick={() => setReprog(true)}>
                        Reprogramar
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost w-full py-2 text-xs text-zinc-400 hover:text-red-300"
                      onClick={() => confirm('¿Cancelar el partido?') && rpc('cancelar_partido')}
                    >
                      Cancelar partido
                    </button>
                  </div>
                )}
                {partido.estado === 'finalizado' && (
                  <button
                    type="button"
                    className="btn-ghost w-full py-2 text-xs text-zinc-400 hover:text-red-300"
                    onClick={() => confirm('¿Cancelar este partido finalizado?') && rpc('cancelar_partido')}
                  >
                    Cancelar / Descartar fecha
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {reprog && (
        <ReprogramarModal partido={partido} token={token} onClose={() => setReprog(false)} onSaved={cargar} />
      )}

      {/* Grilla Principal: Inscripciones + Versus */}
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="card space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
              <Users size={15} />
              Convocatoria e Inscripciones
            </div>
            {yo && (
              <span className="text-xs text-zinc-400">
                Identificado como:{' '}
                <b className="text-white">{jugadores.find(j => j.id === yo)?.nombre ?? 'Jugador'}</b>
              </span>
            )}
          </div>

          {abierta && (
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="input flex-1"
                  placeholder="Escribí tu nombre para anotarte o buscarte…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
                {q.trim() && !existeExacto && (
                  <button type="button" className="btn-red shrink-0" onClick={crearYAnotar}>
                    Crear “{q.trim()}” y anotarme
                  </button>
                )}
              </div>

              {sugeridos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {sugeridos.map(j => (
                    <button
                      key={j.id}
                      type="button"
                      disabled={anotados.has(j.id)}
                      onClick={() => anotar(j.id)}
                      className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition hover:border-red-500 hover:bg-red-600 disabled:opacity-40"
                    >
                      {j.nombre} {anotados.has(j.id) ? '✓ Anotado' : '+ Anotarme'}
                    </button>
                  ))}
                </div>
              )}

              {msg && <p className="text-xs font-semibold text-red-400">{msg}</p>}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Lista
              titulo="Titulares"
              subtitulo={`${titulares.length}/${partido.cupo_maximo}`}
              items={titulares}
              yo={yo}
              esAdmin={esAdmin}
              abierta={abierta}
              onSelectYo={jid => {
                setMiJugador(jid)
                setYo(jid)
              }}
              onBajar={bajar}
            />
            <Lista
              titulo="Suplentes"
              subtitulo={suplentes.length ? `${suplentes.length} en espera` : 'Lista vacía'}
              items={suplentes}
              yo={yo}
              esAdmin={esAdmin}
              abierta={abierta}
              onSelectYo={jid => {
                setMiJugador(jid)
                setYo(jid)
              }}
              onBajar={bajar}
            />
          </div>
        </div>

        <Versus partidoId={id} titulares={titulares} />
      </section>

      {/* Votación secreta FUT y Tercer Tiempo */}
      {abierta && yo && anotados.has(yo) && <VotarStats partidoId={id} yo={yo} jugadores={insc} />}

      {(partido.estado === 'confirmado' || partido.estado === 'finalizado') && (
        <TercerTiempo partido={partido} titulares={titulares} yo={yo} token={token} onChange={cargar} />
      )}

      <div className="text-center">
        <Link to="/" className="text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:text-white">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  )
}

function Lista({
  titulo,
  subtitulo,
  items,
  yo,
  esAdmin,
  abierta,
  onSelectYo,
  onBajar,
}: {
  titulo: string
  subtitulo: string
  items: Inscripcion[]
  yo: string | null
  esAdmin: boolean
  abierta: boolean
  onSelectYo: (jid: string) => void
  onBajar: (id: string) => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">{titulo}</h3>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white">{subtitulo}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-500">Sin jugadores en esta lista.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i, n) => {
            const soyYo = i.jugador_id === yo
            return (
              <li
                key={i.id}
                className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
                  soyYo ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 bg-zinc-900/70'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xs font-bold text-zinc-500">{n + 1}.</span>
                  <button
                    type="button"
                    title="Tocá si sos vos para votar"
                    onClick={() => onSelectYo(i.jugador_id)}
                    className="truncate font-semibold text-white hover:text-red-300 text-left"
                  >
                    {i.jugadores?.nombre}
                  </button>
                  {soyYo && <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-black text-red-600">VOS</span>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {i.equipo && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        i.equipo === 'A'
                          ? 'bg-white text-zinc-950 ring-1 ring-white'
                          : 'bg-red-600 text-white ring-1 ring-red-400'
                      }`}
                    >
                      {i.equipo === 'A' ? 'Blanco (A)' : 'Rojo (B)'}
                    </span>
                  )}
                  {abierta && (soyYo || esAdmin) && (
                    <button
                      type="button"
                      title="Dar de baja"
                      className="rounded-lg p-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => onBajar(i.id)}
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
