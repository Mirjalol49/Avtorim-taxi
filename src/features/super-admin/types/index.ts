export interface SuperAdminAccount {
    id: string; // Tenant/Account ID (Firebase UID)
    accountName: string;
    ownerEmail: string;
    status: 'active' | 'disabled';
    createdAt?: any; // Firestore Timestamp
    updatedAt?: any;
}

export interface CreateAccountDTO {
    email: string;
    accountName: string;
    initialAdminName: string;
}

export interface ApiResponse<T> {
    success?: boolean;
    message?: string;
    error?: string;
    data?: T;
}
