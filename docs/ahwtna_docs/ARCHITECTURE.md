# قهوتنا | ahwtna — البنية التقنية والمعمارية (Technical Architecture)

> **الإصدار:** 1.0.0 — معمارية النظم المعتمدة  
> **الهدف:** توثيق حدود المسؤوليات، بنية Monorepo، عزل المحرك، وبروتوكولات الأمان والمزامنة الحية.

---

## 1. المبادئ المعمارية الحاكمة

1. **الاستقلالية والحتمية (Engine Determinism):** محرك الدومينو (`packages/game-engine`) هو مكتبة نقية (Pure TypeScript Library) لا تعرف شيئاً عن React أو WebSockets أو قواعد البيانات. يُمكن تشغيلها في المتصفح أوفلاين، أو على السيرفر، أو داخل جناح الاختبارات الآلية.
2. **سلطة السيرفر المطلقة (Server Authority):** في طور الأونلاين، السيرفر هو مصدر الحقيقة الوحيد. العميل لا يحسب الفائز ولا يقرر قانونية الحركة النهائية، بل يرسل أمراً (`Command`) وينتظر اعتماد السيرفر وبث الحدث (`Event`).
3. **أمان المعرفة الصفرية (Zero-Knowledge Game State):** لا يحصل أي عميل على تفاصيل أيدي الخصوم عبر الشبكة؛ السيرفر يقوم بتصفية الحالة (`Masking/Projection`) قبل بثها، مرسلاً فقط عدد القطع المتبقية في يد كل خصم.
4. **التطوير للويب أولاً مع قابلية التثبيت (PWA Mobile-First):** بنية واجهة المستخدم مبنية لتكون متجاوبة وخفيفة للغاية، تدعم الهواتف والشاشات اللوحية وسطح المكتب، مع دعم كامل لوضع عدم الاتصال عبر Service Workers.

---

## 2. هيكل الحزم ومساحة العمل (Monorepo Layout)

```
ahwtna/
├── apps/
│   ├── web/                    # تطبيق الواجهة والـ PWA
│   │   ├── src/
│   │   │   ├── components/     # طاولات اللعب، البلاطات، لوحات الرصيد
│   │   │   ├── hooks/          # خطافات الاتصال بالسوكت وإدارة الحالة
│   │   │   ├── audio/          # محرك الصوتيات الشعبية المصرية
│   │   │   └── screens/        # الشاشات: الرئيسية، اللوبي، الطاولة، الإعدادات
│   │   └── public/             # الأيقونات وأصوات الدومينو والشاي
│   │
│   └── server/                 # خادم الألعاب الموثوق (Authoritative Game Server)
│       ├── src/
│       │   ├── rooms/          # إدارة الغرف والمقاعد والجاهزية
│       │   ├── match/          # إدارة مباريات السيرفر المعتمدة على المحرك
│       │   ├── sockets/        # معالجات أحداث Socket.IO والمصادقة
│       │   └── anti-cheat/     # فحص الأوامر ومنع التكرار والتلاعب
│       └── server.ts           # نقطة انطلاق خادم Fastify/Socket.IO
│
├── packages/
│   ├── game-engine/            # محرك الدومينو 101 النقي
│   │   ├── src/
│   │   │   ├── tile.ts         # توليد الـ 28 بلاطة وحفظ القطع
│   │   │   ├── board.ts        # سلسلة الطاولة والأطراف المفتوحة
│   │   │   ├── engine.ts       # آلة حالة اللعبة الحتمية (State Machine)
│   │   │   ├── scoring.ts      # احتساب النقاط وحد الـ 101
│   │   │   └── ai.ts           # خوارزميات الذكاء الاصطناعي الأوفلاين
│   │   └── test/               # اختبارات Vitest التلقائية الشاملة
│   │
│   ├── shared/                 # الأنواع والمخططات المشتركة
│   │   ├── src/
│   │   │   ├── types/          # تعريفات البلاطة، اللاعب، الغرفة، الحالة
│   │   │   ├── schemas/        # مخططات التحقق الصارمة باستخدام Zod
│   │   │   └── constants/      # الثوابت وأكواد الأخطاء والألوان الأساسية
│   │
│   └── ui/                     # نظام التصميم العربي بروح القهوة
│       ├── src/
│       │   ├── tiles/          # مكونات البلاطات وتفاصيل النقاط الواقعية
│       │   ├── buttons/        # أزرار القهوة التراثية
│       │   └── dialogs/        # مربعات الحوار والنتائج التراثية
│
└── docs/                       # وثائق المشروع والمواصفات
```

---

## 3. عقود البيانات وتدفق الأوامر (Command-Event Architecture)

### 3.1 تدفق الحركة في طور الأونلاين
```
[اللاعب في المتصفح] 
       │
       ▼ (1) PlayTileCommand { tileId, targetEnd, clientCommandId, stateVersion }
[السيرفر: Socket.IO]
       │
       ▼ (2) Anti-Cheat & Lock Check: هل الدور للاعب؟ هل النسخة مطابقة؟
       │
       ▼ (3) GameEngine.executeMove(state, command)
       │
       ├───► إذا فشلت: يرجع Server Error Event (NOT_YOUR_TURN / ILLEGAL_MOVE)
       │
       └───► إذا نجحت: توليد الحالة الموثوقة الجديدة + أحداث (TilePlayed, RoundEnded...)
               │
               ▼ (4) إسقاط الحالة المخصصة (State Projection per player):
               │     - اللاعب الحالي يرى يده الحقيقية.
               │     - الخصوم يتلقون فقط { tileCount: number }.
               │
               ▼ (5) بث الحدث عبر الغرفة (Room Broadcast)
[جميع اللاعبين في المتصفحات]
```

### 3.2 مخططات الأوامر عبر Zod (`packages/shared`)
```typescript
export const PlayTileCommandSchema = z.object({
  type: z.literal('PLAY_TILE'),
  tileId: z.string().regex(/^[0-6]\|[0-6]$/),
  targetEnd: z.enum(['LEFT', 'RIGHT']),
  clientCommandId: z.string().uuid(),
  expectedStateVersion: z.number().int().nonnegative(),
});

export const DrawTileCommandSchema = z.object({
  type: z.literal('DRAW_TILE'),
  clientCommandId: z.string().uuid(),
  expectedStateVersion: z.number().int().nonnegative(),
});

export const PassCommandSchema = z.object({
  type: z.literal('PASS'),
  clientCommandId: z.string().uuid(),
  expectedStateVersion: z.number().int().nonnegative(),
});
```

---

## 4. نموذج الأمان ومكافحة الغش (Security & Anti-Cheat Invariants)

1. **إخفاء الأيدي الصارم (Zero-Knowledge Projection):**
   ```typescript
   export function projectPlayerState(fullState: AuthoritativeGameState, viewerSeat: SeatIndex): PlayerPublicState {
     return {
       ...fullState,
       players: fullState.players.map(p => ({
         seat: p.seat,
         displayName: p.displayName,
         team: p.team,
         tileCount: p.hand.length,
         hand: p.seat === viewerSeat ? p.hand : undefined, // مخفية تماماً عن الخصوم
         isConnected: p.isConnected,
       })),
     };
   }
   ```
2. **منع الأوامر المتكررة والمتقادمة (Idempotency & Optimistic Locking):**
   - كل أمر يحمل `clientCommandId` و `expectedStateVersion`.
   - إذا استلم السيرفر نفس المعرف مرتين، يُهمل التكرار فوراً دون إعادة الحساب.
   - إذا كان رقم النسخة أقل من نسخة السيرفر الحالية، يُرفض الأمر مع خطأ `STALE_STATE` ويُعاد إرسال أحدث حالة للمتصفح.
3. **مؤقت السيرفر الموثوق (Server-Side 30s Turn Timer):**
   - يتم حساب الوقت على السيرفر وليس في المتصفح. إذا انتهت الـ 30 ثانية دون حركة، يُجبر اللاعب على السحب/التمرير تلقائياً أو يتم تفعيل الـ AI المؤقت.

---

## 5. مواصفات الأداء والشبكة (Performance Targets)

- **زمن معالجة الحركة على السيرفر:** $\le 5\text{ ms}$ (بفضل خفة محرك TypeScript النقي).
- **حجم حزمة المتصفح الأولية (Web Initial Bundle):** $\le 150\text{ KB}$ مضغوطة.
- **استهلاك الذاكرة في خادم الألعاب:** أقل من 250 ميجابايت عند تشغيل 500 طاولة نشطة في آن واحد.
- **إعادة الاتصال:** استرجاع حالة المباراة المعلقة في أقل من 200 ميلي ثانية فور استعادة الاتصال بالإنترنت.

---
*تم اعتماد هذه البنية كمرجع معماري ملزم لجميع مراحل التنفيذ.*
