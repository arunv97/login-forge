import React from 'react';
import { Typography, Container } from '@mui/material';
import { useAppSelector } from 'app/redux/hook';
import { selectCurrentUser } from 'features/auth/slices/authSlice';

export function ProfilePage() {
  const user = useAppSelector(selectCurrentUser);
  return (
    <Container>
      <Typography variant="h4">User Profile</Typography>
      {user ? (
        <>
          <Typography>Name: {user.name || 'N/A'}</Typography>
          <Typography>Email: {user.email}</Typography>
        </>
      ) : (
        <Typography>Loading user data...</Typography>
      )}
    </Container>
  );
}