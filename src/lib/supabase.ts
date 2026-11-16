import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key)

export const PARTIDO_COLS =
  'id,formato,cupo_maximo,fecha_hora,ubicacion,link_maps,precio_cancha,tiene_sena,monto_sena,estado,numero_fecha,resultado_texto,mvp_imagen_url,mvp_cerrado,creado_en'

export interface Jugador {
  id: string
  nombre: string
}

export interface Partido {
  id: string
  formato: 'F5' | 'F6' | 'F7' | 'F8' | 'CUSTOM'
  cupo_maximo: number
  fecha_hora: string
  ubicacion: string | null
  link_maps: string | null
  precio_cancha: number
  tiene_sena: boolean
  monto_sena: number | null
  estado: 'abierto' | 'confirmado' | 'reprogramado' | 'cancelado' | 'finalizado'
  numero_fecha: number | null
  resultado_texto: string | null
  mvp_imagen_url: string | null
  mvp_cerrado: boolean
}

export interface Inscripcion {
  id: string
  partido_id: string
  jugador_id: string
  orden_llegada: number
  equipo: 'A' | 'B' | null
  goles: number
  asistencias: number
  es_mvp: boolean
  puntos_mvp_fecha: number
  jugadores?: { id: string; nombre: string }
}

const ADMIN_KEY = (id: string) => `fulbito_admin_${id}`
const JUGADOR_ID_KEY = 'fulbito_mi_jugador_v2'
const JUGADOR_NOMBRE_KEY = 'fulbito_mi_nombre_v2'
const JUGADOR_TOKEN_KEY = 'fulbito_mi_token_v2'

export const getAdminToken = (id: string) => localStorage.getItem(ADMIN_KEY(id))
export const setAdminToken = (id: string, token: string) => localStorage.setItem(ADMIN_KEY(id), token)

export const getMiJugador = () => localStorage.getItem(JUGADOR_ID_KEY)
export const getMiNombre = () => localStorage.getItem(JUGADOR_NOMBRE_KEY)
export const getMiToken = () => localStorage.getItem(JUGADOR_TOKEN_KEY)

export function setMiSesion(id: string, nombre: string, token: string) {
  localStorage.setItem(JUGADOR_ID_KEY, id)
  localStorage.setItem(JUGADOR_NOMBRE_KEY, nombre)
  localStorage.setItem(JUGADOR_TOKEN_KEY, token)
  window.dispatchEvent(new Event('fulbito-auth-change'))
}

export function clearMiSesion() {
  localStorage.removeItem(JUGADOR_ID_KEY)
  localStorage.removeItem(JUGADOR_NOMBRE_KEY)
  localStorage.removeItem(JUGADOR_TOKEN_KEY)
  window.dispatchEvent(new Event('fulbito-auth-change'))
}

// Compatibilidad
export const setMiJugador = (id: string) => localStorage.setItem(JUGADOR_ID_KEY, id)
