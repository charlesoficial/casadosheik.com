"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createSupabaseBrowserAuthClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserAuthClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      className="text-[var(--admin-logout-fg)] hover:bg-[var(--admin-logout-hover-bg)] hover:text-[var(--admin-logout-hover-fg)]"
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      Sair
    </Button>
  );
}
