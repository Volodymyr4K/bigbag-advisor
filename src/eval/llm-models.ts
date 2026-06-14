// Мультимодельний прогін LLM (grounded) на held-out, з паралелізмом — щоб чесно
// порівняти кілька моделей за розумний час навіть на повільних free-ендпоінтах.
//
// Запуск:
//   LLM_MODELS="nvidia/nemotron-nano-9b-v2:free,nex-agi/nex-n2-pro:free" \
//   node --env-file=.env --import tsx src/eval/llm-models.ts
//
// Базові рядки rules / ML рахуються офлайн для тієї ж вибірки (контекст).

import { writeFileSync } from "node:fs";
import { HELDOUT } from "./heldout";
import { adviseRules } from "../core/rules";
import { adviseMl } from "../core/ml";
import { adviseLlm, adviseLlmNoGround } from "../core/llm";
import type { Advice } from "../core/types";
import type { Case } from "./dataset";

const WITH_NOGROUND = !!process.env.LLM_WITH_NOGROUND;

const CONCURRENCY = Number(process.env.LLM_CONCURRENCY) || 5;

interface Stat {
  n: number; deptOK: number;
  catN: number; catOK: number;
  nonBagN: number; specOnNonBag: number;
  latSum: number; calls: number; fails: number;
}
const empty = (): Stat => ({ n: 0, deptOK: 0, catN: 0, catOK: 0, nonBagN: 0, specOnNonBag: 0, latSum: 0, calls: 0, fails: 0 });

function grade(s: Stat, c: Case, a: Advice) {
  s.n++;
  if (a.routedTo.id === c.expectedDept) s.deptOK++;
  if (c.expectedCategory != null) {
    s.catN++;
    if (a.spec?.category === c.expectedCategory) s.catOK++;
  } else {
    s.nonBagN++;
    if (a.spec) s.specOnNonBag++;
  }
}

const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((100 * n) / d)}% (${n}/${d})`);

// Простий пул паралельних задач.
async function pool<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

async function runModel(model: string, noGround = false): Promise<Stat> {
  process.env.LLM_MODEL = model;
  const advise = noGround ? adviseLlmNoGround : adviseLlm;
  const s = empty();
  await pool(HELDOUT, CONCURRENCY, async (c) => {
    try {
      const { advice, usage } = await advise({ text: c.text, lang: c.lang });
      grade(s, c, advice);
      s.latSum += usage.latencyMs;
      s.calls++;
    } catch {
      s.fails++;
      // невдалий виклик не зараховуємо в n — щоб не псувати знаменник «нечесно».
    }
  });
  return s;
}

function rowLLM(model: string, s: Stat) {
  return {
    engine: model.replace(":free", ""),
    Відділ: pct(s.deptOK, s.n),
    Категорія: pct(s.catOK, s.catN),
    "Spec на не-бег ↓": pct(s.specOnNonBag, s.nonBagN),
    "Латентн.": s.calls ? `${Math.round(s.latSum / s.calls)}ms` : "—",
    "невдалих викликів": s.fails,
  };
}

async function main() {
  const models = (process.env.LLM_MODELS || "nvidia/nemotron-nano-9b-v2:free")
    .split(",").map((m) => m.trim()).filter(Boolean);

  // Офлайн-базлайни на тій самій вибірці.
  const rules = empty(), ml = empty();
  for (const c of HELDOUT) {
    grade(rules, c, adviseRules({ text: c.text, lang: c.lang }));
    grade(ml, c, adviseMl({ text: c.text, lang: c.lang }));
  }

  const rows: Record<string, string | number>[] = [
    { engine: "rules", Відділ: pct(rules.deptOK, rules.n), Категорія: pct(rules.catOK, rules.catN), "Spec на не-бег ↓": pct(rules.specOnNonBag, rules.nonBagN), "Латентн.": "0ms", "невдалих викликів": 0 },
    { engine: "ml (NaiveBayes)", Відділ: pct(ml.deptOK, ml.n), Категорія: pct(ml.catOK, ml.catN), "Spec на не-бег ↓": pct(ml.specOnNonBag, ml.nonBagN), "Латентн.": "0ms", "невдалих викликів": 0 },
  ];

  console.log(`\nHELD-OUT: ${HELDOUT.length} кейсів · grounded${WITH_NOGROUND ? " + no-ground" : ""} · паралелізм ${CONCURRENCY}`);
  console.log(`Моделі: ${models.join(", ")}\n`);

  const jsonModels: Record<string, unknown>[] = [];
  for (const m of models) {
    process.stdout.write(`  ганяю ${m} (grounded) ...`);
    let t0 = Date.now();
    const g = await runModel(m, false);
    console.log(` готово за ${Math.round((Date.now() - t0) / 1000)}с (fails: ${g.fails})`);
    const r = rowLLM(m, g);
    rows.push(r);
    console.log(`    → Відділ ${r["Відділ"]} · Категорія ${r["Категорія"]} · Spec-на-не-бег ${r["Spec на не-бег ↓"]} · ${r["Латентн."]}`);
    const entry: Record<string, unknown> = { model: m, grounded: g };
    if (WITH_NOGROUND) {
      process.stdout.write(`  ганяю ${m} (no-ground) ...`);
      t0 = Date.now();
      const ng = await runModel(m, true);
      console.log(` готово за ${Math.round((Date.now() - t0) / 1000)}с (fails: ${ng.fails})`);
      entry.noGround = ng;
      console.log(`    no-ground spec-на-не-бег: ${pct(ng.specOnNonBag, ng.nonBagN)}`);
    }
    jsonModels.push(entry);
  }

  console.log();
  console.table(rows);

  writeFileSync(
    new URL("../../data/llm-models-results.json", import.meta.url),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), heldoutSize: HELDOUT.length, concurrency: CONCURRENCY, baselines: { rules, ml }, models: jsonModels },
      null,
      2,
    ),
  );
  console.log("Збережено: data/llm-models-results.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
