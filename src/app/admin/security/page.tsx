import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { authEnv, loadAuthConfig } from "@/lib/auth/config";
import { getDb, hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  login_success: "Signed in",
  login_failure: "Wrong password or code",
  login_blocked: "Blocked: too many attempts",
  logout: "Signed out",
  setup_view: "Viewed the authenticator setup",
};

export default async function SecurityPage() {
  const config = loadAuthConfig(authEnv());
  const events = hasDatabase() ? await getDb().authEvent.findMany({ orderBy: { at: "desc" }, take: 50 }) : null;

  return (
    <>
      <PageHeader title="Security" description="How the dashboard is protected, and recent sign-in activity." />
      <div className="grid max-w-3xl gap-4">
        <Card title="Sign-in">
          {config.mode === "ready" ? (
            <ul className="grid gap-1 text-sm">
              <li>Password plus a 6-digit authenticator code is required.</li>
              <li>Sessions last {config.sessionSeconds / 3600} hours, then you sign in again.</li>
              <li>Five wrong attempts from one address pauses sign-in from it for 15 minutes.</li>
              <li>An authenticator code can be used only once.</li>
            </ul>
          ) : (
            <p className="text-sm text-warn">Two-step sign-in is not fully set up on this server (mode: {config.mode}).</p>
          )}
        </Card>
        <Card title="Recent activity">
          {events === null ? (
            <p className="text-sm text-muted">Sign-in activity is recorded when a database is connected.</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted">Nothing recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="py-2 pr-4 font-medium">When</th>
                    <th scope="col" className="py-2 pr-4 font-medium">What</th>
                    <th scope="col" className="py-2 font-medium">From address</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-b border-line last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">{e.at.toLocaleString("en-GB", { timeZone: "Europe/London" })}</td>
                      <td className={`py-2 pr-4 ${e.kind === "login_failure" || e.kind === "login_blocked" ? "text-bad" : ""}`}>{LABELS[e.kind] ?? e.kind}</td>
                      <td className="py-2 font-mono">{e.ip ?? "unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Entries older than 90 days are removed. If you see sign-ins you do not recognise, change the dashboard password and the authenticator secret in the host&apos;s settings.</p>
        </Card>
      </div>
    </>
  );
}
