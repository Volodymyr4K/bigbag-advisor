// Класичний ML, чистий TypeScript, без Python/залежностей.
// Multinomial Naive Bayes на СИМВОЛЬНИХ n-грамах (3–5).
//
// Чому char n-грами, а не слова: українська/російська — сильно флективні
// (відмінки, рід, число). Пословний bag-of-words без стемінгу розсипається на
// «беги/бегів/бегами». Символьні n-грами ловлять корінь («бег») незалежно від
// закінчення — і не треба тягнути морфоаналізатор.
//
// Це навмисно простий, прозорий, відтворюваний baseline між «правилами» і LLM.

export interface Sample {
  text: string;
  label: string;
}

export interface Prediction {
  label: string;
  confidence: number; // 0..1, нормалізована апостеріорна ймовірність топ-класу
  scores: Record<string, number>; // log-оцінки по класах
}

function charNgrams(text: string, nMin = 3, nMax = 5): string[] {
  // Нормалізуємо: нижній регістр, схлопуємо пробіли, прибираємо рідкісний шум.
  const s = ` ${text.toLowerCase().replace(/\s+/g, " ").trim()} `;
  const grams: string[] = [];
  for (let n = nMin; n <= nMax; n++) {
    for (let i = 0; i + n <= s.length; i++) grams.push(s.slice(i, i + n));
  }
  return grams;
}

export class NaiveBayes {
  private classDocCount = new Map<string, number>();
  private classTokenTotal = new Map<string, number>();
  private featCount = new Map<string, Map<string, number>>(); // label -> gram -> count
  private vocab = new Set<string>();
  private docTotal = 0;

  train(samples: Sample[]): void {
    for (const { text, label } of samples) {
      this.classDocCount.set(label, (this.classDocCount.get(label) ?? 0) + 1);
      this.docTotal++;
      if (!this.featCount.has(label)) this.featCount.set(label, new Map());
      const fc = this.featCount.get(label)!;
      for (const g of charNgrams(text)) {
        fc.set(g, (fc.get(g) ?? 0) + 1);
        this.vocab.add(g);
        this.classTokenTotal.set(label, (this.classTokenTotal.get(label) ?? 0) + 1);
      }
    }
  }

  get labels(): string[] {
    return [...this.classDocCount.keys()];
  }

  predict(text: string): Prediction {
    const grams = charNgrams(text);
    const V = this.vocab.size;
    const scores: Record<string, number> = {};

    for (const label of this.classDocCount.keys()) {
      const prior = Math.log((this.classDocCount.get(label) ?? 0) / this.docTotal);
      const fc = this.featCount.get(label)!;
      const total = this.classTokenTotal.get(label) ?? 0;
      let logp = prior;
      for (const g of grams) {
        // add-1 (Laplace) згладжування
        const count = fc.get(g) ?? 0;
        logp += Math.log((count + 1) / (total + V));
      }
      scores[label] = logp;
    }

    // softmax для людино-зрозумілої впевненості
    const entries = Object.entries(scores);
    const maxLog = Math.max(...entries.map(([, v]) => v));
    let denom = 0;
    for (const [, v] of entries) denom += Math.exp(v - maxLog);
    let best = entries[0];
    for (const e of entries) if (e[1] > best[1]) best = e;
    const confidence = Math.exp(best[1] - maxLog) / denom;

    return { label: best[0], confidence, scores };
  }
}
