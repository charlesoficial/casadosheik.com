/**
 * EXEMPLO DE REFATORAÇÃO — Metric Card do Dashboard
 *
 * Arquivo original: features/history/components/dashboard-overview.tsx (linhas 151–165)
 *
 * Este arquivo mostra o ANTES e o DEPOIS usando o Design System.
 * Não é usado em produção — serve como referência de migração.
 */

import type { LucideIcon } from "lucide-react";

import { DSCard, DSBadge } from "@/components/system";

interface MetricCardProps {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}

// ─────────────────────────────────────────────────────────────────────────────
// ❌ ANTES — Hex hardcoded, sem tokens, inconsistente
// ─────────────────────────────────────────────────────────────────────────────

export function MetricCardBefore({ label, value, note, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-ds-xl border border-admin-border bg-admin-surface p-4 2xl:p-5 admin-dashboard-dark-block">
      {/* ❌ border-admin-border — hex hardcoded. Qual token é esse? Ninguém sabe. */}
      {/* ❌ fundo hardcoded — igual a admin-surface mas sem nome semântico     */}
      {/* ❌ rounded-ds-xl  — valor arbitrário fora da escala                  */}

      <div className="flex items-center justify-between">
        <p className="text-sm text-admin-fg-muted">{label}</p>
        {/* ❌ text-admin-fg-muted — é o fg-muted? fg-faint? Impossível saber sem o JSON */}

        <Icon className="h-4 w-4 text-brand-gold" />
        {/* ❌ text-brand-gold — brand-gold hardcoded */}
      </div>

      <p className="mt-2 2xl:mt-3 text-2xl 2xl:text-3xl font-semibold text-admin-fg">{value}</p>
      {/* ❌ text-admin-fg — deveria ser text-admin-fg para respeitar temas */}

      <p className="mt-1.5 2xl:mt-2 text-sm text-status-success-fg">{note}</p>
      {/* ❌ text-status-success-fg — verde, mas qual verde? success-fg? Hardcoded. */}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ✅ DEPOIS — 100% tokens, semântico, previsível
// ─────────────────────────────────────────────────────────────────────────────

export function MetricCardAfter({ label, value, note, icon: Icon }: MetricCardProps) {
  return (
    <DSCard variant="admin-deep" padding="md" className="2xl:p-5">
      {/* ✅ variant="admin-deep" → bg-admin-surface + border-admin-border + rounded-ds-xl */}
      {/* ✅ Qualquer mudança no token admin-surface afeta todos os cards de uma vez   */}

      <div className="flex items-center justify-between">
        <p className="text-sm text-admin-fg-muted">{label}</p>
        {/* ✅ text-admin-fg-muted → token rastreável, alterável em um lugar só */}

        <Icon className="h-4 w-4 text-brand-gold" />
        {/* ✅ text-brand-gold → token nomeado, documentado no design-tokens.json */}
      </div>

      <p className="mt-2 2xl:mt-3 text-2xl 2xl:text-3xl font-semibold text-admin-fg">{value}</p>
      {/* ✅ text-admin-fg → funciona em qualquer tema admin (black, dark, light) */}

      <p className="mt-1.5 2xl:mt-2 text-sm text-status-success-fg">{note}</p>
      {/* ✅ text-status-success-fg → semântico: "nota positiva de métrica" */}
    </DSCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ✅ VARIANTE — Com badge de trend em vez de texto verde solto
// ─────────────────────────────────────────────────────────────────────────────

export function MetricCardWithBadge({ label, value, note, icon: Icon }: MetricCardProps) {
  return (
    <DSCard variant="admin-deep" padding="md" className="2xl:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-admin-fg-muted">{label}</p>
        <Icon className="h-4 w-4 text-brand-gold" />
      </div>

      <p className="mt-2 2xl:mt-3 text-2xl 2xl:text-3xl font-semibold text-admin-fg">{value}</p>

      {/* Badge de status substituindo o texto verde cru */}
      <div className="mt-2">
        <DSBadge variant="success">{note}</DSBadge>
      </div>
    </DSCard>
  );
}

/**
 * RESUMO DA REFATORAÇÃO
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * ANTES (por componente):
 *   rounded-ds-xl        → rounded-ds-xl
 *   border-admin-border      → border-admin-border
 *   bg-[#121212]          → bg-admin-surface       (via variant="admin-deep")
 *   text-admin-fg-muted        → text-admin-fg-muted
 *   text-brand-gold        → text-brand-gold
 *   text-admin-fg            → text-admin-fg
 *   text-status-success-fg        → text-status-success-fg
 *
 * GANHOS:
 *   • Tema mutável: alterar brand-gold em design-tokens.json → atualiza todo o sistema
 *   • Consistência garantida: impossível ter dois "cinzas de texto" diferentes
 *   • Legibilidade: className lê como intenção, não como valor arbitrário
 *   • Autocompletar: VSCode sugere text-admin-*, bg-status-*, etc.
 *   • Auditoria simples: grep "text-admin-fg-muted" mostra todos os usos
 */
