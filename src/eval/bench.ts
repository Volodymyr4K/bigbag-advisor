// БЕНЧ: rules vs LLM(grounded) vs LLM(no-ground) на розміченому датасеті.
//
// Чесність:
//  - Без OPENROUTER_API_KEY ганяємо ЛИШЕ rules (реальні числа, відтворювані
//    будь-ким безкоштовно). LLM-колонки позначаємо як SKIPPED.
//  - Нічого не хардкодимо в результати. Що порахувалось — те й друкуємо.
//
// Запуск:  npm run bench         (rules + LLM, потрібен ключ)
//          npm run bench:rules   (тільки rules)

import { writeFileSync } from "node:fs";
import { DATASET, type Case } from "./dataset";
import { adviseRules } from "../core/rules";
import { adviseLlm, adviseLlmNoGround, hasApiKey, type LlmUsage } from "../core/llm";
import type { Advice } from "../core/types";

interface EngineStats {
  engine: string;
  n: number;
  deptCorrect: number;
  catTotal: number; // скільки кейсів мають expectedCategory != null
  catCorrect: number;
  loopsTotal: number;
  loopsCorrect: number;
  linerTotal: number;
  linerCorrect: number;
  hallucinated: number; // кейси з outOfCatalog != []
  // Контроль пасток: spec там, де його НЕ мало бути (expectedCategory=null).
  specOnNonBag: number;
  nonBagTotal: number;
  cost: number;
  latencySum: number;
  llmCalls: number;
}

function emptyStats(engine: string): EngineStats {
  return {
    engine, n: 0, deptCorrect: 0, catTotal: 0, catCorrect: 0,
    loopsTotal: 0, loopsCorrect: 0, linerTotal: 0, linerCorrect: 0,
    hallucinated: 0, specOnNonBag: 0, nonBagTotal: 0, cost: 0, latencySum: 0, llmCalls: 0,
  };
}

function grade(s: EngineStats, c: Case, a: Advice, usage?: LlmUsage) {
  s.n++;
  if (a.routedTo.id === c.expectedDept) s.deptCorrect++;

  if (c.expectedCategory != null) {
    s.catTotal++;
    if (a.spec?.category === c.expectedCategory) s.catCorrect++;
    if (c.expectLoops != null) {
      s.loopsTotal++;
      if (a.spec?.loops === c.expectLoops) s.loopsCorrect++;
    }
    if (c.expectLiner != null) {
      s.linerTotal++;
      if (a.spec?.liner === c.expectLiner) s.linerCorrect++;
    }
  } else {
    s.nonBagTotal++;
    if (a.spec) s.specOnNonBag++; // вигадав spec там, де його не мало бути
  }

  if (a.flags.outOfCatalog.length > 0) s.hallucinated++;
  if (usage) {
    s.cost += usage.costUsd;
    s.latencySum += usage.latencyMs;
    s.llmCalls++;
  }
}

function pct(n: number, d: number): string {
  if (d === 0) return "—";
  return `${((100 * n) / d).toFixed(0)}% (${n}/${d})`;
}

function row(s: EngineStats): Record<string, string> {
  return {
    engine: s.engine,
    "Відділ (роутинг)": pct(s.deptCorrect, s.n),
    "Категорія": pct(s.catCorrect, s.catTotal),
    "Стропи": pct(s.loopsCorrect, s.loopsTotal),
    "Вкладиш": pct(s.linerCorrect, s.linerTotal),
    "Галюцинації ↓": pct(s.hallucinated, s.n),
    "Spec на не-бег ↓": pct(s.specOnNonBag, s.nonBagTotal),
    "$/100 запитів": s.llmCalls ? `$${((s.cost / s.llmCalls) * 100).toFixed(3)}` : "$0",
    "Латентність": s.llmCalls ? `${Math.round(s.latencySum / s.llmCalls)}ms` : "—",
  };
}

async function main() {
  const useLlm = hasApiKey() && !process.env.RULES_ONLY;
  console.log(`\nДатасет: ${DATASET.length} кейсів (UA/RU/EN + пастки)`);
  console.log(`LLM: ${useLlm ? `УВІМКНЕНО (${process.env.LLM_MODEL || "openai/gpt-4o-mini"})` : "ВИМКНЕНО (нема ключа або RULES_ONLY)"}\n`);

  const rules = emptyStats("rules (baseline)");
  const llm = emptyStats("llm (grounded)");
  const llmNG = emptyStats("llm (no-ground)");

  for (const c of DATASET) {
    grade(rules, c, adviseRules({ text: c.text, lang: c.lang }));
    if (useLlm) {
      try {
        const g = await adviseLlm({ text: c.text, lang: c.lang });
        grade(llm, c, g.advice, g.usage);
      } catch (e) {
        console.error(`[llm] ${c.id}: ${(e as Error).message}`);
      }
      try {
        const ng = await adviseLlmNoGround({ text: c.text, lang: c.lang });
        grade(llmNG, c, ng.advice, ng.usage);
      } catch (e) {
        console.error(`[llm-ng] ${c.id}: ${(e as Error).message}`);
      }
    }
  }

  const rows = [row(rules)];
  if (useLlm) rows.push(row(llm), row(llmNG));
  console.table(rows);

  console.log("\nЯк читати:");
  console.log("  ↓ = менше краще (галюцинації, spec там де не треба).");
  console.log("  «Галюцинації» = специфікація містить значення поза каталогом VBA.");
  console.log("  «Spec на не-бег» = система вигадала біг-бег у відповідь на запит про вапняк/розпливчасте.\n");

  const out = {
    generatedAt: new Date().toISOString(),
    datasetSize: DATASET.length,
    llmEnabled: useLlm,
    model: useLlm ? process.env.LLM_MODEL || "openai/gpt-4o-mini" : null,
    engines: useLlm ? [rules, llm, llmNG] : [rules],
  };
  writeFileSync(new URL("../../data/bench-results.json", import.meta.url), JSON.stringify(out, null, 2));
  console.log("Збережено: data/bench-results.json");
  if (!useLlm) {
    console.log("\nЩоб отримати числа LLM — додай OPENROUTER_API_KEY у .env і запусти `npm run bench`.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
