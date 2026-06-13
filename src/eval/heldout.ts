// HELD-OUT тестовий набір. Головна мета — чесність порівняння:
//   - ці рядки НЕ використовувались для тюнінгу синонімів правил;
//   - ці рядки НЕ входять у синтетичний train ML (src/ml/traindata.ts).
//
// Навмисно домішана НЕВИДАНА лексика («ріпак», «суперфосфат», «лушпиння»,
// «гравій», «доломітове борошно»), якої нема ні в словнику правил, ні в train.
// Це показує реальну межу: правила і ML тримаються на баченій лексиці, а
// zero-shot LLM має шанс упоратись із новою. Якщо ні — напишемо це чесно.

import type { Case } from "./dataset";

export const HELDOUT: Case[] = [
  // --- знайома лексика, інше формулювання (має працювати скрізь) ------------
  { id: "h-grain-1", lang: "uk", text: "доброго дня, треба тара під пшеницю, десь тонна", expectedDept: "bigbag", expectedCategory: "grain" },
  { id: "h-fert-1", lang: "ru", text: "подскажите биг-бэг под селитру с вкладышем", expectedDept: "bigbag", expectedCategory: "fertilizer" },
  { id: "h-quarry-1", lang: "uk", text: "беги під щебінь, перевозка вагонами", expectedDept: "bigbag", expectedCategory: "quarry" },
  { id: "h-feed-1", lang: "uk", text: "потрібна тара під комбікорм", expectedDept: "bigbag", expectedCategory: "feed" },
  { id: "h-lime-1", lang: "uk", text: "ціна на вапняк фракції 2-4", expectedDept: "limestone_powder", expectedCategory: null },
  { id: "h-pow-1", lang: "ru", text: "интересует минеральный порошок для асфальта", expectedDept: "limestone_powder", expectedCategory: null },

  // --- НЕВИДАНА лексика (правила/ML, скоріш за все, спіткнуться) -------------
  { id: "h-rapeseed", lang: "uk", text: "потрібні біг-беги під ріпак, тонна", expectedDept: "bigbag", expectedCategory: "grain", note: "ріпак — нема в словнику" },
  { id: "h-oats", lang: "uk", text: "тара під овес і гречку", expectedDept: "bigbag", expectedCategory: "grain", note: "овес/гречка — нема в словнику" },
  { id: "h-superphos", lang: "uk", text: "беги під суперфосфат", expectedDept: "bigbag", expectedCategory: "fertilizer", note: "суперфосфат — нема в словнику" },
  { id: "h-ammsulf", lang: "ru", text: "нужны биг беги под сульфат аммония", expectedDept: "bigbag", expectedCategory: "fertilizer", note: "невидане" },
  { id: "h-husk", lang: "uk", text: "пакування під лушпиння соняшнику на паливо", expectedDept: "bigbag", expectedCategory: "biofuel", note: "лушпиння — нема в словнику" },
  { id: "h-gravel", lang: "uk", text: "потрібна тара під гравій", expectedDept: "bigbag", expectedCategory: "quarry", note: "гравій — нема в словнику" },
  { id: "h-dolomite", lang: "uk", text: "цікавить доломітове борошно для ґрунту", expectedDept: "limestone_powder", expectedCategory: null, note: "доломіт — частково в словнику" },
  { id: "h-chalk", lang: "uk", text: "потрібна крейда мелена, оптом", expectedDept: "limestone_powder", expectedCategory: null, note: "крейда — нема в словнику" },

  // --- мовний шум / суміш / помилки -----------------------------------------
  { id: "h-typo", lang: "uk", text: "біг бегі під зерно потрбіно терміново", expectedDept: "bigbag", expectedCategory: "grain", note: "одруківки" },
  { id: "h-en-1", lang: "en", text: "big bags for sunflower seeds, 1 ton, by rail", expectedDept: "bigbag", expectedCategory: "grain" },
  { id: "h-en-2", lang: "en", text: "do you sell limestone for soil, fraction 0-5?", expectedDept: "limestone_powder", expectedCategory: null },
  { id: "h-mixed-1", lang: "uk", text: "є питання по бегах під добрива і ще по вапняку", expectedDept: "bigbag", expectedCategory: "fertilizer", note: "змішане, біг-бег первинний" },

  // --- пастки: не вигадувати spec / не наш профіль --------------------------
  { id: "h-trap-pallet", lang: "uk", text: "чи продаєте ви палети дерев'яні?", expectedDept: "general", expectedCategory: null, note: "офтоп" },
  { id: "h-trap-job", lang: "uk", text: "хочу до вас на роботу, куди надіслати резюме?", expectedDept: "general", expectedCategory: null },
  { id: "h-trap-vague", lang: "uk", text: "вітаю, підкажіть будь ласка по продукції", expectedDept: "general", expectedCategory: null, note: "розпливчасто" },
  { id: "h-trap-delivery", lang: "uk", text: "а ви возите в Польщу?", expectedDept: "general", expectedCategory: null, note: "логістика, без продукту" },
  { id: "h-trap-overload", lang: "ru", text: "нужен биг бэг под зерно на 5 тонн", expectedDept: "bigbag", expectedCategory: "grain", note: "5т > каталог" },

  // === Розширення (друга хвиля) — більше n, менше шуму ======================

  // зерно/бобові, переважно невидана лексика
  { id: "h-millet", lang: "uk", text: "тара під просо, тонна", expectedDept: "bigbag", expectedCategory: "grain", note: "просо — невидане" },
  { id: "h-sorghum", lang: "uk", text: "біг-беги під сорго", expectedDept: "bigbag", expectedCategory: "grain", note: "сорго — невидане" },
  { id: "h-lentil", lang: "uk", text: "потрібні беги під чечевицю", expectedDept: "bigbag", expectedCategory: "grain", note: "чечевиця — невидане" },
  { id: "h-chickpea", lang: "ru", text: "биг бэги под нут", expectedDept: "bigbag", expectedCategory: "grain", note: "нут — невидане" },
  { id: "h-beans", lang: "uk", text: "пакування під квасолю", expectedDept: "bigbag", expectedCategory: "grain", note: "бобові → зерно" },

  // добрива
  { id: "h-diamm", lang: "uk", text: "беги під діамофоску", expectedDept: "bigbag", expectedCategory: "fertilizer", note: "діамофоска — невидане" },
  { id: "h-urea", lang: "ru", text: "нужны биг беги под мочевину", expectedDept: "bigbag", expectedCategory: "fertilizer", note: "мочевина — невидане" },

  // макуха/жмих
  { id: "h-rapemeal", lang: "uk", text: "беги під ріпаковий шрот", expectedDept: "bigbag", expectedCategory: "oilcake" },
  { id: "h-rapecake", lang: "uk", text: "макуха ріпакова, тонна", expectedDept: "bigbag", expectedCategory: "oilcake" },

  // біопаливо
  { id: "h-agripellet", lang: "uk", text: "потрібні беги під агропелети", expectedDept: "bigbag", expectedCategory: "biofuel" },
  { id: "h-peat", lang: "ru", text: "тара под торфобрикеты", expectedDept: "bigbag", expectedCategory: "biofuel" },

  // комбікорм
  { id: "h-fishfeed", lang: "uk", text: "беги під корм для риби", expectedDept: "bigbag", expectedCategory: "feed" },

  // кар'єр
  { id: "h-keramzit", lang: "uk", text: "тара під керамзит", expectedDept: "bigbag", expectedCategory: "quarry", note: "керамзит — невидане" },
  { id: "h-butstone", lang: "uk", text: "біг-беги під бутовий камінь", expectedDept: "bigbag", expectedCategory: "quarry" },

  // вапняк/порошок
  { id: "h-mp2", lang: "ru", text: "интересует минеральный порошок МП-2", expectedDept: "limestone_powder", expectedCategory: null },
  { id: "h-finelime", lang: "uk", text: "потрібен тонкомелений вапняк", expectedDept: "limestone_powder", expectedCategory: null },

  // EN
  { id: "h-en-barley", lang: "en", text: "fibc bags for barley export, 1t", expectedDept: "bigbag", expectedCategory: "grain" },
  { id: "h-en-mp", lang: "en", text: "price for mineral powder MP-1", expectedDept: "limestone_powder", expectedCategory: null },

  // пастки / не наш профіль
  { id: "h-trap-invoice", lang: "uk", text: "можна рахунок-фактуру на оплату?", expectedDept: "general", expectedCategory: null },
  { id: "h-trap-return", lang: "uk", text: "хочу повернути партію, виявили брак", expectedDept: "general", expectedCategory: null },
  { id: "h-trap-office", lang: "ru", text: "где находится ваш офис?", expectedDept: "general", expectedCategory: null },
];
