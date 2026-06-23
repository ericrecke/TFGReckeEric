export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

export interface LoginResponse {
    message: string;
    user: AuthUser;
    token: string;
}

export interface RegisterResponse {
    message: string;
    user: AuthUser;
}
