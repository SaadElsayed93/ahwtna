import { describe, it, expect } from 'vitest';
import { renderHomeScreen, type HomeScreenState } from '../src/screens/home-screen.js';

describe('Egyptian Home Screen Component (Home Screen)', () => {
  it('renders authentic Egyptian cafe hero card and domino 101 mode buttons', () => {
    const state: HomeScreenState = {
      playerName: 'صبحي',
      playerTitle: 'المعلم',
      activeModal: 'NONE',
    };

    const html = renderHomeScreen(state);

    // Verify brand, title, and persona
    expect(html).toContain('قهوتنا');
    expect(html).toContain('المعلم صبحي');
    expect(html).toContain('دومينو أمريكاني 101');

    // Verify mode buttons exist
    expect(html).toContain('btn-start-offline-2p');
    expect(html).toContain('btn-start-offline-4p');
    expect(html).toContain('btn-open-create-room-modal');
    expect(html).toContain('btn-open-join-room-modal');

    // Verify upcoming games section
    expect(html).toContain('طاولة 31');
    expect(html).toContain('استميشن');
    expect(html).toContain('شطرنج القهوة');
  });

  it('renders Egyptian vocabulary modal when activeModal is VOCABULARY', () => {
    const state: HomeScreenState = {
      playerName: 'حسونة',
      playerTitle: 'الباشا',
      activeModal: 'VOCABULARY',
    };

    const html = renderHomeScreen(state);

    expect(html).toContain('معجم مسميات الدومينو في القهاوي المصرية');
    expect(html).toContain('الدش (صاحب البداية)');
    expect(html).toContain('دبش');
    expect(html).toContain('دورجي');
    expect(html).toContain('شيش بنج');
  });

  it('renders create room modal with generated room code', () => {
    const state: HomeScreenState = {
      playerName: 'صبحي',
      playerTitle: 'المعلم',
      activeModal: 'CREATE_ROOM',
      generatedRoomCode: 'AHW-888',
    };

    const html = renderHomeScreen(state);

    expect(html).toContain('افتح ترابيزة أونلاين لأصحابك');
    expect(html).toContain('AHW-888');
    expect(html).toContain('btn-copy-room-code');
  });

  it('renders change player name modal', () => {
    const state: HomeScreenState = {
      playerName: 'محروس',
      playerTitle: 'الأسطى',
      activeModal: 'CHANGE_NAME',
    };

    const html = renderHomeScreen(state);

    expect(html).toContain('تعديل لقب واسم المعلم');
    expect(html).toContain('input-player-title');
    expect(html).toContain('input-player-name');
    expect(html).toContain('btn-save-name');
  });
});
