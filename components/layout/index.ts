// ─── Layout System — Barrel Export ────────────────────────────────────────────
// Importe sempre daqui:  import { AdminPage, AdminHeader, ... } from "@/components/layout"
//
// Camada:      Layout System (acima do Design System de tokens)
// Dependência: @/components/system/* (DSCard, DSButton, DSBadge...)
//              lib/design-tokens.json (tokens de cor, espaçamento e raio)
// ──────────────────────────────────────────────────────────────────────────────

// ── Page container ─────────────────────────────────────────────────────────────
export { AdminPage, type AdminPageProps } from "./admin-page";

// ── Page header ────────────────────────────────────────────────────────────────
export {
  AdminHeader,
  AdminHeaderContent,
  AdminHeaderEyebrow,
  AdminHeaderTitle,
  AdminHeaderDescription,
  AdminHeaderActions,
  AdminLivePulse,
  type AdminHeaderProps,
  type AdminHeaderTitleProps,
  type AdminLivePulseProps,
} from "./admin-header";

// ── Section ────────────────────────────────────────────────────────────────────
export {
  AdminSection,
  AdminSectionHeader,
  AdminSectionIconHeader,
  AdminSectionContent,
  AdminDivider,
  AdminFieldGroup,
  type AdminSectionProps,
  type AdminSectionHeaderProps,
  type AdminSectionIconHeaderProps,
  type AdminSectionContentProps,
  type AdminFieldGroupProps,
} from "./admin-section";

// ── Grid ───────────────────────────────────────────────────────────────────────
export {
  AdminGrid,
  AdminGridItem,
  type AdminGridProps,
  type AdminGridItemProps,
} from "./admin-grid";

// ── Stack / Inline ─────────────────────────────────────────────────────────────
export {
  AdminStack,
  AdminInline,
  type AdminStackProps,
  type AdminInlineProps,
} from "./admin-stack";

// ── Loading skeleton ───────────────────────────────────────────────────────────
export { AdminPageSkeleton } from "./admin-page-skeleton";
