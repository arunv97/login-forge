import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography, CircularProgress, Box } from '@mui/material';
import { useAppDispatch } from 'app/redux/hook';
import { setCredentials } from 'features/auth/slices/authSlice';
import type { SafeUserDto } from 'common/types';

const decodeJwt = (token: string): any | null => {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
        atob(base64)
            .split('')
            .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join(''),
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Failed to decode JWT", error);
        return null;
    }
};


const mapDecodedTokenToSafeUser = (decodedToken: any): SafeUserDto | null => {
    if (!decodedToken || !decodedToken.sub || !decodedToken.email) return null;
    return {
        id: decodedToken.sub,
        email: decodedToken.email,
        name: decodedToken.name || null,
        emailVerified: true, 
        provider: 'google', 
        createdAt: decodedToken.iat ? new Date(decodedToken.iat * 1000).toISOString() : new Date().toISOString(),
        updatedAt: decodedToken.iat ? new Date(decodedToken.iat * 1000).toISOString() : new Date().toISOString(),
        avatarUrl: null, 
    };
};

export const OAuthCallbackHandler: React.FC = () => {
const dispatch = useAppDispatch();
const navigate = useNavigate();
const location = useLocation();

useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');

    if (token && refreshToken) {
    const decodedToken = decodeJwt(token);
    const userForState = decodedToken ? mapDecodedTokenToSafeUser(decodedToken) : null;

    if (userForState) {
        dispatch(setCredentials({ user: userForState, token, refreshToken }));
        navigate('/profile', { replace: true });
    } else {
        console.error('Failed to create user object from decoded token for OAuth callback.');
        navigate('/login', { replace: true, state: { error: 'OAuth login failed to process user data.' } });
    }
    } else {
    console.error('Missing token or refreshToken in OAuth callback.');
    navigate('/login', { replace: true, state: { error: 'OAuth login failed, missing tokens.' } });
    }
}, [dispatch, location.search, navigate]);

return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
    <CircularProgress />
    <Typography sx={{ ml: 2 }}>Processing login...</Typography>
    </Box>
);
};