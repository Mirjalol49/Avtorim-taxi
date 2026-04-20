export interface SuperAdminAccount {
    id: string;
    username: string;
    accountName: string;
    ownerEmail: string;
    role: 'admin' | 'super_admin';
    status: 'active' | 'disabled';
    createdAt?: number;
}

export interface CreateAccountDTO {
    email?: string;
    username?: string;
    accountName?: string;
    initialAdminName?: string;
    password?: string;
}

export interface ApiResponse<T> {
    success?: boolean;
    message?: string;
    error?: string;
    data?: T;
}
