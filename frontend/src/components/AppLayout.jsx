import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Avatar
} from '@mui/material';
import {
  DashboardOutlined as DashboardIcon,
  FactCheckOutlined as AttendanceIcon,
  PeopleAltOutlined as WorkersIcon,
  AccountBalanceWalletOutlined as AdvancesIcon,
  ReceiptLongOutlined as PayrollIcon,
  LocationCityOutlined as SitesIcon,
  QueryStatsOutlined as AnalyticsIcon,
  Menu as MenuIcon,
  LockOutlined as LockIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { label: 'Overview', path: '/', icon: <DashboardIcon sx={{ fontSize: 20 }} /> },
  { label: 'Attendance', path: '/attendance', icon: <AttendanceIcon sx={{ fontSize: 20 }} /> },
  { label: 'Workers', path: '/workers', icon: <WorkersIcon sx={{ fontSize: 20 }} /> },
  { label: 'Sites', path: '/sites', icon: <SitesIcon sx={{ fontSize: 20 }} /> },
  { label: 'Advances', path: '/advances', icon: <AdvancesIcon sx={{ fontSize: 20 }} /> },
  { label: 'Payroll', path: '/payroll', icon: <PayrollIcon sx={{ fontSize: 20 }} /> },
  { label: 'Analytics', path: '/analytics', icon: <AnalyticsIcon sx={{ fontSize: 20 }} /> },
];

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, appTitle } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const getNavValue = () => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path.startsWith('/attendance')) return 1;
    if (path.startsWith('/workers')) return 2;
    if (path.startsWith('/advances')) return 3;
    if (path.startsWith('/payroll')) return 4;
    return -1;
  };

  const confirmLogout = () => {
    setLogoutDialogOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Application Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          zIndex: 1200,
        }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            minHeight: { xs: 52, sm: 56 },
            px: { xs: 1.5, sm: 3 }
          }}
        >
          {/* Brand Identity with Menu toggle on mobile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => setDrawerOpen(true)}
              sx={{ color: '#cbd5e1', display: { xs: 'inline-flex', md: 'none' }, p: 0.5 }}
              aria-label="open navigation drawer"
            >
              <MenuIcon fontSize="small" />
            </IconButton>

            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    bgcolor: '#334155',
                    color: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  CP
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 700, lineHeight: 1.15, fontSize: '0.925rem' }}>
                  {appTitle}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem', lineHeight: 1 }}>
                  Workforce & Payroll
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Desktop Navigation Links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
            {NAV_LINKS.map((item) => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

              return (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: isActive ? '#ffffff' : '#94a3b8',
                    bgcolor: isActive ? '#1e293b' : 'transparent',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 600 : 500,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1.5,
                    '&:hover': {
                      color: '#ffffff',
                      bgcolor: '#1e293b',
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          {/* User Controls & Circular Badge on Right */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              onClick={() => setLogoutDialogOpen(true)}
              startIcon={<LockIcon sx={{ fontSize: '0.85rem !important' }} />}
              sx={{
                color: '#cbd5e1',
                borderColor: '#334155',
                border: '1px solid #334155',
                fontSize: '0.75rem',
                py: 0.5,
                px: 1.25,
                display: { xs: 'none', sm: 'inline-flex' },
                '&:hover': { bgcolor: '#1e293b', borderColor: '#475569' }
              }}
            >
              Lock
            </Button>

            {/* Circular Avatar "CP" */}
            <Box
              onClick={() => setLogoutDialogOpen(true)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: '#334155',
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                border: '1px solid #475569',
                '&:hover': { bgcolor: '#475569' }
              }}
              title="Admin Session / Lock"
            >
              CP
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 260,
            bgcolor: '#0f172a',
            color: '#f8fafc',
            borderRight: '1px solid #1e293b'
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b' }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ffffff' }}>
              Contractor Pro
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Workforce & Payroll
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setDrawerOpen(false)} sx={{ color: '#94a3b8' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <List sx={{ px: 1, py: 1.5 }}>
          {NAV_LINKS.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate(item.path);
                  }}
                  sx={{
                    borderRadius: 1.5,
                    bgcolor: isActive ? '#1e293b' : 'transparent',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    '&:hover': { bgcolor: '#1e293b', color: '#ffffff' }
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? '#ffffff' : '#94a3b8', minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 500 }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}

          <Divider sx={{ my: 1.5, borderColor: '#1e293b' }} />

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                setLogoutDialogOpen(true);
              }}
              sx={{
                borderRadius: 1.5,
                color: '#f87171',
                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' }
              }}
            >
              <ListItemIcon sx={{ color: '#f87171', minWidth: 36 }}>
                <LockIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Lock Application"
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      {/* Primary Content Container */}
      <Container
        maxWidth="lg"
        sx={{
          flex: 1,
          py: { xs: 2, sm: 2.5 },
          pb: { xs: 11, sm: 4 }, // Generous padding so sticky/bottom elements never overlap content
          px: { xs: 1.5, sm: 3 }
        }}
      >
        <Outlet />
      </Container>

      {/* Mobile Bottom Navigation (Strictly 5 Primary Items matching prompt) */}
      <Paper
        sx={{
          display: { xs: 'block', md: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -1px 4px rgba(0,0,0,0.04)',
          bgcolor: '#ffffff'
        }}
        elevation={0}
      >
        <BottomNavigation
          showLabels
          value={getNavValue()}
          onChange={(event, newValue) => {
            if (newValue === 0) navigate('/');
            else if (newValue === 1) navigate('/attendance');
            else if (newValue === 2) navigate('/workers');
            else if (newValue === 3) navigate('/advances');
            else if (newValue === 4) navigate('/payroll');
          }}
          sx={{
            height: 56,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              padding: '6px 0',
              color: '#64748b',
              '&.Mui-selected': {
                color: '#0f172a',
                fontWeight: 600,
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.6875rem',
              '&.Mui-selected': {
                fontSize: '0.6875rem',
                fontWeight: 600,
              },
            },
          }}
        >
          <BottomNavigationAction label="Overview" icon={<DashboardIcon sx={{ fontSize: 20 }} />} />
          <BottomNavigationAction label="Attendance" icon={<AttendanceIcon sx={{ fontSize: 20 }} />} />
          <BottomNavigationAction label="Workers" icon={<WorkersIcon sx={{ fontSize: 20 }} />} />
          <BottomNavigationAction label="Advances" icon={<AdvancesIcon sx={{ fontSize: 20 }} />} />
          <BottomNavigationAction label="Payroll" icon={<PayrollIcon sx={{ fontSize: 20 }} />} />
        </BottomNavigation>
      </Paper>

      {/* Lock / Logout Confirmation Modal */}
      <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>Lock Application?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Your session will be closed. You will need to enter your MPIN to open the app again.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLogoutDialogOpen(false)} size="small" variant="outlined">
            Cancel
          </Button>
          <Button onClick={confirmLogout} size="small" variant="contained" color="primary">
            Lock Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppLayout;
