import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
    User,
    UserResponse,
    LoginRequest,
    LoginResponse,
    UpdateInfoRequest,
    ChangePasswordRequest,
    PasswordResetRequest,
    ResetPasswordRequest,
} from '../../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
    private readonly http = inject(HttpClient);
    private readonly API_URL = environment.apiUrl;

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
     * Récupère les infos de l'utilisateur authentifié
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
    updateUserInfo(updateData: UpdateInfoRequest): Observable<{ status: string; message: string; data: UserResponse }> {
        return this.http
            .put<{ status: string; message: string; data: UserResponse }>(`${this.API_URL}/auth/profil/info`, updateData)
            .pipe(catchError(this.handleError));
    }

    /**
     * Changement de mot de passe
     */
    changePassword(changePasswordData: ChangePasswordRequest): Observable<{ status: string; message: string }> {
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

    /**
     * Gestion des erreurs HTTP
     */
    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Une erreur est survenue';

        if (error.error instanceof ErrorEvent) {
            errorMessage = `Erreur: ${error.error.message}`;
        } else {
            if (error.status === 0) {
                errorMessage = 'Pas de connexion internet.';
            } else if (error.error?.message) {
                errorMessage = error.error.message;
            } else {
                errorMessage = `Erreur serveur: ${error.status}`;
            }
        }

        return throwError(() => new Error(errorMessage));
    }
}
