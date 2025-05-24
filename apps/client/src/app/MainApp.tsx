import React, { useEffect, ComponentType } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CssBaseline, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import theme from 'common/lib/theme';
import { MainLayout } from 'common/components/layout/MainLayout';
import { HomePage } from 'features/home/pages/HomePage';
import { LoginPage } from 'features/auth/pages/LoginPage';
import { RegisterPage } from 'features/auth/pages/RegisterPage';
import { ProfilePage } from 'features/profile/pages/ProfilePage';
import { ProtectedRoute } from 'features/auth/routes/ProtectedRoute';
import { useAppDispatch  } from 'app/redux/hooks';
import { loadUserFromStorage, setCredentials } from 'features/auth/slices/authSlice'; 
import { LoginResponsePayload, SafeUserDto } from 'common/types';

const OAuthCallbackHandler: ComponentType = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');


    if (token && refreshToken) {
      const mockUserFromToken = (decodedToken: any): SafeUserDto => {
        return {
          id: decodedToken.sub,
          email: decodedToken.email,
          name: decodedToken.name || null,
          emailVerified: true, 
          provider: 'google',
          createdAt: new Date(decodedToken.iat * 1000).toISOString(),
          updatedAt: new Date(decodedToken.iat * 1000).toISOString(),
          avatarUrl: null, 
        };
      };
      
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decodedToken = JSON.parse(jsonPayload);

        const userForState = mockUserFromToken(decodedToken);
        dispatch(setCredentials({ user: userForState, token, refreshToken }));
        navigate('/profile', { replace: true });

      } catch(e) {
        console.error("Error processing OAuth token:", e);
        navigate('/login', { replace: true });
      }


    } else {
      navigate('/login', { replace: true });
    }
  }, [dispatch, location, navigate]);

  return <Typography>Processing login...</Typography>; // Or a loading spinner
};


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
          
          <Route path="/auth/oauth-callback" element={<OAuthCallbackHandler />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </ThemeProvider>
  );
}

export default App;