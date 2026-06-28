import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ManagedUser } from '../../../shared/models/admin.models';
import { AuthUser } from '../../../shared/models/auth.models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss'
})
export class AdminUsersComponent implements OnInit {
  user: AuthUser | null = null;
  users: ManagedUser[] = [];
  search = '';
  selectedRole = '';
  selectedStatus = '';
  loading = false;
  savingUserId = '';
  errorMessage = '';
  successMessage = '';
  currentPage = 1;
  readonly pageSize = 10;
  totalPages = 1;
  summary = {
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0
  };

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.user = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(clearError = true): void {
    this.loading = true;

    if (clearError) {
      this.errorMessage = '';
    }

    this.adminService.getUsers({
      search: this.search.trim(),
      role: this.selectedRole,
      status: this.selectedStatus,
      page: this.currentPage,
      limit: this.pageSize
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        this.users = response.data;
        this.summary = response.summary;
        this.currentPage = response.pagination.page;
        this.totalPages = response.pagination.totalPages;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'No se pudieron cargar los usuarios.';
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  clearFilters(): void {
    this.search = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadUsers();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadUsers();
  }

  saveUser(managedUser: ManagedUser): void {
    this.savingUserId = managedUser._id;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminService.updateUser(managedUser._id, {
      role: managedUser.role,
      status: managedUser.status
    }).pipe(
      finalize(() => {
        this.savingUserId = '';
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.successMessage = `Usuario ${managedUser.email} actualizado.`;
        this.loadUsers();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'No se pudo actualizar el usuario.';
        this.loadUsers(false);
      }
    });
  }

  isCurrentUser(managedUser: ManagedUser): boolean {
    return managedUser._id === this.user?.id;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
