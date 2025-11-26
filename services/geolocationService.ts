/**
 * Geolocation Service
 * Handles browser-based geolocation with permission management
 */

export interface GeolocationPosition {
    lat: number;
    lon: number;
    accuracy: number;
    timestamp: number;
    heading: number | null;
    speed: number | null;
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export class GeolocationService {
    private static isSupported(): boolean {
        return 'geolocation' in navigator;
    }

    /**
     * Check current permission status
     */
    static async checkPermission(): Promise<PermissionState> {
        if (!this.isSupported()) {
            return 'unsupported';
        }

        try {
            if ('permissions' in navigator) {
                const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                return result.state as PermissionState;
            }
            return 'prompt'; // Assume prompt if Permissions API not available
        } catch (error) {
            console.warn('Permission API not available:', error);
            return 'prompt';
        }
    }

    /**
     * Request geolocation permission and get current position
     */
    static async getCurrentPosition(): Promise<GeolocationPosition> {
        if (!this.isSupported()) {
            throw new Error('Geolocation is not supported by this browser');
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp,
                        heading: position.coords.heading,
                        speed: position.coords.speed
                    });
                },
                (error) => {
                    let errorMessage = 'Unknown geolocation error';

                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location permission denied';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out';
                            break;
                    }

                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Watch position with continuous updates
     * Returns a watchId that can be used to stop watching
     */
    static watchPosition(
        onSuccess: (position: GeolocationPosition) => void,
        onError?: (error: Error) => void
    ): number {
        if (!this.isSupported()) {
            throw new Error('Geolocation is not supported');
        }

        return navigator.geolocation.watchPosition(
            (position) => {
                onSuccess({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                    heading: position.coords.heading,
                    speed: position.coords.speed
                });
            },
            (error) => {
                if (onError) {
                    let errorMessage = 'Unknown geolocation error';

                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location permission denied';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out';
                            break;
                    }

                    onError(new Error(errorMessage));
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000 // Accept cached positions up to 30s old
            }
        );
    }

    /**
     * Stop watching position
     */
    static clearWatch(watchId: number): void {
        if (this.isSupported()) {
            navigator.geolocation.clearWatch(watchId);
        }
    }
}

export default GeolocationService;
