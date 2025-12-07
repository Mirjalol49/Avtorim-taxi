import { Howl, Howler } from 'howler';

/**
 * Unified Sound Service for Web Application
 * Refactored to use Howler.js for reliable cross-browser playback
 */

// Sound file paths - Centralized configuration
const SOUND_PATHS = {
    correct: '/Sounds/correct.mp3',
    incorrect: '/Sounds/incorrect.mp3',
    lock: '/Sounds/lock.mp3',
};

class SoundService {
    private sounds: Map<string, Howl> = new Map();
    private isEnabled: boolean = true;
    private isInitialized: boolean = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        // Global Howler settings
        Howler.autoUnlock = true; // Automatically unlock audio on first user interaction
        Howler.volume(0.5); // Default global volume

        // Load core sounds
        Object.entries(SOUND_PATHS).forEach(([key, path]) => {
            this.loadSound(key, path);
        });

        console.log('🔊 Sound Manager Initialized (Howler.js)');
        this.isInitialized = true;

        // Setup explicit unlock listener as backup
        this.setupUnlockListener();
    }

    private setupUnlockListener() {
        if (typeof window !== 'undefined') {
            const unlock = () => {
                if (Howler.ctx && Howler.ctx.state === 'suspended') {
                    Howler.ctx.resume().then(() => {
                        console.log('🔊 AudioContext Resumed by User Interaction');
                    });
                }
            };

            // Listen to common interaction events
            const events = ['click', 'touchstart', 'keydown', 'mousedown'];
            events.forEach(event => {
                document.addEventListener(event, unlock, { passive: true });
            });
        }
    }

    private loadSound(key: string, src: string) {
        const sound = new Howl({
            src: [src],
            preload: true,
            html5: false, // Force Web Audio API for better timing and locking handling
            onload: () => console.log(`✅ Sound loaded: ${key}`),
            onloaderror: (id, err) => console.error(`❌ Failed to load sound ${key}:`, err),
            onplayerror: (id, err) => {
                console.warn(`⚠️ Playback failed for ${key} (browser block?), attempting unlock...`, err);
                (Howler as any).once('unlock', () => {
                    this.play(key);
                });
            }
        });
        this.sounds.set(key, sound);
    }

    /**
     * Play a sound by key
     */
    play(key: string, volumeOverride?: number) {
        if (!this.isEnabled) return;

        const sound = this.sounds.get(key);
        if (sound) {
            // Create a new ID for this playback instance to set volume independently if needed
            const id = sound.play();

            if (volumeOverride !== undefined) {
                sound.volume(volumeOverride, id);
            }
        } else {
            // Fallback mapping for generic notification types
            if (key === 'success' || key === 'info') {
                this.play('correct', volumeOverride);
            } else if (key === 'error' || key === 'warning') {
                this.play('incorrect', volumeOverride);
            } else {
                console.warn(`Sound not found: ${key}`);
            }
        }
    }

    setVolume(vol: number) {
        Howler.volume(Math.max(0, Math.min(1, vol)));
    }

    setEnabled(enabled: boolean) {
        this.isEnabled = enabled;
        Howler.mute(!enabled);
    }

    isAudioEnabled() {
        return this.isEnabled;
    }
}

// Singleton instance
const soundService = new SoundService();
export default soundService;

// ============================================================
// PUBLIC API - Matching previous interface for compatibility
// ============================================================

export const playCorrectSound = (): void => {
    soundService.play('correct');
};

export const playIncorrectSound = (): void => {
    soundService.play('incorrect');
};

export const playLockSound = (): void => {
    soundService.play('lock');
};

export const playNotificationSound = (type: 'success' | 'info' | 'error' | 'warning' = 'info'): void => {
    // Map notification types to existing sounds with appropriate volumes
    if (type === 'error' || type === 'warning') {
        soundService.play('incorrect', 0.4);
    } else {
        soundService.play('correct', 0.3);
    }
};

export const setVolume = (volume: number): void => {
    soundService.setVolume(volume);
};

export const setSoundEnabled = (enabled: boolean): void => {
    soundService.setEnabled(enabled);
};

export const isSoundEnabled = (): boolean => {
    return soundService.isAudioEnabled();
};
