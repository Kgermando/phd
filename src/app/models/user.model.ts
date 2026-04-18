// =====================================================
// USER MODELS - Aligné avec le backend Go/Fiber
// =====================================================

export interface User {
  uuid: string;
  fullname: string;
  email: string;
  telephone: string;
  password: string;
  password_confirm?: string;
  role: 'Directeur' | 'Superviseur' | 'Producteur' | 'Admin';
  permission: string;
  status: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserResponse {
  uuid: string;
  fullname: string;
  email: string;
  telephone: string;
  password?: string;
  password_confirm?: string;
  role: 'Directeur' | 'Superviseur' | 'Producteur' | 'Admin';
  permission: string;
  status: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LoginRequest {
  identifier: string; // email ou telephone
  password: string;
}

export interface LoginResponse {
  message: string;
  data: string; // JWT token
}

export interface PasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
  password_confirm: string;
}

export interface UpdateInfoRequest {
  fullname: string;
  email: string;
  telephone: string;
  direction_uuid?: string;
  bureau_uuid?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  password: string;
  password_confirm: string;
}

export interface UserStats {
  user_uuid: string;
  user_fullname: string;
  total_producers: number;
  eligible_producers: number;
  non_eligible_producers: number;
  avg_score: number;
  completion_rate: number;
  last_survey_date: string | null;
}
