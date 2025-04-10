import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate
} from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme
} from '@mui/material';
import ReservationForm from './components/ReservationForm';
import QueueStatus from './components/QueueStatus';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import NewReservation from './components/NewReservation';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const App = () => {
  const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem('sessionId'));

  const handleLogout = () => {
    localStorage.removeItem('sessionId');
    setIsAdmin(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Queue Management System
              </Typography>
              
              <Button color="inherit" component={Link} to="/">
                New Reservation
              </Button>
              
              <Button color="inherit" component={Link} to="/status">
                Check Status
              </Button>
              
              {isAdmin ? (
                <>
                  <Button color="inherit" component={Link} to="/admin">
                    Dashboard
                  </Button>
                  <Button color="inherit" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <Button color="inherit" component={Link} to="/admin/login">
                  Admin Login
                </Button>
              )}
            </Toolbar>
          </AppBar>

          <Container sx={{ mt: 4 }}>
            <Routes>
              <Route path="/" element={<NewReservation />} />
              <Route path="/status" element={<QueueStatus />} />
              <Route
                path="/admin"
                element={
                  isAdmin ? (
                    <AdminDashboard />
                  ) : (
                    <Navigate to="/admin/login" replace />
                  )
                }
              />
              <Route
                path="/admin/login"
                element={
                  !isAdmin ? (
                    <AdminLogin onLoginSuccess={() => setIsAdmin(true)} />
                  ) : (
                    <Navigate to="/admin" replace />
                  )
                }
              />
              <Route path="/queue-status" element={<QueueStatus />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App; 