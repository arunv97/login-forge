import React from 'react';
import { Typography, Container } from '@mui/material';

export function LoginPage() {
  return (
    <Container sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h4">Login Page</Typography>
    </Container>
  );
}