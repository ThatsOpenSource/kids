export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'operator' | 'viewer';
  active: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  /** Hardware / device binding claim */
  deviceFingerprint?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
