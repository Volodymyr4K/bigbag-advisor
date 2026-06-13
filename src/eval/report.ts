// Генерує docs/heldout-report.md — по-кейсовий розбір held-out набору:
// що передбачив кожен рушій (без LLM) і де помилився. Прозорість замість
// «повірте таблиці»: рев'юер бачить КОЖЕН промах поіменно.
//
// Запуск: npm run report

import { writeFileSync } from "node:fs";
import { HELDOUT } from "./heldout";
import { adviseRules } from "../core/rules";
import { adviseMl } from "../core/ml";
import type { Advice } from "../core/types";
import type { Case } from "./dataset";

function cell(a: Advice, c: Case): string {
  const deptOk = a.routedTo.id === c.expectedDept;
  const catExpected = c.expectedCategory;
  const got = a.spec?.category ?? "—";
  const catOk = catExpected == null ? a.spec == null || true : got === catExpected;
  const dept = `${deptOk ? "✓" : "✗"} ${a.routedTo.id}`;
  const cat = catExpected == null ? "—" : `${catOk ? "✓" : "✗"} ${got}`;
  return `${dept}<br>${cat}`;
}

function main() {
  const rows: string[] = [];
  let rulesDept = 0, mlDept = 0, rulesCat = 0, mlCat = 0, catTotal = 0;

  for (const c of HELDOUT) {
    const r = adviseRules({ text: c.text, lang: c.lang });
    const m = adviseMl({ text: c.text, lang: c.lang });
    if (r.routedTo.id === c.expectedDept) rulesDept++;
    if (m.routedTo.id === c.expectedDept) mlDept++;
    if (c.expectedCategory != null) {
      catTotal++;
      if (r.spec?.category === c.expectedCategory) rulesCat++;
      if (m.spec?.category === c.expectedCategory) mlCat++;
    }
    const want = c.expectedCategory ? `${c.expectedDept}<br>${c.expectedCategory}` : `${c.expectedDept}<br>—`;
    rows.push(`| \`${c.id}\` | ${c.text} | ${want} | ${cell(r, c)} | ${cell(m, c)} |`);
  }

  const n = HELDOUT.length;
  const md = [
    "# HELD-OUT: по-кейсовий розбір",
    "",
    "> Згенеровано автоматично: `npm run report`. Тільки rules + ML (без LLM).",
    "> Кожна клітинка: `відділ` / `категорія`, ✓ — збіг з очікуваним, ✗ — промах.",
    "",
    `**Підсумок (${n} кейсів):** ` +
      `rules — відділ ${rulesDept}/${n}, категорія ${rulesCat}/${catTotal}; ` +
      `ML — відділ ${mlDept}/${n}, категорія ${mlCat}/${catTotal}.`,
    "",
    "Найцікавіше — рядки з ✗ на невиданій лексиці (ріпак, суперфосфат, лушпиння, гравій, крейда):",
    "саме там видно межу підходів «ключові слова» і ML на малих даних.",
    "",
    "| id | запит | очікувано | rules | ml |",
    "|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");

  writeFileSync(new URL("../../docs/heldout-report.md", import.meta.url), md);
  console.log(`Звіт збережено: docs/heldout-report.md (${n} кейсів)`);
}

main();
