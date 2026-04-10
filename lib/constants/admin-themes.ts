export type AdminTheme = "black" | "light";

export type AdminThemeConfig = {
  id: AdminTheme;
  label: string;
  description: string;
  cssClass: `admin-theme-${AdminTheme}`;
  previewGradient: string;
};

export type AdminThemeMeta = {
  label: string;
  description: string;
  preview: string;
};

export const ADMIN_THEMES: AdminThemeConfig[] = [
  {
    id: "black",
    label: "Preto",
    description: "Monocromatico forte, focado em contraste maximo.",
    cssClass: "admin-theme-black",
    previewGradient: "from-[#0a0a0a] via-[#171717] to-[#262626]"
  },
  {
    id: "light",
    label: "Branco",
    description: "Leve, limpo e claro para operacao diurna.",
    cssClass: "admin-theme-light",
    previewGradient: "from-[#ffffff] via-[#fafafa] to-[#ececec]"
  }
];

export const adminThemes = ADMIN_THEMES.map((theme) => theme.id) as readonly AdminTheme[];

export const adminThemeMeta: Record<AdminTheme, AdminThemeMeta> = Object.fromEntries(
  ADMIN_THEMES.map((theme) => [
    theme.id,
    {
      label: theme.label,
      description: theme.description,
      preview: theme.previewGradient
    }
  ])
) as Record<AdminTheme, AdminThemeMeta>;
