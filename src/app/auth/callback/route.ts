import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Google (and email sign-in links) send you back here with a one-time ?code=.
 * We swap it for a session cookie, then continue to the page you wanted.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";

  const fail = (message: string) => {
    console.error("[auth/callback]", message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  };

  // Supabase or Google reported a problem before we got a code.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) return fail(providerError);
  if (!code) return fail("No sign-in code was returned.");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);

  return NextResponse.redirect(`${origin}${next}`);
}
