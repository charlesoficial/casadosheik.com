// ─── Design System — Barrel Export ────────────────────────────────────────────
// Importe sempre desta pasta:  import { DSCard, DSButton } from "@/components/system"
//
// Tokens:       lib/design-tokens.json  (fonte da verdade)
// Tailwind map: tailwind.config.ts      (classes semânticas geradas)
// Componentes:  components/system/*     (CVA + tokens)
// ──────────────────────────────────────────────────────────────────────────────

export {
  DSCard,
  DSCardContent,
  DSCardHeader,
  DSCardTitle,
  DSCardSubtitle,
  dsCardVariants,
  type DSCardProps,
} from "./ds-card";

export {
  DSButton,
  dsButtonVariants,
  type DSButtonProps,
} from "./ds-button";

export {
  DSInput,
  DSLabel,
  DSFieldGroup,
  dsInputVariants,
  type DSInputProps,
  type DSLabelProps,
} from "./ds-input";

export {
  DSBadge,
  dsBadgeVariants,
  orderStatusVariant,
  type DSBadgeProps,
} from "./ds-badge";

export {
  DSSpinner,
  DSLoadingOverlay,
  DSLoadingPage,
  DSLoadingButton,
  DSSkeleton,
  type DSSpinnerProps,
  type DSLoadingOverlayProps,
  type DSSkeletonProps,
} from "./ds-spinner";

// ── Feedback System ────────────────────────────────────────────────────────────

export { DSToastHost } from "./ds-toast";

export {
  DSFeedback,
  useFeedback,
  type DSFeedbackProps,
} from "./ds-feedback";

export {
  DSEmpty,
  EmptyOrders,
  EmptyProducts,
  EmptyHistory,
  EmptyPrinters,
  EmptySearch,
  type DSEmptyProps,
  type DSEmptyAction,
} from "./ds-empty";

export {
  DSError,
  useErrorState,
  type DSErrorProps,
} from "./ds-error";
