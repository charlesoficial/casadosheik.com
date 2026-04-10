-- =============================================================================
-- Migration 007 — Production Hardening
-- Sistema Restaurante / Casa do Sheik
-- Data: 2026-04-10
-- =============================================================================
-- Correcoes aplicadas:
--   [C-01] Revoga default privileges de anon em tabelas futuras
--   [C-02] Singleton constraint em restaurante_config
--   [C-03] Unique constraint em caixa_fechamentos(referencia_data)
--   [A-01] Coluna auxiliar mesa_numero em pedidos (FK futura para mesas)
--   [A-02] Coluna whatsapp em restaurante_config
--   [M-01] Soft delete (deleted_at) em produtos e categorias
--   [M-02] Tabela audit_log + triggers de auditoria
--   [P-01] Indice composto pedidos(status, tipo, created_at)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- [C-01] Revogar default privileges de anon para tabelas futuras
-- O migration 001_initial.sql concedeu erroneamente:
--   alter default privileges in schema public grant select on tables to anon
-- Isso faria qualquer nova tabela ficar legivel por usuarios anonimos.
-- O schema.sql (source of truth) revoga isso — aqui re-aplicamos explicitamente.
-- -----------------------------------------------------------------------------

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- Garantir que as tabelas existentes de leitura publica nao foram afetadas
-- (as policies RLS ja controlam o acesso linha-a-linha, mas garantimos grants minimos)
grant select on restaurante_config to anon;
grant select on categorias to anon;
grant select on produtos to anon;
grant select on mesas to anon;

-- -----------------------------------------------------------------------------
-- [C-02] Singleton constraint em restaurante_config
-- Garante que apenas uma linha de configuracao existe no banco.
-- Equivalente ao padrao ja adotado em order_settings.
-- -----------------------------------------------------------------------------

create unique index if not exists idx_restaurante_config_singleton
  on restaurante_config ((true));

-- -----------------------------------------------------------------------------
-- [C-03] Unique constraint em caixa_fechamentos por data de referencia
-- Evita duplo fechamento de caixa no mesmo dia.
-- ATENCAO: se ja existirem duplicatas na tabela, remova-as antes de rodar este
-- migration. Query para verificar:
--   SELECT referencia_data, count(*) FROM caixa_fechamentos
--   GROUP BY referencia_data HAVING count(*) > 1;
-- -----------------------------------------------------------------------------

create unique index if not exists idx_caixa_fechamentos_referencia_unique
  on caixa_fechamentos (referencia_data);

-- -----------------------------------------------------------------------------
-- [A-02] Adicionar coluna whatsapp em restaurante_config
-- A coluna 'telefone' era usada semanticamente como WhatsApp no codigo.
-- Adicionamos 'whatsapp' como coluna dedicada. A coluna 'telefone' permanece
-- para exibicao em telas que mostram telefone fixo ou outro contato.
-- O codigo em data.legacy.ts deve ser atualizado para usar 'whatsapp' diretamente.
-- -----------------------------------------------------------------------------

alter table restaurante_config
  add column if not exists whatsapp text;

-- Migra valor atual de telefone para whatsapp como ponto de partida
update restaurante_config
  set whatsapp = telefone
  where whatsapp is null and telefone is not null;

comment on column restaurante_config.whatsapp is
  'Numero do WhatsApp exibido no cardapio e checkout. Formato recomendado: +55 64 99999-9999';

comment on column restaurante_config.telefone is
  'Telefone fixo ou de contato geral. Separado do WhatsApp operacional.';

-- -----------------------------------------------------------------------------
-- [A-01] Coluna auxiliar mesa_numero em pedidos
-- pedidos.mesa e TEXT, mas mesas.numero e INTEGER — sem FK possivel.
-- Adicionamos mesa_numero integer como ponte para referencia futura.
-- A coluna mesa (text) permanece para compatibilidade com codigo existente.
-- Migracao dos dados existentes:
-- -----------------------------------------------------------------------------

alter table pedidos
  add column if not exists mesa_numero integer references mesas(numero) on delete set null;

-- Tenta popular mesa_numero a partir de mesa text para pedidos existentes
-- (so funciona quando o valor de mesa e numerico valido)
update pedidos p
  set mesa_numero = m.numero
  from mesas m
  where p.mesa_numero is null
    and p.mesa is not null
    and p.mesa ~ '^\d+$'
    and m.numero = p.mesa::integer;

create index if not exists idx_pedidos_mesa_numero
  on pedidos (mesa_numero)
  where mesa_numero is not null;

comment on column pedidos.mesa_numero is
  'FK auxiliar para mesas.numero. Substitui gradualmente o campo mesa (text). '
  'Quando ambos estiverem em sincronia, mesa text pode ser removido.';

-- -----------------------------------------------------------------------------
-- [M-01] Soft delete em produtos e categorias
-- Adiciona deleted_at para permitir exclusao logica sem perda de historico.
-- Produtos com deleted_at IS NOT NULL nao aparecem no cardapio publico,
-- mas seu historico permanece em pedido_itens (snapshot preservado).
-- -----------------------------------------------------------------------------

alter table produtos
  add column if not exists deleted_at timestamptz;

alter table categorias
  add column if not exists deleted_at timestamptz;

-- Indices parciais: queries de listagem filtram apenas registros nao deletados
create index if not exists idx_produtos_not_deleted
  on produtos (categoria_id, disponivel, ordem)
  where deleted_at is null;

create index if not exists idx_categorias_not_deleted
  on categorias (ordem)
  where deleted_at is null;

-- Politica de leitura publica nao exibe produtos deletados
-- (A politica RLS existente "produtos_select_public" usa using(true) — e necessario
-- garantir que o codigo de aplicacao sempre filtre deleted_at IS NULL)

comment on column produtos.deleted_at is
  'Soft delete. NULL = ativo. NOT NULL = deletado logicamente. '
  'Sempre filtrar "deleted_at IS NULL" em queries de cardapio.';

comment on column categorias.deleted_at is
  'Soft delete. NULL = ativa. NOT NULL = deletada logicamente.';

-- -----------------------------------------------------------------------------
-- [M-02] Tabela de audit log
-- Registra alteracoes em tabelas criticas com usuario, operacao e snapshot.
-- -----------------------------------------------------------------------------

create table if not exists audit_log (
  id           uuid primary key default gen_random_uuid(),
  tabela       text not null,
  operacao     text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id  uuid,
  dados_antes  jsonb,
  dados_depois jsonb,
  usuario_id   uuid,
  usuario_email text,
  ip_address   inet,
  created_at   timestamptz not null default now()
);

comment on table audit_log is
  'Trilha de auditoria para operacoes criticas. Inserida via trigger.';

create index if not exists idx_audit_log_tabela_created
  on audit_log (tabela, created_at desc);

create index if not exists idx_audit_log_registro
  on audit_log (registro_id, tabela, created_at desc);

create index if not exists idx_audit_log_usuario
  on audit_log (usuario_id, created_at desc);

-- RLS: apenas service_role e authenticated podem ler/escrever audit_log
alter table audit_log enable row level security;

create policy "audit_log_manage_authenticated"
  on audit_log
  for all
  to authenticated
  using (true)
  with check (true);

grant all privileges on audit_log to authenticated;
grant all privileges on audit_log to service_role;

-- Funcao de trigger para registrar alteracoes
create or replace function fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
  v_before    jsonb;
  v_after     jsonb;
  v_user_id   uuid;
  v_user_email text;
begin
  -- Captura o ID e snapshot do registro alterado
  if TG_OP = 'DELETE' then
    v_record_id := OLD.id;
    v_before    := row_to_json(OLD)::jsonb;
    v_after     := null;
  elsif TG_OP = 'INSERT' then
    v_record_id := NEW.id;
    v_before    := null;
    v_after     := row_to_json(NEW)::jsonb;
  else -- UPDATE
    v_record_id := NEW.id;
    v_before    := row_to_json(OLD)::jsonb;
    v_after     := row_to_json(NEW)::jsonb;
  end if;

  -- Tenta capturar o usuario autenticado da sessao atual
  begin
    v_user_id    := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    v_user_email := current_setting('request.jwt.claims', true)::jsonb ->> 'email';
  exception
    when others then
      v_user_id    := null;
      v_user_email := null;
  end;

  -- CRITICO: o INSERT no audit_log nao deve bloquear a operacao original.
  -- Qualquer falha na auditoria e suprimida para nao causar rollback acidental.
  begin
    insert into audit_log (tabela, operacao, registro_id, dados_antes, dados_depois, usuario_id, usuario_email)
    values (TG_TABLE_NAME, TG_OP, v_record_id, v_before, v_after, v_user_id, v_user_email);
  exception
    when others then
      -- Auditoria silenciosamente descartada — operacao original prossegue normalmente.
      null;
  end;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- Aplicar trigger de auditoria nas tabelas criticas
-- (pedidos, produtos, categorias — as mais sensiveis operacionalmente)

drop trigger if exists audit_pedidos on pedidos;
create trigger audit_pedidos
  after insert or update or delete on pedidos
  for each row execute function fn_audit_log();

drop trigger if exists audit_produtos on produtos;
create trigger audit_produtos
  after insert or update or delete on produtos
  for each row execute function fn_audit_log();

drop trigger if exists audit_categorias on categorias;
create trigger audit_categorias
  after insert or update or delete on categorias
  for each row execute function fn_audit_log();

drop trigger if exists audit_restaurante_config on restaurante_config;
create trigger audit_restaurante_config
  after insert or update or delete on restaurante_config
  for each row execute function fn_audit_log();

-- -----------------------------------------------------------------------------
-- [P-01] Indice composto em pedidos(status, tipo, created_at)
-- O admin board filtra por status E tipo simultaneamente.
-- O indice existente idx_pedidos_status_created_at nao cobre 'tipo'.
-- -----------------------------------------------------------------------------

create index if not exists idx_pedidos_status_tipo_created
  on pedidos (status, tipo, created_at desc);

-- Indice para filtros de pedidos ativos (excluindo concluidos e cancelados)
-- Util para o board de pedidos em tempo real
create index if not exists idx_pedidos_ativos
  on pedidos (status, created_at desc)
  where status not in ('concluido', 'cancelado');

-- -----------------------------------------------------------------------------
-- Retencao de print_jobs
-- Limpa jobs resolvidos com mais de 90 dias para evitar acumulo indefinido.
-- Esta funcao deve ser chamada periodicamente (ex: Edge Function agendada).
-- Invocacao manual: SELECT fn_cleanup_print_jobs();
-- -----------------------------------------------------------------------------

create or replace function fn_cleanup_print_jobs(retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from print_jobs
  where status in ('success', 'failed')
    and created_at < now() - (retention_days || ' days')::interval;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- =============================================================================
-- Verificacao final
-- Confirma que as principais mudancas foram aplicadas
-- =============================================================================

do $$
declare
  v_count integer;
begin
  -- Verifica singleton de restaurante_config
  select count(*) into v_count
  from pg_indexes
  where tablename = 'restaurante_config'
    and indexname = 'idx_restaurante_config_singleton';
  assert v_count = 1, 'FALHA: idx_restaurante_config_singleton nao foi criado';

  -- Verifica coluna whatsapp
  select count(*) into v_count
  from information_schema.columns
  where table_name = 'restaurante_config' and column_name = 'whatsapp';
  assert v_count = 1, 'FALHA: coluna whatsapp nao encontrada em restaurante_config';

  -- Verifica deleted_at em produtos
  select count(*) into v_count
  from information_schema.columns
  where table_name = 'produtos' and column_name = 'deleted_at';
  assert v_count = 1, 'FALHA: coluna deleted_at nao encontrada em produtos';

  -- Verifica tabela audit_log
  select count(*) into v_count
  from information_schema.tables
  where table_name = 'audit_log';
  assert v_count = 1, 'FALHA: tabela audit_log nao encontrada';

  raise notice 'Migration 007 verificada com sucesso.';
end;
$$;
