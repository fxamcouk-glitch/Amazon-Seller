import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/card";
import { authEnv, loadAuthConfig } from "@/lib/auth/config";
import { safeNext } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const INPUT = "w-full rounded-md border border-line bg-page px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-accent";

type Search = { error?: string; wait?: string; next?: string };

function message(error: string | undefined, wait: string | undefined): string | null {
  if (error === "invalid") return "That password or code was not right. Codes change every 30 seconds, so wait for a fresh one and try again.";
  if (error === "blocked") {
    const minutes = Math.min(Math.max(Number(wait) || 15, 1), 60);
    return `Too many attempts. Please wait about ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
  }
  if (error === "notready") return "Sign-in is not set up on this server yet.";
  return null;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { error, wait, next } = await searchParams;
  const config = loadAuthConfig(authEnv());
  const problem = message(error, wait);
  const link = "text-accent underline focus-visible:outline-2 focus-visible:outline-accent";

  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {config.mode === "ready" && (
        <Card>
          <form method="post" action="/api/auth/login" className="grid gap-4">
            <input type="hidden" name="next" value={safeNext(next)} />
            <label className="grid gap-1 text-sm font-medium">
              Password
              <input type="password" name="password" required autoComplete="current-password" autoFocus className={INPUT} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              6-digit code from Google Authenticator
              <input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} className={`${INPUT} tracking-widest`} />
            </label>
            {problem && (
              <p role="alert" className="text-sm text-bad">
                {problem}
              </p>
            )}
            <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              Sign in
            </button>
          </form>
        </Card>
      )}
      {config.mode === "setup-needed" && (
        <Card>
          <p className="text-sm">Two-step sign-in has not been set up on this server yet.</p>
          <p className="mt-2 text-sm">
            <Link href="/login/setup" className={link}>
              Set it up now
            </Link>
          </p>
        </Card>
      )}
      {config.mode === "unconfigured" && (
        <Card>
          <p className="text-sm">The dashboard password has not been set on this server, so the dashboard is switched off.</p>
        </Card>
      )}
      {config.mode === "open" && (
        <Card>
          <p className="text-sm">No sign-in is configured, so the dashboard is open. This only happens in development.</p>
          <p className="mt-2 text-sm">
            <Link href="/admin" className={link}>
              Open the dashboard
            </Link>
          </p>
        </Card>
      )}
    </main>
  );
}
