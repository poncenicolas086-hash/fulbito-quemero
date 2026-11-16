import { useCallback, useEffect, useState } from 'react'
import { Crown, Minus, Plus, Camera, Flame } from 'lucide-react'
import { supabase, type Partido, type Inscripcion } from '../lib/supabase'

interface Props {
  partido: Partido
  titulares: Inscripcion[]
  yo: string | null
  token: string | null
  onChange: () => void
}

interface VotoMvpRow {
  votante_id: string
  votado_id: string
}

export default function TercerTiempo({ partido, titulares, yo, token, onChange }: Props) {
  const esAdmin = !!token
  const [votosMvp, setVotosMvp] = useState<VotoMvpRow[]>([])
  const [miVoto, setMiVoto] = useState('')
  const [msg, setMsg] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const juega = !!yo && titulares.some(t => t.jugador_id === yo)

  const leerVotos = useCallback(async () => {
    const { data } = await supabase
      .from('votos_mvp')
      .select('votante_id, votado_id')
      .eq('partido_id', partido.id)
    const rows = (data ?? []) as VotoMvpRow[]
    setVotosMvp(rows)
    if (yo) {
      const mio = rows.find(r => r.votante_id === yo)
      if (mio) setMiVoto(mio.votado_id)
    }
  }, [partido.id, yo])

  useEffect(() => {
    leerVotos()
    const ch = supabase
      .channel(`mvp-${partido.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votos_mvp', filter: `partido_id=eq.${partido.id}` },
        leerVotos,
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [partido.id, leerVotos])

  async function contar(i: Inscripcion, campo: 'goles' | 'asistencias', d: number) {
    const goles = Math.max(0, i.goles + (campo === 'goles' ? d : 0))
    const asist = Math.max(0, i.asistencias + (campo === 'asistencias' ? d : 0))
    const { error } = await supabase.rpc('guardar_goles', {
      p_partido: partido.id,
      p_jugador: i.jugador_id,
      p_goles: goles,
      p_asist: asist,
    })
    setMsg(error?.message ?? '')
    onChange()
  }

  async function votar() {
    if (!yo || !miVoto) return
    const { error } = await supabase.rpc('votar_mvp', { p_partido: partido.id, p_votante: yo, p_votado: miVoto })
    setMsg(error?.message ?? '¡Tu voto al MVP fue publicado!')
    leerVotos()
    onChange()
  }

  async function cerrarUrna() {
    const { error } = await supabase.rpc('cerrar_urna_mvp', { p_partido: partido.id, p_token: token })
    setMsg(error?.message ?? '')
    onChange()
  }

  async function subirFoto(file: File) {
    setSubiendo(true)
    const path = `fechas/${partido.id}-${Date.now()}.${file.name.split('.').pop()}`
    const up = await supabase.storage.from('mvp-premios').upload(path, file, { upsert: true })
    if (up.error) {
      setSubiendo(false)
      return setMsg(up.error.message)
    }
    const url = supabase.storage.from('mvp-premios').getPublicUrl(path).data.publicUrl
    const { error } = await supabase.rpc('set_mvp_imagen', { p_partido: partido.id, p_token: token, p_url: url })
    setSubiendo(false)
    setMsg(error?.message ?? '')
    onChange()
  }

  const nombreDe = (jid: string) => titulares.find(t => t.jugador_id === jid)?.jugadores?.nombre ?? 'Jugador'
  const mvps = titulares.filter(t => t.es_mvp)

  // Agrupar votos por candidato para mostrar el conteo público en vivo
  const conteoCandidatos = titulares
    .map(t => {
      const quienesVotaron = votosMvp.filter(v => v.votado_id === t.jugador_id).map(v => nombreDe(v.votante_id))
      return {
        jugador_id: t.jugador_id,
        nombre: t.jugadores?.nombre ?? 'Jugador',
        votos: quienesVotaron.length,
        votantes: quienesVotaron,
      }
    })
    .filter(c => c.votos > 0)
    .sort((a, b) => b.votos - a.votos)

  const Counter = ({ i, campo }: { i: Inscripcion; campo: 'goles' | 'asistencias' }) => {
    const puede = i.jugador_id === yo || esAdmin
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!puede}
          onClick={() => contar(i, campo, -1)}
          className="rounded-xl border border-white/10 bg-zinc-800 p-2 text-white transition hover:bg-zinc-700 disabled:opacity-30"
        >
          <Minus size={13} />
        </button>
        <b className="w-6 text-center text-sm font-black text-white">{i[campo]}</b>
        <button
          type="button"
          disabled={!puede}
          onClick={() => contar(i, campo, 1)}
          className="rounded-xl bg-red-600 p-2 text-white transition hover:bg-red-500 disabled:opacity-30"
        >
          <Plus size={13} />
        </button>
      </div>
    )
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      {/* Carga de Goles y Asistencias */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
            <Flame size={15} />
            Tercer Tiempo · Goles y Asistencias
          </div>
          {partido.resultado_texto && (
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white">
              {partido.resultado_texto}
            </span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          <span>Jugador</span>
          <span className="w-20 text-center">Goles</span>
          <span className="w-20 text-center">Asist.</span>
        </div>

        <ul className="space-y-2">
          {titulares.map(i => (
            <li
              key={i.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 rounded-2xl border border-white/10 bg-zinc-950/70 px-3.5 py-2.5"
            >
              <div className="truncate">
                <span className="font-semibold text-white">{i.jugadores?.nombre}</span>
                {i.es_mvp && <span className="ml-1.5">👑</span>}
              </div>
              <Counter i={i} campo="goles" />
              <Counter i={i} campo="asistencias" />
            </li>
          ))}
        </ul>
      </div>

      {/* Votación Pública del MVP */}
      <div className="card flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            <Crown size={15} />
            Votación Pública · MVP de la Fecha
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-bold text-white">
            {votosMvp.length}/{titulares.length} votos
          </span>
        </div>

        {partido.mvp_cerrado && (
          <div className="rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-red-600/30 via-zinc-900 to-zinc-950 p-6 text-center shadow-[0_20px_50px_rgba(245,158,11,0.2)]">
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-600">
              FIGURA QUEMERA {partido.numero_fecha ? `· FECHA #${partido.numero_fecha}` : ''}
            </span>

            {partido.mvp_imagen_url ? (
              <img
                src={partido.mvp_imagen_url}
                alt="MVP"
                className="mx-auto my-4 h-44 w-44 rounded-3xl border-2 border-white object-cover shadow-xl"
              />
            ) : (
              <div className="mx-auto my-4 flex h-24 w-24 items-center justify-center rounded-3xl border border-amber-400/40 bg-amber-500/15 text-amber-300">
                <Crown size={48} />
              </div>
            )}

            <p className="text-2xl font-black text-white">
              {mvps.map(m => m.jugadores?.nombre).join(' & ') || 'Sin votos registrados'}
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-300">+3 pts bonus MVP en la Tabla</p>

            {esAdmin && (
              <label className="btn-white mt-4 inline-flex cursor-pointer items-center gap-2 text-xs">
                <Camera size={15} />
                {subiendo ? 'Subiendo…' : partido.mvp_imagen_url ? 'Cambiar foto del MVP' : 'Subir foto honorífica'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => e.target.files?.[0] && subirFoto(e.target.files[0])}
                />
              </label>
            )}
          </div>
        )}

        {/* Pizarra pública de votos en tiempo real */}
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Votos en vivo (públicos)
          </div>

          {conteoCandidatos.length === 0 ? (
            <p className="py-3 text-center text-xs text-zinc-500">Todavía nadie votó al MVP.</p>
          ) : (
            <ul className="space-y-2.5">
              {conteoCandidatos.map(c => (
                <li key={c.jugador_id} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-black text-white">{c.nombre}</span>
                    <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-black text-white">
                      {c.votos} {c.votos === 1 ? 'voto' : 'votos'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Votado por: <span className="font-medium text-zinc-200">{c.votantes.join(', ')}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!partido.mvp_cerrado && (
          <div className="space-y-3">
            {juega ? (
              <>
                <select className="input" value={miVoto} onChange={e => setMiVoto(e.target.value)}>
                  <option value="">Elegí a la figura de la cancha…</option>
                  {titulares
                    .filter(t => t.jugador_id !== yo)
                    .map(t => (
                      <option key={t.id} value={t.jugador_id}>
                        {t.jugadores?.nombre}
                      </option>
                    ))}
                </select>
                <button type="button" className="btn-red w-full" disabled={!miVoto} onClick={votar}>
                  Publicar mi voto al MVP
                </button>
              </>
            ) : (
              <p className="text-center text-xs text-zinc-400">
                Iniciá sesión con tu cuenta de titular para votar al MVP.
              </p>
            )}

            {esAdmin && (
              <button type="button" className="btn-ghost w-full" onClick={cerrarUrna}>
                Cerrar votación y coronar MVP ahora
              </button>
            )}
          </div>
        )}

        {msg && <p className="text-xs font-semibold text-red-300">{msg}</p>}
      </div>
    </section>
  )
}
