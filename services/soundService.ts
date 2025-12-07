/**
 * Unified Sound Service for Web Application
 * 
 * OPTIMIZED VERSION - Fixes intermittent playback issues:
 * - Single unified API for all sounds
 * - Preloaded audio buffers for instant playback
 * - HTML5 Audio fallback for better compatibility
 * - Guaranteed audio context resume before playback
 * - Cross-browser compatibility with multiple fallbacks
 */

// Sound loading status tracking
type SoundStatus = 'loading' | 'loaded' | 'error';

interface SoundInfo {
    buffer?: AudioBuffer;
    htmlAudio?: HTMLAudioElement;
    status: SoundStatus;
    url?: string;
}

class SoundService {
    private audioContext: AudioContext | null = null;
    private sounds: Map<string, SoundInfo> = new Map();
    private isEnabled: boolean = true;
    private volume: number = 0.5;
    private isInitialized: boolean = false;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.initPromise = this.initialize();
    }

    /**
     * Initialize audio context and preload all sounds
     */
    private async initialize(): Promise<void> {
        try {
            // Create audio context
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass();
            }

            // Setup user interaction handlers for audio resume
            this.setupInteractionHandlers();

            // Preload all sounds immediately
            await this.preloadAllSounds();

            this.isInitialized = true;
            console.log('✅ Sound system fully initialized');
        } catch (error) {
            console.error('Sound initialization failed:', error);
            // Still mark as initialized to prevent blocking
            this.isInitialized = true;
        }
    }

    /**
     * Setup multiple event listeners for audio context resume
     */
    private setupInteractionHandlers(): void {
        const resumeAudio = () => {
            if (this.audioContext?.state === 'suspended') {
                this.audioContext.resume();
            }
        };

        // Multiple events for reliability
        ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown'].forEach(event => {
            document.addEventListener(event, resumeAudio, { passive: true });
        });
    }

    /**
     * Preload all application sounds
     */
    private async preloadAllSounds(): Promise<void> {
        // Generate synthetic beeps (instant, no network)
        this.generateBeep('success', 880, 0.12);  // Higher pitch for success
        this.generateBeep('error', 330, 0.15);    // Lower pitch for error
        this.generateBeep('info', 660, 0.1);      // Medium pitch for info
        this.generateBeep('warning', 440, 0.15);  // Alert tone

        // Load external sound files with HTML5 Audio fallback
        await Promise.allSettled([
            this.loadSoundWithFallback('correct', '/Sounds/correct.mp3'),
            this.loadSoundWithFallback('incorrect', '/Sounds/incorrect.mp3'),
            this.loadSoundWithFallback('lock', '/Sounds/lock.mp3'),
        ]);
    }

    /**
     * Generate synthetic beep sound (no network required)
     */
    private generateBeep(name: string, frequency: number, duration: number): void {
        if (!this.audioContext) return;

        try {
            const sampleRate = this.audioContext.sampleRate;
            const numSamples = Math.floor(sampleRate * duration);
            const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
            const channelData = buffer.getChannelData(0);

            // Generate sine wave with envelope
            for (let i = 0; i < numSamples; i++) {
                const t = i / sampleRate;
                const envelope = Math.min(1, Math.min(t * 50, (duration - t) * 50)); // Fast attack/decay
                channelData[i] = Math.sin(2 * Math.PI * frequency * t) * 0.3 * envelope;
            }

            this.sounds.set(name, { buffer, status: 'loaded' });
        } catch (error) {
            console.error(`Failed to generate beep ${name}:`, error);
        }
    }

    /**
     * Load sound with HTML5 Audio fallback for maximum compatibility
     */
    private async loadSoundWithFallback(name: string, url: string): Promise<void> {
        this.sounds.set(name, { status: 'loading', url });

        try {
            // Try Web Audio API first
            if (this.audioContext) {
                const response = await fetch(url);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    this.sounds.set(name, { buffer: audioBuffer, status: 'loaded', url });
                    console.log(`✅ Sound loaded (WebAudio): ${name}`);
                    return;
                }
            }
        } catch (webAudioError) {
            console.warn(`WebAudio failed for ${name}, trying HTML5 Audio...`);
        }

        // Fallback to HTML5 Audio
        try {
            const audio = new Audio(url);
            audio.preload = 'auto';
            await new Promise<void>((resolve, reject) => {
                audio.addEventListener('canplaythrough', () => resolve(), { once: true });
                audio.addEventListener('error', () => reject(audio.error), { once: true });
                audio.load();
            });
            this.sounds.set(name, { htmlAudio: audio, status: 'loaded', url });
            console.log(`✅ Sound loaded (HTML5): ${name}`);
        } catch (htmlError) {
            console.error(`❌ Failed to load sound ${name}:`, htmlError);
            this.sounds.set(name, { status: 'error', url });
        }
    }

    /**
     * Play a sound (public API)
     */
    play(name: string, volumeOverride?: number): void {
        if (!this.isEnabled) return;

        const vol = volumeOverride !== undefined ? volumeOverride : this.volume;
        const sound = this.sounds.get(name);

        if (!sound || sound.status !== 'loaded') {
            console.warn(`Sound not ready: ${name} (status: ${sound?.status || 'unknown'})`);
            return;
        }

        // Resume audio context if needed
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume().then(() => this.playInternal(name, vol));
        } else {
            this.playInternal(name, vol);
        }
    }

    /**
     * Internal play method
     */
    private playInternal(name: string, volume: number): void {
        const sound = this.sounds.get(name);
        if (!sound) return;

        try {
            if (sound.buffer && this.audioContext) {
                // Web Audio API playback
                const source = this.audioContext.createBufferSource();
                source.buffer = sound.buffer;

                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = volume;

                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                source.start(0);
            } else if (sound.htmlAudio) {
                // HTML5 Audio playback
                const audio = sound.htmlAudio.cloneNode() as HTMLAudioElement;
                audio.volume = volume;
                audio.play().catch(e => console.warn('Audio play failed:', e));
            }
        } catch (error) {
            console.error(`Error playing sound ${name}:`, error);
        }
    }

    /**
     * Set global volume (0.0 to 1.0)
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Enable/disable sounds
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    /**
     * Check if audio is enabled
     */
    isAudioEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Wait for initialization to complete
     */
    async waitForInit(): Promise<void> {
        if (this.initPromise) {
            await this.initPromise;
        }
    }
}

// Create singleton instance
const soundService = new SoundService();

// ============================================================
// PUBLIC API - Use these functions throughout the application
// ============================================================

/**
 * Play login success sound
 */
export const playCorrectSound = (): void => {
    soundService.play('correct', 0.5);
};

/**
 * Play login failure sound
 */
export const playIncorrectSound = (): void => {
    soundService.play('incorrect', 0.5);
};

/**
 * Play lock/logout sound
 */
export const playLockSound = (): void => {
    soundService.play('lock', 0.5);
};

/**
 * Play notification sound based on type
 */
export const playNotificationSound = (type: 'success' | 'info' | 'error' | 'warning' = 'info'): void => {
    soundService.play(type, type === 'error' || type === 'warning' ? 0.4 : 0.3);
};

/**
 * Set global volume
 */
export const setVolume = (volume: number): void => {
    soundService.setVolume(volume);
};

/**
 * Enable/disable all sounds
 */
export const setSoundEnabled = (enabled: boolean): void => {
    soundService.setEnabled(enabled);
};

/**
 * Check if sounds are enabled
 */
export const isSoundEnabled = (): boolean => {
    return soundService.isAudioEnabled();
};

export default soundService;
