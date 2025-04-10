import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Snackbar,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  Person, 
  Phone, 
  Email, 
  Group, 
  Restaurant, 
  LocationOn,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const steps = ['Personal Information', 'Reservation Details', 'Confirmation'];

const NewReservation = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    party_size: '',
    service_type: 'dine-in',
    location: 'Main Dining'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [reservationNumber, setReservationNumber] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 0) {
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
      else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) 
        newErrors.phone = 'Please enter a valid 10-digit phone number';
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        newErrors.email = 'Please enter a valid email address';
    } else if (step === 1) {
      if (!formData.party_size) newErrors.party_size = 'Party size is required';
      else if (formData.party_size < 1) newErrors.party_size = 'Party size must be at least 1';
      else if (formData.party_size > 20) newErrors.party_size = 'Maximum party size is 20';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(activeStep)) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reservation');
      }

      setReservationNumber(data.reservation.id);
      setSuccess(true);
      setActiveStep(2); // Move to confirmation step
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewReservation = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      party_size: '',
      service_type: 'dine-in',
      location: 'Main Dining'
    });
    setActiveStep(0);
    setSuccess(false);
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                error={!!errors.phone}
                helperText={errors.phone}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email (Optional)"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Party Size"
                name="party_size"
                type="number"
                value={formData.party_size}
                onChange={handleChange}
                error={!!errors.party_size}
                helperText={errors.party_size}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Group />
                    </InputAdornment>
                  ),
                  inputProps: { min: 1, max: 20 }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Service Type</InputLabel>
                <Select
                  name="service_type"
                  value={formData.service_type}
                  onChange={handleChange}
                  label="Service Type"
                  startAdornment={
                    <InputAdornment position="start">
                      <Restaurant />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="dine-in">Dine-in</MenuItem>
                  <MenuItem value="takeout">Takeout</MenuItem>
                  <MenuItem value="delivery">Delivery</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Location</InputLabel>
                <Select
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  label="Location"
                  startAdornment={
                    <InputAdornment position="start">
                      <LocationOn />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="Main Dining">Main Dining</MenuItem>
                  <MenuItem value="Outdoor">Outdoor</MenuItem>
                  <MenuItem value="Private Room">Private Room</MenuItem>
                  {formData.service_type === 'takeout' && (
                    <MenuItem value="Takeout Counter">Takeout Counter</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Reservation Confirmed!
              </Typography>
              <Typography variant="body1" gutterBottom>
                Your reservation number is: <strong>#{reservationNumber}</strong>
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Reservation Details:
              </Typography>
              <Typography variant="body2">
                Name: {formData.name}
              </Typography>
              <Typography variant="body2">
                Party Size: {formData.party_size}
              </Typography>
              <Typography variant="body2">
                Service Type: {formData.service_type}
              </Typography>
              <Typography variant="body2">
                Location: {formData.location}
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleNewReservation}
                  sx={{ mr: 2 }}
                >
                  Make Another Reservation
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/queue-status')}
                >
                  Check Queue Status
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 2 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          New Reservation
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {getStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNewReservation}
                >
                  Make Another Reservation
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={activeStep === steps.length - 2 ? handleSubmit : handleNext}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : activeStep === steps.length - 2 ? 'Submit' : 'Next'}
                </Button>
              )}
            </Box>
          </Box>
        </form>
      </Paper>

      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccess(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Reservation created successfully! Your number is #{reservationNumber}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NewReservation; 