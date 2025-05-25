import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import theme from 'common/lib/theme';
import { MainLayout } from 'common/components/layout/MainLayout';
import { HomePage } from 'features/home/pages/HomePage';
import { LoginPage } from 'features/auth/pages/LoginPage';
import { RegisterPage } from 'features/auth/pages/RegisterPage';
import { ProfilePage } from 'features/profile/pages/ProfilePage';
import { OAuthCallbackHandler } from 'features/auth/components/OAuthCallbackHandler';
import { useAppDispatch } from 'app/redux/hook';
import { loadUserFromStorage } from 'features/auth/slices/authSlice';
import { ProtectedRoute } from 'features/auth/routes/ProtectedRoute';

export function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/auth/oauth-callback"
            element={<OAuthCallbackHandler />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </ThemeProvider>
  );
}

export default App;
