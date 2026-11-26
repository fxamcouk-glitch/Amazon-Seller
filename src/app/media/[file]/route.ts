import { getDb, hasDatabase } from "@/lib/db";
import { ImageStore, parseMediaFile } from "@/lib/images/store";

type Context = { params: Promise<{ file: string }> };

// Public: product photos on the shop. An address never changes what it shows (every upload gets a
// new id), so browsers and Cloudflare may keep it for a year.
export async function GET(_request: Request, { params }: Context) {
  const parsed = parseMediaFile((await params).file);
  if (!parsed || !hasDatabase()) return new Response("Not found", { status: 404 });
  const bytes = await new ImageStore(getDb()).get(parsed.id, parsed.thumb);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
