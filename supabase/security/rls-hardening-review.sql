-- FindIT School — revisão de políticas RLS
-- ATENÇÃO: script para revisão/aplicação manual pelo responsável do projeto.
-- Não aplicar antes de criar em public.utilizadores um perfil para cada conta
-- autorizada (cargo: 'admin' ou 'funcionario').
-- Mantém o catálogo de objetos e as fotografias publicamente legíveis.
-- Não altera nem elimina registos de negócio.

begin;

-- 1) Perfis: cada utilizador autenticado só consulta o seu próprio perfil.
alter table public.utilizadores enable row level security;
drop policy if exists "Todos podem ver utilizadores" on public.utilizadores;
drop policy if exists "Utilizadores veem o proprio perfil" on public.utilizadores;
create policy "Utilizadores veem o proprio perfil"
on public.utilizadores
for select
to authenticated
using (id = (select auth.uid()));

revoke all on table public.utilizadores from public, anon;
grant select on table public.utilizadores to authenticated;

-- 2) Objetos: catálogo público para leitura; escrita apenas por staff.
alter table public.objetos enable row level security;
drop policy if exists "Ler objetos autenticado" on public.objetos;
drop policy if exists "Inserir objetos autenticado" on public.objetos;
drop policy if exists "Permitir inserção de objetos" on public.objetos;
drop policy if exists "Apenas funcionários editam objetos" on public.objetos;
drop policy if exists "Apenas funcionários apagam objetos" on public.objetos;

create policy "Staff insere objetos"
on public.objetos
for insert
to authenticated
with check (
  exists (
    select 1 from public.utilizadores u
    where u.id = (select auth.uid())
      and u.cargo in ('admin', 'funcionario')
  )
);

create policy "Staff atualiza objetos"
on public.objetos
for update
to authenticated
using (
  exists (
    select 1 from public.utilizadores u
    where u.id = (select auth.uid())
      and u.cargo in ('admin', 'funcionario')
  )
)
with check (
  exists (
    select 1 from public.utilizadores u
    where u.id = (select auth.uid())
      and u.cargo in ('admin', 'funcionario')
  )
);

create policy "Staff elimina objetos"
on public.objetos
for delete
to authenticated
using (
  exists (
    select 1 from public.utilizadores u
    where u.id = (select auth.uid())
      and u.cargo in ('admin', 'funcionario')
  )
);

revoke all on table public.objetos from public, anon;
grant select on table public.objetos to anon, authenticated;
grant insert, update, delete on table public.objetos to authenticated;

-- 3) Contactos: apenas admin/funcionario podem consultar ou gerir.
alter table public.contactos_email enable row level security;
drop policy if exists "Admins gerem contactos" on public.contactos_email;
drop policy if exists "Utilizadores autenticados podem atualizar contactos" on public.contactos_email;
drop policy if exists "Utilizadores autenticados podem eliminar contactos" on public.contactos_email;
drop policy if exists "Utilizadores autenticados podem inserir contactos" on public.contactos_email;
drop policy if exists "Utilizadores autenticados podem ver contactos" on public.contactos_email;
drop policy if exists "Staff gere contactos" on public.contactos_email;

create policy "Staff gere contactos"
on public.contactos_email
for all
to authenticated
using (
  exists (
    select 1 from public.utilizadores u
    where u.id = (select auth.uid())
      and u.cargo in ('admin', 'funcionario')
  )
)
with check (
  exists (
    select 1 from public.utilizadores u
    where u.id = (select auth.uid())
      and u.cargo in ('admin', 'funcionario')
  )
);

revoke all on table public.contactos_email from public, anon;
grant select, insert, update, delete on table public.contactos_email to authenticated;
grant usage, select on sequence public.contactos_email_id_seq to authenticated;

-- 4) Reclamações: submissão pública; consulta apenas por staff.
alter table public.reclamacoes enable row level security;
drop policy if exists "Apenas admins veem reclamações" on public.reclamacoes;
create policy "Staff consulta reclamacoes"
on public.reclamacoes
for select
to authenticated
using (
  exists (
    select 1 from public.utilizadores u
    where u.id = (select auth.uid())
      and u.cargo in ('admin', 'funcionario')
  )
);

revoke all on table public.reclamacoes from public, anon;
grant insert on table public.reclamacoes to anon, authenticated;
grant select on table public.reclamacoes to authenticated;
grant usage, select on sequence public.reclamacoes_id_seq to anon, authenticated;

-- 5) Fotografias: leitura pública (catálogo), upload apenas por staff.
drop policy if exists "Permitir leitura dos próprios ficheiros" on storage.objects;
drop policy if exists "Permitir upload de objetos" on storage.objects;
create policy "Staff envia fotografias de objetos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'objetos'
  and exists (
    select 1 from public.utilizadores u
    where u.id = (select auth.uid())
      and u.cargo in ('admin', 'funcionario')
  )
);

-- Limite também aplicado no servidor, não apenas no formulário.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'objetos';

commit;
