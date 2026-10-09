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
        bgcolor: '#faf9f6',
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
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: '14px',
            bgcolor: '#09090b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1.5,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
          }}
        >
          <LockIcon sx={{ fontSize: 24 }} />
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: '#ea580c'
            }}
          />
        </Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '1.5rem',
            color: '#09090b',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}
        >
          Attendly
        </Typography>
        <Typography
          sx={{
            color: '#71717a',
            fontSize: '0.875rem',
            fontWeight: 500,
            mt: 0.5,
            mb: 3
          }}
        >
          Enter your MPIN to continue
        </Typography>

        <Card
          elevation={0}
          sx={{
            borderRadius: '14px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
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
                    border: isFilled ? 'none' : '2px solid #d4d4d8',
                    bgcolor: isFilled ? '#ea580c' : 'transparent',
                    transform: isFilled ? 'scale(1.12)' : 'scale(1)',
                    boxShadow: isFilled ? '0 2px 6px rgba(234, 88, 12, 0.35)' : 'none',
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
                textAlign: 'left',
                bgcolor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca'
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
                  color: '#09090b',
                  bgcolor: '#ffffff',
                  border: '1px solid #e4e4e7',
                  borderRadius: '50%',
                  minWidth: 0,
                  p: 0,
                  touchAction: 'manipulation',
                  transition: 'all 0.12s ease',
                  '@media (hover: hover) and (pointer: fine)': {
                    '&:hover': {
                      bgcolor: '#f4f4f5',
                      borderColor: '#d4d4d8'
                    }
                  },
                  '&:active': {
                    transform: 'scale(0.92)',
                    bgcolor: '#fff7ed',
                    borderColor: '#fed7aa',
                    color: '#ea580c'
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
                color: '#71717a',
                borderRadius: '50%',
                minWidth: 0,
                p: 0,
                textTransform: 'none',
                touchAction: 'manipulation',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': {
                    color: '#09090b',
                    bgcolor: '#f4f4f5'
                  }
                },
                '&:active': {
                  transform: 'scale(0.92)'
                },
                '&.Mui-disabled': {
                  color: '#d4d4d8'
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
                color: '#09090b',
                bgcolor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '50%',
                minWidth: 0,
                p: 0,
                touchAction: 'manipulation',
                transition: 'all 0.12s ease',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': {
                    bgcolor: '#f4f4f5',
                    borderColor: '#d4d4d8'
                  }
                },
                '&:active': {
                  transform: 'scale(0.92)',
                  bgcolor: '#fff7ed',
                  borderColor: '#fed7aa',
                  color: '#ea580c'
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
                color: '#71717a',
                borderRadius: '50%',
                minWidth: 0,
                p: 0,
                touchAction: 'manipulation',
                transition: 'all 0.12s ease',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': {
                    color: '#09090b',
                    bgcolor: '#f4f4f5'
                  }
                },
                '&:active': {
                  transform: 'scale(0.92)'
                },
                '&.Mui-disabled': {
                  color: '#d4d4d8'
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
                borderRadius: 2.5,
                minHeight: 46,
                fontSize: '0.9375rem',
                bgcolor: '#09090b',
                color: '#ffffff',
                boxShadow: 'none',
                textTransform: 'none',
                touchAction: 'manipulation',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': {
                    bgcolor: '#27272a',
                    boxShadow: 'none'
                  }
                },
                '&:active': {
                  transform: 'scale(0.97)'
                },
                '&.Mui-disabled': {
                  bgcolor: '#f4f4f5',
                  color: '#a1a1aa'
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
                borderRadius: 2.5,
                minHeight: 46,
                fontSize: '0.9375rem',
                color: '#09090b',
                borderColor: '#e4e4e7',
                bgcolor: '#ffffff',
                textTransform: 'none',
                touchAction: 'manipulation',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': {
                    bgcolor: '#f4f4f5',
                    borderColor: '#d4d4d8'
                  }
                },
                '&:active': {
                  transform: 'scale(0.97)'
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
