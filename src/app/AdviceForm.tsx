"use client";

import { useState } from "react";
import type { Advice } from "@/core/types";

const EXAMPLES = [
  "Потрібні біг-беги під соняшник, тонна, возитимемо вагонами",
  "биг беги под нитроаммофоску с вкладышем",
  "Вапняк фракції 0-3 мм для комбікорму",
  "беги під пелети, хочемо вищі",
  "Потрібен біг-бег під зерно на 3 тонни",
];

export default function AdviceForm({ variant }: { variant: "desk" | "widget" }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [usage, setUsage] = useState<{ costUsd: number; latencyMs: number; model: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(engine: "rules" | "ml" | "llm") {
    if (!text.trim()) return;
    setLoading(true);
    setErr(null);
    setAdvice(null);
    setUsage(null);
    try {
      const res = await fetch("/api/advise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, engine, lang: "uk" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Помилка");
      } else {
        setAdvice(data.advice);
        setUsage(data.usage ?? null);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <textarea
        placeholder="Напишіть, що плануєте пакувати або придбати… напр. «беги під зерно, тонна, вагонами»"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="chips">
        {EXAMPLES.map((ex) => (
          <small key={ex} onClick={() => setText(ex)}>
            {ex.length > 42 ? ex.slice(0, 42) + "…" : ex}
          </small>
        ))}
      </div>
      <div className="row">
        <button onClick={() => run("rules")} disabled={loading}>
          {loading ? "…" : "Підібрати (правила)"}
        </button>
        {variant === "desk" && (
          <>
            <button className="ghost" onClick={() => run("ml")} disabled={loading}>
              Через ML
            </button>
            <button className="ghost" onClick={() => run("llm")} disabled={loading}>
              Через LLM
            </button>
          </>
        )}
      </div>

      {err && <div className="card err">⚠️ {err}</div>}

      {advice && (
        <div className="card">
          <span className="badge">Відділ: {advice.routedTo.name}</span>{" "}
          <span className="badge">engine: {advice.engine}</span>
          {variant === "desk" && (
            <div className="sub" style={{ marginTop: 8 }}>
              {advice.routedTo.phone} · {advice.routedTo.email}
            </div>
          )}

          {advice.spec ? (
            <ul className="spec">
              <li><b>Тип вантажу</b>{advice.spec.label}</li>
              <li><b>Розмір дна, см</b>{advice.spec.baseSize.join(" або ")}</li>
              <li><b>Висота, см</b>{advice.spec.heightCm.join("–")}</li>
              <li><b>Стропи / петлі</b>{advice.spec.loops}</li>
              <li><b>Верх</b>{advice.spec.top}</li>
              <li><b>Вкладиш</b>{advice.spec.liner}</li>
              <li><b>Вантажопідйомність</b>~{advice.spec.loadCapacityKg} кг</li>
              <li><b>Q-бег</b>{advice.spec.qbag ? "доцільний (штабелювання)" : "не обов'язковий"}</li>
              {advice.spec.source && (
                <li><b>Джерело</b><span className="sub">{advice.spec.source}</span></li>
              )}
            </ul>
          ) : (
            <p className="sub" style={{ marginTop: 12 }}>
              Це не запит на підбір біг-бега — передаємо у відділ.
            </p>
          )}

          {advice.flags.outOfCatalog.length > 0 && (
            <div className="err">
              Поза каталогом VBA: {advice.flags.outOfCatalog.join(", ")}
            </div>
          )}

          <div className="draft">{advice.draft}</div>

          {usage && (
            <div className="sub" style={{ marginTop: 10 }}>
              LLM {usage.model}: {usage.latencyMs}ms · ${usage.costUsd.toFixed(5)} / запит
            </div>
          )}
        </div>
      )}
    </div>
  );
}
