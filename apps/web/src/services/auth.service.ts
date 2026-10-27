import type {
  AuthResponseDto,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
  UserDto,
} from '@shop/shared';
import { api } from '@/lib/api-client';

export const authService = {
  register: (input: RegisterInput) =>
    api.post<{ data: AuthResponseDto }>('/auth/register', input, { skipAuthRefresh: true, anonymous: true }).then((r) => r.data),
  login: (input: LoginInput) =>
    api.post<{ data: AuthResponseDto }>('/auth/login', input, { skipAuthRefresh: true, anonymous: true }).then((r) => r.data),
  logout: () => api.post<void>('/auth/logout', undefined, { skipAuthRefresh: true }),
  me: () => api.get<{ data: UserDto }>('/auth/me').then((r) => r.data),
  forgotPassword: (input: ForgotPasswordInput) =>
    api.post<{ data: { message: string; debugResetUrl?: string } }>('/auth/forgot-password', input, { anonymous: true }).then((r) => r.data),
  resetPassword: (input: ResetPasswordInput) =>
    api.post<{ data: { message: string } }>('/auth/reset-password', input, { anonymous: true }).then((r) => r.data),
  updateProfile: (input: UpdateProfileInput) => api.patch<{ data: UserDto }>('/users/me', input).then((r) => r.data),
  changePassword: (input: ChangePasswordInput) => api.post<void>('/users/me/change-password', input),
};
