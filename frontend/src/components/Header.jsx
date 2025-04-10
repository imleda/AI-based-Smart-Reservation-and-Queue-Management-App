import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Button,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  QueuePlayNext as QueueIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const Header = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socket.on('queue_update', (data) => {
      if (data.newEntry && isAdmin) {
        addNotification(`New customer joined: ${data.newEntry.name}`);
      }
    });

    socket.on('status_update', (data) => {
      if (!isAdmin) {
        addNotification(`Your queue status has been updated to: ${data.newStatus}`);
      }
    });

    return () => socket.disconnect();
  }, []);

  const addNotification = (message) => {
    const newNotification = {
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleTimeString(),
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 5));
    
    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification('Queue Update', { body: message });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const menuItems = [
    {
      text: isAdmin ? 'Dashboard' : 'Queue Status',
      icon: isAdmin ? <DashboardIcon /> : <QueueIcon />,
      onClick: () => navigate(isAdmin ? '/admin/dashboard' : '/'),
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      onClick: () => navigate('/settings'),
    },
  ];

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Queue Management System
          </Typography>

          <IconButton color="inherit" onClick={handleNotificationClick}>
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <Box sx={{ ml: 2 }}>
            <IconButton onClick={handleProfileClick} color="inherit">
              <Avatar sx={{ width: 32, height: 32 }}>
                {user.name?.[0]?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        PaperProps={{
          sx: { width: 320, maxHeight: 400 },
        }}
      >
        {notifications.length === 0 ? (
          <MenuItem>No new notifications</MenuItem>
        ) : (
          notifications.map((notification) => (
            <MenuItem key={notification.id}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body1">{notification.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {notification.timestamp}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileClose}
      >
        <MenuItem onClick={() => { handleProfileClose(); }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <Typography>{user.name}</Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <Typography>Logout</Typography>
        </MenuItem>
      </Menu>

      {/* Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <List>
            {menuItems.map((item) => (
              <ListItem button key={item.text} onClick={item.onClick}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
          <Divider />
          <List>
            <ListItem button onClick={handleLogout}>
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Toolbar spacer */}
      <Toolbar />
    </>
  );
};

export default Header; 