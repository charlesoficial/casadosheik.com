-- =============================================================================
-- SCHEMA OFICIAL - Sistema Restaurante (Casa do Sheik)
-- =============================================================================
--
-- Data de geracao: 2026-04-25
-- Versao: 2.0.0 (consolidacao + correcoes de producao)
--
-- Este arquivo e o source of truth para reconstruir a estrutura completa do
-- banco em uma unica importacao no Supabase SQL Editor.
--
-- Ordem oficial de uso:
--   1. schema.sql   (este arquivo)
--   2. seed.sql     (dados iniciais)
--   3. bootstrap-admin.sql (usuario admin, se necessario)
--
-- Historico consolidado:
--   001_initial.sql                   - Schema base + RLS + grants
--   002_cash.sql                      - Ja incorporado ao schema oficial
--   003_printers.sql                  - Ja incorporado ao schema oficial
--   004_alert_sounds.sql              - Sons extras de alerta (Alerta 1-8)
--   005_order_public_token_hardening  - Endurecimento de acesso publico
--   006_storage_product_images        - Bucket/policies de imagens
--   007_production_hardening.sql      - Audit log, soft delete, indices
--   008_max_alert_volume.sql          - Alert volume default = 100
--
-- Correcoes aplicadas nesta versao (2.0.0):
--   FIX-001: fn_audit_log() agora popula ip_address via request.headers
--   FIX-002: Removidos REVOKE redundantes de anon em pedidos/pedido_itens
--   FIX-003: Adicionadas politicas UPDATE e DELETE no bucket 'produtos'
--   FIX-004: Documentado que audit_log e coberto pelo GRANT generico
--   FIX-005: Documentada decisao sobre campo mesa legado vs mesa_numero FK
--
-- Garantias de idempotencia:
--   - DROP ... IF EXISTS CASCADE em todos os objetos
--   - DO $$ EXCEPTION guard em todos os CREATE TYPE
--   - CREATE OR REPLACE em todas as funcoes
--   - DROP POLICY IF EXISTS antes de cada CREATE POLICY
--   - DROP TRIGGER IF EXISTS antes de cada CREATE TRIGGER
--   - DROP INDEX IF EXISTS antes de cada CREATE INDEX
--
-- Decisoes de design documentadas:
--   - RLS: single-role (authenticated tem ALL em tudo). Aceitavel para
--     single-tenant (um restaurante, um admin). Documentado em ISSUE-004.
--   - Campo mesa (text): mantido por compatibilidade. O campo mesa_numero
--     (FK para mesas.numero) coexiste e ambos sao sincronizados pelo
--     frontend no momento da criacao do pedido. Ver FIX-005.
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

create extension if not exists pgcrypto;


-- =============================================================================
-- 2. DROP FUNCOES E TRIGGERS (clean slate)
-- =============================================================================

drop function if exists set_updated_at() cascade;
drop function if exists fn_audit_log() cascade;
drop function if exists fn_cleanup_print_jobs(integer) cascade;


-- =============================================================================
-- 3. DROP TABELAS (dependentes incluidos via CASCADE)
-- =============================================================================

drop table if exists audit_log cascade;
drop table if exists print_jobs cascade;
drop table if exists order_settings cascade;
drop table if exists printers cascade;
drop table if exists caixa_movimentacoes cascade;
drop table if exists caixa_fechamentos cascade;
drop table if exists mesa_contas cascade;
drop table if exists pedido_itens cascade;
drop table if exists pedidos cascade;
drop table if exists produtos cascade;
drop table if exists categorias cascade;
drop table if exists mesas cascade;
drop table if exists restaurante_config cascade;


-- =============================================================================
-- 4. DROP TIPOS ENUM
-- =============================================================================

drop type if exists print_job_status_enum cascade;
drop type if exists print_trigger_source_enum cascade;
drop type if exists print_transport_type_enum cascade;
drop type if exists printer_destination_enum cascade;
drop type if exists printer_type_enum cascade;
drop type if exists table_account_status_enum cascade;
drop type if exists cash_movement_type_enum cascade;
drop type if exists auto_print_trigger_status_enum cascade;
drop type if exists auto_print_mode_enum cascade;
drop type if exists alert_frequency_enum cascade;
drop type if exists alert_sound_enum cascade;
drop type if exists order_status_enum cascade;
drop type if exists order_kind_enum cascade;


-- =============================================================================
-- 5. CREATE TIPOS ENUM (com guard contra duplicatas)
-- =============================================================================

do $$ begin
  create type order_kind_enum as enum ('mesa', 'delivery', 'retirada');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type order_status_enum as enum ('novo', 'aceito', 'preparo', 'pronto', 'concluido', 'cancelado');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type alert_sound_enum as enum ('Alerta 1', 'Alerta 2', 'Alerta 3', 'Alerta 4', 'Alerta 5', 'Alerta 6', 'Alerta 7', 'Alerta 8');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type alert_frequency_enum as enum ('none', 'once_per_order', 'repeat_while_pending');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type auto_print_mode_enum as enum ('single_printer', 'by_destination');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type auto_print_trigger_status_enum as enum ('novo', 'aceito');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type printer_type_enum as enum ('usb', 'network');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type printer_destination_enum as enum ('caixa', 'cozinha', 'bar', 'delivery', 'geral');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type print_transport_type_enum as enum ('usb', 'network', 'manual');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type print_trigger_source_enum as enum ('test', 'auto_accept', 'manual_reprint');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type print_job_status_enum as enum ('pending', 'success', 'failed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type table_account_status_enum as enum ('aberta', 'fechada');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type cash_movement_type_enum as enum ('sangria', 'suprimento');
exception
  when duplicate_object then null;
end $$;


-- =============================================================================
-- 6. CREATE FUNCOES
-- =============================================================================

-- Trigger auxiliar: atualiza updated_at automaticamente em qualquer UPDATE.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Mantem a auditoria basica de alteracao sem repetir logica em cada tabela.
  new.updated_at = now();
  return new;
end;
$$;

-- Trilha de auditoria para operacoes criticas.
-- FIX-001: Agora tenta popular ip_address via current_setting('request.headers').
--          Se o header nao estiver disponivel (ex: migration, trigger direto),
--          registra NULL sem falhar.
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
  v_ip        inet;
begin
  if TG_OP = 'DELETE' then
    v_record_id := OLD.id;
    v_before    := row_to_json(OLD)::jsonb;
    v_after     := null;
  elsif TG_OP = 'INSERT' then
    v_record_id := NEW.id;
    v_before    := null;
    v_after     := row_to_json(NEW)::jsonb;
  else
    v_record_id := NEW.id;
    v_before    := row_to_json(OLD)::jsonb;
    v_after     := row_to_json(NEW)::jsonb;
  end if;

  -- Extrair usuario autenticado do JWT (Supabase PostgREST)
  begin
    v_user_id    := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    v_user_email := current_setting('request.jwt.claims', true)::jsonb ->> 'email';
  exception
    when others then
      v_user_id    := null;
      v_user_email := null;
  end;

  -- FIX-001: Extrair IP do request header x-forwarded-for.
  -- Em Supabase, request.headers esta disponivel no contexto PostgREST.
  -- Se nao disponivel (migration, trigger direto), v_ip fica NULL.
  begin
    v_ip := (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for')::inet;
  exception
    when others then
      v_ip := null;
  end;

  -- Auditoria nao bloqueia operacao original caso falhe
  begin
    insert into audit_log(tabela, operacao, registro_id, dados_antes, dados_depois, usuario_id, usuario_email, ip_address)
    values (TG_TABLE_NAME, TG_OP, v_record_id, v_before, v_after, v_user_id, v_user_email, v_ip);
  exception
    when others then null;
  end;

  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;

-- Funcao de retencao: limpa print_jobs resolvidos com mais de N dias (padrao 90).
-- Invocar periodicamente: SELECT fn_cleanup_print_jobs();
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
-- 7. CREATE TABELAS (ordem: sem FK primeiro, depois com FK)
-- =============================================================================

-- Configuracao institucional exibida no cardapio, checkout e telas operacionais.
-- Singleton: apenas uma linha permitida (idx_restaurante_config_singleton).
create table restaurante_config (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  endereco text,
  telefone text,               -- Telefone fixo ou de contato geral
  whatsapp text,               -- Numero do WhatsApp operacional (ex: +55 64 99999-9999)
  logo_url text,
  pedido_minimo numeric(10,2) not null default 0 check (pedido_minimo >= 0),
  taxa_entrega numeric(10,2) not null default 0 check (taxa_entrega >= 0),
  entrega_gratis_acima numeric(10,2) check (entrega_gratis_acima is null or entrega_gratis_acima >= 0),
  tempo_entrega_min integer check (tempo_entrega_min is null or tempo_entrega_min >= 0),
  tempo_retirada_min integer check (tempo_retirada_min is null or tempo_retirada_min >= 0),
  aberto boolean not null default true,
  horarios jsonb not null default '[]'::jsonb,
  formas_pagamento text[] not null default array['dinheiro', 'credito', 'debito', 'pix'],
  mensagem_boas_vindas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Categorias organizam o cardapio admin e a vitrine publica.
create table categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem integer not null default 0 check (ordem >= 0),
  ativa boolean not null default true,
  deleted_at timestamptz,      -- Soft delete: NULL = ativa, NOT NULL = deletada
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Produtos publicados no cardapio. O checkout usa este cadastro como fonte de verdade
-- para nome, preco e disponibilidade.
create table produtos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references categorias(id) on delete set null,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null check (preco >= 0),
  foto_url text,
  disponivel boolean not null default true,
  destaque boolean not null default false,
  ordem integer not null default 0 check (ordem >= 0),
  deleted_at timestamptz,      -- Soft delete: NULL = disponivel para exibicao, NOT NULL = removido
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pedido e o agregado principal da operacao. Ele representa tanto mesa quanto delivery/retirada.
-- FIX-005: O campo mesa (text) e legado mas ainda ativamente usado pelo frontend em queries
-- de mesa_contas e exibicao. O campo mesa_numero (integer FK) coexiste para integridade
-- referencial. Ambos sao sincronizados no momento da criacao do pedido pelo frontend
-- (createOrderFromCheckout). NAO remover mesa sem migrar todas as queries que o usam.
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  tipo order_kind_enum not null,
  mesa text,                   -- Identificador textual da mesa (legado — manter para compatibilidade)
  mesa_numero integer,         -- FK para mesas.numero — constraint adicionada via ALTER TABLE apos criacao de mesas
  status order_status_enum not null default 'novo',
  cliente_nome text,
  cliente_telefone text,
  endereco_entrega jsonb,
  forma_pagamento text,
  financeiro_forma_pagamento text,
  financeiro_fechado_em timestamptz,
  financeiro_fechado_por text,
  troco_para numeric(10,2) check (troco_para is null or troco_para >= 0),
  observacao_geral text,
  total numeric(10,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pedidos_table_number_required check (
    (tipo = 'mesa' and mesa is not null and btrim(mesa) <> '') or
    tipo <> 'mesa'
  )
);

-- Itens do pedido preservam um snapshot do produto no momento da compra,
-- para nao depender de futuras alteracoes no cadastro do cardapio.
create table pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid references produtos(id) on delete set null,
  produto_nome text not null,
  produto_preco numeric(10,2) not null check (produto_preco >= 0),
  quantidade integer not null default 1 check (quantidade > 0),
  observacao text,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

-- Mesas ativas geram QR Codes e ajudam a controlar consumo presencial.
create table mesas (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique check (numero > 0),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mesa_contas registra o fechamento financeiro separado da conclusao operacional do pedido.
create table mesa_contas (
  id uuid primary key default gen_random_uuid(),
  mesa text not null,
  status table_account_status_enum not null default 'fechada',
  pedido_ids uuid[] not null default '{}',
  total numeric(10,2) not null default 0 check (total >= 0),
  forma_pagamento text,
  fechada_por text,
  fechada_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Fechamento consolidado do caixa por dia, usado em historico e auditoria operacional.
create table caixa_fechamentos (
  id uuid primary key default gen_random_uuid(),
  referencia_data date not null,
  total numeric(10,2) not null default 0 check (total >= 0),
  pedidos_count integer not null default 0 check (pedidos_count >= 0),
  mesas_count integer not null default 0 check (mesas_count >= 0),
  totais_por_pagamento jsonb not null default '[]'::jsonb,
  observacao text,
  fechado_por text,
  fechado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Sangrias e suprimentos alteram o saldo fisico esperado do caixa sem mudar faturamento.
create table caixa_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  referencia_data date not null,
  tipo cash_movement_type_enum not null,
  valor numeric(10,2) not null check (valor > 0),
  observacao text,
  created_at timestamptz not null default now()
);

-- Cadastro de impressoras por destino operacional.
create table printers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type printer_type_enum not null,
  destination printer_destination_enum not null,
  printer_name text,
  ip_address text,
  port integer not null default 9100 check (port > 0 and port <= 65535),
  is_active boolean not null default true,
  auto_print_on_accept boolean not null default true,
  copies integer not null default 1 check (copies > 0 and copies <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint printers_usb_requires_printer_name check (
    (type = 'usb' and printer_name is not null and btrim(printer_name) <> '') or
    type <> 'usb'
  ),
  constraint printers_network_requires_ip check (
    (type = 'network' and ip_address is not null and btrim(ip_address) <> '') or
    type <> 'network'
  )
);

-- Configuracoes operacionais de pedidos. Singleton (idx_order_settings_singleton).
create table order_settings (
  id uuid primary key default gen_random_uuid(),
  enable_table_orders boolean not null default true,
  enable_delivery_orders boolean not null default true,
  enable_manual_orders boolean not null default true,
  enable_step_accepted boolean not null default true,
  enable_step_preparing boolean not null default true,
  enable_step_delivery boolean not null default false,
  notifications_enabled boolean not null default true,
  alert_sound alert_sound_enum not null default 'Alerta 1',
  alert_frequency alert_frequency_enum not null default 'repeat_while_pending',
  alert_volume integer not null default 100 check (alert_volume between 0 and 100),
  auto_print_enabled boolean not null default false,
  auto_print_mode auto_print_mode_enum not null default 'single_printer',
  default_auto_print_printer_id uuid references printers(id) on delete set null,
  auto_print_trigger_status auto_print_trigger_status_enum not null default 'aceito',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Registro de jobs de impressao para rastreabilidade e retry.
create table print_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references pedidos(id) on delete set null,
  printer_id uuid references printers(id) on delete set null,
  destination printer_destination_enum not null,
  transport_type print_transport_type_enum not null,
  trigger_source print_trigger_source_enum not null,
  status print_job_status_enum not null default 'pending',
  attempt_count integer not null default 1 check (attempt_count > 0),
  error_message text,
  payload_preview text,
  created_at timestamptz not null default now(),
  printed_at timestamptz
);

-- Trilha de auditoria para operacoes criticas em pedidos, produtos e configuracoes.
-- FIX-004: Esta tabela e coberta pelo GRANT generico
-- "grant all privileges on all tables in schema public to authenticated" que
-- executa apos sua criacao. Nao precisa de GRANT individual adicional.
create table audit_log (
  id           uuid primary key default gen_random_uuid(),
  tabela       text not null,
  operacao     text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id  uuid,
  dados_antes  jsonb,
  dados_depois jsonb,
  usuario_id   uuid,
  usuario_email text,
  ip_address   inet,            -- FIX-001: Agora populado por fn_audit_log() via request.headers
  created_at   timestamptz not null default now()
);


-- =============================================================================
-- 8. ALTER TABLE PARA FKs COM ORDEM ESPECIFICA
-- =============================================================================

-- FK de pedidos.mesa_numero para mesas.numero adicionada apos criacao de mesas
-- (pedidos e criado antes de mesas para preservar a ordem original do schema)
alter table pedidos
  add constraint pedidos_mesa_numero_fk
  foreign key (mesa_numero) references mesas(numero) on delete set null;


-- =============================================================================
-- 9. CREATE INDEX (com DROP IF EXISTS antes de cada um)
-- =============================================================================

-- restaurante_config
drop index if exists idx_restaurante_config_singleton;
create unique index idx_restaurante_config_singleton on restaurante_config ((true));
drop index if exists idx_restaurante_config_aberto;
create index idx_restaurante_config_aberto on restaurante_config(aberto);

-- categorias
drop index if exists idx_categorias_ordem;
create index idx_categorias_ordem on categorias(ordem);
drop index if exists idx_categorias_ativa_ordem;
create index idx_categorias_ativa_ordem on categorias(ativa, ordem);
drop index if exists idx_categorias_nome_lower;
create index idx_categorias_nome_lower on categorias((lower(nome)));
drop index if exists idx_categorias_not_deleted;
create index idx_categorias_not_deleted on categorias(ordem) where deleted_at is null;

-- produtos
drop index if exists idx_produtos_categoria;
create index idx_produtos_categoria on produtos(categoria_id);
drop index if exists idx_produtos_categoria_disponivel_ordem;
create index idx_produtos_categoria_disponivel_ordem on produtos(categoria_id, disponivel, ordem);
drop index if exists idx_produtos_disponivel_ordem;
create index idx_produtos_disponivel_ordem on produtos(disponivel, ordem);
drop index if exists idx_produtos_destaque;
create index idx_produtos_destaque on produtos(destaque);
drop index if exists idx_produtos_created_at;
create index idx_produtos_created_at on produtos(created_at desc);
drop index if exists idx_produtos_nome_lower;
create index idx_produtos_nome_lower on produtos((lower(nome)));
drop index if exists idx_produtos_disponivel_destaque;
create index idx_produtos_disponivel_destaque on produtos(disponivel, destaque);
drop index if exists idx_produtos_not_deleted;
create index idx_produtos_not_deleted on produtos(categoria_id, disponivel, ordem) where deleted_at is null;

-- pedidos
drop index if exists idx_pedidos_status_created_at;
create index idx_pedidos_status_created_at on pedidos(status, created_at desc);
drop index if exists idx_pedidos_status_tipo_created;
create index idx_pedidos_status_tipo_created on pedidos(status, tipo, created_at desc);
drop index if exists idx_pedidos_ativos;
create index idx_pedidos_ativos on pedidos(status, created_at desc) where status not in ('concluido', 'cancelado');
drop index if exists idx_pedidos_tipo_created_at;
create index idx_pedidos_tipo_created_at on pedidos(tipo, created_at desc);
drop index if exists idx_pedidos_created_at;
create index idx_pedidos_created_at on pedidos(created_at desc);
drop index if exists idx_pedidos_mesa;
create index idx_pedidos_mesa on pedidos(mesa) where mesa is not null;
drop index if exists idx_pedidos_mesa_numero;
create index idx_pedidos_mesa_numero on pedidos(mesa_numero) where mesa_numero is not null;
drop index if exists idx_pedidos_financeiro_fechado_em;
create index idx_pedidos_financeiro_fechado_em on pedidos(financeiro_fechado_em desc);

-- pedido_itens
drop index if exists idx_pedido_itens_pedido_id;
create index idx_pedido_itens_pedido_id on pedido_itens(pedido_id);
drop index if exists idx_pedido_itens_produto_id;
create index idx_pedido_itens_produto_id on pedido_itens(produto_id);
drop index if exists idx_pedido_itens_created_at;
create index idx_pedido_itens_created_at on pedido_itens(created_at desc);

-- mesas
drop index if exists idx_mesas_ativa;
create index idx_mesas_ativa on mesas(ativa);

-- mesa_contas
drop index if exists idx_mesa_contas_mesa_fechada_em;
create index idx_mesa_contas_mesa_fechada_em on mesa_contas(mesa, fechada_em desc);
drop index if exists idx_mesa_contas_pedido_ids_gin;
create index idx_mesa_contas_pedido_ids_gin on mesa_contas using gin (pedido_ids);

-- caixa_fechamentos
drop index if exists idx_caixa_fechamentos_referencia_unique;
create unique index idx_caixa_fechamentos_referencia_unique on caixa_fechamentos(referencia_data);
drop index if exists idx_caixa_fechamentos_referencia;
create index idx_caixa_fechamentos_referencia on caixa_fechamentos(referencia_data desc);
drop index if exists idx_caixa_fechamentos_referencia_fechado;
create index idx_caixa_fechamentos_referencia_fechado on caixa_fechamentos(referencia_data, fechado_em desc);

-- caixa_movimentacoes
drop index if exists idx_caixa_movimentacoes_referencia_created;
create index idx_caixa_movimentacoes_referencia_created on caixa_movimentacoes(referencia_data, created_at desc);

-- printers
drop index if exists idx_printers_destination_active;
create index idx_printers_destination_active on printers(destination, is_active);
drop index if exists idx_printers_auto_print;
create index idx_printers_auto_print on printers(auto_print_on_accept);
drop index if exists idx_printers_created_at;
create index idx_printers_created_at on printers(created_at desc);

-- order_settings
drop index if exists idx_order_settings_singleton;
create unique index idx_order_settings_singleton on order_settings ((true));
drop index if exists idx_order_settings_default_auto_print_printer_id;
create index idx_order_settings_default_auto_print_printer_id
  on order_settings(default_auto_print_printer_id)
  where default_auto_print_printer_id is not null;
drop index if exists idx_order_settings_created_at;
create index idx_order_settings_created_at on order_settings(created_at desc);

-- print_jobs
drop index if exists idx_print_jobs_order_created;
create index idx_print_jobs_order_created on print_jobs(order_id, created_at desc);
drop index if exists idx_print_jobs_printer_created;
create index idx_print_jobs_printer_created on print_jobs(printer_id, created_at desc);
drop index if exists idx_print_jobs_status_created;
create index idx_print_jobs_status_created on print_jobs(status, created_at desc);
drop index if exists idx_print_jobs_created_at;
create index idx_print_jobs_created_at on print_jobs(created_at desc);

-- audit_log
drop index if exists idx_audit_log_tabela_created;
create index idx_audit_log_tabela_created on audit_log(tabela, created_at desc);
drop index if exists idx_audit_log_registro;
create index idx_audit_log_registro on audit_log(registro_id, tabela, created_at desc);
drop index if exists idx_audit_log_usuario;
create index idx_audit_log_usuario on audit_log(usuario_id, created_at desc);


-- =============================================================================
-- 10. CREATE TRIGGERS (com DROP IF EXISTS antes de cada um)
-- =============================================================================

-- updated_at triggers
drop trigger if exists restaurante_config_set_updated_at on restaurante_config;
create trigger restaurante_config_set_updated_at
before update on restaurante_config
for each row execute function set_updated_at();

drop trigger if exists categorias_set_updated_at on categorias;
create trigger categorias_set_updated_at
before update on categorias
for each row execute function set_updated_at();

drop trigger if exists produtos_set_updated_at on produtos;
create trigger produtos_set_updated_at
before update on produtos
for each row execute function set_updated_at();

drop trigger if exists pedidos_set_updated_at on pedidos;
create trigger pedidos_set_updated_at
before update on pedidos
for each row execute function set_updated_at();

drop trigger if exists mesas_set_updated_at on mesas;
create trigger mesas_set_updated_at
before update on mesas
for each row execute function set_updated_at();

drop trigger if exists printers_set_updated_at on printers;
create trigger printers_set_updated_at
before update on printers
for each row execute function set_updated_at();

drop trigger if exists order_settings_set_updated_at on order_settings;
create trigger order_settings_set_updated_at
before update on order_settings
for each row execute function set_updated_at();

-- Audit triggers (FIX-001: fn_audit_log agora popula ip_address)
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


-- =============================================================================
-- 11. GRANTS
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Leitura publica restrita: apenas tabelas exibidas no cardapio publico.
grant select on restaurante_config to anon;
grant select on categorias to anon;
grant select on produtos to anon;
grant select on mesas to anon;

-- FIX-004: O grant generico abaixo cobre TODAS as tabelas existentes no schema,
-- incluindo audit_log. Nao e necessario grant individual adicional.
grant all privileges on all tables in schema public to authenticated;
grant all privileges on all sequences in schema public to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Garantir que tabelas futuras NAO sejam acessiveis por anon por padrao.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;


-- =============================================================================
-- 12. ROW LEVEL SECURITY
-- =============================================================================

alter table restaurante_config enable row level security;
alter table categorias enable row level security;
alter table produtos enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;
alter table mesas enable row level security;
alter table mesa_contas enable row level security;
alter table caixa_fechamentos enable row level security;
alter table caixa_movimentacoes enable row level security;
alter table printers enable row level security;
alter table order_settings enable row level security;
alter table print_jobs enable row level security;
alter table audit_log enable row level security;


-- =============================================================================
-- 13. POLITICAS RLS (DROP IF EXISTS + CREATE para cada tabela)
-- =============================================================================
-- Politicas single-role. Em single-tenant (um restaurante, um admin), usuarios
-- autenticados administram o painel. As politicas usam auth.uid() IS NOT NULL
-- para evitar permissoes "always true" em INSERT/UPDATE/DELETE.
-- Se o sistema evoluir para multi-tenant, incluir tenant_id ou roles dedicadas.

-- restaurante_config
drop policy if exists "restaurante_config_select_public" on restaurante_config;
create policy "restaurante_config_select_public"
on restaurante_config
for select
to public
using (true);

drop policy if exists "restaurante_config_manage_authenticated" on restaurante_config;
drop policy if exists "restaurante_config_insert_authenticated" on restaurante_config;
drop policy if exists "restaurante_config_update_authenticated" on restaurante_config;
drop policy if exists "restaurante_config_delete_authenticated" on restaurante_config;
create policy "restaurante_config_insert_authenticated" on restaurante_config
for insert to authenticated with check (auth.uid() is not null);
create policy "restaurante_config_update_authenticated" on restaurante_config
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "restaurante_config_delete_authenticated" on restaurante_config
for delete to authenticated using (auth.uid() is not null);

-- categorias
drop policy if exists "categorias_select_public" on categorias;
create policy "categorias_select_public"
on categorias
for select
to public
using (ativa = true and deleted_at is null);

drop policy if exists "categorias_manage_authenticated" on categorias;
drop policy if exists "categorias_select_authenticated" on categorias;
drop policy if exists "categorias_insert_authenticated" on categorias;
drop policy if exists "categorias_update_authenticated" on categorias;
drop policy if exists "categorias_delete_authenticated" on categorias;
create policy "categorias_select_authenticated" on categorias
for select to authenticated using (auth.uid() is not null);
create policy "categorias_insert_authenticated" on categorias
for insert to authenticated with check (auth.uid() is not null);
create policy "categorias_update_authenticated" on categorias
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "categorias_delete_authenticated" on categorias
for delete to authenticated using (auth.uid() is not null);

-- produtos
drop policy if exists "produtos_select_public" on produtos;
create policy "produtos_select_public"
on produtos
for select
to public
using (disponivel = true and deleted_at is null);

drop policy if exists "produtos_manage_authenticated" on produtos;
drop policy if exists "produtos_select_authenticated" on produtos;
drop policy if exists "produtos_insert_authenticated" on produtos;
drop policy if exists "produtos_update_authenticated" on produtos;
drop policy if exists "produtos_delete_authenticated" on produtos;
create policy "produtos_select_authenticated" on produtos
for select to authenticated using (auth.uid() is not null);
create policy "produtos_insert_authenticated" on produtos
for insert to authenticated with check (auth.uid() is not null);
create policy "produtos_update_authenticated" on produtos
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "produtos_delete_authenticated" on produtos
for delete to authenticated using (auth.uid() is not null);

-- pedidos
-- FIX-002: Removidos REVOKE SELECT/INSERT FROM anon em pedidos e pedido_itens.
-- A protecao de acesso anonimo e garantida pela combinacao de:
--   1. RLS habilitado na tabela
--   2. Nenhuma politica RLS para o role anon
-- O REVOKE era redundante e adicionava ruido ao schema.
drop policy if exists "pedidos_manage_authenticated" on pedidos;
drop policy if exists "pedidos_select_authenticated" on pedidos;
drop policy if exists "pedidos_insert_authenticated" on pedidos;
drop policy if exists "pedidos_update_authenticated" on pedidos;
drop policy if exists "pedidos_delete_authenticated" on pedidos;
create policy "pedidos_select_authenticated" on pedidos
for select to authenticated using (auth.uid() is not null);
create policy "pedidos_insert_authenticated" on pedidos
for insert to authenticated with check (auth.uid() is not null);
create policy "pedidos_update_authenticated" on pedidos
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "pedidos_delete_authenticated" on pedidos
for delete to authenticated using (auth.uid() is not null);

-- pedido_itens
drop policy if exists "pedido_itens_manage_authenticated" on pedido_itens;
drop policy if exists "pedido_itens_select_authenticated" on pedido_itens;
drop policy if exists "pedido_itens_insert_authenticated" on pedido_itens;
drop policy if exists "pedido_itens_update_authenticated" on pedido_itens;
drop policy if exists "pedido_itens_delete_authenticated" on pedido_itens;
create policy "pedido_itens_select_authenticated" on pedido_itens
for select to authenticated using (auth.uid() is not null);
create policy "pedido_itens_insert_authenticated" on pedido_itens
for insert to authenticated with check (auth.uid() is not null);
create policy "pedido_itens_update_authenticated" on pedido_itens
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "pedido_itens_delete_authenticated" on pedido_itens
for delete to authenticated using (auth.uid() is not null);

-- mesas
drop policy if exists "mesas_select_public" on mesas;
create policy "mesas_select_public"
on mesas
for select
to public
using (ativa = true);

drop policy if exists "mesas_manage_authenticated" on mesas;
drop policy if exists "mesas_select_authenticated" on mesas;
drop policy if exists "mesas_insert_authenticated" on mesas;
drop policy if exists "mesas_update_authenticated" on mesas;
drop policy if exists "mesas_delete_authenticated" on mesas;
create policy "mesas_select_authenticated" on mesas
for select to authenticated using (auth.uid() is not null);
create policy "mesas_insert_authenticated" on mesas
for insert to authenticated with check (auth.uid() is not null);
create policy "mesas_update_authenticated" on mesas
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "mesas_delete_authenticated" on mesas
for delete to authenticated using (auth.uid() is not null);

-- mesa_contas
drop policy if exists "mesa_contas_manage_authenticated" on mesa_contas;
drop policy if exists "mesa_contas_select_authenticated" on mesa_contas;
drop policy if exists "mesa_contas_insert_authenticated" on mesa_contas;
drop policy if exists "mesa_contas_update_authenticated" on mesa_contas;
drop policy if exists "mesa_contas_delete_authenticated" on mesa_contas;
create policy "mesa_contas_select_authenticated" on mesa_contas
for select to authenticated using (auth.uid() is not null);
create policy "mesa_contas_insert_authenticated" on mesa_contas
for insert to authenticated with check (auth.uid() is not null);
create policy "mesa_contas_update_authenticated" on mesa_contas
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "mesa_contas_delete_authenticated" on mesa_contas
for delete to authenticated using (auth.uid() is not null);

-- caixa_fechamentos
drop policy if exists "caixa_fechamentos_manage_authenticated" on caixa_fechamentos;
drop policy if exists "caixa_fechamentos_select_authenticated" on caixa_fechamentos;
drop policy if exists "caixa_fechamentos_insert_authenticated" on caixa_fechamentos;
drop policy if exists "caixa_fechamentos_update_authenticated" on caixa_fechamentos;
drop policy if exists "caixa_fechamentos_delete_authenticated" on caixa_fechamentos;
create policy "caixa_fechamentos_select_authenticated" on caixa_fechamentos
for select to authenticated using (auth.uid() is not null);
create policy "caixa_fechamentos_insert_authenticated" on caixa_fechamentos
for insert to authenticated with check (auth.uid() is not null);
create policy "caixa_fechamentos_update_authenticated" on caixa_fechamentos
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "caixa_fechamentos_delete_authenticated" on caixa_fechamentos
for delete to authenticated using (auth.uid() is not null);

-- caixa_movimentacoes
drop policy if exists "caixa_movimentacoes_manage_authenticated" on caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_select_authenticated" on caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_insert_authenticated" on caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_update_authenticated" on caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_delete_authenticated" on caixa_movimentacoes;
create policy "caixa_movimentacoes_select_authenticated" on caixa_movimentacoes
for select to authenticated using (auth.uid() is not null);
create policy "caixa_movimentacoes_insert_authenticated" on caixa_movimentacoes
for insert to authenticated with check (auth.uid() is not null);
create policy "caixa_movimentacoes_update_authenticated" on caixa_movimentacoes
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "caixa_movimentacoes_delete_authenticated" on caixa_movimentacoes
for delete to authenticated using (auth.uid() is not null);

-- printers
drop policy if exists "printers_manage_authenticated" on printers;
drop policy if exists "printers_select_authenticated" on printers;
drop policy if exists "printers_insert_authenticated" on printers;
drop policy if exists "printers_update_authenticated" on printers;
drop policy if exists "printers_delete_authenticated" on printers;
create policy "printers_select_authenticated" on printers
for select to authenticated using (auth.uid() is not null);
create policy "printers_insert_authenticated" on printers
for insert to authenticated with check (auth.uid() is not null);
create policy "printers_update_authenticated" on printers
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "printers_delete_authenticated" on printers
for delete to authenticated using (auth.uid() is not null);

-- order_settings
drop policy if exists "order_settings_manage_authenticated" on order_settings;
drop policy if exists "order_settings_select_authenticated" on order_settings;
drop policy if exists "order_settings_insert_authenticated" on order_settings;
drop policy if exists "order_settings_update_authenticated" on order_settings;
drop policy if exists "order_settings_delete_authenticated" on order_settings;
create policy "order_settings_select_authenticated" on order_settings
for select to authenticated using (auth.uid() is not null);
create policy "order_settings_insert_authenticated" on order_settings
for insert to authenticated with check (auth.uid() is not null);
create policy "order_settings_update_authenticated" on order_settings
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "order_settings_delete_authenticated" on order_settings
for delete to authenticated using (auth.uid() is not null);

-- print_jobs
drop policy if exists "print_jobs_manage_authenticated" on print_jobs;
drop policy if exists "print_jobs_select_authenticated" on print_jobs;
drop policy if exists "print_jobs_insert_authenticated" on print_jobs;
drop policy if exists "print_jobs_update_authenticated" on print_jobs;
drop policy if exists "print_jobs_delete_authenticated" on print_jobs;
create policy "print_jobs_select_authenticated" on print_jobs
for select to authenticated using (auth.uid() is not null);
create policy "print_jobs_insert_authenticated" on print_jobs
for insert to authenticated with check (auth.uid() is not null);
create policy "print_jobs_update_authenticated" on print_jobs
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "print_jobs_delete_authenticated" on print_jobs
for delete to authenticated using (auth.uid() is not null);

-- audit_log
drop policy if exists "audit_log_manage_authenticated" on audit_log;
drop policy if exists "audit_log_select_authenticated" on audit_log;
drop policy if exists "audit_log_insert_authenticated" on audit_log;
create policy "audit_log_select_authenticated" on audit_log
for select to authenticated using (auth.uid() is not null);
create policy "audit_log_insert_authenticated" on audit_log
for insert to authenticated with check (auth.uid() is not null);


-- =============================================================================
-- 14. STORAGE: BUCKET + POLITICAS (FIX-003)
-- =============================================================================

-- Storage minimo para imagens de produto.
-- Mantemos leitura publica apenas do bucket necessario e upload restrito ao autenticado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'produtos',
  'produtos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Politicas de storage para o bucket 'produtos'
drop policy if exists "produtos_public_read" on storage.objects;
drop policy if exists "produtos_authenticated_insert" on storage.objects;
drop policy if exists "produtos_authenticated_update" on storage.objects;
drop policy if exists "produtos_authenticated_delete" on storage.objects;

create policy "produtos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'produtos');

create policy "produtos_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'produtos');

-- FIX-003: Politicas de UPDATE e DELETE adicionadas para permitir que o admin
-- substitua ou remova imagens de produtos via Storage.
create policy "produtos_authenticated_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'produtos');

create policy "produtos_authenticated_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'produtos');


-- =============================================================================
-- 15. REALTIME PUBLICATIONS
-- =============================================================================
-- Tabelas escutadas pelo frontend via Supabase Realtime:
--   - pedidos: order-board.tsx, admin-order-alerts.tsx
--   - mesa_contas: cash-close-panel.tsx
--   - caixa_fechamentos: cash-close-panel.tsx
--   - caixa_movimentacoes: cash-close-panel.tsx

do $$
begin
  begin
    alter publication supabase_realtime add table pedidos;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table mesa_contas;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table caixa_fechamentos;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table caixa_movimentacoes;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;


-- =============================================================================
-- 16. COMENTARIOS FINAIS SOBRE DECISOES DE DESIGN
-- =============================================================================

-- DECISAO: Single-tenant / Single-role
--   Este sistema e projetado para um unico restaurante com um unico admin.
--   Todas as politicas RLS concedem ALL ao role authenticated sem restricao
--   adicional. Isso e intencional e aceitavel para o caso de uso atual.
--   Para multi-tenant, adicionar verificacao de tenant_id nas politicas.

-- DECISAO: Campo mesa (text) vs mesa_numero (integer FK)
--   O campo mesa (text) e legado e continua sendo usado pelo frontend para:
--     1. Identificar a mesa em queries de pedidos e mesa_contas
--     2. Exibir o identificador textual da mesa nas telas operacionais
--   O campo mesa_numero (integer) e uma FK para mesas.numero que foi adicionada
--   para integridade referencial. Ambos sao populados pelo frontend no momento
--   da criacao do pedido. A constraint pedidos_table_number_required valida
--   apenas o campo texto (mesa IS NOT NULL para tipo 'mesa').
--   Plano de deprecacao: manter ambos os campos ate que todo o frontend migre
--   para usar apenas mesa_numero como referencia primaria.

-- DECISAO: Soft delete em categorias e produtos
--   As funcoes deleteCategory e deleteProduct marcam deleted_at sem excluir
--   permanentemente. Queries publicas (getMenuData, resolveCheckoutItems)
--   filtram deleted_at IS NULL. A tela de gerenciamento admin (getMenuManagementData)
--   NAO filtra deleted_at, permitindo que o admin veja itens deletados.
--   Isso e intencional para eventual restauracao manual.

-- DECISAO: audit_log.ip_address
--   O campo ip_address e populado via current_setting('request.headers').
--   Em Supabase, este header esta disponivel apenas no contexto PostgREST.
--   Operacoes via migration, cron, ou trigger direto registram ip_address = NULL.
--   Isso e esperado e a funcao fn_audit_log trata esse caso sem falhar.
