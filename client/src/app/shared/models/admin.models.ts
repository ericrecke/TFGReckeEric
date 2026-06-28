export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'inactive';

export interface ManagedUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersResponse {
  message: string;
  data: ManagedUser[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateManagedUserRequest {
  role: UserRole;
  status: UserStatus;
}

export interface AdminUserResponse {
  message: string;
  data: ManagedUser;
}
