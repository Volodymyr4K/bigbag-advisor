// Розмічений датасет запитів. Мова — як реально пишуть клієнти/менеджери VBA:
// UA/RU/EN, з помилками, скорочено, інколи розпливчасто.
//
// «Правильна відповідь» = те, що VBA САМ пише на своєму сайті (product/big-bag,
// contacts). Ми нічого не вигадуємо — лише формалізуємо їхні ж рекомендації.
//
// Призначення пасток (trap): перевірити, чи система не вигадує специфікацію
// там, де її нема (вапняк, незрозумілий запит, нереальна вантажопідйомність).

import type { DepartmentId, ProductCategory } from "../core/types";

export interface Case {
  id: string;
  text: string;
  lang: "uk" | "ru" | "en";
  expectedDept: DepartmentId;
  // null = це не питання про підбір біг-бега.
  expectedCategory: ProductCategory | null;
  // Контрольні поля специфікації (де VBA дає однозначно). undefined = не перевіряємо.
  expectLoops?: number;
  expectLiner?: "так" | "ні" | "за бажанням";
  note?: string;
}

export const DATASET: Case[] = [
  // --- Зерно / насіння ------------------------------------------------------
  { id: "grain-1", lang: "uk", text: "Потрібні біг-беги під соняшник, тонна, возитимемо вагонами", expectedDept: "bigbag", expectedCategory: "grain", expectLoops: 4, expectLiner: "ні" },
  { id: "grain-2", lang: "uk", text: "Скільки коштує мішок під пшеницю на 1т?", expectedDept: "bigbag", expectedCategory: "grain", expectLoops: 4 },
  { id: "grain-3", lang: "ru", text: "Нужны биг-бэги под зерно, кукуруза, перевозка авто", expectedDept: "bigbag", expectedCategory: "grain", expectLiner: "ні" },
  { id: "grain-4", lang: "en", text: "Do you have big bags for grain? About 1 ton, soybeans", expectedDept: "bigbag", expectedCategory: "grain" },
  { id: "grain-5", lang: "uk", text: "беги під ячмінь, треба щоб штабелювати на складі", expectedDept: "bigbag", expectedCategory: "grain", note: "натяк на Q-бег" },

  // --- Добрива --------------------------------------------------------------
  { id: "fert-1", lang: "uk", text: "Шукаю тару під селітру, 1 тонна", expectedDept: "bigbag", expectedCategory: "fertilizer", expectLoops: 2, expectLiner: "так" },
  { id: "fert-2", lang: "ru", text: "биг беги под нитроаммофоску с вкладышем", expectedDept: "bigbag", expectedCategory: "fertilizer", expectLiner: "так" },
  { id: "fert-3", lang: "uk", text: "потрібні мішки під мінеральні добрива", expectedDept: "bigbag", expectedCategory: "fertilizer" },
  { id: "fert-4", lang: "en", text: "big bags for fertilizer, 500 kg, EU standard", expectedDept: "bigbag", expectedCategory: "fertilizer" },

  // --- Макуха / жмих --------------------------------------------------------
  { id: "oil-1", lang: "uk", text: "Беги під соняшниковий жмих, 90х90", expectedDept: "bigbag", expectedCategory: "oilcake", expectLiner: "так" },
  { id: "oil-2", lang: "ru", text: "нужна тара под соевый шрот", expectedDept: "bigbag", expectedCategory: "oilcake" },
  { id: "oil-3", lang: "uk", text: "макуха, тонна, возимо вагонами на експорт", expectedDept: "bigbag", expectedCategory: "oilcake", expectLiner: "так" },

  // --- Біопаливо ------------------------------------------------------------
  { id: "bio-1", lang: "uk", text: "біг-беги під пелети, хочемо вищі, на 240см", expectedDept: "bigbag", expectedCategory: "biofuel" },
  { id: "bio-2", lang: "ru", text: "биг бэги для брикетов и опилок", expectedDept: "bigbag", expectedCategory: "biofuel" },
  { id: "bio-3", lang: "en", text: "FIBC bags for wood pellets, 1 ton", expectedDept: "bigbag", expectedCategory: "biofuel" },

  // --- Комбікорм ------------------------------------------------------------
  { id: "feed-1", lang: "uk", text: "потрібні беги під комбікорм для птиці", expectedDept: "bigbag", expectedCategory: "feed", expectLoops: 4 },
  { id: "feed-2", lang: "ru", text: "тара под комбикорм, нужен клапан снизу", expectedDept: "bigbag", expectedCategory: "feed" },

  // --- Кар'єр ---------------------------------------------------------------
  { id: "quarry-1", lang: "uk", text: "біг-беги під щебінь, кар'єр, возимо вагонами", expectedDept: "bigbag", expectedCategory: "quarry", expectLoops: 2, expectLiner: "так" },
  { id: "quarry-2", lang: "ru", text: "биг беги под гранитный отсев", expectedDept: "bigbag", expectedCategory: "quarry" },
  { id: "quarry-3", lang: "uk", text: "тара під пісок, 1 т, 2 петлі", expectedDept: "bigbag", expectedCategory: "quarry", expectLoops: 2 },

  // --- Лайнер / вкладиш у вагон (теж відділ біг-бегів) -----------------------
  { id: "liner-1", lang: "uk", text: "цікавлять лайнер-беги в морський контейнер 40 футів", expectedDept: "bigbag", expectedCategory: null },
  { id: "liner-2", lang: "ru", text: "нужен вкладыш в полувагон", expectedDept: "bigbag", expectedCategory: null },

  // --- Вапняк / мін.порошок (інший відділ, НЕ біг-бег) -----------------------
  { id: "lime-1", lang: "uk", text: "Потрібен вапняк фракції 0-3 мм для комбікорму", expectedDept: "limestone_powder", expectedCategory: null },
  { id: "lime-2", lang: "ru", text: "известняк для раскисления почвы, какие фракции есть?", expectedDept: "limestone_powder", expectedCategory: null },
  { id: "lime-3", lang: "uk", text: "ціна на вапняк для металургії, фракція 40-80", expectedDept: "limestone_powder", expectedCategory: null },
  { id: "lime-4", lang: "uk", text: "вапняк для преміксів, потрібен сертифікат якості", expectedDept: "limestone_powder", expectedCategory: null },
  { id: "pow-1", lang: "uk", text: "мінеральний порошок МП-1 для асфальту", expectedDept: "limestone_powder", expectedCategory: null },
  { id: "pow-2", lang: "ru", text: "минеральный порошок для бетонных смесей, оптом", expectedDept: "limestone_powder", expectedCategory: null },

  // --- Пастки: розпливчасте / не наш профіль / провокація галюцинації --------
  { id: "trap-vague", lang: "uk", text: "Доброго дня, маєте щось для нас?", expectedDept: "general", expectedCategory: null, note: "занадто розпливчасто — не вигадувати spec" },
  { id: "trap-partner", lang: "uk", text: "Хочемо стати вашим дилером, з ким говорити?", expectedDept: "general", expectedCategory: null },
  { id: "trap-offtopic", lang: "uk", text: "А ви шлакоблок продаєте?", expectedDept: "general", expectedCategory: null, note: "колись робили, зараз нема в продукції — fallback" },
  { id: "trap-overload", lang: "uk", text: "Потрібен біг-бег під зерно на 3 тонни", expectedDept: "bigbag", expectedCategory: "grain", note: "3т > каталог (макс 2000кг) — не підтверджувати нереальне" },
  { id: "trap-mixed", lang: "uk", text: "беги під добрива і ще питання по вапняку для ґрунту", expectedDept: "bigbag", expectedCategory: "fertilizer", note: "є біг-бег → відділ біг-бегів" },
];
