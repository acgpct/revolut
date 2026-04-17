import puppeteer from "puppeteer-core";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CHROME  = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL     = "http://localhost:3000/report";
const OUT     = join(__dirname, "..", "..", "Financial-Crime-Intelligence-Report.pdf");

async function run() {
  console.log("Launching Chrome…");
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  const page = await browser.newPage();

  // Emulate print media so @media print rules apply during render
  await page.emulateMediaType("print");

  // A4 at 96dpi ≈ 794 × 1123px
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });

  console.log(`Opening ${URL}…`);
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 45000 });

  // Wait for Recharts SVGs to appear
  console.log("Waiting for charts to render…");
  await page.waitForSelector(".recharts-surface", { timeout: 20000 });

  // Give animations and ResizeObservers time to settle
  await new Promise(r => setTimeout(r, 2500));

  console.log("Generating PDF…");
  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    preferCSSPageSize: true,
  });

  writeFileSync(OUT, pdf);
  console.log(`\n✓  PDF saved to:\n   ${OUT}\n`);

  await browser.close();
}

run().catch(err => {
  console.error("PDF generation failed:", err.message);
  process.exit(1);
});
