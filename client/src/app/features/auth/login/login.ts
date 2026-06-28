import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  email = '';
  password = '';

  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  login(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Email y contrasena son obligatorios.';
      return;
    }

    this.loading = true;

    this.authService
      .login({
        email: this.email,
        password: this.password
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.loading = false;
          const message = error.error?.message;

          if (message === 'User account is inactive') {
            this.errorMessage = 'La cuenta esta inactiva. Contacte a un administrador.';
          } else if (message === 'Invalid credentials') {
            this.errorMessage = 'Email o contrasena incorrectos.';
          } else {
            this.errorMessage = message || 'Error al iniciar sesion.';
          }
        }
      });
  }
}
