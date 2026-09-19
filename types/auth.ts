export type Role = "student" | "mentor" | "academy_admin";

export interface Profile {
  id: string;
  role: Role;
  fullName: string;
  academyId: string | null;
}

export interface SignupInput {
  email: string;
  password: string;
  fullName: string;
  role: Extract<Role, "student" | "academy_admin">;
  academyName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_in_use"
  | "validation_error"
  | "network_error"
  | "unknown_error";

export interface AuthResult<T> {
  ok: boolean;
  data?: T;
  error?: { code: AuthErrorCode; message: string };
}
