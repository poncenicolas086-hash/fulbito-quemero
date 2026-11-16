import { useEffect, useState } from 'react'
import { supabase, type Inscripcion } from '../lib/supabase'

const STATS = [
  ['ritmo', 'RIT'], ['tiro', 'TIR'], ['pase', 'PAS'],
  ['regate', 'REG'], ['defensa', 'DEF'], ['fisico', 'FÍS']] as const
type Key = typeof STATS[number][0]
type Vals = Record<Key, number>
const base = (): Vals => ({ ritmo: 50, tiro: 50, pase: 50, regate: 50, defensa: 50, fisico: 50 })
const media = (v: Vals) => Math.round(Object.values(v).reduce((a, b) => a + b, 0) / 6)

export default function VotarStats({ partidoId, yo, jugadores }: {
  partidoId: string; yo: string; jugadores: Inscripcion[] }) {
  const otros = jugadores.filter(j => j.jugador_id !== yo)
  const [idx, setIdx] = useState(0)
  const [votos, setVotos] = useState<Record<string, Vals>>({})
  const [guardados, setGuardados] = useState<Set<string>>(new Set())
  const [estado, setEstado] = useState('')

  useEffect(() => {
    supabase.rpc('mis_votos_stats', { p_partido: partidoId, p_votante: yo }).then(({ data }) => {
      const v: Record<string, Vals> = {}; const g = new Set<string>()
      ;(data ?? []).forEach((r: any) => { g.add(r.votado_id)
        v[r.votado_id] = { ritmo: r.ritmo, tiro: r.tiro, pase: r.pase, regate: r.regate, defensa: r.defensa, fisico: r.fisico } })
      setVotos(v); setGuardados(g)
    })
  }, [partidoId, yo])

  if (otros.length === 0) return null
  const cur = otros[Math.min(idx, otros.length - 1)]
  const vals = votos[cur.jugador_id] ?? base()
  const set = (k: Key, n: number) => setVotos(p => ({ ...p, [cur.jugador_id]: { ...vals, [k]: n } }))

  async function guardar() {
    const { error } = await supabase.rpc('votar_stats', {
      p_partido: partidoId, p_votante: yo, p_votado: cur.jugador_id,
      r: vals.ritmo, t: vals.tiro, p: vals.pase, g: vals.regate, d: vals.defensa, f: vals.fisico })
    if (error) return setEstado(error.message)
    setGuardados(s => new Set(s).add(cur.jugador_id)); setEstado('')
    if (idx < otros.length - 1) setIdx(idx + 1)
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Votá en secreto 🤫</h2>
        <span className="text-xs text-zinc-400">{guardados.size}/{otros.length} votados</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {otros.map((j, n) => (
          <button key={j.id} onClick={() => setIdx(n)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${n === idx ? 'bg-red-600' : 'bg-zinc-800'} ${guardados.has(j.jugador_id) ? 'ring-1 ring-amber-400' : ''}`}>
            {j.jugadores?.nombre}</button>))}
      </div>

      <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-300/20 via-red-900/40 to-zinc-950 p-5">
        <div className="flex items-start justify-between">
          <div className="text-6xl font-black leading-none text-amber-300">{media(vals)}</div>
          <div className="text-right"><div className="text-xs text-zinc-300">MEDIA</div>
            <div className="text-lg font-bold">{cur.jugadores?.nombre}</div></div>
        </div>
        <div className="mt-4 space-y-3">
          {STATS.map(([k, label]) => (
            <div key={k} className="flex items-center gap-3">
              <span className="w-9 text-sm font-bold text-amber-200">{label}</span>
              <input type="range" min={1} max={99} value={vals[k]} onChange={e => set(k, +e.target.value)}
                className="h-2 flex-1 accent-red-600" />
              <span className="w-8 text-right font-black">{vals[k]}</span>
            </div>))}
        </div>
      </div>
      {estado && <p className="text-sm text-red-400">{estado}</p>}
      <button className="btn-red w-full" onClick={guardar}>
        {guardados.has(cur.jugador_id) ? 'Actualizar voto' : 'Guardar voto'}</button>
    </div>
  )
}
