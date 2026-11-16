import { useEffect, useState } from 'react'
import { Crown, Minus, Plus, Camera, Flame } from 'lucide-react'
import { supabase, type Partido, type Inscripcion } from '../lib/supabase'

interface Props {
  partido: Partido
  titulares: Inscripcion[]
  yo: string | null
  token: string | null
  onChange: () => void
}

export default function TercerTiempo({ partido, titulares, yo, token, onChange }: Props) {
  const esAdmin = !!token
  const [prog, setProg] = useState({ votaron: 0, total: titulares.length })
  const [miVoto, setMiVoto] = useState('')
  const [msg, setMsg] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const juega = !!yo && titulares.some(t => t.jugador_id === yo)

  useEffect(() => {
    const leer = () =>
      supabase.rpc('progreso_mvp', { p_partido: partido.id }).then(({ data }) => {
        if (data?.[0]) setProg(data[0])
      })
    leer()
    if (partido.mvp_cerrado) return
    const t = setInterval(leer, 5000)
    return () => clearInterval(t)
  }, [partido.id, partido.mvp_cerrado, miVoto])

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
    setMsg(error?.message ?? '¡Voto registrado en la urna!')
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

  const mvps = titulares.filter(t => t.es_mvp)

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

      {/* Urna Secreta y Revelación MVP */}
      <div className="card flex flex-col justify-between space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
          <Crown size={15} />
          MVP de la Fecha
        </div>

        {!partido.mvp_cerrado ? (
          <div className="space-y-4 my-auto">
            <div className="rounded-3xl border border-red-500/30 bg-zinc-950/80 p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-white">Urna secreta activa 🤫</span>
                <span className="text-xs font-bold text-red-300">
                  {prog.votaron} de {prog.total} votos
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-white transition-all"
                  style={{ width: `${prog.total ? (prog.votaron / prog.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400">
                El ganador se revela automáticamente cuando votan todos los titulares o cuando el organizador cierra la urna.
              </p>
            </div>

            {juega && (
              <div className="space-y-3">
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
                  Votar MVP en secreto
                </button>
              </div>
            )}

            {esAdmin && (
              <button type="button" className="btn-ghost w-full" onClick={cerrarUrna}>
                Cerrar urna y revelar MVP ahora
              </button>
            )}
          </div>
        ) : (
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

        {msg && <p className="text-xs font-semibold text-red-300">{msg}</p>}
      </div>
    </section>
  )
}
