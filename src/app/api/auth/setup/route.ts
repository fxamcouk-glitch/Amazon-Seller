import { randomBytes } from "node:crypto";
import QRCode from "qrcode-svg";
import { NextResponse } from "next/server";
import { authEnv, loadAuthConfig } from "@/lib/auth/config";
import { allowedOrigins, authStores, recordAuthEvent, redirectTo } from "@/lib/auth/http";
import { safeEqual } from "@/lib/auth/login";
import { clientIp, isSameOrigin } from "@/lib/auth/redirect";
import { admit } from "@/lib/auth/throttle";
import { newTotpSecret, totpUri } from "@/lib/auth/totp";
import { escapeHtml } from "@/lib/email/content";

const html = (body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Set up two-step sign-in</title></head>` +
      `<body style="margin:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#16181d"><main style="max-width:560px;margin:0 auto;padding:24px">` +
      `<div style="background:#fff;border:1px solid #dfe2e8;border-radius:8px;padding:24px;line-height:1.5">${body}</div></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );

// Shows the two values the owner must copy into the host's settings. It never signs anyone in and
// never stores anything: until the owner saves the values in the host's settings, the secret it shows
// is not active, so seeing it gives nobody access.
export async function POST(request: Request) {
  const config = loadAuthConfig(authEnv());
  if (!isSameOrigin({ origin: request.headers.get("origin"), secFetchSite: request.headers.get("sec-fetch-site") }, allowedOrigins(request.url))) {
    return new NextResponse("Request refused.", { status: 403 });
  }
  if (config.mode !== "setup-needed") {
    return html("<h1>Nothing to set up</h1><p>Two-step sign-in is already set up, or the dashboard password has not been set on this server. To reset the authenticator, remove ADMIN_TOTP_SECRET in the host's settings first.</p>", 409);
  }

  const ip = clientIp(request.headers);
  const { throttle } = authStores();
  const admission = await admit(throttle, `setup:${ip}`, Date.now());
  if (!admission.allowed) return redirectTo(`/login/setup?error=blocked&wait=${Math.ceil(admission.retryAfterSeconds / 60)}`);

  const form = await request.formData().catch(() => null);
  const typed = typeof form?.get("password") === "string" ? (form!.get("password") as string) : "";
  if (!safeEqual(typed.slice(0, 500), process.env.ADMIN_PASSWORD?.trim() ?? "")) {
    await recordAuthEvent("login_failure", ip);
    return redirectTo("/login/setup?error=invalid");
  }
  await recordAuthEvent("setup_view", ip);

  const needTotp = config.missing.includes("ADMIN_TOTP_SECRET");
  const needSession = config.missing.includes("SESSION_SECRET");
  const totp = needTotp ? newTotpSecret() : null;
  const session = needSession ? randomBytes(32).toString("base64url") : null;
  const qr = totp ? new QRCode({ content: totpUri(totp), padding: 2, width: 220, height: 220, color: "#000000", background: "#ffffff", ecl: "M", join: true }).svg() : "";
  const code = (value: string) => `<pre style="background:#f5f6f8;border:1px solid #dfe2e8;border-radius:6px;padding:10px;overflow-x:auto;margin:6px 0 16px">${escapeHtml(value)}</pre>`;

  return html(
    `<h1 style="font-size:22px;margin-top:0">Set up two-step sign-in</h1>` +
      (totp
        ? `<h2 style="font-size:16px">1. Add it to Google Authenticator</h2><p>Open Google Authenticator, tap <strong>+</strong>, choose <strong>Scan a QR code</strong>, and scan this. Or choose <strong>Enter a setup key</strong> and type the key below (leave the type as time-based).</p>${qr}<p>Setup key:</p>${code(totp)}`
        : "") +
      `<h2 style="font-size:16px">${totp ? "2" : "1"}. Save ${totp && session ? "these two values" : "this value"} in the host's settings</h2><p>In your hosting settings (Render), add ${totp && session ? "these as environment variables" : "this as an environment variable"}, then redeploy. Keep them private.</p>` +
      (totp ? `<p>ADMIN_TOTP_SECRET</p>${code(totp)}` : "") +
      (session ? `<p>SESSION_SECRET</p>${code(session)}` : "") +
      `<h2 style="font-size:16px">${totp ? "3" : "2"}. Sign in</h2><p>Once the host has restarted, go to the sign-in page and enter your password and the 6-digit code from the app. <strong>Do not close this page until you have saved the values.</strong> Reloading it makes new ones, and the app would then no longer match what you saved.</p>` +
      `<p style="font-size:13px;color:#5a6170">Nothing on this page signs anyone in. It becomes active only when the values are saved on the server. If you lose your phone, remove ADMIN_TOTP_SECRET in the host's settings and run this setup again.</p>`,
  );
}
