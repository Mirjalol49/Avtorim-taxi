export interface DriverLocation {
    driver_id: string;
    latitude: number;
    longitude: number;
    last_update_ts: number;
}

const API_URL = 'http://localhost:3000/api/drivers';

export const fetchDriverLocations = async (): Promise<DriverLocation[]> => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch driver locations');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching driver locations:', error);
        return [];
    }
};
