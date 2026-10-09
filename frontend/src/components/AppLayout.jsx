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
  Divider,
  Chip,
  Tooltip
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
  Person as PersonIcon,
  ScienceOutlined as DemoIcon
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
  const { logout, appTitle, isDemo } = useAuth();
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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {/* Top Application Bar - Glassmorphism Header */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(248, 249, 250, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid #e4e4e7',
          zIndex: 1100,
          color: '#09090b',
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <IconButton
              size="small"
              onClick={() => setDrawerOpen(true)}
              sx={{
                color: '#71717a',
                display: { xs: 'inline-flex', md: 'none' },
                p: 0.75,
                borderRadius: '8px',
                touchAction: 'manipulation',
                '&:hover': { bgcolor: '#f4f4f5', color: '#09090b' },
                '&:active': { transform: 'scale(0.95)' }
              }}
              aria-label="open navigation drawer"
            >
              <MenuIcon fontSize="small" />
            </IconButton>

            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer', minWidth: 0 }}
              onClick={() => navigate('/')}
            >
              {/* Dark Squircle Logo Mark with Orange Accent Touch */}
              <Box
                sx={{
                  position: 'relative',
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
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  flexShrink: 0
                }}
              >
                A
                <Box
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    bgcolor: '#ea580c'
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Typography sx={{ color: '#09090b', fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.15, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {appTitle || 'Attendly'}
                </Typography>
                <Typography sx={{ color: '#71717a', fontSize: '0.6875rem', fontWeight: 500, lineHeight: 1, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                    color: isActive ? '#ffffff' : '#71717a',
                    bgcolor: isActive ? '#000000' : 'transparent',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 600 : 500,
                    px: 1.75,
                    py: 0.75,
                    borderRadius: 9999,
                    textTransform: 'none',
                    transition: 'all 140ms ease-out',
                    '@media (hover: hover) and (pointer: fine)': {
                      '&:hover': {
                        color: isActive ? '#ffffff' : '#09090b',
                        bgcolor: isActive ? '#27272a' : '#f4f4f5',
                      },
                    },
                    '&:active': { transform: 'scale(0.97)' }
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          {/* Right Controls: Lock & Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
            {isDemo && (
              <Tooltip title="Recruiter Demo Mode: All data is fictional and completely isolated from production." arrow>
                <Chip
                  icon={<DemoIcon sx={{ fontSize: '14px !important', color: '#1e40af !important' }} />}
                  label="Demo Account"
                  size="small"
                  sx={{
                    height: 26,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    bgcolor: '#eff6ff',
                    color: '#1e40af',
                    border: '1px solid #bfdbfe',
                    borderRadius: 9999,
                    letterSpacing: '0.02em',
                    cursor: 'default',
                    '& .MuiChip-label': { px: 1 }
                  }}
                />
              </Tooltip>
            )}

            <IconButton
              onClick={() => setLogoutDialogOpen(true)}
              aria-label="Lock application"
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                color: '#09090b',
                border: '1px solid #e4e4e7',
                bgcolor: '#ffffff',
                touchAction: 'manipulation',
                transition: 'all 140ms ease-out',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': { bgcolor: '#f4f4f5', borderColor: '#d4d4d8' }
                },
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
                touchAction: 'manipulation',
                transition: 'all 140ms ease-out',
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
            color: '#09090b',
            borderRight: '1px solid #e4e4e7',
            p: 1.5
          }
        }}
      >
        <Box sx={{ p: 1.5, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                position: 'relative',
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
              <Box
                sx={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  bgcolor: '#ea580c'
                }}
              />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#09090b', fontSize: '0.9375rem', lineHeight: 1.2 }}>
                {appTitle || 'Attendly'}
              </Typography>
              <Typography sx={{ color: '#71717a', fontSize: '0.6875rem' }}>
                Workforce Management
              </Typography>
              {isDemo && (
                <Chip
                  label="Demo Account"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    bgcolor: '#eff6ff',
                    color: '#1e40af',
                    border: '1px solid #bfdbfe',
                    mt: 0.5
                  }}
                />
              )}
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setDrawerOpen(false)} sx={{ color: '#71717a', touchAction: 'manipulation' }}>
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
                    borderRadius: '8px',
                    bgcolor: isActive ? '#000000' : 'transparent',
                    color: isActive ? '#ffffff' : '#71717a',
                    py: 1,
                    px: 1.5,
                    transition: 'all 140ms ease-out',
                    touchAction: 'manipulation',
                    '@media (hover: hover) and (pointer: fine)': {
                      '&:hover': {
                        bgcolor: isActive ? '#000000' : '#f4f4f5',
                        color: isActive ? '#ffffff' : '#09090b'
                      }
                    },
                    '&:active': { transform: 'scale(0.97)' }
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? '#ffffff' : '#71717a', minWidth: 36 }}>
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

          <Divider sx={{ my: 1.5, borderColor: '#e4e4e7' }} />

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                setLogoutDialogOpen(true);
              }}
              sx={{
                borderRadius: '8px',
                color: '#dc2626',
                py: 1,
                px: 1.5,
                touchAction: 'manipulation',
                '&:hover': { bgcolor: '#fef2f2' }
              }}
            >
              <ListItemIcon sx={{ color: '#dc2626', minWidth: 36 }}>
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

      {/* Mobile Bottom Navigation Bar */}
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
          borderTop: '1px solid #e4e4e7',
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
                color: isActive ? '#09090b' : '#71717a',
                transition: 'all 140ms ease-out',
                userSelect: 'none',
                minWidth: 0,
                minHeight: 48,
                touchAction: 'manipulation',
                '&:active': { transform: 'scale(0.93)' }
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#09090b' : '#71717a',
                  bgcolor: isActive ? '#f4f4f5' : 'transparent',
                  px: 1.5,
                  py: 0.35,
                  borderRadius: 9999,
                  transition: 'all 140ms ease-out',
                  '& .MuiSvgIcon-root': {
                    fontSize: 21,
                  }
                }}
              >
                {tab.icon}
                {isActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 2,
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: '#ea580c'
                    }}
                  />
                )}
              </Box>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#09090b' : '#71717a',
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
            borderRadius: '16px',
            p: 1,
            border: '1px solid #e4e4e7',
            boxShadow: '0 16px 32px rgba(0,0,0,0.08)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 1, color: '#09090b' }}>
          Lock Application?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#71717a' }}>
            Your session will be closed. You will need to enter your MPIN to access Attendly again.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setLogoutDialogOpen(false)}
            variant="outlined"
            size="small"
            sx={{
              borderRadius: '8px',
              borderColor: '#e4e4e7',
              color: '#09090b',
              fontWeight: 600,
              '&:hover': { borderColor: '#d4d4d8', bgcolor: '#f4f4f5' }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmLogout}
            variant="contained"
            size="small"
            sx={{
              borderRadius: '8px',
              bgcolor: '#000000',
              color: '#ffffff',
              fontWeight: 600,
              '&:hover': { bgcolor: '#27272a' }
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
