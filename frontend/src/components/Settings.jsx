import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Divider,
  Alert,
  Snackbar,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import axios from 'axios';

const Settings = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: false,
    smsNotifications: false,
    language: 'en',
    theme: 'light',
    defaultServiceType: 'dine-in',
    defaultLocation: 'Main Dining',
  });

  const [adminSettings, setAdminSettings] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchAdminSettings();
    }
    // Request notification permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }, []);

  const fetchAdminSettings = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAdminSettings(response.data);
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to fetch admin settings',
        severity: 'error'
      });
    }
  };

  const handleSettingChange = (setting) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleAdminSettingChange = async (setting, value) => {
    try {
      await axios.put('http://localhost:5000/api/admin/settings',
        { [setting]: value },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSnackbar({
        open: true,
        message: 'Settings updated successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to update settings',
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Settings
          </Typography>
        </Grid>

        {/* User Preferences */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Preferences
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Push Notifications"
                  secondary="Receive notifications about queue updates"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={settings.notifications}
                    onChange={handleSettingChange('notifications')}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Email Notifications"
                  secondary="Receive updates via email"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={settings.emailNotifications}
                    onChange={handleSettingChange('emailNotifications')}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="SMS Notifications"
                  secondary="Receive updates via SMS"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={settings.smsNotifications}
                    onChange={handleSettingChange('smsNotifications')}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <FormControl fullWidth>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={settings.language}
                    onChange={handleSettingChange('language')}
                    label="Language"
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
              <ListItem>
                <FormControl fullWidth>
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={settings.theme}
                    onChange={handleSettingChange('theme')}
                    label="Theme"
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="system">System</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Default Queue Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Default Queue Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Default Service Type</InputLabel>
                  <Select
                    value={settings.defaultServiceType}
                    onChange={handleSettingChange('defaultServiceType')}
                    label="Default Service Type"
                  >
                    <MenuItem value="dine-in">Dine-in</MenuItem>
                    <MenuItem value="takeout">Takeout</MenuItem>
                    <MenuItem value="delivery">Delivery</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Default Location</InputLabel>
                  <Select
                    value={settings.defaultLocation}
                    onChange={handleSettingChange('defaultLocation')}
                    label="Default Location"
                  >
                    <MenuItem value="Main Dining">Main Dining</MenuItem>
                    <MenuItem value="Outdoor">Outdoor</MenuItem>
                    <MenuItem value="Private Room">Private Room</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Admin Settings */}
        {isAdmin && adminSettings && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Admin Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Maximum Wait Time (minutes)"
                    type="number"
                    value={adminSettings.settings.max_wait_time}
                    onChange={(e) => handleAdminSettingChange('max_wait_time', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Notification Interval (minutes)"
                    type="number"
                    value={adminSettings.settings.notification_interval}
                    onChange={(e) => handleAdminSettingChange('notification_interval', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={adminSettings.settings.auto_cleanup}
                        onChange={(e) => handleAdminSettingChange('auto_cleanup', e.target.checked)}
                      />
                    }
                    label="Auto Cleanup Completed Entries"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
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

export default Settings; 