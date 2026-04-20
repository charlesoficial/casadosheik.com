/**
 * Motion System — tokens, constantes e helpers de composição.
 *
 * Fonte da verdade para duração e easing. O tailwind.config.ts expõe esses
 * valores como classes Tailwind. Use as constantes deste arquivo em qualquer
 * código que precise dos valores em JS (style inline dinâmico, Framer Motion,
 * Web Animations API, testes de timing).
 *
 * Regra: nenhum componente deve ter duration ou easing hardcoded.
 * Use sempre as classes Tailwind geradas ou as constantes daqui.
 */

// ─── Duration tier ────────────────────────────────────────────────────────────
// Classe Tailwind correspondente: duration-motion-{key}

export const duration = {
  /** 100ms — press, snap. Percebido como instantâneo mas suaviza. */
  micro: 100,
  /** 150ms — mudanças de cor, opacity. Micro-feedback. */
  fast: 150,
  /** 200ms — hover, focus. Transição padrão da maioria dos elementos. */
  default: 200,
  /** 250ms — entradas de card, seção, drawer. */
  moderate: 250,
  /** 300ms — modal open, page entrance. Movimento mais expressivo. */
  slow: 300,
  /** 700ms — spinner, decorative loops. Nunca para UI responsivo. */
  loop: 700,
} as const satisfies Record<string, number>;

// ─── Easing ───────────────────────────────────────────────────────────────────
// Classe Tailwind correspondente: ease-motion-{key}

export const easing = {
  /** Saídas (fechar, esconder). Começa rápido, termina no valor final. */
  in:     "cubic-bezier(0.4, 0, 1, 1)",
  /** Entradas (abrir, revelar). Desacelera no destino — parece natural. */
  out:    "cubic-bezier(0.0, 0.0, 0.2, 1)",
  /** Padrão geral (hover, focus). Suave nos dois extremos. */
  inOut:  "cubic-bezier(0.4, 0, 0.2, 1)",
  /** Confirmações positivas — leve overshoot que soa como "ok!". */
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const satisfies Record<string, string>;

// ─── CSS transition shorthands ────────────────────────────────────────────────
// Uso: style={{ transition: transition.interactive }}
// Prefira as classes Tailwind quando possível. Use estes em style= dinâmico.

export const transition = {
  /** Apenas cores — background, border, color. Não anima transform/shadow. */
  colors: [
    `background-color ${duration.default}ms ${easing.inOut}`,
    `border-color      ${duration.default}ms ${easing.inOut}`,
    `color             ${duration.default}ms ${easing.inOut}`,
  ].join(", "),

  /** Transform isolado — lift, press, scale. */
  transform: `transform ${duration.default}ms ${easing.out}`,

  /** Opacidade — fades rápidos. */
  opacity: `opacity ${duration.fast}ms ${easing.inOut}`,

  /** Sombra — combinado com transform em cards interativos. */
  shadow: `box-shadow ${duration.default}ms ${easing.out}`,

  /**
   * Interativo completo — card com hover lift.
   * Anima apenas propriedades GPU-compositable (transform, opacity, box-shadow).
   * Nunca use 'transition: all' — anima propriedades caras como width/height.
   */
  interactive: [
    `transform  ${duration.default}ms ${easing.out}`,
    `box-shadow ${duration.default}ms ${easing.out}`,
    `opacity    ${duration.fast}ms   ${easing.inOut}`,
    `background-color ${duration.default}ms ${easing.inOut}`,
    `border-color     ${duration.default}ms ${easing.inOut}`,
  ].join(", "),

  /** Press — mais rápido que interactive, para feedback imediato de clique. */
  press: [
    `transform ${duration.micro}ms ${easing.inOut}`,
    `opacity   ${duration.fast}ms  ${easing.inOut}`,
  ].join(", "),
} as const satisfies Record<string, string>;

// ─── Stagger helpers ──────────────────────────────────────────────────────────
// Para listas de cards que entram em sequência (ex: grid de métricas).

/**
 * Retorna um style object com animation-delay para criar efeito stagger.
 *
 * @example
 * {metrics.map((m, i) => (
 *   <DSCard key={m.label} style={stagger(i)} className="animate-motion-slide-up">
 * ))}
 */
export function stagger(index: number, baseDelayMs = 60): React.CSSProperties {
  return { animationDelay: `${index * baseDelayMs}ms` };
}

// ─── Classe names prontas ─────────────────────────────────────────────────────
// Constantes das classes Tailwind geradas — autocompletar garantido.

export const motionClass = {
  /** Entrada por fade simples. */
  fadeIn:   "animate-motion-fade-in",
  /** Saída por fade. */
  fadeOut:  "animate-motion-fade-out",
  /** Entrada com slide pra cima + fade — padrão de cards e seções. */
  slideUp:  "animate-motion-slide-up",
  /** Entrada por zoom + fade — modais e popovers. */
  zoomIn:   "animate-motion-zoom-in",
  /** Saída por zoom — modais fechando. */
  zoomOut:  "animate-motion-zoom-out",
  /** Pulse de skeleton loading. */
  skeleton: "animate-motion-skeleton",
  /** Shimmer de skeleton. */
  shimmer:  "animate-motion-shimmer",
  /** Bounce de confirmação positiva. */
  pop:      "animate-motion-pop",
  /** Spinner suave (700ms). */
  spin:     "animate-motion-spin",
} as const satisfies Record<string, string>;

// ─── Types ────────────────────────────────────────────────────────────────────

import type React from "react";

export type MotionClass = keyof typeof motionClass;
export type Duration    = keyof typeof duration;
export type Easing      = keyof typeof easing;
