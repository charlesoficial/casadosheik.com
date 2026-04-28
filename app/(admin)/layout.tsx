import Script from "next/script";

import { AdminOrderAlerts } from "@/features/orders/components/admin-order-alerts";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { NavProgressBar } from "@/components/admin/nav-progress-bar";
import { DSToastHost } from "@/components/system/ds-toast";
import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { adminThemes, type AdminTheme } from "@/lib/constants/admin-themes";

// Shell principal do admin.
// Ele injeta sidebar, topbar e o script que restaura o tema salvo antes da hidratacao.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Le o tema salvo no banco para renderizar server-side sem flash.
  let serverTheme: AdminTheme = "black";
  const supabase = await createSupabaseServerAuthClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    const meta = user?.user_metadata?.admin_theme;
    if (meta && adminThemes.includes(meta as AdminTheme)) {
      serverTheme = meta as AdminTheme;
    }
  }

  return (
    <div className={`admin-shell min-h-screen text-[var(--admin-foreground)] admin-theme-${serverTheme}`}>
      <Script id="admin-theme-init" strategy="afterInteractive">
        {`(function(){var t=localStorage.getItem("admin-theme");var v=["black","light"];if(t&&v.indexOf(t)!==-1){var e=document.querySelector(".admin-shell");if(e){e.classList.remove("admin-theme-black","admin-theme-light");e.classList.add("admin-theme-"+t);}}})();`}
      </Script>
      <NavProgressBar />
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminOrderAlerts />
          <AdminTopbar />
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">{children}</div>
          {/* Toast host — renderiza a stack de notificações globais */}
          <DSToastHost />
        </div>
      </div>
    </div>
  );
}
