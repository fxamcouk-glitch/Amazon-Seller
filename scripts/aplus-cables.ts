// Builds an A+ (Enhanced Brand Content) DRAFT for the cable range and links it to the cable ASINs.
// Nothing goes live until it is submitted for approval (separate step: --submit KEY).
//   npx tsx scripts/aplus-cables.ts IMAGE_DIR           -> upload images, create draft, validate, link ASINs
//   npx tsx scripts/aplus-cables.ts --update REF_KEY IMAGE_DIR -> rebuild an existing draft in place
//   npx tsx scripts/aplus-cables.ts --submit REF_KEY    -> submit the draft for Amazon approval (owner approved)
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import crypto from "node:crypto";
import https from "node:https";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig, spRequest } from "../src/lib/spapi";

const cfg = loadConfig();
const MP = cfg.SP_API_MARKETPLACE_ID;

const CABLE_ASINS = [
  "B0CK6N1F3M","B0D325QFRL","B0D3263BBC","B0D324Q9NP","B0D321JC7X","B0CWLTGDR9","B0CWLRYY6X","B0CWLR1FNY","B0CWLS3SF5",
  "B0CWLR242N","B0D325WW4R","B0D326LF57","B0D3263P8N","B0D326N5RL","B0D325S8LM","B0CS9N5BTK","B0CS9MXCTX","B0CS9NJFQG",
  "B0CS9MB7GN","B0CS9Q9VN3","B0CK7C72FS","B0CK7DDYPP","B0D2Y5B5VY","B0CK7DDV8V","B0DFWSLDCK","B0DFWT7YG8",
  "B0DFWTK7ZM","B0DFWSGC95","B0DFWSXHXY","B0CK7CL4LP","B0CK7CRDTZ","B0CK7D5JZP","B0CK7CQL3N","B0CK7CVXTH","B0CRXBKHYJ",
  "B0CRXCQ26N","B0CRXDKPQZ","B0CRWXWRMQ","B0CRXKLNC7","B0D1RCY5BG","B0D1RDL2BC","B0D1RCWGJZ","B0D1RFW99M","B0D1RDTWM2",
];

// The upload destination is an S3 browser-form (POST policy) URL: its query parameters are the form fields.
function postForm(url: string, file: Buffer, contentType: string): Promise<{ status: number; body: string }> {
  const u = new URL(url);
  const boundary = "----cablestore" + crypto.randomBytes(8).toString("hex");
  const parts: Buffer[] = [];
  const field = (name: string, value: string) =>
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  for (const [k, v] of u.searchParams) field(k, v); // the policy allows exactly these fields
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
  const r = await spRequest<{ payload: { uploadDestinationId: string; url: string; headers?: Record<string, string> } }>(
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


// Keyword-rich copy and image alt text (alt text is indexed by Amazon). Facts only from verified listing data.
async function makeDocument(dir: string) {
  const f = (n: string) => path.join(dir, n);
  const id = {
    logo: await upload(f("logo-600x180.jpg")),
    header: await upload(f("header-970x600.jpg")),
    red: await upload(f("four-red-220.jpg")),
    twisted: await upload(f("four-twisted-220.jpg")),
    zigzag: await upload(f("four-zigzag-220.jpg")),
    speckled: await upload(f("four-speckled-220.jpg")),
    cRound: await upload(f("compare-round-150x300.jpg")),
    cTwisted: await upload(f("compare-twisted-150x300.jpg")),
    cZigzag: await upload(f("compare-zigzag-150x300.jpg")),
  };

  const metricLabels = ["Look", "Colours", "Cores", "Conductor", "Lengths"];
  const col = (position: number, image: unknown, title: string, asin: string, values: string[]) => ({
    position, image, title, asin, highlight: false,
    metrics: values.map((v, i) => ({ position: i + 1, value: v })),
  });

  return {
    name: "Fabric lighting cable range",
    contentType: "EBC",
    locale: "en-GB",
    contentModuleList: [
      {
        contentModuleType: "STANDARD_COMPANY_LOGO",
        standardCompanyLogo: { companyLogo: img(id.logo, 600, 180, "The Cable Store logo – fabric lighting cable and braided flex") },
      },
      {
        contentModuleType: "STANDARD_HEADER_IMAGE_TEXT",
        standardHeaderImageText: {
          headline: T("Fabric Lighting Cable – Braided 3 Core Flex, Made in the EU"),
          block: block(
            img(id.header, 970, 600, "Black and white zig zag fabric braided electrical cable, 3 core lighting flex"),
            "Make the cable part of the design",
            "Our fabric braided electrical cable is 3 core lighting flex with a woven textile sleeve, in nine colours. " +
              "A decorative lamp cable for pendant lights, table and floor lamps and vintage DIY lighting – it curls and " +
              "coils cleanly, so exposed wiring looks finished, not hidden."),
        },
      },
      {
        contentModuleType: "STANDARD_FOUR_IMAGE_TEXT",
        standardFourImageText: {
          headline: T("Choose your braided cable style"),
          block1: block(img(id.red, 220, 220, "Red round fabric covered lighting cable close-up"),
            "Round fabric cable", "Smooth woven braid in black, red, grey, canvas grey or oatmeal – a classic cloth covered lighting flex."),
          block2: block(img(id.twisted, 220, 220, "Red twisted fabric braided pendant cable close-up"),
            "Twisted fabric cable", "Three braided cores twisted together for a vintage rope-style pendant cable."),
          block3: block(img(id.zigzag, 220, 220, "Linen zig zag braided electrical cable"),
            "Zig zag braided cable", "A graphic woven pattern in black and white or linen."),
          block4: block(img(id.speckled, 220, 220, "Black speckled fabric lighting flex"),
            "Speckled fabric flex", "Black braid with a light fleck that adds texture."),
        },
      },
      {
        contentModuleType: "STANDARD_COMPARISON_TABLE",
        standardComparisonTable: {
          productColumns: [
            col(1, img(id.cRound, 150, 300, "Black round fabric lighting cable"), "Round", "B0CK6N1F3M", ["Smooth, classic", "6 inc. speckled", "3 (with earth)", "0.75mm²", "3 to 50 m"]),
            col(2, img(id.cTwisted, 150, 300, "Red twisted fabric lighting cable"), "Twisted", "B0D1RCY5BG", ["Vintage rope", "Red", "3 (with earth)", "0.75mm²", "3 to 50 m"]),
            col(3, img(id.cZigzag, 150, 300, "Black and white zig zag fabric lighting cable"), "Zig zag", "B0CK7CL4LP", ["Graphic pattern", "Black & white, linen", "3 (with earth)", "0.75mm²", "3 to 50 m"]),
          ],
          metricRowLabels: metricLabels.map((v, i) => ({ position: i + 1, value: v })),
        },
      },
      {
        contentModuleType: "STANDARD_TEXT",
        standardText: {
          headline: T("Which length of lighting cable do you need?"),
          body: P("Measure from the ceiling to where you want the bulb, then allow a little extra for the ceiling rose and any loop. " +
            "3 m suits one pendant drop or a lamp rewire, 5 m a floor lamp or looped swag, and 10 m two or three pendant lights. " +
            "20 m and 50 m reels suit larger projects and cost less per metre. Every length of braided flex arrives as one continuous run."),
        },
      },
      {
        contentModuleType: "STANDARD_TECH_SPECS",
        standardTechSpecs: {
          headline: T("3 core lighting flex – technical specification"),
          specificationList: [
            ["Cores", "3 (live, neutral and earth)"],
            ["Conductor size", "0.75 mm² per core, copper"],
            ["Insulation", "Double PVC under a woven textile braid"],
            ["Standard", "H03VV-F, EN 50525-2-11"],
            ["Max temperature", "+70 °C"],
            ["Max suspended load", "3 kg"],
            ["Round cable", "6.6 mm outer diameter, 24 mm bend radius"],
            ["Origin", "Made in the EU, CE marked"],
          ].map(([l, d]) => ({ label: T(l), description: T(d) })),
          tableCount: 1,
        },
      },
    ],
  };
}

async function validate(contentDocument: unknown) {
  const v = await spRequest<any>(cfg, "POST", "/aplus/2020-11-01/contentAsinValidations",
    { marketplaceId: MP, asinSet: CABLE_ASINS.join(",") }, { contentDocument });
  const vErr = v.errors ?? [];
  console.log(`validation: ${vErr.length ? JSON.stringify(vErr).slice(0, 1500) : "no errors"}${v.warnings?.length ? " | warnings: " + JSON.stringify(v.warnings).slice(0, 800) : ""}`);
  return vErr.length === 0;
}

async function link(key: string) {
  const rel = await spRequest<any>(cfg, "POST", `/aplus/2020-11-01/contentDocuments/${encodeURIComponent(key)}/asins`,
    { marketplaceId: MP }, { asinSet: CABLE_ASINS });
  console.log(`ASINs linked (${CABLE_ASINS.length})${rel?.warnings?.length ? " | warnings: " + JSON.stringify(rel.warnings).slice(0, 600) : ""}`);
}

async function build(dir: string) {
  const contentDocument = await makeDocument(dir);
  if (!(await validate(contentDocument))) return;
  const created = await spRequest<{ contentReferenceKey: string }>(cfg, "POST", "/aplus/2020-11-01/contentDocuments", { marketplaceId: MP }, { contentDocument });
  console.log(`draft created: ${created.contentReferenceKey}`);
  await link(created.contentReferenceKey);
}

// Updates an existing draft in place (keeps its reference key), then re-links the ASINs.
async function update(key: string, dir: string) {
  const contentDocument = await makeDocument(dir);
  if (!(await validate(contentDocument))) return;
  const r = await spRequest<any>(cfg, "POST", `/aplus/2020-11-01/contentDocuments/${encodeURIComponent(key)}`, { marketplaceId: MP }, { contentDocument });
  console.log(`draft updated: ${r.contentReferenceKey ?? key}${r.warnings?.length ? " | warnings: " + JSON.stringify(r.warnings).slice(0, 600) : ""}`);
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
