export interface CarDocument {
    name: string;
    type: string;      // MIME type
    data: string;      // base64 data URL
    category: 'id_card' | 'insurance' | 'technical_passport' | 'other';
}

export interface Car {
    id: string;
    fleetId?: string;
    name: string;           // e.g. "Chevrolet Cobalt"
    licensePlate: string;   // e.g. "01 A 777 AA"
    avatar?: string;        // car photo
    documents?: CarDocument[];
    assignedDriverId?: string | null;
    dailyPlan?: number;     // required daily income amount
    isDeleted?: boolean;
    createdAt?: number;
}
