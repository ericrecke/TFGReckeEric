import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AdminUserResponse,
  AdminUsersResponse,
  UpdateManagedUserRequest
} from '../../shared/models/admin.models';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = 'http://localhost:3000/api/admin/users';

  constructor(private http: HttpClient) {}

  getUsers(filters: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Observable<AdminUsersResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page ?? 1))
      .set('limit', String(filters.limit ?? 10));

    if (filters.search) {
      params = params.set('search', filters.search);
    }

    if (filters.role) {
      params = params.set('role', filters.role);
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<AdminUsersResponse>(this.apiUrl, { params });
  }

  updateUser(id: string, data: UpdateManagedUserRequest): Observable<AdminUserResponse> {
    return this.http.patch<AdminUserResponse>(`${this.apiUrl}/${id}`, data);
  }
}
