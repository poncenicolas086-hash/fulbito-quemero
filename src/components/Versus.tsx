import { useEffect, useState } from 'react'
import { Trophy, Shield } from 'lucide-react'
import { supabase, type Inscripcion } from '../lib/supabase'

export default function Versus({ partidoId, titulares }: { partidoId: string; titulares: Inscripcion[] }) {
  const [medias, setMedias] = useState<Record<string, number>>({})

  useEffect(() => {
    supabase.rpc('medias_partido', { p_partido: partidoId }).then(({ data }) => {
      const m: Record<string, number> = {}
      ;(data ?? []).forEach((r: any) => {
        m[r.jugador_id] = Number(r.media)
      })
      setMedias(m)
    })
  }, [partidoId, titulares])

  const eq = (e: 'A' | 'B') => titulares.filter(t => t.equipo === e)
  const prom = (l: Inscripcion[]) =>
    l.length ? (l.reduce((a, t) => a + (medias[t.jugador_id] ?? 6), 0) / l.length).toFixed(1) : '–'

  const teamA = eq('A')
  const teamB = eq('B')

  return (
    <div className="card flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">Versus · Equipos</div>
        <Trophy className="text-amber-400" size={18} />
      </div>

      {!teamA.length && !teamB.length ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-zinc-950/50 p-6 text-center">
          <Shield size={32} className="mb-2 text-red-500/60" />
          <p className="text-sm font-bold text-white">Equipos todavía sin sortear</p>
          <p className="mt-1 text-xs text-zinc-400">
            Cuando se complete el cupo, el organizador puede armar los equipos equilibrados Blanco vs Rojo según los votos secretos.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {/* Equipo Blanco (A) */}
          <div className="rounded-3xl border border-white/30 bg-gradient-to-br from-white/15 via-zinc-900/90 to-zinc-950 p-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black uppercase text-red-600">
                  Equipo A
                </span>
                <div className="mt-1 text-base font-black text-white">BLANCO</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Promedio</div>
                <div className="text-3xl font-black text-white">{prom(teamA)}</div>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {teamA.map(t => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/70 px-3 py-1.5"
                >
                  <span className="truncate font-medium text-white">{t.jugadores?.nombre}</span>
                  <b className="rounded-lg bg-white/15 px-2 py-0.5 text-xs font-black text-white">
                    {medias[t.jugador_id]?.toFixed(1) ?? '6.0'}
                  </b>
                </li>
              ))}
            </ul>
          </div>

          {/* Equipo Rojo (B) */}
          <div className="rounded-3xl border border-red-500/40 bg-gradient-to-br from-red-600/20 via-zinc-900/90 to-zinc-950 p-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-red-500/25 pb-3">
              <div>
                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                  Equipo B
                </span>
                <div className="mt-1 text-base font-black text-red-400">ROJO</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-red-300">Promedio</div>
                <div className="text-3xl font-black text-white">{prom(teamB)}</div>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {teamB.map(t => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-red-500/20 bg-zinc-950/70 px-3 py-1.5"
                >
                  <span className="truncate font-medium text-white">{t.jugadores?.nombre}</span>
                  <b className="rounded-lg bg-red-600/30 px-2 py-0.5 text-xs font-black text-red-200">
                    {medias[t.jugador_id]?.toFixed(1) ?? '6.0'}
                  </b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
