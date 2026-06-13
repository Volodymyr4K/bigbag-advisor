// Спільні типи для ядра. Без залежностей від Next/React — щоб і веб, і CLI-бенч
// імпортували одне й те саме ядро.

export type DepartmentId = "bigbag" | "limestone_powder" | "general";

export type ProductCategory =
  | "fertilizer"
  | "grain"
  | "oilcake"
  | "biofuel"
  | "feed"
  | "quarry";

export type TransportMode = "rail" | "truck" | "unknown";

// Що користувач (менеджер або клієнт) хоче запакувати.
export interface AdviceQuery {
  // Вільний текст запиту, як його пише людина.
  text: string;
  // Опційні структуровані поля (якщо UI зібрав їх формою).
  product?: ProductCategory;
  weightKg?: number;
  transport?: TransportMode;
  lang?: "uk" | "ru" | "en";
}

// Рекомендована специфікація біг-бега.
export interface BigBagSpec {
  category: ProductCategory | null;
  label: string;
  loops: number | null;
  liner: string | null;
  baseSize: string[]; // напр. ["90x90"]
  heightCm: number[]; // напр. [150, 160]
  loadCapacityKg: number | null;
  top: string | null;
  qbag: boolean | null;
  fabricDensityGsm: [number, number] | null;
  notes: string;
  source: string; // сторінка-джерело на сайті VBA
}

export interface Department {
  id: DepartmentId;
  name: string;
  phone: string;
  email: string;
  note: string;
}

// Повна відповідь радника.
export interface Advice {
  // Який це продукт-напрям (для роутингу): біг-бег / вапняк-порошок / інше.
  routedTo: Department;
  // Чи це взагалі питання про підбір біг-бега (тоді є spec).
  spec: BigBagSpec | null;
  // Прапорці, що пояснюють відповідь людині.
  flags: {
    // Запит занадто розпливчастий — нічого не розпізнали.
    lowConfidence: boolean;
    // Параметр поза каталогом VBA (галюцинація). Список проблемних значень.
    outOfCatalog: string[];
  };
  // Готовий чернетковий текст відповіді клієнту.
  draft: string;
  // Звідки взялась рекомендація: "rules" | "llm" | "llm-no-ground".
  engine: string;
  // Діагностика для eval (необов'язкова в UI).
  debug?: Record<string, unknown>;
}
