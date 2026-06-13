// БЕНЧ: rules vs ML vs LLM(grounded) vs LLM(no-ground).
//
// Дві таблиці:
//   DEV (33 кейси)      — набір, на якому тюнились синоніми правил. Тут у правил
//                         «домашня перевага» (вони бачили цю лексику).
//   HELD-OUT (свіжі)    — головна таблиця. Цих рядків правила НЕ бачили, ML на
//                         них НЕ тренувався. Тут видно реальну генералізацію.
//
// Чесність:
//   - rules + ML працюють без ключа (реальні, безкоштовні, відтворювані числа).
//   - LLM-колонки рахуються лише за наявності OPENROUTER_API_KEY; інакше SKIPPED.
//   - Нічого не хардкодимо. Що порахувалось — те й друкуємо.

import { writeFileSync } from "node:fs";
import { DATASET, type Case } from "./dataset";
import { HELDOUT } from "./heldout";
import { adviseRules } from "../core/rules";
import { adviseMl } from "../core/ml";
import { adviseLlm, adviseLlmNoGround, hasApiKey, type LlmUsage } from "../core/llm";
import type { Advice } from "../core/types";

interface EngineStats {
  engine: string;
  n: number;
  deptCorrect: number;
  catTotal: number;
  catCorrect: number;
  loopsTotal: number;
  loopsCorrect: number;
  linerTotal: number;
  linerCorrect: number;
  hallucinated: number;
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
    if (a.spec) s.specOnNonBag++;
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
    "Відділ": pct(s.deptCorrect, s.n),
    "Категорія": pct(s.catCorrect, s.catTotal),
    "Галюцинації ↓": pct(s.hallucinated, s.n),
    "Spec на не-бег ↓": pct(s.specOnNonBag, s.nonBagTotal),
    "$/100": s.llmCalls ? `$${((s.cost / s.llmCalls) * 100).toFixed(3)}` : "$0",
    "Латентн.": s.llmCalls ? `${Math.round(s.latencySum / s.llmCalls)}ms` : "0ms",
  };
}

async function runDataset(cases: Case[], useLlm: boolean): Promise<EngineStats[]> {
  const rules = emptyStats("rules");
  const ml = emptyStats("ml (NaiveBayes)");
  const llm = emptyStats("llm (grounded)");
  const llmNG = emptyStats("llm (no-ground)");

  for (const c of cases) {
    grade(rules, c, adviseRules({ text: c.text, lang: c.lang }));
    grade(ml, c, adviseMl({ text: c.text, lang: c.lang }));
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
  return useLlm ? [rules, ml, llm, llmNG] : [rules, ml];
}

async function main() {
  const useLlm = hasApiKey() && !process.env.RULES_ONLY;
  console.log(`\nLLM: ${useLlm ? `УВІМКНЕНО (${process.env.LLM_MODEL || "openai/gpt-4o-mini"})` : "ВИМКНЕНО (нема ключа або RULES_ONLY)"}`);
  console.log("ML тренується на синтетичних даних (src/ml/traindata.ts), тест — на наборах нижче.\n");

  console.log(`=== DEV (${DATASET.length} кейсів; правила тут мають «домашню перевагу») ===`);
  const dev = await runDataset(DATASET, useLlm);
  console.table(dev.map(row));

  console.log(`\n=== HELD-OUT (${HELDOUT.length} свіжих кейсів; нова лексика; головна таблиця) ===`);
  const held = await runDataset(HELDOUT, useLlm);
  console.table(held.map(row));

  console.log("\nЯк читати:");
  console.log("  ↓ = менше краще. «Галюцинації» = spec поза каталогом VBA.");
  console.log("  Падіння rules/ML між DEV і HELD-OUT = ціна крихкості до нової лексики.");
  console.log("  LLM на HELD-OUT — перевірка, чи zero-shot тягне нову лексику без галюцинацій.\n");

  const out = {
    generatedAt: new Date().toISOString(),
    llmEnabled: useLlm,
    model: useLlm ? process.env.LLM_MODEL || "openai/gpt-4o-mini" : null,
    dev: { size: DATASET.length, engines: dev },
    heldout: { size: HELDOUT.length, engines: held },
  };
  writeFileSync(new URL("../../data/bench-results.json", import.meta.url), JSON.stringify(out, null, 2));
  console.log("Збережено: data/bench-results.json");
  if (!useLlm) console.log("\nЩоб додати LLM-колонки — впиши OPENROUTER_API_KEY у .env і запусти `npm run bench`.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
