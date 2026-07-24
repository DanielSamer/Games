// One-off script: downloads brand logos from Clearbit and saves them into public/logos/
// Usage: node scripts/download-logos.mjs

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("public/logos");

const BRANDS = [
  ["apple", "apple.com"],
  ["nike", "nike.com"],
  ["mcdonalds", "mcdonalds.com"],
  ["google", "google.com"],
  ["coca-cola", "coca-cola.com"],
  ["pepsi", "pepsi.com"],
  ["samsung", "samsung.com"],
  ["amazon", "amazon.com"],
  ["netflix", "netflix.com"],
  ["youtube", "youtube.com"],
  ["facebook", "facebook.com"],
  ["instagram", "instagram.com"],
  ["whatsapp", "whatsapp.com"],
  ["spotify", "spotify.com"],
  ["adidas", "adidas.com"],
  ["puma", "puma.com"],
  ["kfc", "kfc.com"],
  ["burger-king", "burgerking.com"],
  ["starbucks", "starbucks.com"],
  ["ikea", "ikea.com"],
  ["playstation", "playstation.com"],
  ["xbox", "xbox.com"],
  ["nintendo", "nintendo.com"],
  ["visa", "visa.com"],
  ["mastercard", "mastercard.com"],
  ["toyota", "toyota.com"],
  ["bmw", "bmw.com"],
  ["mercedes-benz", "mercedes-benz.com"],
  ["ferrari", "ferrari.com"],
  ["disney", "disney.com"],
  ["x-twitter", "x.com"],
  ["tiktok", "tiktok.com"],
  ["linkedin", "linkedin.com"],
  ["uber", "uber.com"],
  ["airbnb", "airbnb.com"],
  ["shell", "shell.com"],
  ["chevrolet", "chevrolet.com"],
  ["ford", "ford.com"],
  ["honda", "honda.com"],
  ["pizza-hut", "pizzahut.com"],
  ["under-armour", "underarmour.com"],
  ["reebok", "reebok.com"],
  ["new-balance", "newbalance.com"],
  ["hm", "hm.com"],
  ["zara", "zara.com"],
  ["gucci", "gucci.com"],
  ["louis-vuitton", "louisvuitton.com"],
  ["chanel", "chanel.com"],
  ["rolex", "rolex.com"],
  ["red-bull", "redbull.com"],
  ["fanta", "fanta.com"],
  ["sprite", "sprite.com"],
  ["7up", "7up.com"],
  ["subway", "subway.com"],
  ["dominos", "dominos.com"],
  ["dunkin", "dunkindonuts.com"],
  ["tim-hortons", "timhortons.com"],
  ["costa-coffee", "costa.co.uk"],
  ["lg", "lg.com"],
  ["sony", "sony.com"],
  ["huawei", "huawei.com"],
  ["xiaomi", "mi.com"],
  ["dell", "dell.com"],
  ["hp", "hp.com"],
  ["lenovo", "lenovo.com"],
  ["intel", "intel.com"],
  ["amd", "amd.com"],
  ["nvidia", "nvidia.com"],
  ["snapchat", "snapchat.com"],
  ["telegram", "telegram.org"],
  ["discord", "discord.com"],
  ["pinterest", "pinterest.com"],
  ["reddit", "reddit.com"],
  ["twitch", "twitch.tv"],
  ["microsoft", "microsoft.com"],
  ["fila", "fila.com"],
  ["umbro", "umbro.com"],
  ["kappa", "kappa.com"],
  ["lacoste", "lacoste.com"],
  ["hugo-boss", "hugoboss.com"],
  ["prada", "prada.com"],
  ["versace", "versace.com"],
  ["aston-martin", "astonmartin.com"],
  ["bugatti", "bugatti.com"],
  ["lamborghini", "lamborghini.com"],
  ["maserati", "maserati.com"],
  ["jaguar", "jaguar.com"],
  ["land-rover", "landrover.com"],
  ["peugeot", "peugeot.com"],
  ["renault", "renault.com"],
  ["fiat", "fiat.com"],
  ["vespa", "vespa.com"],
  ["duracell", "duracell.com"],
  ["energizer", "energizer.com"],
  ["colgate", "colgate.com"],
  ["nivea", "nivea.com"],
  ["dove", "dove.com"],
  ["gillette", "gillette.com"],
  ["head-and-shoulders", "headandshoulders.com"],
  ["ariel", "ariel.com"],
];

async function downloadOne(slug, domain) {
  const url = `https://logo.clearbit.com/${domain}?size=256`;
  const res = await fetch(url);
  if (!res.ok) {
    return { slug, domain, ok: false, status: res.status };
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 200) {
    // Suspiciously small — likely a placeholder/error image, not a real logo
    return { slug, domain, ok: false, status: "too-small" };
  }
  await writeFile(path.join(OUT_DIR, `${slug}.png`), buffer);
  return { slug, domain, ok: true };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const results = [];
  for (const [slug, domain] of BRANDS) {
    try {
      const result = await downloadOne(slug, domain);
      results.push(result);
      console.log(result.ok ? `OK   ${slug}` : `FAIL ${slug} (${result.status})`);
    } catch (err) {
      results.push({ slug, domain, ok: false, status: err instanceof Error ? err.message : "error" });
      console.log(`FAIL ${slug} (${err instanceof Error ? err.message : "error"})`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nDone. ${results.length - failed.length}/${results.length} succeeded.`);
  if (failed.length > 0) {
    console.log("Failed:", failed.map((f) => `${f.slug} (${f.status})`).join(", "));
  }
}

main();
