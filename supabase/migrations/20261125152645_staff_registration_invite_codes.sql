-- FindIT School: convites temporários para registo de funcionários
-- A migration já foi aplicada no projeto Supabase associado.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.staff_registration_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash bytea not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 minutes'),
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);
alter table private.staff_registration_codes enable row level security;
revoke all on private.staff_registration_codes from public, anon, authenticated;
create index if not exists staff_registration_codes_created_by_idx on private.staff_registration_codes(created_by);
create index if not exists staff_registration_codes_used_by_idx on private.staff_registration_codes(used_by);

create or replace function public.generate_staff_registration_code()
returns text language plpgsql security definer
set search_path = pg_catalog, public, private, extensions
as $fn$
declare v_code text;
begin
  if not exists (select 1 from public.utilizadores where id = auth.uid() and cargo = 'admin') then
    raise exception 'Apenas um administrador pode gerar códigos.';
  end if;
  delete from private.staff_registration_codes where expires_at <= now() or used_at is not null;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  insert into private.staff_registration_codes(code_hash, created_by, expires_at)
  values (extensions.digest(convert_to(v_code, 'UTF8'), 'sha256'), auth.uid(), now() + interval '3 minutes');
  return v_code;
end;
$fn$;
revoke all on function public.generate_staff_registration_code() from public, anon;
grant execute on function public.generate_staff_registration_code() to authenticated;

create or replace function private.assign_staff_profile_from_invite()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private, extensions
as $fn$
declare v_hash_hex text; v_code_id uuid;
begin
  v_hash_hex := new.raw_user_meta_data ->> 'staff_invite_hash';
  if v_hash_hex is null then return new; end if;
  if v_hash_hex !~ '^[0-9a-fA-F]{64}$' then raise exception 'Código de convite inválido.'; end if;
  delete from private.staff_registration_codes where expires_at <= now() or used_at is not null;
  update private.staff_registration_codes set used_at = now(), used_by = new.id
   where code_hash = decode(v_hash_hex, 'hex') and used_at is null and expires_at > now()
   returning id into v_code_id;
  if v_code_id is null then raise exception 'Código inválido, expirado ou já utilizado.'; end if;
  insert into public.utilizadores(id, email, cargo) values (new.id, new.email, 'funcionario')
  on conflict (id) do nothing;
  return new;
end;
$fn$;
revoke all on function private.assign_staff_profile_from_invite() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_staff_invite on auth.users;
create trigger on_auth_user_created_staff_invite after insert on auth.users
for each row execute function private.assign_staff_profile_from_invite();

-- Agendamento de limpeza, se pg_cron estiver disponível no projeto.
create extension if not exists pg_cron with schema pg_catalog;
do $block$
begin
  begin
    if not exists (select 1 from cron.job where jobname = 'findit-clean-expired-staff-codes') then
      perform cron.schedule('findit-clean-expired-staff-codes', '* * * * *',
        'delete from private.staff_registration_codes where expires_at <= now() or used_at is not null');
    end if;
  exception when others then
    raise notice 'Limpeza agendada não disponível: %', SQLERRM;
  end;
end;
$block$;
