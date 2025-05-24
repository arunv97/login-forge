export interface SafeUserDto {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
  avatarUrl?: string | null;
}

export interface LoginResponsePayload {
  message: string;
  user: SafeUserDto;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponsePayload {
  accessToken: string;
  refreshToken?: string;
  message: string;
}
