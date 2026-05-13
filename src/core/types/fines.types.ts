export type FineStatus = 'UNPAID' | 'PAID';

export interface Fine {
    id: string;
    fleetId: string;
    driverId: string;
    carId?: string | null;
    amount: number;
    fineDate: number; // MS
    status: FineStatus;
    description?: string;
    photoUrl?: string | null;
    createdMs: number;
    updatedMs: number;
    
    // Joined fields (for UI)
    driverName?: string;
    carName?: string;
}
