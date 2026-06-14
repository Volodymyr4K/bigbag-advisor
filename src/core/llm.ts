// LLM-шар через OpenAI-сумісний endpoint (OpenRouter).
// Два режими:
//   grounded   — у промпт кладемо реальну базу знань VBA. Модель мусить
//                рекомендувати ЛИШЕ з каталогу.
//   no-ground  — без бази знань, «з голови». Тут ловимо галюцинації:
//                модель вигадує розміри, яких у VBA немає.
//
// Без OPENROUTER_API_KEY будь-який виклик кидає помилку — це навмисно.
// Rules-baseline працює без ключа; LLM-числа треба чесно ганяти на реальному API.

import { KB, getDepartment, outOfCatalog } from "./kb";
import { buildDraft } from "./rules";
import type { Advice, AdviceQuery, BigBagSpec, DepartmentId } from "./types";

const BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const MODEL = process.env.LLM_MODEL || "openai/gpt-4o-mini";

// Орієнтовні ціни USD за 1М токенів (станом на конфіг). Лише для оцінки
// вартості за розмову в бенчі. Якщо моделі немає в таблиці — рахуємо 0 і
// чесно позначаємо в README, що ціна невідома.
const PRICES: Record<string, { in: number; out: number }> = {
  "openai/gpt-4o-mini": { in: 0.15, out: 0.6 },
  "openai/gpt-4o": { in: 2.5, out: 10 },
  "openai/gpt-oss-120b:free": { in: 0, out: 0 },
  "meta-llama/llama-3.1-8b-instruct": { in: 0.02, out: 0.05 },
  "google/gemini-flash-1.5": { in: 0.075, out: 0.3 },
};

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
  model: string;
}

export function hasApiKey(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

interface RawLlmSpec {
  department?: string;
  category?: string | null;
  baseSize?: string[];
  heightCm?: number[];
  loops?: number | null;
  liner?: string | null;
  top?: string | null;
  loadCapacityKg?: number | null;
  qbag?: boolean | null;
  isBigBagQuestion?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callOpenRouter(system: string, user: string): Promise<{ raw: RawLlmSpec; usage: LlmUsage }> {
  if (!hasApiKey()) throw new Error("OPENROUTER_API_KEY не заданий — LLM-режим недоступний.");
  const t0 = Date.now();
  const body = JSON.stringify({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  // Ретрай лише на 429 (rate-limit) — типово для безкоштовних моделей.
  // 402/403 (вичерпано ліміт/оплату) не ретраїмо: це не мине саме собою.
  let res: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body,
    });
    if (res.status === 429 && attempt < 4) {
      await sleep(2000 * 2 ** attempt); // 2s, 4s, 8s, 16s
      continue;
    }
    break;
  }
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  const latencyMs = Date.now() - t0;
  const content = data.choices?.[0]?.message?.content ?? "{}";
  let raw: RawLlmSpec = {};
  try {
    raw = JSON.parse(content);
  } catch {
    raw = {};
  }
  const pt = data.usage?.prompt_tokens ?? 0;
  const ct = data.usage?.completion_tokens ?? 0;
  const price = PRICES[MODEL] ?? { in: 0, out: 0 };
  const costUsd = (pt / 1e6) * price.in + (ct / 1e6) * price.out;
  return { raw, usage: { promptTokens: pt, completionTokens: ct, costUsd, latencyMs, model: MODEL } };
}

const OUTPUT_SCHEMA = `Поверни СУВОРО JSON такого вигляду:
{
  "isBigBagQuestion": boolean,        // це питання про підбір біг-бега?
  "department": "bigbag" | "limestone_powder" | "general",
  "category": "fertilizer"|"grain"|"oilcake"|"biofuel"|"feed"|"quarry"|null,
  "baseSize": ["90x90"],              // розмір(и) дна в см
  "heightCm": [150, 160],
  "loops": 4,
  "liner": "так"|"ні"|"за бажанням"|null,
  "top": "клапан"|"фартух"|"клапан або фартух"|"відкритий"|null,
  "loadCapacityKg": 1000,
  "qbag": true|false|null
}`;

function groundedSystem(): string {
  return [
    "Ти — асистент відділу продажів Торгової Групи «ВБА» (виробник біг-бегів, вапняку, мінерального порошку).",
    "Твоя задача: за запитом клієнта визначити відділ і, якщо це про біг-бег, підібрати специфікацію.",
    "ВАЖЛИВО: рекомендуй ЛИШЕ зі знань нижче. Не вигадуй розмірів, яких тут немає.",
    "",
    "БАЗА ЗНАНЬ (правила підбору біг-бега за типом вантажу):",
    JSON.stringify(KB.bigbag_rules, null, 0),
    "",
    "ДОПУСТИМИЙ КАТАЛОГ (значення поза ним заборонені):",
    JSON.stringify(KB.catalog, null, 0),
    "",
    "ВІДДІЛИ:",
    JSON.stringify(KB.departments, null, 0),
    "",
    OUTPUT_SCHEMA,
  ].join("\n");
}

function noGroundSystem(): string {
  return [
    "Ти — експерт з пакування сипучих вантажів у біг-беги (FIBC).",
    "За запитом клієнта підбери специфікацію біг-бега та визнач відділ.",
    OUTPUT_SCHEMA,
  ].join("\n");
}

function toAdvice(raw: RawLlmSpec, query: AdviceQuery, engine: string): { advice: Advice } {
  const deptId: DepartmentId =
    raw.department === "bigbag" || raw.department === "limestone_powder" || raw.department === "general"
      ? raw.department
      : "general";
  const dept = getDepartment(deptId);

  let spec: BigBagSpec | null = null;
  if (raw.isBigBagQuestion && raw.baseSize) {
    spec = {
      category: (raw.category as BigBagSpec["category"]) ?? null,
      label: raw.category ? `Під ${raw.category}` : "Біг-бег",
      loops: raw.loops ?? null,
      liner: raw.liner ?? null,
      baseSize: raw.baseSize ?? [],
      heightCm: raw.heightCm ?? [],
      loadCapacityKg: raw.loadCapacityKg ?? null,
      top: raw.top ?? null,
      qbag: raw.qbag ?? null,
      fabricDensityGsm: null,
      notes: "",
      source: engine === "llm" ? "LLM (grounded на KB VBA)" : "LLM (без бази знань)",
    };
  }
  const bad = spec ? outOfCatalog(spec) : [];

  return {
    advice: {
      routedTo: dept,
      spec,
      flags: { lowConfidence: !raw.isBigBagQuestion && deptId === "general", outOfCatalog: bad },
      draft: buildDraft({ dept: dept.name, spec, lowConfidence: false, lang: query.lang ?? "uk" }),
      engine,
      debug: { raw },
    },
  };
}

export async function adviseLlm(query: AdviceQuery): Promise<{ advice: Advice; usage: LlmUsage }> {
  const { raw, usage } = await callOpenRouter(groundedSystem(), query.text);
  return { ...toAdvice(raw, query, "llm"), usage };
}

export async function adviseLlmNoGround(query: AdviceQuery): Promise<{ advice: Advice; usage: LlmUsage }> {
  const { raw, usage } = await callOpenRouter(noGroundSystem(), query.text);
  return { ...toAdvice(raw, query, "llm-no-ground"), usage };
}
