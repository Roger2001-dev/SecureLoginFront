import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl; 
  private readonly TOKEN_KEY = 'authToken';

  private readonly ACCESS_TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';

  private inactivityTimeout = 30 * 60 * 1000; // 30 minutos
  private inactivityTimer: any;

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.setupInactivityCheck();
    this.setupTokenRefresh();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/Auth/login`, credentials).pipe(
      tap((response: any) => {
        if (response.accessToken && response.refreshToken) {
          this.storeTokens(response);
        }
      })
    );
  }

  verifyMfa(username: string, code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/Auth/verify-mfa`, { username, code }).pipe(
      tap((response: any) => {
        if (response.accessToken && response.refreshToken) {
          this.storeTokens(response);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.isAuthenticatedSubject.next(false);
    this.stopTimers();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

   getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
  
refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http.post(`${this.apiUrl}/api/Auth/refresh-token`, { refreshToken }).pipe(
      tap((tokens: any) => {
        this.storeTokens(tokens);
      })
    );
  }

  register(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/Auth/register`, credentials);
  }

  private setupInactivityCheck(): void {
    this.resetInactivityTimer();
    ['mousemove', 'keypress', 'click'].forEach(event => {
      document.addEventListener(event, () => this.resetInactivityTimer());
    });
  }

  private resetInactivityTimer(): void {
    clearTimeout(this.inactivityTimer);
    if (this.hasToken()) {
      this.inactivityTimer = setTimeout(() => this.logout(), this.inactivityTimeout);
    }
  }

  private setupTokenRefresh(): void {
    const token = this.getToken();
    if (!token) return;

    try {
      const decodedToken: any = jwtDecode(token);
      const expirationDate = decodedToken.exp * 1000;
      const now = Date.now();
      const timeUntilRefresh = expirationDate - now - (60 * 1000);

      if (timeUntilRefresh > 0) {
        setTimeout(() => {
          console.warn('El token está a punto de expirar. Por seguridad, se cerrará la sesión.');
          this.logout();
        }, timeUntilRefresh);
      } else {
        console.warn('Token expirado o casi expirado al iniciar. Cerrando sesión.');
        this.logout();
      }
    } catch (e) {
      console.error('Error al decodificar el token. Cerrando sesión.', e);
      this.logout();
    }
  }

  private stopTimers(): void {
    clearTimeout(this.inactivityTimer);
  }

  private storeTokens(tokens: { accessToken: string, refreshToken: string }): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.isAuthenticatedSubject.next(true);
    this.resetInactivityTimer();
    this.setupTokenRefresh(); 
  }
}