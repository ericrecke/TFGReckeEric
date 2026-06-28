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
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
}

export interface LoginResponse {
    message: string;
    user: AuthUser;
    token: string;
    refreshToken: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface RefreshTokenResponse extends LoginResponse {}

export interface RegisterResponse extends LoginResponse {}
