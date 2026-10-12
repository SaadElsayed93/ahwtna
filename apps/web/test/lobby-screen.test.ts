import { describe, it, expect } from 'vitest';
import { renderLobbyScreen } from '../src/screens/lobby-screen.js';
import type { RoomPublicState, RoomPlayer } from '@ahwtna/shared';

describe('LobbyScreen (شاشة صالة الانتظار للقهوة)', () => {
  const hostPlayer: RoomPlayer = {
    id: 'user-host',
    displayName: 'المعلم صبحي',
    seat: 0,
    isHost: true,
    isReady: true,
    isConnected: true,
  };

  const guestPlayer: RoomPlayer = {
    id: 'user-guest',
    displayName: 'عم شكشك',
    seat: 1,
    isHost: false,
    isReady: false,
    isConnected: true,
  };

  const sample2PRoom: RoomPublicState = {
    roomId: 'AHW-709',
    mode: 'INDIVIDUAL_2P',
    hostId: 'user-host',
    status: 'LOBBY',
    players: [hostPlayer],
    stateVersion: 1,
    currentRoundNumber: 1,
    matchScore: { seat0: 0, seat1: 0 },
  };

  it('renders room code, copy button, and host player card in 2P mode', () => {
    const html = renderLobbyScreen(sample2PRoom, hostPlayer);

    expect(html).toContain('AHW-709');
    expect(html).toContain('كود الغرفة:');
    expect(html).toContain('📋 نسخ');
    expect(html).toContain('المعلم صبحي');
    expect(html).toContain('👑 صاحب الطاولة');
    expect(html).toContain('✅ جاهز يا معلم');
    expect(html).toContain('كرسي فاضي (مقعد 2)');
    expect(html).toContain('اجلس هنا 🎯');
  });

  it('renders empty seats and ready toggles properly for guest player', () => {
    const full2PRoom: RoomPublicState = {
      ...sample2PRoom,
      players: [hostPlayer, guestPlayer],
    };

    const html = renderLobbyScreen(full2PRoom, guestPlayer);

    expect(html).toContain('المعلم صبحي');
    expect(html).toContain('عم شكشك');
    expect(html).toContain('(أنت)');
    // عم شكشك ليس جاهزاً بعد
    expect(html).toContain('⏳ بيولع الشيشة');
    expect(html).toContain('⚡ اضغط هنا للتأكيد: أنا جاهز يا معلم!');
  });

  it('renders 4P team indicators and all seats in 4P partnership mode', () => {
    const room4P: RoomPublicState = {
      roomId: 'AHW-444',
      mode: 'TEAM_4P',
      hostId: 'user-host',
      status: 'LOBBY',
      players: [
        { ...hostPlayer, seat: 0, team: 'TEAM_A' },
        { ...guestPlayer, seat: 1, team: 'TEAM_B' },
      ],
      stateVersion: 1,
      currentRoundNumber: 1,
      matchScore: { teamA: 0, teamB: 0 },
    };

    const html = renderLobbyScreen(room4P, hostPlayer);

    expect(html).toContain('AHW-444');
    expect(html).toContain('👥 نمط زوجي (4 لاعبين - شراكة فرق)');
    expect(html).toContain('فريق أ');
    expect(html).toContain('فريق ب');
    expect(html).toContain('كرسي فاضي (فريق أ - مقعد 3)');
    expect(html).toContain('كرسي فاضي (فريق ب - مقعد 4)');
  });

  it('indicates when all players are seated and ready', () => {
    const readyRoom: RoomPublicState = {
      ...sample2PRoom,
      players: [
        hostPlayer,
        { ...guestPlayer, isReady: true },
      ],
    };

    const html = renderLobbyScreen(readyRoom, hostPlayer);
    expect(html).toContain('🎉 اكتملت الطاولة والجميع جاهز! تبدأ الجولة الآن...');
  });
});
