-- FULBITO ROJIBLANCO · Esquema Supabase
create extension if not exists pgcrypto;

create table if not exists jugadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  creado_en timestamptz default now()
);
create unique index if not exists jugadores_nombre_uq on jugadores (lower(trim(nombre)));

create table if not exists partidos (
  id uuid primary key default gen_random_uuid(),
  admin_token text not null default encode(gen_random_bytes(16),'hex'),
  formato text not null check (formato in ('F5','F6','F7','F8','CUSTOM')),
  cupo_maximo int not null check (cupo_maximo >= 2),
  fecha_hora timestamptz not null,
  ubicacion text, link_maps text,
  precio_cancha numeric default 0,
  tiene_sena boolean default false, monto_sena numeric,
  estado text not null default 'abierto'
    check (estado in ('abierto','confirmado','reprogramado','cancelado','finalizado')),
  numero_fecha int unique,
  resultado_texto text, mvp_imagen_url text,
  mvp_cerrado boolean default false,
  creado_en timestamptz default now()
);

create table if not exists premios_anuales (
  id uuid primary key default gen_random_uuid(),
  anio int unique not null,
  jugador_id uuid references jugadores(id),
  imagen_url text, nota text
);

create table if not exists inscripciones (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references partidos(id) on delete cascade,
  jugador_id uuid not null references jugadores(id),
  orden_llegada bigint generated always as identity,
  equipo text check (equipo in ('A','B')),
  goles int default 0 check (goles >= 0),
  asistencias int default 0 check (asistencias >= 0),
  es_mvp boolean default false,
  puntos_mvp_fecha int default 0,
  unique (partido_id, jugador_id)
);
create index if not exists inscripciones_partido_orden_idx on inscripciones (partido_id, orden_llegada);

create table if not exists votos_stats (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references partidos(id) on delete cascade,
  votante_id uuid not null references jugadores(id),
  votado_id uuid not null references jugadores(id),
  ritmo int check (ritmo between 1 and 99), tiro int check (tiro between 1 and 99),
  pase int check (pase between 1 and 99), regate int check (regate between 1 and 99),
  defensa int check (defensa between 1 and 99), fisico int check (fisico between 1 and 99),
  check (votante_id <> votado_id),
  unique (partido_id, votante_id, votado_id)
);

create table if not exists votos_mvp (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references partidos(id) on delete cascade,
  votante_id uuid not null references jugadores(id),
  votado_id uuid not null references jugadores(id),
  check (votante_id <> votado_id),
  unique (partido_id, votante_id)
);

-- ===== RLS =====
alter table jugadores enable row level security;
alter table partidos enable row level security;
alter table premios_anuales enable row level security;
alter table inscripciones enable row level security;
alter table votos_stats enable row level security;
alter table votos_mvp enable row level security;

drop policy if exists "leer jugadores" on jugadores;
drop policy if exists "crear jugadores" on jugadores;
drop policy if exists "leer partidos" on partidos;
drop policy if exists "leer premios" on premios_anuales;
drop policy if exists "crear premios" on premios_anuales;
drop policy if exists "editar premios" on premios_anuales;
drop policy if exists "leer inscripciones" on inscripciones;
drop policy if exists "anotarse" on inscripciones;
drop policy if exists "bajarse" on inscripciones;
drop policy if exists "cargar goles" on inscripciones;

create policy "leer jugadores" on jugadores for select using (true);
create policy "crear jugadores" on jugadores for insert with check (true);
create policy "leer partidos" on partidos for select using (true);
create policy "leer premios" on premios_anuales for select using (true);
create policy "crear premios" on premios_anuales for insert with check (true);
create policy "editar premios" on premios_anuales for update using (true) with check (true);
create policy "leer inscripciones" on inscripciones for select using (true);
create policy "anotarse" on inscripciones for insert with check (true);
create policy "bajarse" on inscripciones for delete using (true);
create policy "cargar goles" on inscripciones for update using (true) with check (true);
-- votos_*: SIN políticas => nadie los lee ni escribe directo; solo vía RPC.

-- El admin_token nunca se expone al cliente anónimo
revoke select on partidos from anon, authenticated;
grant select (id, formato, cupo_maximo, fecha_hora, ubicacion, link_maps, precio_cancha,
  tiene_sena, monto_sena, estado, numero_fecha, resultado_texto, mvp_imagen_url, mvp_cerrado, creado_en)
  on partidos to anon, authenticated;
revoke update, delete on partidos from anon, authenticated;

-- ===== RPC =====
create or replace function titulares(p_partido uuid) returns setof uuid
language sql security definer stable as $$
  select jugador_id from inscripciones where partido_id=p_partido
  order by orden_llegada limit (select cupo_maximo from partidos where id=p_partido);
$$;

create or replace function crear_partido(p_formato text, p_cupo int, p_fecha timestamptz,
  p_ubicacion text, p_maps text, p_precio numeric, p_sena boolean, p_monto_sena numeric)
returns table(id uuid, admin_token text) language sql security definer as $$
  insert into partidos(formato,cupo_maximo,fecha_hora,ubicacion,link_maps,precio_cancha,tiene_sena,monto_sena)
  values (p_formato,p_cupo,p_fecha,p_ubicacion,p_maps,p_precio,p_sena,p_monto_sena)
  returning partidos.id, partidos.admin_token;
$$;

create or replace function es_admin(p_partido uuid, p_token text) returns boolean
language sql security definer stable as $$
  select exists(select 1 from partidos where id=p_partido and admin_token=p_token);
$$;

create or replace function _chk(p_partido uuid, p_token text) returns void
language plpgsql security definer as $$
begin
  if not es_admin(p_partido,p_token) then raise exception 'No autorizado'; end if;
end $$;

create or replace function confirmar_partido(p_partido uuid, p_token text) returns int
language plpgsql security definer as $$
declare n int; cupo int;
begin
  perform _chk(p_partido,p_token);
  select cupo_maximo into cupo from partidos where id=p_partido;
  select coalesce(max(numero_fecha),0)+1 into n from partidos;
  update partidos set estado='confirmado', numero_fecha=n where id=p_partido;
  return n;
end $$;

create or replace function reprogramar_partido(p_partido uuid, p_token text,
  p_fecha timestamptz, p_ubicacion text, p_maps text, p_precio numeric, p_sena boolean, p_monto numeric)
returns void language plpgsql security definer as $$
begin
  perform _chk(p_partido,p_token);
  update partidos set estado='reprogramado', fecha_hora=p_fecha, ubicacion=p_ubicacion,
    link_maps=p_maps, precio_cancha=p_precio, tiene_sena=p_sena, monto_sena=p_monto
  where id=p_partido;
end $$;

create or replace function cancelar_partido(p_partido uuid, p_token text) returns void
language plpgsql security definer as $$
begin perform _chk(p_partido,p_token); update partidos set estado='cancelado' where id=p_partido; end $$;

create or replace function finalizar_partido(p_partido uuid, p_token text, p_resultado text) returns void
language plpgsql security definer as $$
begin perform _chk(p_partido,p_token);
  update partidos set estado='finalizado', resultado_texto=nullif(trim(p_resultado),'') where id=p_partido; end $$;

create or replace function set_mvp_imagen(p_partido uuid, p_token text, p_url text) returns void
language plpgsql security definer as $$
begin perform _chk(p_partido,p_token); update partidos set mvp_imagen_url=p_url where id=p_partido; end $$;

-- Voto secreto de stats (upsert; solo inscriptos, sin autovoto)
create or replace function votar_stats(p_partido uuid, p_votante uuid, p_votado uuid,
  r int, t int, p int, g int, d int, f int) returns void language plpgsql security definer as $$
begin
  if not exists(select 1 from partidos where id=p_partido and estado in ('abierto','reprogramado')) then
    raise exception 'Votación cerrada'; end if;
  if not exists(select 1 from inscripciones where partido_id=p_partido and jugador_id=p_votante)
     or not exists(select 1 from inscripciones where partido_id=p_partido and jugador_id=p_votado) then
    raise exception 'Ambos deben estar inscriptos'; end if;
  insert into votos_stats(partido_id,votante_id,votado_id,ritmo,tiro,pase,regate,defensa,fisico)
  values (p_partido,p_votante,p_votado,r,t,p,g,d,f)
  on conflict (partido_id,votante_id,votado_id) do update
    set ritmo=r,tiro=t,pase=p,regate=g,defensa=d,fisico=f;
end $$;

-- Solo devuelve MIS propios votos (para precargar la carta)
create or replace function mis_votos_stats(p_partido uuid, p_votante uuid)
returns setof votos_stats language sql security definer stable as $$
  select * from votos_stats where partido_id=p_partido and votante_id=p_votante;
$$;

-- Media general agregada por jugador (nunca votos individuales)
create or replace function medias_partido(p_partido uuid)
returns table(jugador_id uuid, media numeric, votos int) language sql security definer stable as $$
  select votado_id, round(avg((ritmo+tiro+pase+regate+defensa+fisico)/6.0),1), count(*)::int
  from votos_stats where partido_id=p_partido group by votado_id;
$$;

-- Armado equilibrado: ordena titulares por media y reparte en serpiente + mejora por swaps
create or replace function armar_equipos(p_partido uuid, p_token text) returns void
language plpgsql security definer as $$
declare ids uuid[]; ms numeric[]; n int; i int; j int; k int;
  asign int[]; sa numeric; sb numeric; best numeric; cur numeric; tmp int; improved boolean;
begin
  perform _chk(p_partido,p_token);
  select array_agg(x.jid order by x.m desc), array_agg(x.m order by x.m desc) into ids, ms from (
    select i.jugador_id jid, coalesce(m.media,50) m from inscripciones i
    left join medias_partido(p_partido) m on m.jugador_id=i.jugador_id
    where i.partido_id=p_partido
    order by i.orden_llegada limit (select cupo_maximo from partidos where id=p_partido)
  ) x;
  n := coalesce(array_length(ids,1),0); if n=0 then return; end if;
  asign := array_fill(0,array[n]);
  for i in 1..n loop asign[i] := case when ((i-1)/2)%2=0 then (i-1)%2 else 1-((i-1)%2) end; end loop;
  loop
    improved := false;
    select coalesce(sum(case when asign[x]=0 then ms[x] end),0) - coalesce(sum(case when asign[x]=1 then ms[x] end),0)
      into cur from generate_series(1,n) x;
    best := abs(cur);
    for j in 1..n loop for k in j+1..n loop
      if asign[j]<>asign[k] then
        tmp := asign[j]; asign[j]:=asign[k]; asign[k]:=tmp;
        select abs(coalesce(sum(case when asign[x]=0 then ms[x] end),0) - coalesce(sum(case when asign[x]=1 then ms[x] end),0))
          into cur from generate_series(1,n) x;
        if cur < best then best:=cur; improved:=true;
        else tmp := asign[j]; asign[j]:=asign[k]; asign[k]:=tmp; end if;
      end if;
    end loop; end loop;
    exit when not improved;
  end loop;
  update inscripciones set equipo=null where partido_id=p_partido;
  for i in 1..n loop
    update inscripciones set equipo = case when asign[i]=0 then 'A' else 'B' end
    where partido_id=p_partido and jugador_id=ids[i];
  end loop;
end $$;

-- Votación MVP secreta
create or replace function votar_mvp(p_partido uuid, p_votante uuid, p_votado uuid) returns void
language plpgsql security definer as $$
begin
  if not exists(select 1 from partidos where id=p_partido and estado in ('confirmado','finalizado') and not mvp_cerrado)
  then raise exception 'Urna cerrada'; end if;
  if not exists(select 1 from inscripciones where partido_id=p_partido and jugador_id=p_votante)
     or not exists(select 1 from inscripciones where partido_id=p_partido and jugador_id=p_votado)
  then raise exception 'Ambos deben haber jugado'; end if;
  insert into votos_mvp(partido_id,votante_id,votado_id) values (p_partido,p_votante,p_votado)
  on conflict (partido_id,votante_id) do update set votado_id=p_votado;
  perform _resolver_mvp(p_partido, false);
end $$;

create or replace function progreso_mvp(p_partido uuid) returns table(votaron int, total int)
language sql security definer stable as $$
  select (select count(*)::int from votos_mvp where partido_id=p_partido),
         (select count(*)::int from titulares(p_partido));
$$;

-- Revela MVP al votar todos (o al forzar); empate => todos los empatados
create or replace function _resolver_mvp(p_partido uuid, forzar boolean) returns void
language plpgsql security definer as $$
declare v int; t int; mx int;
begin
  select count(*) into v from votos_mvp where partido_id=p_partido;
  select count(*) into t from titulares(p_partido);
  if (v < t and not forzar) or v = 0 then return; end if;
  select max(c) into mx from (select count(*) c from votos_mvp where partido_id=p_partido group by votado_id) q;
  update inscripciones set es_mvp = false where partido_id=p_partido;
  update inscripciones set es_mvp = true where partido_id=p_partido and jugador_id in
    (select votado_id from votos_mvp where partido_id=p_partido group by votado_id having count(*)=mx);
  update partidos set mvp_cerrado=true where id=p_partido;
  perform recalcular_puntos(p_partido);
end $$;

create or replace function cerrar_urna_mvp(p_partido uuid, p_token text) returns void
language plpgsql security definer as $$
begin perform _chk(p_partido,p_token); perform _resolver_mvp(p_partido,true); end $$;

-- Fórmula: 1 presencia + min(goles,5) + min(asist,5) + 5 si MVP
create or replace function recalcular_puntos(p_partido uuid) returns void
language sql security definer as $$
  update inscripciones set puntos_mvp_fecha = 1 + least(goles,5) + least(asistencias,5) + (case when es_mvp then 5 else 0 end)
  where partido_id=p_partido and jugador_id in (select titulares(p_partido));
$$;

create or replace function guardar_goles(p_partido uuid, p_jugador uuid, p_goles int, p_asist int) returns void
language plpgsql security definer as $$
begin
  update inscripciones set goles=greatest(p_goles,0), asistencias=greatest(p_asist,0)
  where partido_id=p_partido and jugador_id=p_jugador;
  perform recalcular_puntos(p_partido);
end $$;

-- Ranking anual
create or replace function ranking_anual(p_anio int)
returns table(jugador_id uuid, nombre text, partidos int, goles int, asistencias int, puntos int, mvps int)
language sql security definer stable as $$
  select j.id, j.nombre, count(*)::int, sum(i.goles)::int, sum(i.asistencias)::int,
         sum(1 + least(i.goles,5) + least(i.asistencias,5) + (case when i.es_mvp then 5 else 0 end))::int,
         count(*) filter (where i.es_mvp)::int
  from inscripciones i join partidos p on p.id=i.partido_id join jugadores j on j.id=i.jugador_id
  where p.estado in ('confirmado','finalizado') and extract(year from p.fecha_hora)=p_anio
    and i.jugador_id in (select titulares(p.id))
  group by j.id, j.nombre order by 6 desc, 4 desc;
$$;

grant execute on all functions in schema public to anon, authenticated;
revoke execute on function titulares(uuid) from anon, authenticated;
revoke execute on function _chk(uuid,text), _resolver_mvp(uuid,boolean) from anon, authenticated;

-- ===== Storage =====
insert into storage.buckets (id, name, public) values ('mvp-premios','mvp-premios',true)
on conflict (id) do nothing;
drop policy if exists "leer premios img" on storage.objects;
drop policy if exists "subir premios img" on storage.objects;
drop policy if exists "actualizar premios img" on storage.objects;
create policy "leer premios img" on storage.objects for select using (bucket_id='mvp-premios');
create policy "subir premios img" on storage.objects for insert with check (bucket_id='mvp-premios');
create policy "actualizar premios img" on storage.objects for update using (bucket_id='mvp-premios');

-- ===== Realtime =====
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'partidos') then
    alter publication supabase_realtime add table partidos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'inscripciones') then
    alter publication supabase_realtime add table inscripciones;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'votos_mvp') then
    alter publication supabase_realtime add table votos_mvp;
  end if;
end $$;
