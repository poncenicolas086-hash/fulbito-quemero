import { useEffect, useState } from 'react'
import { Star, CheckCircle2 } from 'lucide-react'
import { supabase, type Inscripcion } from '../lib/supabase'

const STATS = [
  ['ritmo', 'RIT', 'Ritmo'],
  ['tiro', 'TIR', 'Tiro'],
  ['pase', 'PAS', 'Pase'],
  ['regate', 'REG', 'Regate'],
  ['defensa', 'DEF', 'Defensa'],
  ['fisico', 'FÍS', 'Físico'],
] as const
type Key = (typeof STATS)[number][0]
type Vals = Record<Key, number>
const base = (): Vals => ({ ritmo: 6, tiro: 6, pase: 6, regate: 6, defensa: 6, fisico: 6 })
const clamp10 = (n: number) => Math.min(10, Math.max(1, n > 10 ? Math.round(n / 10) : n))
const media = (v: Vals) => (Object.values(v).reduce((a, b) => a + b, 0) / 6).toFixed(1)

export default function VotarStats({
  partidoId,
  yo,
  jugadores,
}: {
  partidoId: string
  yo: string
  jugadores: Inscripcion[]
}) {
  const otros = jugadores.filter(j => j.jugador_id !== yo)
  const [idx, setIdx] = useState(0)
  const [votos, setVotos] = useState<Record<string, Vals>>({})
  const [guardados, setGuardados] = useState<Set<string>>(new Set())
  const [estado, setEstado] = useState('')

  useEffect(() => {
    supabase.rpc('mis_votos_stats', { p_partido: partidoId, p_votante: yo }).then(({ data }) => {
      const v: Record<string, Vals> = {}
      const g = new Set<string>()
      ;(data ?? []).forEach((r: any) => {
        g.add(r.votado_id)
        v[r.votado_id] = {
          ritmo: clamp10(r.ritmo),
          tiro: clamp10(r.tiro),
          pase: clamp10(r.pase),
          regate: clamp10(r.regate),
          defensa: clamp10(r.defensa),
          fisico: clamp10(r.fisico),
        }
      })
      setVotos(v)
      setGuardados(g)
    })
  }, [partidoId, yo])

  if (otros.length === 0) return null
  const cur = otros[Math.min(idx, otros.length - 1)]
  const vals = votos[cur.jugador_id] ?? base()
  const set = (k: Key, n: number) => setVotos(p => ({ ...p, [cur.jugador_id]: { ...vals, [k]: n } }))

  async function guardar() {
    const { error } = await supabase.rpc('votar_stats', {
      p_partido: partidoId,
      p_votante: yo,
      p_votado: cur.jugador_id,
      r: vals.ritmo,
      t: vals.tiro,
      p: vals.pase,
      g: vals.regate,
      d: vals.defensa,
      f: vals.fisico,
    })
    if (error) return setEstado(error.message)
    setGuardados(s => new Set(s).add(cur.jugador_id))
    setEstado('')
    if (idx < otros.length - 1) setIdx(idx + 1)
  }

  return (
    <section className="card space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
          <Star size={15} className="text-amber-400" />
          Puntajes del 1 al 10 · Votación secreta de nivel
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-white">
          {guardados.size}/{otros.length} votados
        </span>
      </div>

      {/* Selector de jugador a votar */}
      <div className="flex flex-wrap gap-2">
        {otros.map((j, n) => {
          const yaVoto = guardados.has(j.jugador_id)
          const activo = n === idx
          return (
            <button
              key={j.id}
              type="button"
              onClick={() => setIdx(n)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                activo
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.45)] ring-2 ring-white'
                  : yaVoto
                    ? 'border border-red-500/40 bg-red-500/15 text-white'
                    : 'border border-white/10 bg-zinc-950/70 text-zinc-300 hover:border-white/30'
              }`}
            >
              {yaVoto && <CheckCircle2 size={13} className="text-emerald-400" />}
              <span>{j.jugadores?.nombre}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] items-center">
        {/* Tarjeta de Jugador Albirroja */}
        <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-[32px] border-2 border-white/80 bg-gradient-to-b from-red-600 via-red-900 to-zinc-950 p-6 shadow-[0_20px_50px_rgba(220,38,38,0.35)] ring-4 ring-red-600/30">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
          <div className="flex items-start justify-between border-b border-white/20 pb-4">
            <div>
              <div className="text-5xl font-black leading-none text-white drop-shadow">{media(vals)}</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-red-200">PROMEDIO</div>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black uppercase text-red-600">
                QUEMERO
              </span>
              <div className="mt-2 text-xl font-black text-white">{cur.jugadores?.nombre}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
            {STATS.map(([k, short]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-xl border border-white/15 bg-black/30 px-3 py-2"
              >
                <span className="text-xs font-bold text-red-200">{short}</span>
                <span className="text-base font-black text-white">{vals[k]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sliders de atributos (1 a 10) */}
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {STATS.map(([k, , fullLabel]) => (
              <div key={k} className="space-y-2 rounded-2xl border border-white/10 bg-zinc-950/70 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-zinc-300">{fullLabel}</span>
                  <span className="rounded-lg bg-red-600/20 px-2.5 py-0.5 font-black text-white">
                    {vals[k]} <span className="text-[10px] font-normal text-zinc-400">/ 10</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={vals[k]}
                  onChange={e => set(k, +e.target.value)}
                  className="h-2 w-full cursor-pointer accent-red-500"
                />
              </div>
            ))}
          </div>

          {estado && <p className="text-sm font-medium text-red-400">{estado}</p>}

          <div className="flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">Puntaje general</div>
              <div className="text-2xl font-black text-white">{media(vals)} / 10</div>
            </div>
            <button type="button" className="btn-white" onClick={guardar}>
              {guardados.has(cur.jugador_id) ? 'Actualizar voto secreto' : 'Guardar voto secreto'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
