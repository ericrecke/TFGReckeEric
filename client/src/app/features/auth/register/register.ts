import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  private isPasswordSecure(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  private isEmailValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email.trim());
  }

  private getRegisterErrorMessage(error: any): string {
    const message = error.error?.message;

    if (message?.includes('Password must')) {
      return 'La contrasena debe tener al menos 8 caracteres, una mayuscula, una minuscula, un numero y un caracter especial.';
    }

    if (message?.includes('Email already in use')) {
      return 'El email ya esta registrado.';
    }

    return message || 'Error al registrar usuario.';
  }

  register(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Todos los campos son obligatorios.';
      return;
    }

    if (!this.isEmailValid(this.email)) {
      this.errorMessage = 'Ingrese un email valido.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contrasenas no coinciden.';
      return;
    }

    if (!this.isPasswordSecure(this.password)) {
      this.errorMessage = 'La contrasena debe tener al menos 8 caracteres, una mayuscula, una minuscula, un numero y un caracter especial.';
      return;
    }

    this.loading = true;

    this.authService
      .register({
        name: this.name.trim(),
        email: this.email.trim().toLowerCase(),
        password: this.password
      })
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: () => {
          this.successMessage = 'Usuario registrado correctamente.';
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.errorMessage = this.getRegisterErrorMessage(error);
        }
      });
  }
}
