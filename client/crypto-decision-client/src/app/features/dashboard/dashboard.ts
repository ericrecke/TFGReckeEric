import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent {
  user: any = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
  }

  oninit() {
    this.user = this.authService.getCurrentUser();
  }


  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}