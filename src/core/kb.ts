// Завантаження бази знань (data/knowledge-base.json) + хелпери валідації
// специфікації проти каталогу VBA. Каталог = «що VBA реально заявляє».
// Усе поза каталогом вважаємо галюцинацією.

import kbJson from "../../data/knowledge-base.json";
import type { BigBagSpec, Department, DepartmentId, ProductCategory } from "./types";

export const KB = kbJson as typeof kbJson;

export function getDepartment(id: DepartmentId): Department {
  const d = KB.departments[id];
  return { id, name: d.name, phone: d.phone, email: d.email, note: d.note };
}

export function bigbagRule(cat: ProductCategory) {
  return KB.bigbag_rules[cat];
}

// Перевірка специфікації на «вихід за каталог». Повертає список значень,
// яких VBA не заявляє. Порожній список = специфікація валідна.
// Детерміновано, без LLM — це наш детектор галюцинацій.
export function outOfCatalog(spec: Partial<BigBagSpec>): string[] {
  const c = KB.catalog;
  const bad: string[] = [];

  if (spec.baseSize) {
    for (const s of spec.baseSize) {
      if (!c.base_sizes_cm.includes(normalizeSize(s))) bad.push(`розмір дна «${s}»`);
    }
  }
  if (spec.loops != null && !c.loops.includes(spec.loops)) {
    bad.push(`${spec.loops} петель`);
  }
  if (spec.loadCapacityKg != null) {
    if (spec.loadCapacityKg < c.load_capacity_kg.min || spec.loadCapacityKg > c.load_capacity_kg.max) {
      bad.push(`вантажопідйомність ${spec.loadCapacityKg} кг`);
    }
  }
  if (spec.fabricDensityGsm) {
    const [lo, hi] = spec.fabricDensityGsm;
    if (lo < c.fabric_density_gsm.min || hi > c.fabric_density_gsm.max) {
      bad.push(`щільність ${lo}-${hi} г/м²`);
    }
  }
  if (spec.top && !c.tops.some((t) => spec.top!.includes(t))) {
    bad.push(`верх «${spec.top}»`);
  }
  return bad;
}

// "90х90", "90*90", "90 x 90" -> "90x90"
export function normalizeSize(s: string): string {
  return s
    .replace(/[х×*]/gi, "x")
    .replace(/\s+/g, "")
    .replace(/см/gi, "")
    .toLowerCase();
}
