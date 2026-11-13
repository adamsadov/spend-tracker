import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/*
 * Email sign-in links land here: /auth/confirm?token_hash=...&type=email
 *
 * Unlike /auth/callback, this doesn't depend on a cookie from the browser that
 * asked for the link, so you can request a link on your PC and open it on your
 * phone. Whichever device opens the link is the one that gets signed in.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";

  const fail = (message: string) => {
    console.error("[auth/confirm]", message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  };

  if (!tokenHash) return fail("This sign-in link is incomplete.");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return fail(error.message);

  return NextResponse.redirect(`${origin}${next}`);
}
