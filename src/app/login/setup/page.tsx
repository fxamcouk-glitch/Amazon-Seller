import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/card";
import { authEnv, loadAuthConfig } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Set up two-step sign-in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string; wait?: string }> }) {
  const { error, wait } = await searchParams;
  const config = loadAuthConfig(authEnv());
  const link = "text-accent underline focus-visible:outline-2 focus-visible:outline-accent";
  const problem =
    error === "invalid"
      ? "That password was not right."
      : error === "blocked"
        ? `Too many attempts. Please wait about ${Math.min(Math.max(Number(wait) || 15, 1), 60)} minutes.`
        : null;

  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Set up two-step sign-in</h1>
      {config.mode === "setup-needed" ? (
        <Card>
          <form method="post" action="/api/auth/setup" className="grid gap-4">
            <p className="text-sm">Enter the dashboard password to see your authenticator setup. This does not sign you in.</p>
            <label className="grid gap-1 text-sm font-medium">
              Password
              <input type="password" name="password" required autoComplete="current-password" autoFocus className="w-full rounded-md border border-line bg-page px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-accent" />
            </label>
            {problem && (
              <p role="alert" className="text-sm text-bad">
                {problem}
              </p>
            )}
            <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              Show my setup
            </button>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="text-sm">There is nothing to set up: sign-in is already configured, or the dashboard password has not been set on this server.</p>
        </Card>
      )}
      <p className="text-sm">
        <Link href="/login" className={link}>
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
