// FLYWHEEL ЗБОРУ ДАНИХ.
//
// Власна знахідка проєкту: класичний ML голодний, бо в бізнесу НЕМА розміченого
// корпусу звернень. Логічна відповідь — почати його збирати: щоразу, коли система
// НЕ змогла впевнено допомогти (низька впевненість або відділ «загальний»),
// записуємо запит. З часом це стає реальним датасетом для ML/донавчання.
//
// ЧЕСНО про обмеження: це запис у локальний файл (`data/miss-log.jsonl`). На
// serverless (Vercel) ФС ефемерна/read-only — там це треба замінити на БД чи
// об'єктне сховище. Тому помилка запису НЕ валить запит (best-effort).

import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Advice, AdviceQuery } from "./types";

const LOG_PATH = join(process.cwd(), "data", "miss-log.jsonl");

export interface MissEntry {
  ts: string;
  text: string;
  lang?: string;
  engine: string;
  routedTo: string;
  predictedCategory: string | null;
  reason: "low_confidence" | "general_fallback";
}

// Чи варто логувати цей результат як «промах» (система не дала впевненої спец).
export function isMiss(a: Advice): boolean {
  return a.flags.lowConfidence || a.routedTo.id === "general";
}

export async function logMiss(query: AdviceQuery, a: Advice): Promise<void> {
  if (!isMiss(a)) return;
  const entry: MissEntry = {
    ts: new Date().toISOString(),
    text: query.text,
    lang: query.lang,
    engine: a.engine,
    routedTo: a.routedTo.id,
    predictedCategory: a.spec?.category ?? null,
    reason: a.flags.lowConfidence ? "low_confidence" : "general_fallback",
  };
  try {
    await appendFile(LOG_PATH, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // best-effort: на read-only ФС просто мовчки пропускаємо.
  }
}

// Для адмін-перегляду: останні N записів + лічильник.
export async function readMisses(limit = 50): Promise<{ total: number; recent: MissEntry[] }> {
  try {
    const raw = await readFile(LOG_PATH, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const recent = lines.slice(-limit).map((l) => JSON.parse(l) as MissEntry).reverse();
    return { total: lines.length, recent };
  } catch {
    return { total: 0, recent: [] };
  }
}
