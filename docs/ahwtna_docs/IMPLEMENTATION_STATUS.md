# قهوتنا | ahwtna — تقرير حالة التنفيذ (Implementation Status)

> **تاريخ التحديث:** أكتوبر 2026  
> **الحالة العامة:** تم إنجاز **المراحل 0 و 1 و 2 و 3 و 4 (Turn Cycle, Draw Policy & Block Check)** بنجاح 100%. جاهز للبدء في **المرحلة 5 (Scoring Engine & 101 Limit)**.

---

## 📊 نظرة سريعة على المشروع (Snapshot)
- **المشروع:** منصة ألعاب اجتماعية بروح القهوة المصرية — اللعبة الأولى: **دومينو 101**.
- **المستودع البعيد:** [https://github.com/SaadElsayed93/ahwtna](https://github.com/SaadElsayed93/ahwtna)
- **الفرع الحالي:** `main`
- **المراحل المكتملة:**
  - ✅ **Stage 0: Monorepo Setup & Tooling**
  - ✅ **Stage 1: Shared Contracts & Schemas**
  - ✅ **Stage 2: Domino Tile Generation & Shuffling**
  - ✅ **Stage 3: Board Topology & Legal Moves**
  - ✅ **Stage 4: Turn Cycle, Draw Policy & Block Check**
- **المرحلة التالية:** **Stage 5: Scoring Engine & 101 Threshold Resolution** 🏆

---

## 🏗️ ملخص إنجاز المرحلة 4 (Stage 4 Summary)
- **سياسة السحب في النمط الفردي (`packages/game-engine/src/turn-cycle.ts`):**
  - رفض السحب في النمط الزوجي نهائياً `ENG-060` (`CANNOT_DRAW_IN_TEAM_MODE`).
  - سحب بلاطة واحدة في النمط الفردي عند غياب النقلة `ENG-068`.
  - منع السحب إذا كان لدى اللاعب نقلة قانونية بالفعل في يده (`CANNOT_DRAW_WHEN_MOVE_EXISTS`).
- **سياسة التمرير الإجباري:**
  - منع التمرير إذا كان اللاعب يملك نقلة قانونية `ENG-061` (`CANNOT_PASS_WHEN_MOVE_EXISTS`).
  - في الفردي: قبول التمرير بعد نفاد المخزون وغياب البدائل `ENG-062`, `ENG-069`.
  - في الزوجي: قبول التمرير الفوري عند غياب النقلة `ENG-063`.
- **كشف القفلة الشامل (Blocked Game Detection):**
  - فحص أيدي جميع اللاعبين الأحياء مقابل الطرفين المفتوحين `ENG-066`.
  - إعلان انتهاء الجولة فوراً عند انعدام الحركات لدى الجميع `ENG-064`.
  - استمرار اللعب طالما وُجد لاعب واحد قادر على اللعب `ENG-065`.
- **الاختبارات المنفذة:**
  - اجتياز اختبارات `ENG-060`, `ENG-061`, `ENG-062`, `ENG-063`, `ENG-064`, `ENG-065`, `ENG-066`, `ENG-068`, `ENG-069` بنسبة 100% (إجمالي 45 اختباراً تلقائياً عبر المستودع).

---

## 📋 مصفوفة تقدم المراحل (Stage Progress Matrix)

| المرحلة | الوصف | الحالة | نتائج الاختبارات | ملاحظات |
|---|---|---|---|---|
| **Stage 0** | Monorepo Setup & Tooling | ✅ مكتمل | build & typecheck 100% | ربط المستودع بـ GitHub وتجهيز الـ Monorepo |
| **Stage 1** | Shared Contracts & Schemas | ✅ مكتمل | 17/17 tests passed (100%) | عقود Zod وأنواع البلاطات والأوامر |
| **Stage 2** | Tile Generation & Shuffling | ✅ مكتمل | 9/9 tests passed (100%) | ENG-001 إلى ENG-008 (حفظ القطع والتوزيع) |
| **Stage 3** | Board Topology & Legal Moves | ✅ مكتمل | 11/11 tests passed (100%) | ENG-010 إلى ENG-019 (سلسلة الطاولة والحركات) |
| **Stage 4** | Draw, Pass & Block Detection | ✅ مكتمل | 8/8 tests passed (100%) | ENG-060 إلى ENG-069 (السحب والتمرير والقفلة) |
| **Stage 5** | Scoring Engine & 101 Limit | ⬜ جاهز للبدء | لم تُشغّل بعد | ENG-030 إلى ENG-055 (احتساب النقاط والـ 101) |
| **Stage 6** | Offline AI & Mass Simulation | ⬜ لم يبدأ | لم تُشغّل بعد | ENG-070 إلى ENG-074 (1,000 جولة) |
| **Stage 7** | Egyptian Ahwa Design System | ⬜ لم يبدأ | لم تُشغّل بعد | لوحة ألوان القهوة وخطوط RTL |
| **Stage 8** | Interactive Domino Table UI | ⬜ لم يبدأ | لم تُشغّل بعد | طاولة اللعب التفاعلية والأوفلاين |
| **Stage 9** | Authoritative Server & Rooms | ⬜ لم يبدأ | لم تُشغّل بعد | إدارة الغرف والمقاعد |
| **Stage 10** | Real-time Sync & Anti-Cheat | ⬜ لم يبدأ | لم تُشغّل بعد | حجب أيدي الخصوم والقفل المتفائل |
| **Stage 11** | Multiplayer Web Client | ⬜ لم يبدأ | لم تُشغّل بعد | ربط اللوبي ومؤقت الـ 30 ثانية |
| **Stage 12** | Egyptian Audio & PWA Polish | ⬜ لم يبدأ | لم تُشغّل بعد | خبطة الدومينو والشاي وتثبيت PWA |
| **Stage 13** | E2E Suite & Release Gate | ⬜ لم يبدأ | لم تُشغّل بعد | اختبارات Playwright وحزم الإنتاج |

---

## 🔍 نتائج التحقق الفعلية (Stage 4 Verification Results)
| الأمر المنفذ | النتيجة الفعلية | الملاحظات |
|---|---|---|
| `npm run test` (Turborepo) | ✅ نجح (45/45 tests) | 17 في shared + 28 في game-engine بنجاح 100% |
| `npm run build` (Turborepo) | ✅ نجح (5/5 packages) | تجميع الكود المصدري لجميع الحزم |
| `npm run typecheck` | ✅ نجح (8/8 tasks) | اجتياز فحص TypeScript الصارم بنجاح تام |

---

## 🎯 الخطوة التالية المباشرة (Single Next Step)
- **بدء المرحلة 5 (Stage 5: Scoring Engine & 101 Threshold Resolution) في `packages/game-engine`:**
  - حساب نتيجة الجولة عند خروج لاعب في الفردي والزوجي (`ENG-030`, `ENG-031`, `ENG-050`, `ENG-051`, `ENG-055`).
  - حساب نتيجة الجولة عند القفلة (المجموع الأقل يفوز، والتعادل = 0 نقاط) (`ENG-032`, `ENG-033`, `ENG-034`, `ENG-052`, `ENG-053`).
  - تطبيق عقوبة الـ 101 التراكمية وإعلان نهاية الماتش الفورية (`ENG-035`, `ENG-036`, `ENG-054`).
