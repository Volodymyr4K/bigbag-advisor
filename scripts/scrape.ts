// ПРОВЕНАНС / ВІДТВОРЮВАНІСТЬ.
//
// База знань (data/knowledge-base.json) виведена з контенту сайту ВБА. Канонічні
// тексти лежать у data/raw/*.uk.txt (зняті headless-браузером для чистоти).
//
// Цей скрипт — простий fetch-перезбір тих самих сторінок: щоб будь-хто міг
// переконатися, що джерело все ще каже те, що ми формалізували, і за потреби
// оновити дані. Пише у data/raw/fetched/ (цей каталог у .gitignore — він
// регенерується цим скриптом).
//
// Запуск: npm run scrape

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SOURCES: Record<string, string> = {
  "big-bag": "https://vba.com.ua/uk/product/big-bag",
  "liner-bag": "https://vba.com.ua/uk/product/liner-bag",
  "liner-in-the-train": "https://vba.com.ua/uk/product/liner-in-the-train",
  "limestone": "https://vba.com.ua/uk/product/limestone",
  "mineral-powder": "https://vba.com.ua/uk/product/mineral-powder",
  "cooperation": "https://vba.com.ua/uk/about/cooperation",
  "contacts": "https://vba.com.ua/uk/contacts",
};

// Перевірочні «маяки»: якщо джерело змінилось і маяк зник — попередимо.
// NB: email-адреси на /contacts підвантажуються через JS, тому в серверному
// HTML їх НЕМА (fetch їх не бачить). Саме тому канонічні контакти знято
// headless-браузером у data/raw/contacts.uk.txt. Тут маяк — телефон, який
// рендериться на сервері.
const BEACONS: Record<string, string> = {
  "big-bag": "Під добрива",
  "limestone": "ГОСТ 8043",
  "contacts": "+380 67 231 62 23",
};

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

async function main() {
  const outDir = join(process.cwd(), "data", "raw", "fetched");
  await mkdir(outDir, { recursive: true });

  let warned = 0;
  for (const [name, url] of Object.entries(SOURCES)) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`✗ ${name}: HTTP ${res.status}`);
        warned++;
        continue;
      }
      const html = await res.text();
      const text = htmlToText(html);
      await writeFile(join(outDir, `${name}.txt`), text, "utf8");

      const beacon = BEACONS[name];
      const ok = beacon ? text.includes(beacon) : true;
      console.log(
        `${ok ? "✓" : "⚠"} ${name.padEnd(20)} ${String(text.length).padStart(6)} симв.` +
          (beacon ? `  маяк «${beacon}»: ${ok ? "є" : "ЗНИК!"}` : ""),
      );
      if (!ok) warned++;
    } catch (e) {
      console.error(`✗ ${name}: ${(e as Error).message}`);
      warned++;
    }
  }

  console.log(`\nЗбережено у data/raw/fetched/.`);
  if (warned > 0) {
    console.log(`⚠ ${warned} попереджень — джерело могло змінитись, перевірте knowledge-base.json.`);
    process.exit(1);
  }
  console.log("Усі маяки на місці — база знань узгоджена з джерелом.");
}

main();
