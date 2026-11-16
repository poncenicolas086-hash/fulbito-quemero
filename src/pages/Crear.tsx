import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, MapPinned, Sparkles, Users } from 'lucide-react'
import { supabase, PARTIDO_COLS, setAdminToken, type Partido } from '../lib/supabase'

const FORMATOS: Record<string, number> = { F5: 10, F6: 12, F7: 14, F8: 16 }
const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

const statusColor: Record<Partido['estado'], string> = {
  abierto: 'bg-white text-red-600 ring-1 ring-white',
  confirmado: 'bg-red-600 text-white ring-1 ring-red-400',
  reprogramado: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40',
  cancelado: 'bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700',
  finalizado: 'bg-white/10 text-white ring-1 ring-white/25',
}

const labelStatus: Record<Partido['estado'], string> = {
  abierto: 'Abierto',
  confirmado: 'Confirmado',
  reprogramado: 'Reprogramado',
  cancelado: 'Cancelado',
  finalizado: 'Finalizado',
}

interface PartidoConConteo extends Partido {
  inscripciones?: { id: string }[]
}

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

  const [partidos, setPartidos] = useState<PartidoConConteo[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('partidos')
      .select(`${PARTIDO_COLS}, inscripciones(id)`)
      .neq('estado', 'cancelado')
      .order('fecha_hora', { ascending: false })
      .limit(18)
      .then(({ data }) => {
        const rows = ((data ?? []) as unknown as PartidoConConteo[]).filter(
          m => !(m.estado === 'finalizado' && (m.inscripciones?.length ?? 0) === 0),
        )
        setPartidos(rows)
      })
  }, [])

  const cupo = formato === 'CUSTOM' ? custom : FORMATOS[formato]
  const total = cupo > 0 ? precio / cupo : 0
  const senaPP = cupo > 0 ? montoSena / cupo : 0

  const filteredMatches = useMemo(
    () =>
      partidos.filter(m => {
        const q = search.trim().toLowerCase()
        if (!q) return true
        return `${m.ubicacion ?? ''} ${m.formato} ${m.estado}`.toLowerCase().includes(q)
      }),
    [partidos, search],
  )

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    if (!fecha) return setErr('Elegí fecha y hora')
    setBusy(true)
    setErr('')
    const { data, error } = await supabase.rpc('crear_partido', {
      p_formato: formato,
      p_cupo: cupo,
      p_fecha: new Date(fecha).toISOString(),
      p_ubicacion: lugar,
      p_maps: maps,
      p_precio: precio,
      p_sena: sena,
      p_monto_sena: sena ? montoSena : null,
    })
    setBusy(false)
    if (error || !data?.[0]) return setErr(error?.message ?? 'Error al crear')
    setAdminToken(data[0].id, data[0].admin_token)
    nav(`/partido/${data[0].id}?admin=${data[0].admin_token}`)
  }

  const fechaPreview = fecha
    ? new Date(fecha).toLocaleString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Elegí día y horario en el formulario'

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Hero / Preview Card */}
        <div className="card-white relative overflow-hidden flex flex-col justify-between">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white">
              <Sparkles size={14} className="text-red-400" />
              <span className="text-[11px] font-bold uppercase tracking-[0.24em]">Preview del partido</span>
            </div>

            <div className="grid gap-6 md:grid-cols-2 items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-300">Pasión Quemera</p>
                <h1 className="mt-2 text-4xl font-black leading-[1.05] tracking-tight text-white md:text-5xl">
                  Organizá tu <span className="bg-gradient-to-r from-white via-red-200 to-red-500 bg-clip-text text-transparent">Fulbito</span> en minutos.
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-zinc-200 md:text-base">
                  Convocá a los pibes, votá el puntaje de cada uno del 1 al 10 en secreto, armá equipos equilibrados Blanco vs Rojo y coroná al MVP de cada fecha.
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-zinc-950/80 p-5 shadow-xl">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">
                  <span>Próxima fecha</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black text-red-600">
                    ABIERTA
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="rounded-xl bg-red-600/20 p-2 text-red-400 ring-1 ring-red-500/30">
                    <CalendarDays size={18} />
                  </div>
                  <span className="text-sm font-bold capitalize text-white">{fechaPreview}</span>
                </div>

                {lugar && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="rounded-xl bg-white/10 p-2 text-white ring-1 ring-white/20">
                      <MapPinned size={18} />
                    </div>
                    <span className="text-sm font-medium text-zinc-200 truncate">{lugar}</span>
                  </div>
                )}

                <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-sm text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span>Formato</span>
                    <span className="rounded-lg bg-red-600 px-2 py-0.5 text-xs font-black text-white">{formato}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cupo titulares</span>
                    <span className="font-bold text-white">{cupo} jugadores</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Seña</span>
                    <span className="font-bold text-white">{sena ? money(montoSena) : 'Sin seña'}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="font-semibold text-white">Por cabeza</span>
                    <span className="text-base font-black text-red-400">{money(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-red-300">1. Convocatoria</div>
              <div className="mt-1 text-xs text-zinc-300">Titulares y suplentes en vivo</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-white">2. Voto Secreto</div>
              <div className="mt-1 text-xs text-zinc-300">Puntajes del 1 al 10 y armado parejo</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-red-300">3. Tercer Tiempo</div>
              <div className="mt-1 text-xs text-zinc-300">Goles, urna MVP y ranking</div>
            </div>
          </div>
        </div>

        {/* Formulario Crear Partido */}
        <form onSubmit={crear} className="card space-y-4 border-red-500/30 bg-gradient-to-b from-zinc-900/95 to-zinc-950">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-xl font-black text-white">Armar el partido ⚽</h2>
            <span className="rounded-full border border-red-500/40 bg-red-600/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
              Nuevo
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Formato</label>
            <div className="grid grid-cols-5 gap-2">
              {[...Object.keys(FORMATOS), 'CUSTOM'].map(f => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFormato(f)}
                  className={`rounded-2xl py-2.5 text-xs font-black transition ${
                    formato === f
                      ? 'bg-white text-red-600 shadow-[0_0_15px_rgba(255,255,255,0.35)] ring-2 ring-red-500'
                      : 'border border-white/10 bg-zinc-950/70 text-zinc-300 hover:border-white/30'
                  }`}
                >
                  {f === 'CUSTOM' ? 'Otro' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              <span>Cupo</span>
              <input
                className="input"
                type="number"
                min={2}
                disabled={formato !== 'CUSTOM'}
                value={cupo}
                onChange={e => setCustom(+e.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              <span>Precio cancha</span>
              <input
                className="input"
                type="number"
                min={0}
                placeholder="$0"
                value={precio || ''}
                onChange={e => setPrecio(+e.target.value)}
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <span>Fecha y hora</span>
            <input className="input" type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              <span>Cancha / Lugar</span>
              <input
                className="input"
                placeholder="Ej: La Quema Fútbol"
                value={lugar}
                onChange={e => setLugar(e.target.value)}
              />
            </label>
            <label className="block space-y-1.5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              <span>Google Maps (opcional)</span>
              <input
                className="input"
                placeholder="https://maps.google..."
                value={maps}
                onChange={e => setMaps(e.target.value)}
              />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-zinc-950/70 p-3 text-sm">
            <span className="font-semibold text-white">¿Hay que dejar seña?</span>
            <button
              type="button"
              onClick={() => setSena(!sena)}
              className={`flex h-7 w-14 items-center rounded-full px-1 transition ${
                sena ? 'justify-end bg-red-600' : 'justify-start bg-zinc-800'
              }`}
            >
              <span className="h-5 w-5 rounded-full bg-white shadow" />
            </button>
          </div>

          {sena && (
            <label className="block space-y-1.5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              <span>Monto total de la seña</span>
              <input
                className="input"
                type="number"
                min={0}
                placeholder="Monto de la seña"
                value={montoSena || ''}
                onChange={e => setMontoSena(+e.target.value)}
              />
            </label>
          )}

          <div className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-white/5 to-red-500/10 p-3.5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">Costo por cabeza</div>
            <div className="space-y-1.5 text-sm text-zinc-200">
              {sena && (
                <>
                  <div className="flex justify-between">
                    <span>Seña por jugador</span>
                    <b className="text-white">{money(senaPP)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Resto en cancha</span>
                    <b className="text-white">{money(total - senaPP)}</b>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-white/10 pt-1.5 text-base">
                <span className="font-bold text-white">Total por cabeza</span>
                <b className="font-black text-red-400">{money(total)}</b>
              </div>
            </div>
          </div>

          {err && <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm font-medium text-red-300">{err}</p>}

          <button type="submit" className="btn-red w-full py-3.5 text-base" disabled={busy}>
            {busy ? 'Creando sala…' : 'Crear partido'}
          </button>
        </form>
      </section>

      {/* Sala en vivo: Partidos creados */}
      <section className="card space-y-5 border-white/15">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-red-400">Sala en vivo</p>
            <h2 className="mt-1 text-2xl font-black text-white">Partidos activos y recientes</h2>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cancha, formato o estado…"
            className="input md:max-w-xs"
          />
        </div>

        {filteredMatches.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-zinc-950/50 py-10 text-center text-sm text-zinc-400">
            Todavía no hay partidos cargados. ¡Creá el primero arriba!
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredMatches.map(m => {
              const anotadosCount = m.inscripciones?.length ?? 0
              return (
                <Link
                  key={m.id}
                  to={`/partido/${m.id}`}
                  className="group rounded-3xl border border-white/10 bg-zinc-950/75 p-5 transition hover:-translate-y-0.5 hover:border-red-500/50 hover:bg-zinc-900/90 hover:shadow-[0_16px_40px_rgba(220,38,38,0.2)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                        {m.formato}
                      </span>
                      {m.numero_fecha && (
                        <span className="text-xs font-bold text-amber-300">Fecha #{m.numero_fecha}</span>
                      )}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusColor[m.estado]}`}>
                      {labelStatus[m.estado]}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2.5 text-sm font-medium text-white">
                    <CalendarDays size={16} className="shrink-0 text-red-400" />
                    <span className="capitalize">
                      {new Date(m.fecha_hora).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2.5 text-sm text-zinc-300">
                    <MapPinned size={16} className="shrink-0 text-white" />
                    <span className="truncate">{m.ubicacion || 'Cancha a confirmar'}</span>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3.5 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-zinc-300">
                      <Users size={15} className="text-red-400" />
                      {anotadosCount} anotados
                    </span>
                    <span className="font-bold text-white group-hover:text-red-400 transition">
                      Cupo {m.cupo_maximo} →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
