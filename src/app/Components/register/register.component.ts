// src/app/Components/register/register.component.ts

import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/Authentication/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule,RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'] 
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    return password && confirmPassword && password.value === confirmPassword.value ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;

    const credentials = {
      username: this.registerForm.value.username,
      password: this.registerForm.value.password
    };

    this.authService.register(credentials).subscribe({
      next: () => {
        this.successMessage = '¡Registro exitoso! Serás redirigido al login en 3 segundos.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        if (err.status === 409) { 
          this.errorMessage = 'El nombre de usuario ya existe. Por favor, elige otro.';
        } else {
          this.errorMessage = 'Ocurrió un error durante el registro.';
        }
        console.error('Error de registro:', err);
      }
    });
  }
}