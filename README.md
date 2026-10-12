# قهوتنا | ahwtna ☕🎲

> **منصة ألعاب اجتماعية عربية بروح ودفء القهوة المصرية الأصيلة**  
> أولى الألعاب التأسيسية: **دومينو 101 (Domino 101)**

[![CI Status](https://img.shields.io/badge/Tests-161%2F161%20Passing-2E7D32.svg)](https://github.com/SaadElsayed93/ahwtna)
[![Build](https://img.shields.io/badge/Build-Passing-0D3B2E.svg)](https://github.com/SaadElsayed93/ahwtna)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20100%25-D4AF37.svg)](https://github.com/SaadElsayed93/ahwtna)
[![GitHub Repo](https://img.shields.io/badge/GitHub-SaadElsayed93%2Fahwtna-blue.svg)](https://github.com/SaadElsayed93/ahwtna)

---

## 📖 نظرة عامة على المشروع

**قهوتنا (ahwtna)** هي منصة ألعاب تراثية واجتماعية تهدف لإعادة إحياء أجواء القهوة البلدية المصرية في العصر الرقمي. اللعبة الأولى في المنصة هي لعبة **الدومينو الأمريكية / المصرية (دومينو 101)** بقواعدها الصارمة ونكهتها الشعبية الفريدة.

تم بناء المشروع باستخدام بنية **Monorepo** احترافية فائقة السرعة مع عزل تام لمحرك اللعبة النقي الحتمي، وتصميم واجهة مستخدم ناطقة بالهوية المصرية وتدعم اللغة العربية والاتجاه من اليمين إلى اليسار (RTL) بشكل أصيل.

---

## 🏛️ الهيكل المعماري للحزم (Monorepo Layout)

```
ahwtna/
├── apps/
│   ├── web/                    # تطبيق الويب التفاعلي والـ PWA (Vite + Live Reload)
│   │   ├── src/main.ts         # العميل التفاعلي المرتبط بالمحرك ونظام التصميم
│   │   └── index.html          # الصفحة الرئيسية للعبة
│   └── server/                 # خادم الألعاب الموثوق (Node.js / Fastify / Socket.IO)
│
├── packages/
│   ├── shared/                 # العقود المشتركة والأنواع ومخططات Zod
│   │   ├── src/types/          # Tile, Board, Player, Commands, Events
│   │   └── src/schemas/        # Zod Validators للأمان والتحقق الصارم
│   │
│   ├── game-engine/            # محرك دومينو 101 النقي الحتمي (Pure TypeScript Engine)
│   │   ├── src/tile-set.ts     # توليد الـ 28 بلاطة ومولد Mulberry32 PRNG
│   │   ├── src/board.ts        # طوبولوجيا السلسلة والأطراف المفتوحة
│   │   ├── src/deal.ts         # توزيع القطع للفردي (2P) والزوجي (4P) وبادئ الجولة
│   │   ├── src/move-validator.ts # التحقق الحتمي الصارم من صحة الحركات
│   │   ├── src/turn-cycle.ts   # إدارة السحب والتمرير وكشف القفلة (Blocked)
│   │   ├── src/scoring.ts      # احتساب نقاط الخروج والقفلة وحد الـ 101
│   │   ├── src/ai.ts           # الذكاء الاصطناعي التكتيكي بمعرفة صفرية
│   │   └── src/simulation.ts   # محاكي المباريات الذاتية واختبارات الإجهاد
│   │
│   └── ui/                     # نظام تصميم القهوة المصرية (Design System & RTL)
│       ├── src/tokens/         # ألوان القهوة، خطوط Cairo، معايير WCAG AA/AAA، وقاموس الدومينو
│       ├── src/tiles/          # مصفوفة توزيع النقاط الهندسية ورسم البلاطات العاجية (SVG/HTML)
│       ├── src/components/     # AhwaButton, TurnIndicator, ScoreBoardWidget, Modal, MatchFeed
│       └── src/styles/         # Master CSS Theme وحاقن الأنماط وأنيميشن خبطة البلاطة
│
├── docs/                       # وثائق ومواصفات المشروع الرسمية
│   └── ahwtna_docs/            # ARCHITECTURE, GAME_DESIGN, GAME_RULES, IMPLEMENTATION_PLAN...
├── IMPLEMENTATION.md           # الدليل التنفيذي الشامل ذو الـ 14 مرحلة
└── test-table.html             # صفحة المعاينة التفاعلية المستقلة
```

---

## 📜 قواعد دومينو 101 المعتمدة على أصولها

1. **طقم البلاطات:** Double-Six مكون من 28 بلاطة فريدة من `[0|0]` إلى `[6|6]`.
2. **بداية الجولة الأولى:** تبدأ الجولة الأولى بالدوش `[6|6]` (أو أعلى دبل متاح) ولا يجوز بدء الجولة بقطعة غير دبل. الجولات التالية تبدأ بواسطة الفائز بالجولة السابقة بأي قطعة يختارها.
3. **نمط الفردي (2 لاعبين):**
   - 7 بلاطات لكل لاعب، و14 بلاطة في المخزون (البلاطة).
   - عند غياب النقلة، يسحب اللاعب إجبارياً حتى يجد حركة قانونية أو ينفد المخزون.
   - إذا نفد المخزون ولم يملك نقلة، يمرر الدور إجبارياً (باص).
4. **نمط الزوجي (4 لاعبين / فريقين):**
   - تُوزع الـ 28 بلاطة كاملة (7 لكل لاعب).
   - لا يوجد سحب نهائياً؛ اللاعب الذي لا يملك حركة يمرر الدور فوراً.
5. **نهاية الجولة:**
   - **دومينو (Domino Out):** أول لاعب يُنهي ورقه يفوز بالجولة، وتُحسب مجموع نقاط ورق الخصوم كعقوبة عليهم.
   - **القفلة (Blocked Game):** عندما لا يملك أي لاعب حركة قانونية، يُحسب مجموع نقاط ورق كل طرف؛ صاحب المجموع الأقل يفوز وتُضاف نقاط الخاسر كجزاء عليه. وفي حالة التعادل في المجموع، تنتهي الجولة بـ 0 نقاط لكلا الطرفين.
6. **نهاية الماتش (حد الـ 101):**
   - النقاط المسجلة هي **نقاط جزاء تراكمية**.
   - أول طرف يصل رصيده التراكمي إلى **101 نقطة جزاء أو أكثر يخسر الماتش فوراً**.

---

## 🎨 هوية ونظام تصميم القهوة المصرية (`@ahwtna/ui`)

- **لوحة الألوان التراثية:**
  - الأخضر التراثي الداكن (`#0D3B2E`) ولباد الطاولة (`#134B3B`).
  - ورق الشاي العتيق لنوتة الحساب (`#F7F3E9`).
  - الذهب التراثي والنحاس للشارات ودبوس البلاطة (`#D4AF37`, `#B8860B`).
  - خشب الجوز الماهوجني لإطار الطاولة والصواني (`#2D1A12`).
  - عاج البلاطات الفاخر مع حفر النقاط الأسود (`#FFFFF2`, `#1A1A1A`).
  - أحمر تحذيري غني متوافق مع معايير الوصول (`#C62828`).
- **فحص إمكانية الوصول الدولي (WCAG AA & AAA):**
  - تباين حفر النقاط فوق البلاطة العاجية يتجاوز `14:1` (WCAG AAA).
  - تباين ورق الشاي فوق الطاولة الخضراء يتجاوز `8:1` (WCAG AAA).
  - تباين النصوص والتحذيرات يتجاوز `4.5:1` (WCAG AA).
- **المكونات الأساسية:**
  - `DominoTileWidget`: رسم عالي الدقة لشاشات Retina مع الدبوس المعدني وأنيميشن النقر والخبط.
  - `TurnIndicator`: شارة دور اللاعب مع وهج نبض ذهبي ومؤقت دائري تنازلي.
  - `ScoreBoardWidget`: محاكاة نوتة حساب القهوة المصرية لتسجيل النقاط التراكمية وحد الـ 101.
  - `MatchFeedWidget`: شريط التعليق الحي المباشر للأحداث باللهجة المصرية الشعبية.

### 🎲 معجم مسميات الدومينو في القهاوي المصرية
تم تضمين قاموس مسميات الدومينو الشعبية بالكامل داخل المحرك وواجهة المستخدم لتعزيز الهوية المصرية الأصيلة:
- **الأرقام المفردة:** 0 = بيض / بلاط، 1 = يك، 2 = دوجا، 3 = سيه، 4 = جهار، 5 = بنج، 6 = شيش.
- **الدبل (البلاطات المزدوجة):**
  - `[6|6]` = **الدش (الدوش)**
  - `[5|5]` = **دبش**
  - `[4|4]` = **دورجي**
  - `[3|3]` = **دوسة**
  - `[2|2]` = **دوبارة**
  - `[1|1]` = **هاب يك**
  - `[0|0]` = **بلاطين (بيض)**
- **البلاطات المركبة:** `[6|5]` = **شيش بنج**، `[6|4]` = **شيش جهار**، `[5|4]` = **بنج جهار**، `[4|3]` = **جهار سيه**، `[3|1]` = **سيه يك**... تظهر جميعها على شارات البلاطات وسجل أحداث الماتش.

---

## 🚀 التشغيل والتطوير (Getting Started)

### 1. المتطلبات الأساسية
- **Node.js** إصدار `>= 20.0.0`
- **npm** إصدار `>= 10.0.0`

### 2. تثبيت الحزم
```bash
npm install
```

### 3. تشغيل اللعبة في المتصفح مع التحديث التلقائي الفوري (Live Reload)
```bash
npm run dev
```
> سيفتح المتصفح تلقائياً على الرابط `http://localhost:3000`، وأي تعديل في الكود سيظهر فوراً دون الحاجة لتحديث الصفحة!

### 4. تجربة اللعب التفاعلي من الطرفية (Terminal CLI)
```bash
npm run play
```
> تجربة لعبة كاملة ضد الذكاء الاصطناعي "عم شكشك" مباشرة داخل شاشة الـ Terminal.

### 5. تشغيل جناح الاختبارات الآلية الشاملة
```bash
npm run test
```
> يُشغل جميع الـ 161 اختباراً آلياً عبر الحزم الخمس بواسطة Turborepo و Vitest بنسبة نجاح 100%.

### 6. فحص الأنواع الصارم وتجميع الكود
```bash
npm run typecheck   # فحص TypeScript الصارم
npm run build       # بناء الكود المصدري لجميع الحزم
```

---

## 📊 حالة المراحل التنفيذية (Project Roadmap)

| المرحلة | اسم المرحلة والوصف | الحالة | الاختبارات |
|:---:|---|:---:|:---:|
| **Stage 0** | **Monorepo Setup & Tooling** (workspaces, Turbo, strict tsconfig) | ✅ مكتمل | Build & Typecheck 100% |
| **Stage 1** | **Shared Contracts & Schemas** (Tile invariants, Seats, Zod) | ✅ مكتمل | 17/17 Tests Passing |
| **Stage 2** | **Tile Set & Deterministic Deal** (Mulberry32 PRNG, 28 tiles) | ✅ مكتمل | 9/9 Tests Passing |
| **Stage 3** | **Board Topology & Legal Moves** (Immutable chain, validation) | ✅ مكتمل | 11/11 Tests Passing |
| **Stage 4** | **Turn Cycle, Draw Policy & Block Check** (Pass, Draw, Lock) | ✅ مكتمل | 8/8 Tests Passing |
| **Stage 5** | **Scoring Engine & 101 Limit** (Penalty tally, match loss limit) | ✅ مكتمل | 11/11 Tests Passing |
| **Stage 6** | **Tactical AI & 1,000-Round Simulation** (Zero-knowledge heuristics) | ✅ مكتمل | 10/10 Tests Passing |
| **Stage 7** | **Egyptian Ahwa Design System & RTL UI** (Pips, Notebook, WCAG AA) | ✅ مكتمل | 20/20 Tests Passing |
| **Stage 8** | **Interactive Domino Table Web Screen** (`apps/web` مع بوابة الشاشة الرئيسية المصرية وسلسلة متصلة وخانات منقطة) | ✅ مكتمل | 17/17 Tests Passing |
| **Stage 9** | **Authoritative Game Server & Rooms** (`apps/server` مع Fastify و Socket.IO وأكواد الغرف والمقاعد والتوفيق العشوائي السريع) | ✅ مكتمل | 34/34 Tests Passing |
| **Stage 10** | **Real-time Socket Synchronization & Anti-Cheat** (`apps/server` مع مؤقت الـ 30 ثانية ونافذة الـ 45 ثانية ومكافحة الغش) | ✅ مكتمل | 31/31 Tests Passing |
| **Stage 11** | **Multiplayer Web Client Integration** (`apps/web` مع السوكت وشاشة اللوبي ومؤقت الـ 30ث وشريط الأحداث والماتش العشوائي ⚡) | ✅ مكتمل | 41/41 Tests Passing |
| **Stage 12** | **Egyptian Audio Ambiance, Haptics & PWA Polish** (`apps/web` مع Web Audio وخبطة الدومينو والشاي والاهتزاز وPWA الكامل) | ✅ مكتمل | 41/41 Tests Passing |
| **Stage 13** | **Playwright E2E Automation & Master Release Gate** | ⬜ لم يبدأ | لم تُشغّل بعد |

---

## 🔗 روابط الوثائق التفصيلية

- [خطة التنفيذ الشاملة (IMPLEMENTATION.md)](./IMPLEMENTATION.md)
- [تقرير حالة التنفيذ المحدث (docs/ahwtna_docs/IMPLEMENTATION_STATUS.md)](./docs/ahwtna_docs/IMPLEMENTATION_STATUS.md)
- [المعمارية التقنية (docs/ahwtna_docs/ARCHITECTURE.md)](./docs/ahwtna_docs/ARCHITECTURE.md)
- [قواعد اللعبة التفصيلية (docs/ahwtna_docs/GAME_RULES.md)](./docs/ahwtna_docs/GAME_RULES.md)
- [تصميم اللعبة وتجربة المستخدم (docs/ahwtna_docs/GAME_DESIGN.md)](./docs/ahwtna_docs/GAME_DESIGN.md)

---

*صُنع بحب وشاي بنعناع مصري ☕🇪🇬*
