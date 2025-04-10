import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Snackbar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart, Bar } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend
} from 'chart.js';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const AdminDashboard = () => {
  const [queue, setQueue] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalReservations: 0,
    averageWaitTime: 0,
    peakHours: [],
    currentCapacity: '0%',
    dailyStats: [],
    serviceTypeDistribution: []
  });
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [pollingInterval, setPollingInterval] = useState(null);
  const [waitTimeTrends, setWaitTimeTrends] = useState([]);
  const navigate = useNavigate();

  const headers = {
    'Content-Type': 'application/json',
    'X-Session-ID': localStorage.getItem('sessionId')
  };

  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      navigate('/admin/login');
      return;
    }

    fetchQueue();
    fetchAnalytics();

    const interval = setInterval(() => {
      fetchQueue();
      fetchAnalytics();
    }, 10000);

    setPollingInterval(interval);

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [navigate]);

  const fetchQueue = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/queue', { headers });
      if (response.data) {
        setQueue(response.data);
        setError('');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/admin/login');
      } else {
        setError('Failed to fetch queue data');
        console.error('Queue fetch error:', error);
      }
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/analytics', { headers });
      if (response.data) {
        setAnalytics(response.data);
      setError('');
      }
    } catch (error) {
      setError('Failed to fetch analytics data');
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWaitTimeTrends = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/analytics/wait-times', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch wait time trends');
      }
      
      const data = await response.json();
      setWaitTimeTrends(data);
    } catch (error) {
      console.error('Error fetching wait time trends:', error);
    }
  };

  useEffect(() => {
    fetchWaitTimeTrends();
    const interval = setInterval(fetchWaitTimeTrends, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (entryId, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/queue/${entryId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSnackbar({ open: true, message: 'Status updated successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
  };

  const handleDelete = async (entryId) => {
    try {
      await axios.delete(`http://localhost:5000/api/admin/queue/${entryId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSnackbar({ open: true, message: 'Entry deleted successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete entry', severity: 'error' });
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/reservations/${selectedReservation.id}/status`,
        { status, notes },
        { headers }
      );
      setDialogOpen(false);
      await fetchQueue();
      await fetchAnalytics();
      setError('');
    } catch (error) {
      setError('Failed to update status');
      console.error('Status update error:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/export', { headers });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'queue-data.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to export data');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting':
        return 'warning';
      case 'seated':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Analytics Overview */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Analytics Overview</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4">{analytics.totalReservations}</Typography>
                  <Typography color="textSecondary">Total Reservations</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4">{analytics.averageWaitTime}</Typography>
                  <Typography color="textSecondary">Avg. Wait Time</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4">{analytics.currentCapacity}</Typography>
                  <Typography color="textSecondary">Current Capacity</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4">{analytics.peakHours.join(', ')}</Typography>
                  <Typography color="textSecondary">Peak Hours</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Queue Management */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Queue Management</Typography>
              <Box>
                <IconButton onClick={fetchQueue} color="primary">
                  <RefreshIcon />
                </IconButton>
                <IconButton onClick={handleExport} color="primary">
                  <DownloadIcon />
                </IconButton>
              </Box>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Party Size</TableCell>
                    <TableCell>Service Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Wait Time</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queue.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>{reservation.name}</TableCell>
                      <TableCell>{reservation.party_size}</TableCell>
                      <TableCell>{reservation.service_type}</TableCell>
                      <TableCell>
                        <Chip
                          label={reservation.status}
                          color={getStatusColor(reservation.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {Math.floor((new Date() - new Date(reservation.created_at)) / 60000)} min
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedReservation(reservation);
                            setStatus(reservation.status);
                            setNotes(reservation.notes || '');
                            setDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Analytics Charts */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Daily Reservations</Typography>
              <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                  <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Service Type Distribution</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.serviceTypeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {analytics.serviceTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
              </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Add Wait Time Trends Chart */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Wait Time Trends
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={waitTimeTrends}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Average Wait Time (min)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="average_wait"
                    name="Average Wait Time"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="max_wait"
                    name="Maximum Wait Time"
                    stroke="#82ca9d"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Status Update Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Update Reservation Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="waiting">Waiting</MenuItem>
              <MenuItem value="seated">Seated</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            label="Notes"
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStatusUpdate} variant="contained" color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Alert */}
      {error && (
        <Box mt={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default AdminDashboard; 