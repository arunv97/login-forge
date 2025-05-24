import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from 'app/redux/store';
import type { SafeUserDto } from 'common/types';

export interface AuthState {
  user: SafeUserDto | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: SafeUserDto;
        token: string;
        refreshToken: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload.token);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    setRefreshedTokens: (
      state,
      action: PayloadAction<{ token: string; refreshToken?: string }>
    ) => {
      state.token = action.payload.token;
      localStorage.setItem('accessToken', action.payload.token);
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    loadUserFromStorage: (state) => {
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const userString = localStorage.getItem('user');
      if (token && userString && refreshToken) {
        try {
          state.user = JSON.parse(userString) as SafeUserDto;
          state.token = token;
          state.refreshToken = refreshToken;
          state.isAuthenticated = true;
        } catch (e) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      } else {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      }
    },
  },
});

export const {
  setCredentials,
  setRefreshedTokens,
  logout,
  loadUserFromStorage,
} = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentUser = (state: RootState): SafeUserDto | null =>
  state.auth.user;
export const selectCurrentToken = (state: RootState): string | null =>
  state.auth.token;
export const selectCurrentRefreshToken = (state: RootState): string | null =>
  state.auth.refreshToken;
export const selectIsAuthenticated = (state: RootState): boolean =>
  state.auth.isAuthenticated;
