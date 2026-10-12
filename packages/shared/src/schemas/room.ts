import { z } from 'zod';
import { SeatIndexSchema } from './commands.js';

export const RoomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, 'رمز الغرفة يجب أن يتكون من 6 خانات أحرف أو أرقام');

export const GameModeSchema = z.enum(['INDIVIDUAL_2P', 'TEAM_4P']);

export const CreateRoomSchema = z.object({
  hostName: z.string().trim().min(1, 'اسم المضيف مطلوب').max(30, 'اسم المضيف لا يتجاوز 30 حرفاً'),
  mode: GameModeSchema,
});

export const JoinRoomSchema = z.object({
  roomId: RoomCodeSchema,
  playerName: z.string().trim().min(1, 'اسم اللاعب مطلوب').max(30, 'اسم اللاعب لا يتجاوز 30 حرفاً'),
  preferredSeat: SeatIndexSchema.optional(),
});

export const ChooseSeatSchema = z.object({
  roomId: RoomCodeSchema,
  seat: SeatIndexSchema,
});

export const ToggleReadySchema = z.object({
  roomId: RoomCodeSchema,
  isReady: z.boolean().optional(),
});

export const LeaveRoomSchema = z.object({
  roomId: RoomCodeSchema,
});

export type ValidatedCreateRoom = z.infer<typeof CreateRoomSchema>;
export type ValidatedJoinRoom = z.infer<typeof JoinRoomSchema>;
export type ValidatedChooseSeat = z.infer<typeof ChooseSeatSchema>;
export type ValidatedToggleReady = z.infer<typeof ToggleReadySchema>;
export type ValidatedLeaveRoom = z.infer<typeof LeaveRoomSchema>;
