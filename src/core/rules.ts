// RULES-BASELINE. Жодного LLM, жодного API. Прості детерміновані правила:
// ключові слова -> категорія продукту, відділ, специфікація.
//
// Це навмисно «тупий» baseline. Уся суть проєкту — виміряти, наскільки LLM
// реально б'є оце. Якщо не б'є — лишаємо це й документуємо (анти-хайп).

import { KB, getDepartment, bigbagRule, outOfCatalog } from "./kb";
import type {
  Advice,
  AdviceQuery,
  BigBagSpec,
  DepartmentId,
  ProductCategory,
  TransportMode,
} from "./types";

// Порядок важливий: перший збіг виграє. oilcake ПЕРЕД grain, бо
// «соняшниковий жмих» (oilcake) інакше хибно ловиться на «соняшник» (grain).
const BIGBAG_CATEGORIES: ProductCategory[] = [
  "fertilizer",
  "oilcake",
  "biofuel",
  "feed",
  "quarry",
  "grain",
];

// Слова, що сигналізують про пакувальну/тарну продукцію (відділ біг-бегів).
// Включно з розмовними RU/UA формами: «беги», «бэги», «мешки», «вкладыш».
// Примітка: \b у JS-регексі не працює з кирилицею (Cyrillic = не-\w), тому
// межі слова не використовуємо. «бег[аиі]»/«бэг» у цьому домені практично не
// трапляються всередині інших слів, тож хибних спрацювань не дають.
const BAG_RE =
  /біг-?бег|бэг|бег[аиі]|big[\s-]?bags?|fibc|лайнер|liner|вкладиш|вкладыш|тар[аи]|упаковк|мішк|мешк|пакуванн/i;

// --- 1. Маршрутизація у відділ ----------------------------------------------

const LIMESTONE_KW = [
  "вапняк", "вапняк", "известняк", "вапнякова мука", "мінеральн", "минеральн",
  "мп-1", "мп-2", "мп1", "мп2", "порошок", "розкисл", "раскисл", "вапнуванн",
  "фракці", "фракци", "премікс", "гост 8043", "доломіт", "limestone", "mineral powder",
];

const PARTNERSHIP_KW = ["партнер", "співпрац", "реклам", "вакансі", "partnership", "cooperat"];

export function routeDepartment(text: string): DepartmentId {
  const t = text.toLowerCase();
  // Спершу вапняк/порошок — бо «біг-бег для вапняку» все одно про пакування,
  // але чисте питання про фракцію вапняку має йти у профільний відділ.
  const mentionsBag = BAG_RE.test(text);
  const mentionsLimestone = LIMESTONE_KW.some((k) => t.includes(k));

  if (mentionsLimestone && !mentionsBag) return "limestone_powder";
  if (mentionsBag) return "bigbag";
  // Запит на пакування сипучого (зерно/добрива тощо) без слова «біг-бег» —
  // це теж відділ біг-бегів, бо ми радимо тару.
  if (classifyProduct(text)) return "bigbag";
  if (mentionsLimestone) return "limestone_powder";
  if (PARTNERSHIP_KW.some((k) => t.includes(k))) return "general";
  return "general";
}

// --- 2. Класифікація типу вантажу -------------------------------------------

export function classifyProduct(text: string): ProductCategory | null {
  const t = text.toLowerCase();
  // Перебираємо у фіксованому порядку; перший збіг виграє.
  for (const cat of BIGBAG_CATEGORIES) {
    const rule = bigbagRule(cat);
    if (rule.match.some((kw) => t.includes(kw.toLowerCase()))) return cat;
  }
  return null;
}

// --- 3. Парсинг ваги і транспорту з вільного тексту -------------------------

export function parseWeightKg(text: string): number | null {
  const t = text.toLowerCase();
  // «1 т», «1.5 тонни», «1000 кг», «500кг».
  // \b не використовуємо — він не працює з кирилицею; натомість негативний
  // lookahead, щоб «т» не ловилось усередині слів («товар», «тиждень»).
  const tonne = t.match(/(\d+(?:[.,]\d+)?)\s*(?:тонн[аи]?|тон|т|tonnes?|tons?|t)(?![а-яіїєґa-z])/);
  if (tonne) return Math.round(parseFloat(tonne[1].replace(",", ".")) * 1000);
  const kg = t.match(/(\d{3,4})\s*(?:кг|kg)/);
  if (kg) return parseInt(kg[1], 10);
  return null;
}

export function parseTransport(text: string): TransportMode {
  const t = text.toLowerCase();
  if (/вагон|залізн|залізниц|з\/д|рейк|rail|wagon|поїзд|потяг/.test(t)) return "rail";
  if (/авто|вантажівк|фур|truck|машин|автотранспорт/.test(t)) return "truck";
  return "unknown";
}

// --- 4. Специфікація біг-бега -----------------------------------------------

export function recommendSpec(cat: ProductCategory, transport: TransportMode): BigBagSpec {
  const r = bigbagRule(cat);
  const density = transport === "rail" ? ([160, 200] as [number, number])
    : transport === "truck" ? ([110, 160] as [number, number])
    : (KB.transport_hint.default_density_gsm as [number, number]);

  return {
    category: cat,
    label: r.label,
    loops: r.loops,
    liner: r.liner,
    baseSize: r.base_size,
    heightCm: r.height_cm,
    loadCapacityKg: r.load_capacity_kg,
    top: r.top,
    qbag: r.qbag,
    fabricDensityGsm: density,
    notes: r.notes,
    source: r.source,
  };
}

// --- 5. Повна порада (rules engine) -----------------------------------------

export function adviseRules(query: AdviceQuery): Advice {
  const text = query.text;
  const deptId = routeDepartment(text);
  const dept = getDepartment(deptId);
  const cat = query.product ?? classifyProduct(text);
  const transport = query.transport ?? parseTransport(text);

  let spec: BigBagSpec | null = null;
  if (deptId === "bigbag" && cat) {
    spec = recommendSpec(cat, transport);
  }

  const lowConfidence = deptId === "general" && !cat;
  const bad = spec ? outOfCatalog(spec) : [];

  // Захист від нереальної заявки: VBA шиє до 2000 кг. Не підтверджуємо більше —
  // чесно кажемо, що це поза каталогом, замість «так, зробимо».
  const weightKg = query.weightKg ?? parseWeightKg(text);
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
    engine: "rules",
    debug: { deptId, cat, transport, weightKg, overCapacity },
  };
}

// --- Чернетка відповіді клієнту ---------------------------------------------

export function buildDraft(args: {
  dept: string;
  spec: BigBagSpec | null;
  lowConfidence: boolean;
  lang: "uk" | "ru" | "en";
}): string {
  const { dept, spec, lowConfidence } = args;
  if (lowConfidence) {
    return `Дякуємо за звернення! Щоб підібрати рішення, уточніть, будь ласка, що саме плануєте пакувати/придбати. Передаю ваш запит у ${dept}.`;
  }
  if (!spec) {
    return `Дякуємо за звернення! Передаю ваш запит у ${dept} — менеджер зв'яжеться з вами щодо умов, цін і доставки.`;
  }
  const size = spec.baseSize.join(" або ");
  const h = spec.heightCm.join("–");
  const liner = spec.liner === "так" ? "з ПЕ вкладишем"
    : spec.liner === "за бажанням" ? "вкладиш — за бажанням" : "без вкладиша";
  const q = spec.qbag ? " За потреби штабелювання — розгляньте Q-бег (тримає форму куба)." : "";
  return [
    `Дякуємо за звернення!`,
    `Для вашого вантажу (${spec.label.toLowerCase()}) типово підходить біг-бег:`,
    `• основа ${size} см, висота ${h} см;`,
    `• ${spec.loops} стропи/петлі, верх — ${spec.top}, ${liner};`,
    `• вантажопідйомність ~${spec.loadCapacityKg} кг.${q}`,
    `Точні розміри шиємо під замовлення. Ціну та терміни підкаже ${dept}.`,
  ].join("\n");
}
