// src/app/Components/login/login.component.ts

import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; // Asegúrate que Validators esté importado
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/Authentication/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  isMfaStep = false; 
  private usernameForMfa: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      mfaCode: [''] 
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    
    if (this.isMfaStep) {
      this.verifyMfaCode();
    } else {
      this.submitCredentials();
    }
  }

  private submitCredentials(): void {
    const credentials = {
      username: this.loginForm.value.username,
      password: this.loginForm.value.password,
    };

    this.usernameForMfa = credentials.username; 
    this.authService.login(credentials).subscribe({
      next: (response) => {
        if (response.mfaRequired) {
          this.isMfaStep = true;
          this.errorMessage = null;
          this.loginForm.get('username')?.disable();
          this.loginForm.get('password')?.disable();

          this.loginForm.get('mfaCode')?.setValidators([Validators.required, Validators.pattern('^[0-9]{6}$')]);
          this.loginForm.get('mfaCode')?.updateValueAndValidity();

        } else {
          this.router.navigate(['/profile']);
        }
      },
      error: (err) => {
        this.errorMessage = 'Credenciales incorrectas.';
        console.error('Error de login:', err);
      },
    });
  }

  private verifyMfaCode(): void {
    const mfaCode = this.loginForm.value.mfaCode;
    if (mfaCode && this.usernameForMfa) {
      this.authService.verifyMfa(this.usernameForMfa, mfaCode).subscribe({
        next: () => {
          this.router.navigate(['/profile']);
        },
        error: (err) => {
          this.errorMessage = 'Código MFA incorrecto.';
          console.error('Error de verificación MFA:', err);
        }
      });
    }
  }
}