import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
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
  Divider
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
  Close as CloseIcon,
  Person as PersonIcon
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

const BOTTOM_NAV_ITEMS = [
  { label: 'Overview', path: '/', icon: <DashboardIcon sx={{ fontSize: 22 }} /> },
  { label: 'Attendance', path: '/attendance', icon: <AttendanceIcon sx={{ fontSize: 22 }} /> },
  { label: 'Workers', path: '/workers', icon: <WorkersIcon sx={{ fontSize: 22 }} /> },
  { label: 'Sites', path: '/sites', icon: <SitesIcon sx={{ fontSize: 22 }} /> },
  { label: 'Payroll', path: '/payroll', icon: <PayrollIcon sx={{ fontSize: 22 }} /> },
];

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, appTitle } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const getSubHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    if (path.startsWith('/attendance')) return 'Attendance';
    if (path.startsWith('/workers')) return 'Workers';
    if (path.startsWith('/sites')) return 'Sites';
    if (path.startsWith('/advances')) return 'Advances';
    if (path.startsWith('/payroll')) return 'Payroll';
    if (path.startsWith('/analytics')) return 'Analytics';
    return 'Workforce & Payroll';
  };

  const confirmLogout = () => {
    setLogoutDialogOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f9f9ff' }}>
      {/* Top Application Bar - Stitch Glassmorphism Header */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(249, 249, 255, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid #e2e8f8',
          zIndex: 1100,
          color: '#151c27',
          top: 0,
          pt: 'env(safe-area-inset-top, 0px)'
        }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            minHeight: { xs: 58, sm: 64 },
            px: { xs: 2, sm: 3 }
          }}
        >
          {/* Brand Identity with Mobile Drawer Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <IconButton
              size="small"
              onClick={() => setDrawerOpen(true)}
              sx={{ color: '#555f6f', display: { xs: 'inline-flex', md: 'none' }, p: 0.75, borderRadius: 1.5, '&:hover': { bgcolor: '#f0f3ff' } }}
              aria-label="open navigation drawer"
            >
              <MenuIcon fontSize="small" />
            </IconButton>

            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              {/* Dark Squircle Logo Mark */}
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '10px',
                  bgcolor: '#000000',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                }}
              >
                A
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography sx={{ color: '#151c27', fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
                  {appTitle || 'Attendly'}
                </Typography>
                <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 500, lineHeight: 1, mt: 0.5 }}>
                  {getSubHeaderTitle()}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Desktop Navigation Links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.75 }}>
            {NAV_LINKS.map((item) => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

              return (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: isActive ? '#ffffff' : '#555f6f',
                    bgcolor: isActive ? '#000000' : 'transparent',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 700 : 500,
                    px: 1.75,
                    py: 0.75,
                    borderRadius: 9999,
                    textTransform: 'none',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      color: isActive ? '#ffffff' : '#151c27',
                      bgcolor: isActive ? '#1f2937' : '#f0f3ff',
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          {/* Right Controls: Lock & Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={() => setLogoutDialogOpen(true)}
              aria-label="Lock application"
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                color: '#151c27',
                border: '1px solid #e2e8f8',
                bgcolor: '#ffffff',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: '#f0f3ff', borderColor: '#dce2f3' },
                '&:active': { transform: 'scale(0.95)' }
              }}
            >
              <LockIcon sx={{ fontSize: 18 }} />
            </IconButton>

            <Box
              onClick={() => setLogoutDialogOpen(true)}
              sx={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                bgcolor: '#000000',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': { opacity: 0.85 },
                '&:active': { transform: 'scale(0.95)' }
              }}
              title="Admin Session / Lock"
            >
              <PersonIcon sx={{ fontSize: 18, color: '#ffffff' }} />
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
            width: 280,
            bgcolor: '#ffffff',
            color: '#151c27',
            borderRight: '1px solid #e2e8f8',
            p: 1.5
          }
        }}
      >
        <Box sx={{ p: 1.5, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f8' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '10px',
                bgcolor: '#000000',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem'
              }}
            >
              A
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#151c27', fontSize: '0.9375rem', lineHeight: 1.2 }}>
                {appTitle || 'Attendly'}
              </Typography>
              <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem' }}>
                Workforce Management
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setDrawerOpen(false)} sx={{ color: '#555f6f' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <List sx={{ px: 0.5, py: 1.5 }}>
          {NAV_LINKS.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.75 }}>
                <ListItemButton
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate(item.path);
                  }}
                  sx={{
                    borderRadius: 2,
                    bgcolor: isActive ? '#000000' : 'transparent',
                    color: isActive ? '#ffffff' : '#555f6f',
                    py: 1,
                    px: 1.5,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: isActive ? '#000000' : '#f0f3ff',
                      color: isActive ? '#ffffff' : '#151c27'
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? '#ffffff' : '#555f6f', minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 700 : 500 }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}

          <Divider sx={{ my: 1.5, borderColor: '#e2e8f8' }} />

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                setLogoutDialogOpen(true);
              }}
              sx={{
                borderRadius: 2,
                color: '#ba1a1a',
                py: 1,
                px: 1.5,
                '&:hover': { bgcolor: '#ffdad6' }
              }}
            >
              <ListItemIcon sx={{ color: '#ba1a1a', minWidth: 36 }}>
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
          py: { xs: 2, sm: 3 },
          pb: { xs: 'calc(76px + env(safe-area-inset-bottom, 0px))', sm: 4 },
          px: { xs: 2, sm: 3 }
        }}
      >
        <Outlet />
      </Container>

      {/* Mobile Bottom Navigation Bar - Exact Stitch Alignment */}
      <Box
        component="nav"
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          minHeight: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          pb: 'env(safe-area-inset-bottom, 0px)',
          pt: 0,
          bgcolor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid #e2e8f8',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.03)',
          px: 0.5,
          alignItems: 'center',
          justifyContent: 'space-around',
          userSelect: 'none'
        }}
      >
        {BOTTOM_NAV_ITEMS.map((tab) => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path);

          return (
            <Box
              key={tab.path}
              onClick={() => navigate(tab.path)}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 0.5,
                cursor: 'pointer',
                color: isActive ? '#000000' : '#555f6f',
                transition: 'all 0.15s ease',
                userSelect: 'none',
                minWidth: 0,
                '&:active': { transform: 'scale(0.93)' }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#000000' : '#555f6f',
                  bgcolor: isActive ? '#f0f3ff' : 'transparent',
                  px: 1.5,
                  py: 0.35,
                  borderRadius: 9999,
                  transition: 'all 0.15s ease',
                  '& .MuiSvgIcon-root': {
                    fontSize: 21,
                  }
                }}
              >
                {tab.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#000000' : '#555f6f',
                  mt: 0.25,
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}
              >
                {tab.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Lock / Logout Confirmation Modal */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            border: '1px solid #e2e8f8',
            boxShadow: '0 16px 32px rgba(0,0,0,0.08)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 1, color: '#151c27' }}>
          Lock Application?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#555f6f' }}>
            Your session will be closed. You will need to enter your MPIN to access Attendly again.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setLogoutDialogOpen(false)}
            variant="outlined"
            size="small"
            sx={{
              borderRadius: 2,
              borderColor: '#dce2f3',
              color: '#151c27',
              fontWeight: 600,
              '&:hover': { borderColor: '#bdc7d9', bgcolor: '#f0f3ff' }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmLogout}
            variant="contained"
            size="small"
            sx={{
              borderRadius: 2,
              bgcolor: '#000000',
              color: '#ffffff',
              fontWeight: 600,
              '&:hover': { bgcolor: '#1f2937' }
            }}
          >
            Lock Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppLayout;
