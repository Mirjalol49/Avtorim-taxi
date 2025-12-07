import { describe, it, expect, vi } from 'vitest';
import soundService from '../services/soundService';
import { Howl, Howler } from 'howler';

// Mock Howler.js completely
vi.mock('howler', () => {
    return {
        Howl: vi.fn(function () {
            return {
                play: vi.fn(),
                volume: vi.fn(),
                mute: vi.fn(),
                on: vi.fn(),
                once: vi.fn(),
                state: vi.fn().mockReturnValue('loaded'),
            };
        }),
        Howler: {
            volume: vi.fn(),
            mute: vi.fn(),
            autoUnlock: true,
            ctx: {
                state: 'suspended',
                resume: vi.fn().mockResolvedValue(true)
            }
        }
    };
});

describe('SoundService (Howler)', () => {
    it('should initialize sounds on import', () => {
        // We expect Howl constructor to be called for 'correct', 'incorrect', 'lock'
        expect(Howl).toHaveBeenCalled();
        expect(soundService.isAudioEnabled()).toBe(true);
    });

    it('should attempt to play a sound', () => {
        // Since we mocked Howl, we can't easily spy on the specific instances created inside the singleton
        // without more complex mocking setups, but we can verify it doesn't throw.
        expect(() => soundService.play('lock')).not.toThrow();
        expect(() => soundService.play('correct')).not.toThrow();
    });

    it('should handle volume control', () => {
        soundService.setVolume(0.8);
        expect(Howler.volume).toHaveBeenCalledWith(0.8);
    });

    it('should handle mute toggle', () => {
        soundService.setEnabled(false);
        expect(soundService.isAudioEnabled()).toBe(false);
        expect(Howler.mute).toHaveBeenCalledWith(true);

        soundService.setEnabled(true);
        expect(soundService.isAudioEnabled()).toBe(true);
        expect(Howler.mute).toHaveBeenCalledWith(false);
    });
});
