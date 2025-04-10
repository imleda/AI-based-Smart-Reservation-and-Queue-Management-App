import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Tooltip,
  IconButton
} from '@mui/material';
import { 
  AccessTime, 
  People, 
  Restaurant, 
  PriorityHigh,
  Refresh,
  Timer
} from '@mui/icons-material';

const QueueStatus = () => {
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/queue/status');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch queue status');
      }
      
      setQueueStatus(data);
      setLastUpdated(new Date(data.last_updated));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchQueueStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getWaitTimeColor = (minutes) => {
    if (minutes < 15) return 'success';
    if (minutes < 30) return 'warning';
    return 'error';
  };

  const getPartySizeColor = (size) => {
    if (size <= 2) return 'success';
    if (size <= 4) return 'warning';
    return 'error';
  };

  const formatWaitTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Current Queue Status
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {formatTimeAgo(lastUpdated)}
          </Typography>
          <IconButton onClick={fetchQueueStatus} size="small">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Currently Being Served */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Restaurant sx={{ mr: 1 }} />
                Currently Being Served
              </Typography>
              {queueStatus.current.length > 0 ? (
                <List>
                  {queueStatus.current.map((reservation) => (
                    <ListItem 
                      key={reservation.id}
                      sx={{ 
                        borderLeft: '4px solid',
                        borderColor: 'success.main',
                        mb: 1
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              #{reservation.id} - {reservation.name}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={`${reservation.party_size} people`}
                              color={getPartySizeColor(reservation.party_size)}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip 
                              size="small" 
                              label={reservation.service_type}
                              variant="outlined"
                            />
                            <Chip 
                              size="small" 
                              label={reservation.location}
                              variant="outlined"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No one is currently being served
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Next in Line */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <People sx={{ mr: 1 }} />
                Next in Line
              </Typography>
              {queueStatus.next.length > 0 ? (
                <List>
                  {queueStatus.next.map((reservation, index) => {
                    const prediction = queueStatus.predictions.find(
                      p => p.reservation_id === reservation.id
                    );
                    return (
                      <ListItem 
                        key={reservation.id}
                        sx={{ 
                          borderLeft: '4px solid',
                          borderColor: index === 0 ? 'warning.main' : 'info.main',
                          mb: 1
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1">
                                #{reservation.id} - {reservation.name}
                              </Typography>
                              <Chip 
                                size="small" 
                                label={`${reservation.party_size} people`}
                                color={getPartySizeColor(reservation.party_size)}
                              />
                              {index === 0 && (
                                <Tooltip title="Next to be served">
                                  <PriorityHigh color="warning" />
                                </Tooltip>
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip 
                                  size="small" 
                                  label={reservation.service_type}
                                  variant="outlined"
                                />
                                <Chip 
                                  size="small" 
                                  label={reservation.location}
                                  variant="outlined"
                                />
                              </Box>
                              {prediction && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Timer fontSize="small" />
                                  <Typography variant="body2" color={getWaitTimeColor(prediction.estimated_wait)}>
                                    Estimated wait: {formatWaitTime(prediction.estimated_wait)}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No one is waiting
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Wait Time Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <AccessTime sx={{ mr: 1 }} />
                Wait Time Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body1" gutterBottom>
                    Average Wait Time
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography 
                      variant="h4" 
                      color={getWaitTimeColor(queueStatus.estimated_wait_time)}
                    >
                      {formatWaitTime(queueStatus.estimated_wait_time)}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(queueStatus.estimated_wait_time * 2, 100)}
                      color={getWaitTimeColor(queueStatus.estimated_wait_time)}
                      sx={{ flexGrow: 1 }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body1">
                    Total People Waiting: {queueStatus.total_waiting}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last updated: {formatTimeAgo(lastUpdated)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QueueStatus; 