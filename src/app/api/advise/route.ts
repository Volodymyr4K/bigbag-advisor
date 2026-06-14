import { NextResponse } from "next/server";
import { adviseRules } from "@/core/rules";
import { adviseMl } from "@/core/ml";
import { adviseLlm, hasApiKey } from "@/core/llm";
import { logMiss } from "@/core/misslog";
import type { Advice, AdviceQuery } from "@/core/types";

// POST /api/advise
// body: { text, lang?, engine?: "rules" | "ml" | "llm" }
// За замовчуванням — rules (безкоштовно, миттєво). engine:"llm" вимагає ключа.
export async function POST(req: Request) {
  let body: AdviceQuery & { engine?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невірний JSON" }, { status: 400 });
  }
  if (!body.text || !body.text.trim()) {
    return NextResponse.json({ error: "Порожній запит" }, { status: 400 });
  }

  const useLlm = body.engine === "llm";
  if (useLlm && !hasApiKey()) {
    return NextResponse.json(
      {
        error:
          "LLM у цій демці вимкнено навмисно (потребує платного API-ключа). " +
          "Доступні режими «правила» і «ML». Це не помилка — так задумано для публічного демо.",
      },
      { status: 503 },
    );
  }

  try {
    const q = { text: body.text, lang: body.lang };
    let advice: Advice;
    let usage;
    if (useLlm) {
      const r = await adviseLlm(q);
      advice = r.advice;
      usage = r.usage;
    } else if (body.engine === "ml") {
      advice = adviseMl(q);
    } else {
      advice = adviseRules(q);
    }
    // Flywheel: тихо логуємо запити, де система не дала впевненої спец.
    await logMiss(q, advice);
    return NextResponse.json(usage ? { advice, usage } : { advice });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, llmAvailable: hasApiKey() });
}
