// Тести ключової логіки. Без API, без мережі — `npm test` ганяється будь-ким.
// Запуск: node --import tsx --test src/test/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";

import { NaiveBayes } from "../ml/classifier";
import { generateTrainData } from "../ml/traindata";
import {
  classifyProduct,
  parseWeightKg,
  parseTransport,
  routeDepartment,
  recommendSpec,
  adviseRules,
} from "../core/rules";
import { adviseMl } from "../core/ml";
import { KB, outOfCatalog } from "../core/kb";
import type { ProductCategory } from "../core/types";

// --- rules: парсери ---------------------------------------------------------

test("parseWeightKg: тонни і кілограми", () => {
  assert.equal(parseWeightKg("потрібно 1 т"), 1000);
  assert.equal(parseWeightKg("1.5 тонни"), 1500);
  assert.equal(parseWeightKg("500 кг"), 500);
  assert.equal(parseWeightKg("без числа"), null);
});

test("parseTransport: вагони/авто/невідомо", () => {
  assert.equal(parseTransport("возимо вагонами"), "rail");
  assert.equal(parseTransport("доставка авто"), "truck");
  assert.equal(parseTransport("просто беги"), "unknown");
});

test("classifyProduct: соняшник=зерно, але соняшниковий жмих=макуха", () => {
  assert.equal(classifyProduct("під соняшник"), "grain");
  assert.equal(classifyProduct("соняшниковий жмих"), "oilcake");
  assert.equal(classifyProduct("нема профілю тут"), null);
});

test("routeDepartment: біг-бег / вапняк / загальний", () => {
  assert.equal(routeDepartment("беги під зерно"), "bigbag");
  assert.equal(routeDepartment("вапняк фракції 0-3"), "limestone_powder");
  assert.equal(routeDepartment("доброго дня, маєте каталог"), "general");
});

// --- kb: детектор галюцинацій ----------------------------------------------

test("outOfCatalog: валідна спец проходить, вигадані значення ловляться", () => {
  const valid = recommendSpec("grain", "rail");
  assert.deepEqual(outOfCatalog(valid), []);

  assert.ok(outOfCatalog({ baseSize: ["85x85"] }).length > 0, "85x85 нема в каталозі");
  assert.ok(outOfCatalog({ loops: 5 }).length > 0, "5 петель нема");
  assert.ok(outOfCatalog({ loadCapacityKg: 3000 }).length > 0, "3000 кг > макс");
  assert.deepEqual(outOfCatalog({ loops: 4, baseSize: ["90x90"] }), [], "валідні значення");
});

// --- ІНВАРІАНТ: жодне правило KB не дає спец поза каталогом ------------------

test("інваріант KB: усі категорії дають валідну (не-галюцинаторну) спец", () => {
  const cats = Object.keys(KB.bigbag_rules) as ProductCategory[];
  for (const cat of cats) {
    for (const transport of ["rail", "truck", "unknown"] as const) {
      const spec = recommendSpec(cat, transport);
      assert.deepEqual(
        outOfCatalog(spec),
        [],
        `категорія ${cat}/${transport} не має давати значення поза каталогом`,
      );
    }
  }
});

// --- rules: повна порада ----------------------------------------------------

test("adviseRules: зерно → відділ біг-бегів + спец, 0 галюцинацій", () => {
  const a = adviseRules({ text: "беги під соняшник, тонна, вагонами" });
  assert.equal(a.routedTo.id, "bigbag");
  assert.equal(a.spec?.category, "grain");
  assert.equal(a.flags.outOfCatalog.length, 0);
});

test("adviseRules: розпливчасте → загальний, без спец", () => {
  const a = adviseRules({ text: "доброго дня, маєте щось для нас?" });
  assert.equal(a.routedTo.id, "general");
  assert.equal(a.spec, null);
  assert.equal(a.flags.lowConfidence, true);
});

test("adviseRules: нереальна вага позначається у чернетці", () => {
  const a = adviseRules({ text: "біг-бег під зерно на 3 тонни" });
  assert.match(a.draft, /перевищує/);
});

// --- ml: класифікатор -------------------------------------------------------

test("NaiveBayes: впевненість у [0,1], відомий приклад класифікується", () => {
  const m = new NaiveBayes();
  m.train(generateTrainData());
  const p = m.predict("потрібні біг-беги під пшеницю");
  assert.ok(p.confidence >= 0 && p.confidence <= 1);
  assert.equal(p.label, "grain");
});

test("adviseMl: чистий запит про зерно → bigbag+grain; ML не галюцинує спец", () => {
  const a = adviseMl({ text: "тара під кукурудзу, тонна" });
  assert.equal(a.routedTo.id, "bigbag");
  assert.equal(a.spec?.category, "grain");
  assert.equal(a.flags.outOfCatalog.length, 0);
});
