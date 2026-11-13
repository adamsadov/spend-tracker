import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for the browser. The session lives in cookies so the server can read it too. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
