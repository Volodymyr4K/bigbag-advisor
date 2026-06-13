# HELD-OUT: по-кейсовий розбір

> Згенеровано автоматично: `npm run report`. Тільки rules + ML (без LLM).
> Кожна клітинка: `відділ` / `категорія`, ✓ — збіг з очікуваним, ✗ — промах.

**Підсумок (44 кейсів):** rules — відділ 42/44, категорія 14/29; ML — відділ 37/44, категорія 17/29.

Найцікавіше — рядки з ✗ на невиданій лексиці (ріпак, суперфосфат, лушпиння, гравій, крейда):
саме там видно межу підходів «ключові слова» і ML на малих даних.

| id | запит | очікувано | rules | ml |
|---|---|---|---|---|
| `h-grain-1` | доброго дня, треба тара під пшеницю, десь тонна | bigbag<br>grain | ✓ bigbag<br>✓ grain | ✓ bigbag<br>✓ grain |
| `h-fert-1` | подскажите биг-бэг под селитру с вкладышем | bigbag<br>fertilizer | ✓ bigbag<br>✓ fertilizer | ✓ bigbag<br>✓ fertilizer |
| `h-quarry-1` | беги під щебінь, перевозка вагонами | bigbag<br>quarry | ✓ bigbag<br>✓ quarry | ✓ bigbag<br>✓ quarry |
| `h-feed-1` | потрібна тара під комбікорм | bigbag<br>feed | ✓ bigbag<br>✓ feed | ✓ bigbag<br>✓ feed |
| `h-lime-1` | ціна на вапняк фракції 2-4 | limestone_powder<br>— | ✓ limestone_powder<br>— | ✓ limestone_powder<br>— |
| `h-pow-1` | интересует минеральный порошок для асфальта | limestone_powder<br>— | ✓ limestone_powder<br>— | ✓ limestone_powder<br>— |
| `h-rapeseed` | потрібні біг-беги під ріпак, тонна | bigbag<br>grain | ✓ bigbag<br>✗ — | ✓ bigbag<br>✓ grain |
| `h-oats` | тара під овес і гречку | bigbag<br>grain | ✓ bigbag<br>✗ — | ✓ bigbag<br>✗ oilcake |
| `h-superphos` | беги під суперфосфат | bigbag<br>fertilizer | ✓ bigbag<br>✗ — | ✓ bigbag<br>✗ oilcake |
| `h-ammsulf` | нужны биг беги под сульфат аммония | bigbag<br>fertilizer | ✓ bigbag<br>✗ — | ✓ bigbag<br>✗ oilcake |
| `h-husk` | пакування під лушпиння соняшнику на паливо | bigbag<br>biofuel | ✓ bigbag<br>✗ grain | ✓ bigbag<br>✗ oilcake |
| `h-gravel` | потрібна тара під гравій | bigbag<br>quarry | ✓ bigbag<br>✗ — | ✓ bigbag<br>✓ quarry |
| `h-dolomite` | цікавить доломітове борошно для ґрунту | limestone_powder<br>— | ✓ limestone_powder<br>— | ✓ limestone_powder<br>— |
| `h-chalk` | потрібна крейда мелена, оптом | limestone_powder<br>— | ✗ general<br>— | ✗ general<br>— |
| `h-typo` | біг бегі під зерно потрбіно терміново | bigbag<br>grain | ✓ bigbag<br>✓ grain | ✓ bigbag<br>✓ grain |
| `h-en-1` | big bags for sunflower seeds, 1 ton, by rail | bigbag<br>grain | ✗ general<br>✗ — | ✗ general<br>✗ — |
| `h-en-2` | do you sell limestone for soil, fraction 0-5? | limestone_powder<br>— | ✓ limestone_powder<br>— | ✗ general<br>— |
| `h-mixed-1` | є питання по бегах під добрива і ще по вапняку | bigbag<br>fertilizer | ✓ bigbag<br>✓ fertilizer | ✗ general<br>✗ — |
| `h-trap-pallet` | чи продаєте ви палети дерев'яні? | general<br>— | ✓ general<br>— | ✓ general<br>— |
| `h-trap-job` | хочу до вас на роботу, куди надіслати резюме? | general<br>— | ✓ general<br>— | ✓ general<br>— |
| `h-trap-vague` | вітаю, підкажіть будь ласка по продукції | general<br>— | ✓ general<br>— | ✓ general<br>— |
| `h-trap-delivery` | а ви возите в Польщу? | general<br>— | ✓ general<br>— | ✓ general<br>— |
| `h-trap-overload` | нужен биг бэг под зерно на 5 тонн | bigbag<br>grain | ✓ bigbag<br>✓ grain | ✓ bigbag<br>✓ grain |
| `h-millet` | тара під просо, тонна | bigbag<br>grain | ✓ bigbag<br>✗ — | ✓ bigbag<br>✓ grain |
| `h-sorghum` | біг-беги під сорго | bigbag<br>grain | ✓ bigbag<br>✗ — | ✓ bigbag<br>✓ grain |
| `h-lentil` | потрібні беги під чечевицю | bigbag<br>grain | ✓ bigbag<br>✗ — | ✓ bigbag<br>✓ grain |
| `h-chickpea` | биг бэги под нут | bigbag<br>grain | ✓ bigbag<br>✗ — | ✓ bigbag<br>✗ oilcake |
| `h-beans` | пакування під квасолю | bigbag<br>grain | ✓ bigbag<br>✗ — | ✗ general<br>✗ — |
| `h-diamm` | беги під діамофоску | bigbag<br>fertilizer | ✓ bigbag<br>✗ — | ✓ bigbag<br>✓ fertilizer |
| `h-urea` | нужны биг беги под мочевину | bigbag<br>fertilizer | ✓ bigbag<br>✗ — | ✓ bigbag<br>✗ oilcake |
| `h-rapemeal` | беги під ріпаковий шрот | bigbag<br>oilcake | ✓ bigbag<br>✓ oilcake | ✓ bigbag<br>✓ oilcake |
| `h-rapecake` | макуха ріпакова, тонна | bigbag<br>oilcake | ✓ bigbag<br>✓ oilcake | ✓ bigbag<br>✓ oilcake |
| `h-agripellet` | потрібні беги під агропелети | bigbag<br>biofuel | ✓ bigbag<br>✓ biofuel | ✓ bigbag<br>✓ biofuel |
| `h-peat` | тара под торфобрикеты | bigbag<br>biofuel | ✓ bigbag<br>✓ biofuel | ✓ bigbag<br>✓ biofuel |
| `h-fishfeed` | беги під корм для риби | bigbag<br>feed | ✓ bigbag<br>✓ feed | ✓ bigbag<br>✓ feed |
| `h-keramzit` | тара під керамзит | bigbag<br>quarry | ✓ bigbag<br>✗ — | ✓ bigbag<br>✗ feed |
| `h-butstone` | біг-беги під бутовий камінь | bigbag<br>quarry | ✓ bigbag<br>✓ quarry | ✓ bigbag<br>✗ oilcake |
| `h-mp2` | интересует минеральный порошок МП-2 | limestone_powder<br>— | ✓ limestone_powder<br>— | ✓ limestone_powder<br>— |
| `h-finelime` | потрібен тонкомелений вапняк | limestone_powder<br>— | ✓ limestone_powder<br>— | ✓ limestone_powder<br>— |
| `h-en-barley` | fibc bags for barley export, 1t | bigbag<br>grain | ✓ bigbag<br>✓ grain | ✗ general<br>✗ — |
| `h-en-mp` | price for mineral powder MP-1 | limestone_powder<br>— | ✓ limestone_powder<br>— | ✗ general<br>— |
| `h-trap-invoice` | можна рахунок-фактуру на оплату? | general<br>— | ✓ general<br>— | ✓ general<br>— |
| `h-trap-return` | хочу повернути партію, виявили брак | general<br>— | ✓ general<br>— | ✓ general<br>— |
| `h-trap-office` | где находится ваш офис? | general<br>— | ✓ general<br>— | ✓ general<br>— |
