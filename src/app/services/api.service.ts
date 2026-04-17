import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  User,
  UserResponse,
  LoginRequest,
  LoginResponse,
  UpdateInfoRequest,
  ChangePasswordRequest,
  PasswordResetRequest,
  ResetPasswordRequest,
  MapData,
  DashboardStats,
  UserStats,
  ZonePerformance,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  get baseUrl(): string { return this.API_URL; }

  // ===== AUTH ENDPOINTS =====

  /**
   * Inscription d'un nouvel utilisateur
   */
  register(user: Partial<User>): Observable<{ message: string; data: User }> {
    return this.http.post<{ message: string; data: User }>(`${this.API_URL}/auth/register`, user).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Connexion utilisateur
   */
  login(loginData: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, loginData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les informations de l'utilisateur authentifié
   */
  getAuthenticatedUser(token: string): Observable<UserResponse> {
    return this.http
      .get<UserResponse>(`${this.API_URL}/auth/agent`, {
        params: { token },
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Déconnexion
   */
  logout(): Observable<{ message: string; Logout: string }> {
    return this.http.post<{ message: string; Logout: string }>(`${this.API_URL}/auth/logout`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mise à jour des informations utilisateur
   */
  updateUserInfo(updateData: UpdateInfoRequest): Observable<{ status: string; message: string; data: User }> {
    return this.http
      .put<{ status: string; message: string; data: User }>(`${this.API_URL}/auth/profil/info`, updateData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Changement de mot de passe
   */
  changePassword(
    changePasswordData: ChangePasswordRequest
  ): Observable<{ status: string; message: string }> {
    return this.http
      .put<{ status: string; message: string }>(`${this.API_URL}/auth/change-password`, changePasswordData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Demande de réinitialisation de mot de passe
   */
  forgotPassword(forgotData: PasswordResetRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/auth/forgot-password`, forgotData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Vérification du token de réinitialisation
   */
  verifyResetToken(token: string): Observable<{ message: string; valid: boolean }> {
    return this.http.get<{ message: string; valid: boolean }>(`${this.API_URL}/auth/verify-reset-token/${token}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Réinitialisation du mot de passe avec token
   */
  resetPassword(token: string, resetData: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/auth/reset/${token}`, resetData).pipe(
      catchError(this.handleError)
    );
  }

  // ===== USER ENDPOINTS =====

  /**
   * Récupère les utilisateurs paginés
   */
  getPaginatedUsers(
    page: number = 1,
    limit: number = 15,
    search: string = ''
  ): Observable<{
    status: string;
    message: string;
    data: UserResponse[];
    pagination: {
      total_records: number;
      total_pages: number;
      current_page: number;
      page_size: number;
    };
  }> {
    return this.http
      .get<any>(`${this.API_URL}/users/all/paginate`, {
        params: { page: page.toString(), limit: limit.toString(), search },
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère tous les utilisateurs
   */
  getAllUsers(): Observable<{ status: string; message: string; data: UserResponse[] }> {
    return this.http.get<{ status: string; message: string; data: UserResponse[] }>(`${this.API_URL}/users/all`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère un utilisateur par UUID
   */
  getUser(uuid: string): Observable<{ status: string; message: string; data: UserResponse }> {
    return this.http.get<{ status: string; message: string; data: UserResponse }>(`${this.API_URL}/users/get/${uuid}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crée un nouvel utilisateur
   */
  createUser(user: Partial<User>): Observable<{ status: string; message: string; data: User }> {
    return this.http
      .post<{ status: string; message: string; data: User }>(`${this.API_URL}/users/create`, user)
      .pipe(catchError(this.handleError));
  }

  /**
   * Met à jour un utilisateur
   */
  updateUser(uuid: string, user: Partial<User>): Observable<{ status: string; message: string; data: User }> {
    return this.http
      .put<{ status: string; message: string; data: User }>(`${this.API_URL}/users/update/${uuid}`, user)
      .pipe(catchError(this.handleError));
  }

  /**
   * Supprime un utilisateur
   */
  deleteUser(uuid: string): Observable<{ status: string; message: string; data: null }> {
    return this.http
      .delete<{ status: string; message: string; data: null }>(`${this.API_URL}/users/delete/${uuid}`)
      .pipe(catchError(this.handleError));
  }

  // ===== DASHBOARD ENDPOINTS =====

  getDashboardStats(): Observable<{ status: string; data: DashboardStats }> {
    return this.http
      .get<{ status: string; data: DashboardStats }>(`${this.API_URL}/dashboard/stats`)
      .pipe(catchError(this.handleError));
  }

  getUserPerformance(): Observable<{ status: string; data: UserStats[]; total: number }> {
    return this.http
      .get<{ status: string; data: UserStats[]; total: number }>(`${this.API_URL}/dashboard/user-performance`)
      .pipe(catchError(this.handleError));
  }

  getZonePerformance(): Observable<{ status: string; data: ZonePerformance[]; total: number }> {
    return this.http
      .get<{ status: string; data: ZonePerformance[]; total: number }>(`${this.API_URL}/dashboard/zone-performance`)
      .pipe(catchError(this.handleError));
  }

  // ===== MAP ENDPOINTS =====

  getMapData(): Observable<MapData> {
    return this.http.get<MapData>(`${this.API_URL}/dashboard/map`).pipe(
      catchError(this.handleError)
    );
  }

  getMapDataByZone(zone: string): Observable<MapData> {
    return this.http
      .get<MapData>(`${this.API_URL}/dashboard/map/zone`, { params: { zone } })
      .pipe(catchError(this.handleError));
  }

  getMapDataByScore(eligible: boolean): Observable<MapData> {
    return this.http
      .get<MapData>(`${this.API_URL}/dashboard/map/score`, {
        params: { eligible: eligible.toString() },
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Gestion des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur serveur
      if (error.status === 0) {
        errorMessage = 'Pas de connexion internet. Fonctionnement hors ligne.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Erreur serveur: ${error.status}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
