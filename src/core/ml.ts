// ML-рушій: класичний Naive Bayes класифікує тип вантажу, далі специфікація
// береться з тієї ж бази знань VBA (KB-lookup), а вага/транспорт — тими ж
// парсерами, що й у правилах. Тобто ML замінює лише крок «текст → категорія».
//
// Чесно про дизайн: ML не передбачає розміри/стропи з повітря (це було б
// джерелом галюцинацій). Він лише класифікує; цифри — з каталогу VBA. Тому ML
// фізично не може видати spec поза каталогом — як і правила.

import { NaiveBayes } from "../ml/classifier";
import { generateTrainData } from "../ml/traindata";
import { getDepartment, outOfCatalog } from "./kb";
import { buildDraft, parseTransport, parseWeightKg, recommendSpec } from "./rules";
import { KB } from "./kb";
import type { Advice, AdviceQuery, BigBagSpec, DepartmentId, ProductCategory } from "./types";

const BIGBAG_CATS: ProductCategory[] = [
  "fertilizer", "grain", "oilcake", "biofuel", "feed", "quarry",
];

// Поріг впевненості: нижче — не наважуємось класифікувати, віддаємо в загальний.
const CONF_THRESHOLD = 0.45;

let _model: NaiveBayes | null = null;

export function getModel(): NaiveBayes {
  if (!_model) {
    _model = new NaiveBayes();
    _model.train(generateTrainData());
  }
  return _model;
}

export function adviseMl(query: AdviceQuery): Advice {
  const model = getModel();
  const pred = model.predict(query.text);

  // Зіставлення мітки моделі з відділом і категорією.
  let deptId: DepartmentId;
  let cat: ProductCategory | null = null;

  if (pred.confidence < CONF_THRESHOLD || pred.label === "none") {
    deptId = "general";
  } else if (pred.label === "limestone_powder") {
    deptId = "limestone_powder";
  } else if (BIGBAG_CATS.includes(pred.label as ProductCategory)) {
    deptId = "bigbag";
    cat = pred.label as ProductCategory;
  } else {
    deptId = "general";
  }

  const dept = getDepartment(deptId);
  const transport = query.transport ?? parseTransport(query.text);

  let spec: BigBagSpec | null = null;
  if (deptId === "bigbag" && cat) spec = recommendSpec(cat, transport);

  const lowConfidence = deptId === "general" && !cat;
  const bad = spec ? outOfCatalog(spec) : [];

  const weightKg = query.weightKg ?? parseWeightKg(query.text);
  const maxKg = KB.catalog.load_capacity_kg.max;
  const overCapacity = weightKg != null && weightKg > maxKg;

  let draft = buildDraft({ dept: dept.name, spec, lowConfidence, lang: query.lang ?? "uk" });
  if (overCapacity) {
    draft += `\n\n⚠️ Увага: ${weightKg} кг перевищує типову вантажопідйомність біг-бега (до ${maxKg} кг). Уточніть розподіл по кількох мішках у менеджера.`;
  }

  return {
    routedTo: dept,
    spec,
    flags: { lowConfidence, outOfCatalog: bad },
    draft,
    engine: "ml",
    debug: { predLabel: pred.label, confidence: Number(pred.confidence.toFixed(3)), cat, transport, weightKg, overCapacity },
  };
}
