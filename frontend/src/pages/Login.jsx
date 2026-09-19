import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  LockOutlined as LockIcon,
  BackspaceOutlined as BackspaceIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [mpin, setMpin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const { loginWithMpin, loginDemo } = useAuth();
  const navigate = useNavigate();

  // Keyboard support for desktop / hardware input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mpin, submitting]);

  const handleDigitPress = (digit) => {
    if (mpin.length < 6) {
      setError('');
      setMpin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setError('');
    setMpin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError('');
    setMpin('');
  };

  const handleSubmit = async (pinOverride) => {
    const pinToSubmit = pinOverride || mpin;
    if (pinToSubmit.length < 4) {
      setError('Enter at least 4 digits');
      return;
    }

    setSubmitting(true);
    setError('');

    const res = await loginWithMpin(pinToSubmit);
    if (res.success) {
      navigate('/', { replace: true });
    } else {
      setError(res.message || 'Incorrect MPIN');
      setMpin('');
    }
    setSubmitting(false);
  };

  const handleDemoLogin = async () => {
    setDemoSubmitting(true);
    setError('');
    const res = await loginDemo();
    if (res.success) {
      navigate('/', { replace: true });
    } else {
      setError(res.message || 'Failed to start demo session');
    }
    setDemoSubmitting(false);
  };

  const numpadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 4 },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        {/* Attendly Branding & Lock Icon */}
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '14px',
            bgcolor: '#000000',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1.5,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
        >
          <LockIcon sx={{ fontSize: 24 }} />
        </Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '1.5rem',
            color: '#0f172a',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}
        >
          Attendly
        </Typography>
        <Typography
          sx={{
            color: '#64748b',
            fontSize: '0.875rem',
            mt: 0.5,
            mb: 3
          }}
        >
          Enter your MPIN to continue
        </Typography>

        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
            bgcolor: '#ffffff',
            p: { xs: 2.5, sm: 3 },
          }}
        >
          {/* MPIN Dots Display */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
              mb: 2.75,
              py: 0.5
            }}
          >
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < mpin.length;
              return (
                <Box
                  key={index}
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: isFilled ? 'none' : '2px solid #cbd5e1',
                    bgcolor: isFilled ? '#000000' : 'transparent',
                    transform: isFilled ? 'scale(1.08)' : 'scale(1)',
                    transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              );
            })}
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                py: 0.5,
                fontSize: '0.8125rem',
                borderRadius: 2,
                textAlign: 'left'
              }}
            >
              {error}
            </Alert>
          )}

          {/* Standard 3-Column x 4-Row Mobile Banking Keypad */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: { xs: 1.25, sm: 1.5 },
              maxWidth: 260,
              mx: 'auto',
              mb: 2.5
            }}
          >
            {numpadDigits.map((digit) => (
              <Button
                key={digit}
                onClick={() => handleDigitPress(digit)}
                disabled={submitting}
                sx={{
                  width: '100%',
                  aspectRatio: '1',
                  maxHeight: 62,
                  fontSize: '1.45rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '50%',
                  minWidth: 0,
                  p: 0,
                  transition: 'all 0.12s ease',
                  '&:hover': {
                    bgcolor: '#f1f5f9',
                    borderColor: '#cbd5e1'
                  },
                  '&:active': {
                    transform: 'scale(0.92)',
                    bgcolor: '#e2e8f0'
                  }
                }}
              >
                {digit}
              </Button>
            ))}

            {/* Bottom Row: Clear, 0, Backspace */}
            <Button
              onClick={handleClear}
              disabled={submitting || mpin.length === 0}
              sx={{
                width: '100%',
                aspectRatio: '1',
                maxHeight: 62,
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#64748b',
                borderRadius: '50%',
                minWidth: 0,
                p: 0,
                textTransform: 'none',
                '&:hover': {
                  color: '#0f172a',
                  bgcolor: '#f1f5f9'
                },
                '&:active': {
                  transform: 'scale(0.92)'
                },
                '&.Mui-disabled': {
                  color: '#cbd5e1'
                }
              }}
            >
              Clear
            </Button>

            <Button
              onClick={() => handleDigitPress('0')}
              disabled={submitting}
              sx={{
                width: '100%',
                aspectRatio: '1',
                maxHeight: 62,
                fontSize: '1.45rem',
                fontWeight: 600,
                color: '#0f172a',
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '50%',
                minWidth: 0,
                p: 0,
                transition: 'all 0.12s ease',
                '&:hover': {
                  bgcolor: '#f1f5f9',
                  borderColor: '#cbd5e1'
                },
                '&:active': {
                  transform: 'scale(0.92)',
                  bgcolor: '#e2e8f0'
                }
              }}
            >
              0
            </Button>

            <Button
              onClick={handleBackspace}
              disabled={submitting || mpin.length === 0}
              sx={{
                width: '100%',
                aspectRatio: '1',
                maxHeight: 62,
                color: '#475569',
                borderRadius: '50%',
                minWidth: 0,
                p: 0,
                transition: 'all 0.12s ease',
                '&:hover': {
                  color: '#0f172a',
                  bgcolor: '#f1f5f9'
                },
                '&:active': {
                  transform: 'scale(0.92)'
                },
                '&.Mui-disabled': {
                  color: '#cbd5e1'
                }
              }}
            >
              <BackspaceIcon sx={{ fontSize: 20 }} />
            </Button>
          </Box>

          {/* Action Buttons: Unlock & Try Demo */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, maxWidth: 260, mx: 'auto' }}>
            <Button
              fullWidth
              size="large"
              variant="contained"
              onClick={() => handleSubmit()}
              disabled={submitting || mpin.length < 4}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                py: 1.25,
                fontWeight: 700,
                borderRadius: 2,
                fontSize: '0.9375rem',
                bgcolor: '#000000',
                color: '#ffffff',
                boxShadow: 'none',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#1e293b',
                  boxShadow: 'none'
                },
                '&:active': {
                  transform: 'scale(0.98)'
                },
                '&.Mui-disabled': {
                  bgcolor: '#f1f5f9',
                  color: '#94a3b8'
                }
              }}
            >
              {submitting ? 'Verifying...' : 'Unlock'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleDemoLogin}
              disabled={submitting || demoSubmitting}
              startIcon={demoSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                py: 1.25,
                fontWeight: 600,
                borderRadius: 2,
                fontSize: '0.9375rem',
                color: '#0f172a',
                borderColor: '#e2e8f0',
                bgcolor: '#ffffff',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#f8fafc',
                  borderColor: '#0f172a'
                },
                '&:active': {
                  transform: 'scale(0.98)'
                }
              }}
            >
              {demoSubmitting ? 'Entering Demo...' : 'Try Demo'}
            </Button>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default Login;
