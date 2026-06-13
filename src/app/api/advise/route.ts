import { NextResponse } from "next/server";
import { adviseRules } from "@/core/rules";
import { adviseMl } from "@/core/ml";
import { adviseLlm, hasApiKey } from "@/core/llm";
import type { AdviceQuery } from "@/core/types";

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
      { error: "LLM-режим недоступний: не заданий OPENROUTER_API_KEY. Працює rules-режим." },
      { status: 503 },
    );
  }

  try {
    if (useLlm) {
      const { advice, usage } = await adviseLlm({ text: body.text, lang: body.lang });
      return NextResponse.json({ advice, usage });
    }
    if (body.engine === "ml") {
      return NextResponse.json({ advice: adviseMl({ text: body.text, lang: body.lang }) });
    }
    const advice = adviseRules({ text: body.text, lang: body.lang });
    return NextResponse.json({ advice });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, llmAvailable: hasApiKey() });
}
