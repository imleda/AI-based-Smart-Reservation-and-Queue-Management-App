import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { io } from 'socket.io-client';
import axios from 'axios';

const CheckIn = () => {
  const [formData, setFormData] = useState({
    name: '',
    partySize: 1,
    serviceType: 'dine-in',
    location: 'Main Dining'
  });
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queueStatus, setQueueStatus] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socket.on('queue_update', (data) => {
      setQueueStatus(prev => ({
        ...prev,
        queueLength: data.queueLength,
        estimatedWaitTime: data.estimatedWaitTime
      }));
    });

    socket.on('status_update', (data) => {
      if (data.entryId === formData.entryId) {
        setSnackbar({
          open: true,
          message: `Your status has been updated to: ${data.newStatus}`,
          severity: 'info'
        });
      }
    });

    fetchData();
    return () => socket.disconnect();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, queueRes] = await Promise.all([
        axios.get('http://localhost:5000/api/services'),
        axios.get('http://localhost:5000/api/queue-status', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setServices(servicesRes.data);
      setQueueStatus(queueRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch data');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/check-in', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setFormData(prev => ({ ...prev, entryId: response.data.entryId }));
      setSnackbar({
        open: true,
        message: `Successfully joined queue. Your position: ${response.data.queuePosition}`,
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to join queue',
        severity: 'error'
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Reset location when service type changes
      if (name === 'serviceType') {
        newData.location = services[value].locations[0];
      }
      
      return newData;
    });
  };

  if (loading) return <LinearProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 2 }}>
      <Grid container spacing={3}>
        {/* Queue Status Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Queue Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography color="textSecondary">
                    Queue Length
                  </Typography>
                  <Typography variant="h4">
                    {queueStatus?.queueLength || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="textSecondary">
                    Estimated Wait Time
                  </Typography>
                  <Typography variant="h4">
                    {queueStatus?.estimatedWaitTime ? `${Math.round(queueStatus.estimatedWaitTime)} min` : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Check-in Form */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Join the Queue
            </Typography>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Party Size"
                    name="partySize"
                    type="number"
                    value={formData.partySize}
                    onChange={handleChange}
                    required
                    inputProps={{ min: 1, max: services?.[formData.serviceType]?.max_party_size }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Service Type</InputLabel>
                    <Select
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleChange}
                      label="Service Type"
                      required
                    >
                      {services && Object.entries(services).map(([key, service]) => (
                        <MenuItem key={key} value={key}>
                          {service.name}
                        </MenuItem>
                      ))}
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
                      required
                    >
                      {services && services[formData.serviceType]?.locations.map(location => (
                        <MenuItem key={location} value={location}>
                          {location}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                  >
                    Join Queue
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CheckIn; 