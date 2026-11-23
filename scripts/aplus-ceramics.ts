// Builds an A+ (Enhanced Brand Content) DRAFT for the ceramic lighting range and links it to the ceramic ASINs.
// Nothing goes live until it is submitted for approval (separate step: --submit KEY).
//   npx tsx scripts/aplus-ceramics.ts IMAGE_DIR                -> upload images, validate, create draft, link ASINs
//   npx tsx scripts/aplus-ceramics.ts --update REF_KEY IMAGE_DIR -> rebuild an existing draft in place
//   npx tsx scripts/aplus-ceramics.ts --submit REF_KEY          -> submit the draft for Amazon approval (owner approved)
// Copy uses only facts from the live ceramic listings (dimensions, 60 W, 220–240 V, E27, IP54, fixings included).
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import crypto from "node:crypto";
import https from "node:https";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig, spRequest } from "../src/lib/spapi";

const cfg = loadConfig();
const MP = cfg.SP_API_MARKETPLACE_ID;

// Straight, angled and right-angle lamp holders, and the IP54 wall light.
const CERAMIC_ASINS = ["B08BJ78QCK", "B08BJ7XPTR", "B08BJ9732G", "B08FBN91PK"];

// The upload destination is an S3 browser-form (POST policy) URL: its query parameters are the form fields.
function postForm(url: string, file: Buffer, contentType: string): Promise<{ status: number; body: string }> {
  const u = new URL(url);
  const boundary = "----cablestore" + crypto.randomBytes(8).toString("hex");
  const parts: Buffer[] = [];
  const field = (name: string, value: string) =>
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  for (const [k, v] of u.searchParams) field(k, v);
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="image.jpg"\r\nContent-Type: ${contentType}\r\n\r\n`));
  parts.push(file, Buffer.from(`\r\n--${boundary}--\r\n`));
  const body = Buffer.concat(parts);
  return new Promise((resolve, reject) => {
    const req = https.request(`${u.origin}${u.pathname}`, {
      method: "POST", agent: false,
      headers: { "content-type": `multipart/form-data; boundary=${boundary}`, "content-length": String(body.length) },
    }, (res) => {
      const c: Buffer[] = [];
      res.on("data", (d: Buffer) => c.push(d));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(c).toString("utf8") }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

async function upload(file: string): Promise<string> {
  const buf = await readFile(file);
  const md5 = crypto.createHash("md5").update(buf).digest("base64");
  const r = await spRequest<{ payload: { uploadDestinationId: string; url: string } }>(
    cfg, "POST", "/uploads/2020-11-01/uploadDestinations/aplus/2020-11-01/contentDocuments",
    { marketplaceIds: MP, contentMD5: md5, contentType: "image/jpeg" },
  );
  const res = await postForm(r.payload.url, buf, "image/jpeg");
  if (res.status < 200 || res.status >= 300) throw new Error(`Upload of ${path.basename(file)} failed: HTTP ${res.status} ${res.body.slice(0, 300)}`);
  console.log(`uploaded ${path.basename(file)}`);
  return r.payload.uploadDestinationId;
}

const T = (value: string) => ({ value, decoratorSet: [] });
const P = (...lines: string[]) => ({ textList: lines.map(T) });
const img = (id: string, w: number, h: number, altText: string) => ({
  uploadDestinationId: id,
  imageCropSpecification: { size: { width: { value: w, units: "pixels" }, height: { value: h, units: "pixels" } }, offset: { x: { value: 0, units: "pixels" }, y: { value: 0, units: "pixels" } } },
  altText,
});
const block = (image: unknown, headline: string, body: string) => ({ image, headline: T(headline), body: P(body) });

// Keyword-rich copy and image alt text (alt text is indexed by Amazon).
async function makeDocument(dir: string) {
  const f = (n: string) => path.join(dir, n);
  const id = {
    logo: await upload(f("logo-600x180.jpg")),
    header: await upload(f("header-970x600.jpg")),
    straight: await upload(f("straight-MAIN-300.jpg")),
    angled: await upload(f("angled-MAIN-300.jpg")),
    wall: await upload(f("wall-MAIN-300.jpg")),
    fixings: await upload(f("straight-PT05-300.jpg")),
    bathroom: await upload(f("wall-PT06-300.jpg")),
  };

  return {
    name: "Ceramic lighting range",
    contentType: "EBC",
    locale: "en-GB",
    contentModuleList: [
      {
        contentModuleType: "STANDARD_COMPANY_LOGO",
        standardCompanyLogo: { companyLogo: img(id.logo, 600, 180, "The Cable Store logo – ceramic lamp holders and wall lights") },
      },
      {
        contentModuleType: "STANDARD_HEADER_IMAGE_TEXT",
        standardHeaderImageText: {
          headline: T("Handmade Ceramic Lamp Holders – White Porcelain E27 Light Fittings"),
          block: block(
            img(id.header, 970, 600, "White ceramic E27 lamp holder with a glowing LED filament bulb"),
            "Simple, timeless wall and ceiling lights",
            "Each lamp holder is handmade from white glazed porcelain, so every piece is slightly unique. " +
              "Fit one flush to the wall or ceiling, add an E27 LED filament bulb, and you have a vintage industrial " +
              "light for the kitchen, bathroom, hallway, bedside or a reading nook."),
        },
      },
      {
        contentModuleType: "STANDARD_THREE_IMAGE_TEXT",
        standardThreeImageText: {
          headline: T("Choose your ceramic light fitting"),
          block1: block(img(id.straight, 300, 300, "Straight white ceramic E27 lamp holder with LED filament bulb"),
            "Straight lamp holder", "A classic upright porcelain bulb holder. Height 75 mm, width 75 mm, projection 65 mm."),
          block2: block(img(id.angled, 300, 300, "Angled white ceramic E27 lamp holder with LED filament bulb"),
            "Angled and right-angle", "Tilts the bulb away from the wall. Angled: 75 × 70 mm, 70 mm projection. Right angle: 80 × 75 mm, 75 mm projection."),
          block3: block(img(id.wall, 300, 300, "IP54 white ceramic wall light with frosted glass shade"),
            "IP54 wall light", "Handmade porcelain with a frosted glass shade, rated IP54 for bathrooms and porches. 160 × 85 mm, 120 mm projection."),
        },
      },
      {
        contentModuleType: "STANDARD_SINGLE_SIDE_IMAGE",
        standardSingleSideImage: {
          imagePositionType: "LEFT",
          block: block(img(id.fixings, 300, 300, "Ceramic lamp holder base with screws and wall plugs included"),
            "Fits flush, fixings included",
            "Every lamp holder and wall light comes boxed with screws and wall plugs, ready to mount flush to the wall or ceiling. " +
              "Takes a standard E27 Edison screw (ES) bulb up to 60 W, 220–240 V. Bulb not included."),
        },
      },
      {
        contentModuleType: "STANDARD_SINGLE_SIDE_IMAGE",
        standardSingleSideImage: {
          imagePositionType: "RIGHT",
          block: block(img(id.bathroom, 300, 300, "IP54 ceramic wall light with frosted glass fitted in a tiled bathroom"),
            "Made for bathrooms and porches",
            "The IP54 wall light pairs white glazed porcelain with a frosted glass shade for soft, even light. " +
              "Its IP54 rating suits bathrooms, kitchens, hallways and covered porches in contemporary or period homes."),
        },
      },
      {
        contentModuleType: "STANDARD_TECH_SPECS",
        standardTechSpecs: {
          headline: T("Ceramic light fittings – technical specification"),
          specificationList: [
            ["Material", "Handmade porcelain, white glaze"],
            ["Bulb fitting", "E27 Edison screw (ES), bulb not included"],
            ["Maximum bulb", "60 W, 220–240 V"],
            ["Mounting", "Flush to wall or ceiling, screws and plugs included"],
            ["Straight holder", "H 75 mm, W 75 mm, projection 65 mm"],
            ["Angled holder", "H 75 mm, W 70 mm, projection 70 mm"],
            ["Right-angle holder", "H 80 mm, W 75 mm, projection 75 mm"],
            ["IP54 wall light", "H 160 mm, W 85 mm, projection 120 mm, frosted glass"],
          ].map(([l, d]) => ({ label: T(l), description: T(d) })),
          tableCount: 1,
        },
      },
    ],
  };
}

async function validate(contentDocument: unknown) {
  const v = await spRequest<any>(cfg, "POST", "/aplus/2020-11-01/contentAsinValidations",
    { marketplaceId: MP, asinSet: CERAMIC_ASINS.join(",") }, { contentDocument });
  const vErr = v.errors ?? [];
  console.log(`validation: ${vErr.length ? JSON.stringify(vErr).slice(0, 1500) : "no errors"}${v.warnings?.length ? " | warnings: " + JSON.stringify(v.warnings).slice(0, 800) : ""}`);
  return vErr.length === 0;
}

async function link(key: string) {
  const rel = await spRequest<any>(cfg, "POST", `/aplus/2020-11-01/contentDocuments/${encodeURIComponent(key)}/asins`,
    { marketplaceId: MP }, { asinSet: CERAMIC_ASINS });
  console.log(`ASINs linked (${CERAMIC_ASINS.length})${rel?.warnings?.length ? " | warnings: " + JSON.stringify(rel.warnings).slice(0, 600) : ""}`);
}

async function build(dir: string) {
  const contentDocument = await makeDocument(dir);
  if (!(await validate(contentDocument))) return;
  const created = await spRequest<{ contentReferenceKey: string }>(cfg, "POST", "/aplus/2020-11-01/contentDocuments", { marketplaceId: MP }, { contentDocument });
  console.log(`draft created: ${created.contentReferenceKey}`);
  await link(created.contentReferenceKey);
}

async function update(key: string, dir: string) {
  const contentDocument = await makeDocument(dir);
  if (!(await validate(contentDocument))) return;
  await spRequest<any>(cfg, "POST", `/aplus/2020-11-01/contentDocuments/${encodeURIComponent(key)}`, { marketplaceId: MP }, { contentDocument });
  console.log(`draft updated: ${key}`);
  await link(key);
}

async function submit(key: string) {
  const r = await spRequest<any>(cfg, "POST",
    `/aplus/2020-11-01/contentDocuments/${encodeURIComponent(key)}/approvalSubmissions`, { marketplaceId: MP });
  console.log("submitted for approval", JSON.stringify(r).slice(0, 400));
}

const a = process.argv.slice(2);
(a[0] === "--submit" ? submit(a[1]) : a[0] === "--update" ? update(a[1], a[2]) : build(a[0]))
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
