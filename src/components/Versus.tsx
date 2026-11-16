import { useEffect, useState } from 'react'
import { supabase, type Inscripcion } from '../lib/supabase'

export default function Versus({ partidoId, titulares }: { partidoId: string; titulares: Inscripcion[] }) {
  const [medias, setMedias] = useState<Record<string, number>>({})
  useEffect(() => {
    supabase.rpc('medias_partido', { p_partido: partidoId }).then(({ data }) => {
      const m: Record<string, number> = {}
      ;(data ?? []).forEach((r: any) => { m[r.jugador_id] = Number(r.media) })
      setMedias(m)
    })
  }, [partidoId, titulares])

  const eq = (e: 'A' | 'B') => titulares.filter(t => t.equipo === e)
  const prom = (l: Inscripcion[]) => l.length
    ? (l.reduce((a, t) => a + (medias[t.jugador_id] ?? 50), 0) / l.length).toFixed(1) : '–'
  if (!eq('A').length && !eq('B').length) return null

  const Col = ({ e, color }: { e: 'A' | 'B'; color: string }) => (
    <div className={`flex-1 rounded-2xl border p-3 ${color}`}>
      <div className="text-center">
        <div className="text-xs font-bold tracking-widest">EQUIPO {e}</div>
        <div className="text-4xl font-black">{prom(eq(e))}</div>
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {eq(e).map(t => (
          <li key={t.id} className="flex justify-between rounded bg-black/30 px-2 py-1">
            <span className="truncate">{t.jugadores?.nombre}</span>
            <b>{medias[t.jugador_id]?.toFixed(0) ?? '–'}</b></li>))}
      </ul>
    </div>)

  return (
    <div className="card">
      <h2 className="mb-3 text-center font-black tracking-wide">A  <span className="text-red-500">VS</span>  B</h2>
      <div className="flex gap-2">
        <Col e="A" color="border-sky-500/60 bg-sky-950/40" />
        <Col e="B" color="border-rose-400/60 bg-rose-950/40" />
      </div>
    </div>)
}
