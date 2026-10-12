import { z } from 'zod';

export const PipValueSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const TileIdSchema = z
  .string()
  .regex(/^[0-6]\|[0-6]$/, 'معرف البلاطة يجب أن يكون بالصيغة "a|b" حيث a و b أرقام بين 0 و 6');

export const SeatIndexSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const BoardEndSchema = z.enum(['LEFT', 'RIGHT']);

export const BaseCommandSchema = z.object({
  clientCommandId: z.string().min(1, 'معرف الأمر مطلوب'),
  expectedStateVersion: z.number().int().nonnegative('رقم النسخة يجب أن يكون عدداً صحيحاً غير سالب'),
  seat: SeatIndexSchema,
});

export const PlayTileCommandSchema = BaseCommandSchema.extend({
  type: z.literal('PLAY_TILE'),
  tileId: TileIdSchema,
  targetEnd: BoardEndSchema,
});

export const DrawTileCommandSchema = BaseCommandSchema.extend({
  type: z.literal('DRAW_TILE'),
});

export const PassCommandSchema = BaseCommandSchema.extend({
  type: z.literal('PASS'),
});

export const GameCommandSchema = z.discriminatedUnion('type', [
  PlayTileCommandSchema,
  DrawTileCommandSchema,
  PassCommandSchema,
]);

export type ValidatedGameCommand = z.infer<typeof GameCommandSchema>;
