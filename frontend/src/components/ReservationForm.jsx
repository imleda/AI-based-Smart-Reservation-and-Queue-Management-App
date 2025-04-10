import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Alert,
  Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const SERVICE_TYPES = [
  { value: 'dine-in', label: 'Dine-in' },
  { value: 'takeout', label: 'Takeout' },
  { value: 'delivery', label: 'Delivery' }
];

const ReservationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    service_type: 'dine-in',
    party_size: 1,
    location: 'Main Dining'
  });

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [loading, setLoading] = useState(false);
  const [reservationId, setReservationId] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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

      setReservationId(data.id);
      setNotification({
        open: true,
        message: `Reservation created successfully! Your reservation number is ${data.id} and you are position ${data.queue_position} in the queue.`,
        severity: 'success'
      });

      // Clear form
      setFormData({
        name: '',
        phone: '',
        email: '',
        service_type: 'dine-in',
        party_size: 1,
        location: 'Main Dining'
      });

      // Redirect to queue status page after 3 seconds
      setTimeout(() => {
        navigate(`/queue-status/${data.id}`);
      }, 3000);

    } catch (error) {
      setNotification({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom align="center">
        Make a Reservation
      </Typography>

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          margin="normal"
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>Service Type</InputLabel>
          <Select
            name="service_type"
            value={formData.service_type}
            onChange={handleChange}
            required
          >
            {SERVICE_TYPES.map(type => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Party Size"
          name="party_size"
          type="number"
          value={formData.party_size}
          onChange={handleChange}
          margin="normal"
          required
          inputProps={{ min: 1, max: 20 }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 3 }}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Make Reservation'}
        </Button>

        {reservationId && (
          <Box mt={2}>
            <Alert severity="info">
              Your Reservation ID: {reservationId}
              <br />
              Please save this number to check your status.
            </Alert>
          </Box>
        )}
      </form>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity={notification.severity}
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default ReservationForm; 