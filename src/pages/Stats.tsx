import { useEffect, useState } from 'react'
import { Crown, Camera, ChevronLeft, ChevronRight, Trophy, CheckCircle2 } from 'lucide-react'
import { supabase, PARTIDO_COLS, type Partido, type Inscripcion } from '../lib/supabase'

interface Fila {
  jugador_id: string
  nombre: string
  partidos: number
  goles: number
  asistencias: number
  puntos: number
  mvps: number
}
const medalla = (n: number) => ['🥇', '🥈', '🥉'][n] ?? `${n + 1}.`

export default function Stats() {
  const [vista, setVista] = useState<'anual' | 'fecha'>('anual')
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-red-400">Estadísticas Oficiales</p>
          <h1 className="mt-1 text-3xl font-black text-white">Cuadro de Honor y Tablas 🏆</h1>
        </div>
        <div className="inline-grid grid-cols-2 rounded-2xl border border-white/15 bg-zinc-900/90 p-1">
          {(['anual', 'fecha'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setVista(v)}
              className={`rounded-xl px-5 py-2 text-sm font-black transition ${
                vista === v ? 'bg-white text-red-600 shadow' : 'text-zinc-300 hover:text-white'
              }`}
            >
              {v === 'anual' ? 'Tabla Anual' : 'Por Fecha'}
            </button>
          ))}
        </div>
      </div>

      {vista === 'anual' ? <Anual /> : <PorFecha />}
    </div>
  )
}

function PorFecha() {
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [i, setI] = useState(0)
  const [insc, setInsc] = useState<Inscripcion[]>([])

  useEffect(() => {
    supabase
      .from('partidos')
      .select(PARTIDO_COLS)
      .in('estado', ['confirmado', 'finalizado'])
      .not('numero_fecha', 'is', null)
      .order('numero_fecha')
      .then(({ data }) => {
        const p = (data ?? []) as unknown as Partido[]
        setPartidos(p)
        setI(Math.max(p.length - 1, 0))
      })
  }, [])

  const p = partidos[i]
  useEffect(() => {
    if (!p) return
    supabase
      .from('inscripciones')
      .select('*, jugadores(id,nombre)')
      .eq('partido_id', p.id)
      .order('orden_llegada')
      .then(({ data }) => setInsc(((data ?? []) as Inscripcion[]).slice(0, p.cupo_maximo)))
  }, [p?.id])

  if (!p) {
    return (
      <div className="card py-14 text-center text-zinc-400">
        Todavía no hay fechas confirmadas en el historial.
      </div>
    )
  }

  const mvps = insc.filter(x => x.es_mvp)

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <button type="button" className="btn-ghost p-3" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <span className="rounded-full bg-red-600/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-300">
            Resumen de Fecha
          </span>
          <div className="mt-1 text-2xl font-black text-white">Fecha #{p.numero_fecha}</div>
          <div className="text-xs text-zinc-400">
            {new Date(p.fecha_hora).toLocaleDateString('es-AR', { dateStyle: 'full' })}
            {p.resultado_texto ? ` · ${p.resultado_texto}` : ''}
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost p-3"
          disabled={i === partidos.length - 1}
          onClick={() => setI(i + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Tarjeta MVP de la Fecha */}
        <div className="card-white flex flex-col items-center justify-center text-center p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">MVP DE LA FECHA #{p.numero_fecha}</p>
          {p.mvp_imagen_url ? (
            <img
              src={p.mvp_imagen_url}
              alt="MVP"
              className="my-4 h-40 w-40 rounded-3xl border-2 border-white object-cover shadow-xl"
            />
          ) : (
            <div className="my-4 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/25 bg-white/10 text-amber-300">
              <Crown size={48} />
            </div>
          )}
          <p className="text-2xl font-black text-white">
            {p.mvp_cerrado && mvps.length > 0 ? mvps.map(m => m.jugadores?.nombre).join(' & ') : 'Urna en curso'}
          </p>
          {p.resultado_texto && (
            <span className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-black text-red-600">
              {p.resultado_texto}
            </span>
          )}
        </div>

        {/* Tabla del Partido */}
        <div className="card overflow-x-auto">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
            <CheckCircle2 size={14} />
            Planilla de Jugadores
          </div>
          <table className="min-w-full text-left text-sm text-zinc-200">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-400">
              <tr>
                <th className="pb-3">Jugador</th>
                <th className="pb-3 text-center">Equipo</th>
                <th className="pb-3 text-center">Goles</th>
                <th className="pb-3 text-center">Asist.</th>
                <th className="pb-3 text-right">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {[...insc]
                .sort((a, b) => b.puntos_mvp_fecha - a.puntos_mvp_fecha)
                .map(x => (
                  <tr key={x.id} className="border-b border-white/5">
                    <td className="py-3 font-semibold text-white">
                      {x.jugadores?.nombre}
                      {x.es_mvp && <span className="ml-1.5">👑</span>}
                    </td>
                    <td className="py-3 text-center">
                      {x.equipo ? (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            x.equipo === 'A' ? 'bg-white text-zinc-950' : 'bg-red-600 text-white'
                          }`}
                        >
                          {x.equipo === 'A' ? 'Blanco' : 'Rojo'}
                        </span>
                      ) : (
                        '–'
                      )}
                    </td>
                    <td className="py-3 text-center font-bold">{x.goles}</td>
                    <td className="py-3 text-center font-bold">{x.asistencias}</td>
                    <td className="py-3 text-right font-black text-red-400">{x.puntos_mvp_fecha} pts</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Anual() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [tab, setTab] = useState<'mvp' | 'goles' | 'asist'>('mvp')
  const [filas, setFilas] = useState<Fila[]>([])
  const [foto, setFoto] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const cargar = () => {
    supabase.rpc('ranking_anual', { p_anio: anio }).then(({ data }) => setFilas((data ?? []) as Fila[]))
    supabase
      .from('premios_anuales')
      .select('imagen_url')
      .eq('anio', anio)
      .maybeSingle()
      .then(({ data }) => setFoto(data?.imagen_url ?? null))
  }
  useEffect(cargar, [anio])

  const lider = filas[0]
  const topGoleador = [...filas].sort((a, b) => b.goles - a.goles)[0]
  const topAsistidor = [...filas].sort((a, b) => b.asistencias - a.asistencias)[0]

  const orden =
    tab === 'mvp'
      ? filas
      : [...filas].sort((a, b) => (tab === 'goles' ? b.goles - a.goles : b.asistencias - a.asistencias))

  async function subir(file: File) {
    if (!lider) return
    const path = `anual/${anio}-${Date.now()}.${file.name.split('.').pop()}`
    const up = await supabase.storage.from('mvp-premios').upload(path, file, { upsert: true })
    if (up.error) return setMsg(up.error.message)
    const url = supabase.storage.from('mvp-premios').getPublicUrl(path).data.publicUrl
    const { error } = await supabase
      .from('premios_anuales')
      .upsert({ anio, jugador_id: lider.jugador_id, imagen_url: url }, { onConflict: 'anio' })
    setMsg(error?.message ?? '')
    cargar()
  }

  return (
    <div className="space-y-6">
      {/* Selector de Año + Cuadro de Honor */}
      <section className="card-white overflow-hidden">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.26em] text-red-300">
            <Trophy size={15} className="text-amber-400" />
            Cuadro de Honor · Temporada {anio}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setAnio(anio - 1)}>
              <ChevronLeft size={16} />
            </button>
            <b className="text-lg font-black text-white">{anio}</b>
            <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setAnio(anio + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/25 bg-gradient-to-br from-red-600/30 to-zinc-950/90 p-5 flex items-center gap-4">
            {foto ? (
              <img src={foto} alt="MVP del año" className="h-20 w-20 rounded-2xl border-2 border-white object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow">
                <Crown size={32} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">1º Puesto · MVP {anio}</div>
              <div className="mt-1 truncate text-2xl font-black text-white">{lider?.nombre ?? 'Sin datos'}</div>
              <div className="text-xs font-bold text-amber-300">
                {lider ? `${lider.puntos} pts · ${lider.mvps} MVP` : '0 pts'}
              </div>
              {lider && (
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-white underline hover:text-red-300">
                  <Camera size={12} />
                  {foto ? 'Cambiar foto' : 'Subir foto del campeón'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={e => e.target.files?.[0] && subir(e.target.files[0])}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-zinc-950/75 p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Goleador del Año ⚽</div>
            <div className="mt-2 text-2xl font-black text-white">{topGoleador?.nombre ?? 'Sin datos'}</div>
            <div className="mt-1 text-sm font-bold text-red-400">
              {topGoleador ? `${topGoleador.goles} goles (${(topGoleador.goles / Math.max(topGoleador.partidos, 1)).toFixed(2)}/partido)` : '0 goles'}
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-zinc-950/75 p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Máximo Asistidor 🎯</div>
            <div className="mt-2 text-2xl font-black text-white">{topAsistidor?.nombre ?? 'Sin datos'}</div>
            <div className="mt-1 text-sm font-bold text-white">
              {topAsistidor ? `${topAsistidor.asistencias} asistencias (${(topAsistidor.asistencias / Math.max(topAsistidor.partidos, 1)).toFixed(2)}/partido)` : '0 asistencias'}
            </div>
          </div>
        </div>
        {msg && <p className="mt-3 text-xs text-red-300">{msg}</p>}
      </section>

      {/* Tabla Anual Completa */}
      <section className="card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
            <CheckCircle2 size={14} />
            Tabla General {anio}
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {(
              [
                ['mvp', 'Ranking MVP'],
                ['goles', 'Goleadores'],
                ['asist', 'Asistidores'],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-xl px-3.5 py-2 font-black transition ${
                  tab === k ? 'bg-red-600 text-white' : 'border border-white/10 bg-zinc-950 text-zinc-300 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {orden.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-400">Todavía no hay partidos confirmados en {anio}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-zinc-200">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-400">
                <tr>
                  <th className="pb-3">Pos</th>
                  <th className="pb-3">Jugador</th>
                  <th className="pb-3 text-center">Puntos</th>
                  <th className="pb-3 text-center">MVPs</th>
                  <th className="pb-3 text-center">Goles</th>
                  <th className="pb-3 text-center">Asist.</th>
                  <th className="pb-3 text-right">PJ</th>
                </tr>
              </thead>
              <tbody>
                {orden.map((f, n) => (
                  <tr
                    key={f.jugador_id}
                    className={`border-b border-white/5 ${n < 3 ? 'bg-red-500/10' : ''}`}
                  >
                    <td className="py-3.5 font-black text-white">{medalla(n)}</td>
                    <td className="py-3.5 font-bold text-white">{f.nombre}</td>
                    <td className="py-3.5 text-center font-black text-red-400">{f.puntos}</td>
                    <td className="py-3.5 text-center font-semibold text-amber-300">{f.mvps}</td>
                    <td className="py-3.5 text-center font-semibold">
                      {f.goles}{' '}
                      <span className="text-[11px] text-zinc-400">
                        ({(f.goles / Math.max(f.partidos, 1)).toFixed(1)}/p)
                      </span>
                    </td>
                    <td className="py-3.5 text-center font-semibold">
                      {f.asistencias}{' '}
                      <span className="text-[11px] text-zinc-400">
                        ({(f.asistencias / Math.max(f.partidos, 1)).toFixed(1)}/p)
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-zinc-300">{f.partidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
