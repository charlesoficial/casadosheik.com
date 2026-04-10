import { createSupabaseBrowserAuthClient, isAuthConfigured } from "@/lib/auth/client";

export const authService = {
  createBrowserClient: createSupabaseBrowserAuthClient,
  isConfigured: isAuthConfigured
};
