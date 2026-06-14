"use client";

import { useEffect, useState } from "react";
import type { Advice } from "@/core/types";

const EXAMPLES = [
  "Потрібні біг-беги під соняшник, тонна, возитимемо вагонами",
  "биг беги под нитроаммофоску с вкладышем",
  "Вапняк фракції 0-3 мм для комбікорму",
  "беги під пелети, хочемо вищі",
  "Потрібен біг-бег під зерно на 3 тонни",
];

// Пояснення, чому LLM вимкнено в публічній демці — щоб було ясно, що це
// навмисно, а не помилка.
const LLM_DEMO_NOTE =
  "У публічній демці LLM вимкнено навмисно — він потребує платного API-ключа. " +
  "Тут увімкнено безкоштовні режими «правила» і «ML» (вони ж найточніші в маршрутизації). " +
  "Що саме додає LLM і де він виграє — показано у відтворюваному бенчмарку в README. " +
  "Локально вмикається одним рядком у .env.";

const telHref = (p: string) => "tel:" + p.replace(/[^\d+]/g, "");

export default function AdviceForm({ variant }: { variant: "desk" | "widget" }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [usage, setUsage] = useState<{ costUsd: number; latencyMs: number; model: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  function copyDraft() {
    if (!advice) return;
    navigator.clipboard
      ?.writeText(advice.draft)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  // Дізнаємось, чи доступний LLM-режим (чи заданий ключ на сервері).
  useEffect(() => {
    fetch("/api/advise")
      .then((r) => r.json())
      .then((d) => setLlmAvailable(!!d.llmAvailable))
      .catch(() => setLlmAvailable(false));
  }, []);

  async function run(engine: "rules" | "ml" | "llm") {
    if (!text.trim()) return;
    // LLM вимкнено в демці — показуємо дружнє пояснення замість запиту, що впаде.
    if (engine === "llm" && llmAvailable === false) {
      setErr(null);
      setAdvice(null);
      setInfo(LLM_DEMO_NOTE);
      return;
    }
    setLoading(true);
    setErr(null);
    setInfo(null);
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

  const llmOff = variant === "desk" && llmAvailable === false;

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
        <button onClick={() => run("rules")} disabled={loading || !text.trim()}>
          {loading ? "…" : variant === "desk" ? "Підібрати (правила)" : "Підібрати біг-бег"}
        </button>
        {variant === "desk" && (
          <>
            <button className="ghost" onClick={() => run("ml")} disabled={loading || !text.trim()}>
              Через ML
            </button>
            <button
              className="ghost"
              onClick={() => run("llm")}
              disabled={loading || !text.trim()}
              title={llmOff ? "У демці LLM вимкнено навмисно (потрібен платний ключ)" : undefined}
            >
              Через LLM {llmOff && <span className="tag">демо</span>}
            </button>
          </>
        )}
      </div>

      {llmOff && (
        <p className="hint">
          ℹ️ Це публічна демка: <b>LLM вимкнено навмисно</b> (потребує платного ключа). Режими
          «правила» і «ML» — повноцінні. Як працює LLM-шар — у бенчмарку в{" "}
          <a href="https://github.com/Volodymyr4K/bigbag-advisor#виміряні-результати">README</a>.
        </p>
      )}

      {info && <div className="card info">ℹ️ {info}</div>}
      {err && <div className="card err">⚠️ {err}</div>}

      {advice && (
        <div className="card">
          <span className="badge">Відділ: {advice.routedTo.name}</span>
          {variant === "desk" && <> <span className="badge">engine: {advice.engine}</span></>}
          {variant === "desk" && (
            <div className="sub" style={{ marginTop: 8 }}>
              <a href={telHref(advice.routedTo.phone)}>{advice.routedTo.phone}</a>
              {" · "}
              <a href={`mailto:${advice.routedTo.email}`}>{advice.routedTo.email}</a>
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
              {variant === "desk" && advice.spec.source && (
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

          {variant === "desk" && (
            <div className="row" style={{ marginTop: 10 }}>
              <button className="ghost" onClick={copyDraft}>
                {copied ? "Скопійовано ✓" : "Скопіювати чернетку"}
              </button>
            </div>
          )}

          {variant === "widget" && (
            <div className="cta">
              <b>Готові замовити чи дізнатися ціну?</b>
              <div className="cta-row">
                Зв'яжіться з відділом «{advice.routedTo.name}»:{" "}
                <a href={telHref(advice.routedTo.phone)}>{advice.routedTo.phone}</a>
                {" · "}
                <a href={`mailto:${advice.routedTo.email}`}>{advice.routedTo.email}</a>
              </div>
            </div>
          )}

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
