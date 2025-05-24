import React from 'react';
import { Typography, Container } from '@mui/material';

export function HomePage() {
  return (
    <Container>
      <Typography variant="h3" gutterBottom>
        Welcome to LoginForge!
      </Typography>
      <Typography variant="body1">
        This is the homepage. Dummy content goes here.
      </Typography>
    </Container>
  );
}
