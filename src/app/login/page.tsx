"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function Login() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    params.get("error") ? `Sign-in didn't finish: ${params.get("error")}` : null,
  );

  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const signInWithGoogle = async () => {
    setBusy("google");
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // On success the browser is already navigating to Google.
    if (error) {
      setError(error.message);
      setBusy(null);
    }
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(clean)) {
      setError("Enter a valid email address");
      return;
    }
    setBusy("email");
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(null);
    if (error) setError(error.message);
    else setSentTo(clean);
  };

  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Soft brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,var(--brand-3),transparent)] opacity-40 dark:opacity-15"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand text-brand-fg shadow-card">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M5 16l4-5 4 3 6-8" />
            </svg>
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Ledger</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in to see your spending on any device.</p>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-card sm:p-6">
          <AnimatePresence mode="wait" initial={false}>
            {sentTo ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="flex flex-col items-center py-4 text-center"
              >
                <span className="mb-3 grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
                  <MailCheck className="size-6" />
                </span>
                <h2 className="font-semibold">Check your inbox</h2>
                <p className="mt-1 text-sm text-muted">
                  We sent a sign-in link to <span className="font-medium text-text-2">{sentTo}</span>. The device you
                  open it on is the one that gets signed in.
                </p>
                <button
                  type="button"
                  onClick={() => setSentTo(null)}
                  className="mt-5 text-sm font-medium text-brand hover:underline"
                >
                  Use a different email
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  disabled={busy !== null}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface font-medium transition hover:bg-surface-2 active:scale-[0.99] disabled:opacity-60"
                >
                  {busy === "google" ? <Loader2 className="size-5 animate-spin" /> : <GoogleMark />}
                  Continue with Google
                </button>

                <div className="my-5 flex items-center gap-3 text-xs text-muted">
                  <span className="h-px flex-1 bg-border" />
                  or use email
                  <span className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={sendLink} className="space-y-3">
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-label="Email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-[15px] outline-none transition placeholder:text-muted/70 focus:border-brand-2 focus:ring-4 focus:ring-brand-2/15"
                  />
                  <button
                    type="submit"
                    disabled={busy !== null}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-medium text-brand-fg transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
                  >
                    {busy === "email" ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        Email me a sign-in link
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                role="alert"
                className="mt-3 text-center text-sm text-danger"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
