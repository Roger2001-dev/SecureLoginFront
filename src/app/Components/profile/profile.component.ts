import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/Authentication/auth.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profile: any;
  private apiUrl = environment.apiUrl; 

  mfaSetupInfo: { manualEntryKey: string, qrCodeImageUrl: string } | null = null;
  mfaEnableForm: FormGroup;
  mfaMessage: string | null = null;
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.mfaEnableForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
    });
  }

  ngOnInit(): void {
    this.fetchProfile();
  }

  fetchProfile(): void {
    this.http.get(`${this.apiUrl}/api/Profile`).subscribe({
      next: (data) => {
        this.profile = data;
      },
      error: (err) => {
        console.error('Error al obtener el perfil. Puede que el token haya expirado.', err);
        this.authService.logout();
      }
    });
  }

  onLogout(): void {
    this.authService.logout();
  }
  setupMfa(): void {
    this.http.post<{ manualEntryKey: string, qrCodeImageUrl: string }>(`${this.apiUrl}/api/Mfa/setup`, {}).subscribe({
      next: (data) => {
        this.mfaSetupInfo = data;
        this.mfaMessage = null;
      },
      error: (err) => {
        this.mfaMessage = 'Error al iniciar la configuración de MFA.';
        console.error(err);
      }
    });
  }

  enableMfa(): void {
    if (this.mfaEnableForm.valid) {
      const code = this.mfaEnableForm.value.code;
      this.http.post(`${this.apiUrl}/api/Mfa/enable`, { code }).subscribe({
        next: () => {
          this.mfaMessage = '¡MFA activado con éxito!';
          this.mfaSetupInfo = null;
          this.fetchProfile();
        },
        error: (err) => {
          this.mfaMessage = 'El código es incorrecto. Inténtalo de nuevo.';
          console.error(err);
        }
      });
    }
  }

}