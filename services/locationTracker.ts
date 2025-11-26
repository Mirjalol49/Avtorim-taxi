/**
 * Location Tracker
 * Manages periodic location updates and transmission to Firebase
 */

import GeolocationService, { GeolocationPosition } from './geolocationService';
import * as firestoreService from './firestoreService';

export interface TrackerConfig {
    driverId: string;
    updateInterval: number; // milliseconds
    onUpdate?: (position: GeolocationPosition) => void;
    onError?: (error: Error) => void;
}

export class LocationTracker {
    private watchId: number | null = null;
    private updateTimer: NodeJS.Timeout | null = null;
    private config: TrackerConfig;
    private isTracking: boolean = false;
    private failedUpdates: GeolocationPosition[] = [];
    private lastPosition: GeolocationPosition | null = null;

    constructor(config: TrackerConfig) {
        this.config = config;
    }

    /**
     * Start tracking location
     */
    async start(): Promise<void> {
        if (this.isTracking) {
            console.warn('Location tracking already started');
            return;
        }

        try {
            // Request initial position to ensure permission is granted
            const initialPosition = await GeolocationService.getCurrentPosition();

            // Send initial position
            await this.sendLocationUpdate(initialPosition);
            this.lastPosition = initialPosition;

            if (this.config.onUpdate) {
                this.config.onUpdate(initialPosition);
            }

            // Start watching for continuous updates
            this.watchId = GeolocationService.watchPosition(
                (position) => {
                    this.lastPosition = position;
                    if (this.config.onUpdate) {
                        this.config.onUpdate(position);
                    }
                },
                (error) => {
                    console.error('Watch position error:', error);
                    if (this.config.onError) {
                        this.config.onError(error);
                    }
                }
            );

            // Set up periodic transmission to Firebase
            this.updateTimer = setInterval(async () => {
                if (this.lastPosition) {
                    await this.sendLocationUpdate(this.lastPosition);

                    // Retry failed updates
                    await this.retryFailedUpdates();
                }
            }, this.config.updateInterval);

            this.isTracking = true;
            console.log(`Location tracking started for driver ${this.config.driverId}`);
        } catch (error) {
            console.error('Failed to start location tracking:', error);
            if (this.config.onError) {
                this.config.onError(error as Error);
            }
            throw error;
        }
    }

    /**
     * Stop tracking location
     */
    stop(): void {
        if (!this.isTracking) {
            console.warn('Location tracking not active');
            return;
        }

        // Clear watch
        if (this.watchId !== null) {
            GeolocationService.clearWatch(this.watchId);
            this.watchId = null;
        }

        // Clear update timer
        if (this.updateTimer !== null) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }

        this.isTracking = false;
        this.lastPosition = null;
        console.log(`Location tracking stopped for driver ${this.config.driverId}`);
    }

    /**
     * Check if tracking is active
     */
    isActive(): boolean {
        return this.isTracking;
    }

    /**
     * Send location update to Firebase
     */
    private async sendLocationUpdate(position: GeolocationPosition): Promise<void> {
        try {
            await firestoreService.updateDriverLocation(this.config.driverId, {
                lat: position.lat,
                lng: position.lon,
                accuracy: position.accuracy,
                timestamp: position.timestamp,
                heading: position.heading || 0,
                speed: position.speed || 0
            });
        } catch (error) {
            console.error('Failed to send location update, queuing for retry:', error);

            // Queue failed update for retry
            this.failedUpdates.push(position);

            // Limit queue size
            if (this.failedUpdates.length > 10) {
                this.failedUpdates.shift(); // Remove oldest
            }
        }
    }

    /**
     * Retry sending failed updates
     */
    private async retryFailedUpdates(): Promise<void> {
        if (this.failedUpdates.length === 0) return;

        console.log(`Retrying ${this.failedUpdates.length} failed location updates...`);

        const updates = [...this.failedUpdates];
        this.failedUpdates = [];

        for (const position of updates) {
            try {
                await firestoreService.updateDriverLocation(this.config.driverId, {
                    lat: position.lat,
                    lng: position.lon,
                    accuracy: position.accuracy,
                    timestamp: position.timestamp,
                    heading: position.heading || 0,
                    speed: position.speed || 0
                });
            } catch (error) {
                // Re-queue if still failing
                this.failedUpdates.push(position);
            }
        }
    }

    /**
     * Get current position immediately
     */
    async getCurrentPosition(): Promise<GeolocationPosition> {
        return GeolocationService.getCurrentPosition();
    }
}

export default LocationTracker;
