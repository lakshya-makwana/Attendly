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

  const keyButtonSx = {
    width: '100%',
    height: { xs: 52, sm: 56 },
    borderRadius: '12px',
    fontSize: { xs: '1.45rem', sm: '1.55rem' },
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    color: '#1c1917',
    bgcolor: '#ffffff',
    border: '1px solid #e7e5e4',
    boxShadow: '0 1px 2px rgba(28, 25, 23, 0.04)',
    minWidth: 0,
    p: 0,
    touchAction: 'manipulation',
    userSelect: 'none',
    transition: 'transform 90ms ease, background-color 90ms ease, border-color 90ms ease, color 90ms ease',
    '@media (hover: hover) and (pointer: fine)': {
      '&:hover': {
        bgcolor: '#faf9f6',
        borderColor: '#d6d3d1'
      }
    },
    '&:active': {
      transform: 'scale(0.95)',
      bgcolor: '#fff7ed',
      borderColor: '#fed7aa',
      color: '#ea580c'
    },
    '&.Mui-disabled': {
      color: '#d6d3d1',
      bgcolor: '#faf9f6',
      borderColor: '#f5f5f4'
    }
  };

  const utilityButtonSx = {
    ...keyButtonSx,
    bgcolor: '#faf9f6',
    color: '#78716c',
    fontSize: '0.85rem',
    textTransform: 'none',
    letterSpacing: '0.01em',
    '@media (hover: hover) and (pointer: fine)': {
      '&:hover': {
        bgcolor: '#f5f5f4',
        borderColor: '#d6d3d1',
        color: '#1c1917'
      }
    },
    '&:active': {
      transform: 'scale(0.95)',
      bgcolor: '#f5f5f4',
      borderColor: '#d6d3d1',
      color: '#1c1917'
    }
  };

  const backspaceButtonSx = {
    ...keyButtonSx,
    bgcolor: '#faf9f6',
    color: '#78716c',
    '@media (hover: hover) and (pointer: fine)': {
      '&:hover': {
        bgcolor: '#f5f5f4',
        borderColor: '#d6d3d1',
        color: '#1c1917'
      }
    },
    '&:active': {
      transform: 'scale(0.95)',
      bgcolor: '#fff7ed',
      borderColor: '#fed7aa',
      color: '#ea580c'
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: '#faf9f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, sm: 4 },
        pt: 'max(20px, env(safe-area-inset-top, 20px))',
        pb: 'max(20px, env(safe-area-inset-bottom, 20px))'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 340, textAlign: 'center', my: 'auto' }}>
        {/* Attendly Branding & Lock Icon */}
        <Box
          sx={{
            position: 'relative',
            width: 46,
            height: 46,
            borderRadius: '12px',
            bgcolor: '#1c1917',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1.25,
            boxShadow: '0 4px 14px rgba(28, 25, 23, 0.12)'
          }}
        >
          <LockIcon sx={{ fontSize: 22 }} />
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: '#ea580c',
              boxShadow: '0 0 0 2px #1c1917'
            }}
          />
        </Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '1.45rem',
            color: '#1c1917',
            letterSpacing: '-0.025em',
            lineHeight: 1.2
          }}
        >
          Attendly
        </Typography>
        <Typography
          sx={{
            color: '#78716c',
            fontSize: '0.8125rem',
            fontWeight: 500,
            mt: 0.5,
            mb: { xs: 2.25, sm: 2.75 }
          }}
        >
          Enter your MPIN to continue
        </Typography>

        <Card
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: '1px solid #e7e5e4',
            boxShadow: '0 4px 24px -2px rgba(28, 25, 23, 0.05)',
            bgcolor: '#ffffff',
            p: { xs: 2, sm: 2.5 }
          }}
        >
          {/* MPIN Dots Display */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
              mb: 2.25,
              py: 0.5
            }}
          >
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < mpin.length;
              return (
                <Box
                  key={index}
                  sx={{
                    width: 13,
                    height: 13,
                    borderRadius: '50%',
                    border: isFilled ? '2px solid #ea580c' : '2px solid #d6d3d1',
                    bgcolor: isFilled ? '#ea580c' : 'transparent',
                    transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: isFilled ? '0 2px 8px rgba(234, 88, 12, 0.35)' : 'none',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              );
            })}
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                py: 0.5,
                px: 1.5,
                fontSize: '0.8125rem',
                borderRadius: '10px',
                textAlign: 'left',
                bgcolor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                alignItems: 'center'
              }}
            >
              {error}
            </Alert>
          )}

          {/* 3-Column Keypad with Square-like Rounded Rectangles */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: { xs: 1, sm: 1.25 },
              width: '100%',
              mb: 2.25
            }}
          >
            {numpadDigits.map((digit) => (
              <Button
                key={digit}
                onClick={() => handleDigitPress(digit)}
                disabled={submitting}
                sx={keyButtonSx}
                aria-label={`Digit ${digit}`}
              >
                {digit}
              </Button>
            ))}

            {/* Bottom Row: Clear (Col 1), 0 (Col 2), Backspace (Col 3) */}
            <Button
              onClick={handleClear}
              disabled={submitting || mpin.length === 0}
              sx={utilityButtonSx}
              aria-label="Clear MPIN"
            >
              Clear
            </Button>

            <Button
              onClick={() => handleDigitPress('0')}
              disabled={submitting}
              sx={keyButtonSx}
              aria-label="Digit 0"
            >
              0
            </Button>

            <Button
              onClick={handleBackspace}
              disabled={submitting || mpin.length === 0}
              sx={backspaceButtonSx}
              aria-label="Backspace"
            >
              <BackspaceIcon sx={{ fontSize: 21 }} />
            </Button>
          </Box>

          {/* Action Buttons: Unlock & Try Demo */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => handleSubmit()}
              disabled={submitting || mpin.length < 4}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                height: 46,
                fontWeight: 700,
                borderRadius: '10px',
                fontSize: '0.9375rem',
                bgcolor: '#1c1917',
                color: '#ffffff',
                boxShadow: 'none',
                textTransform: 'none',
                touchAction: 'manipulation',
                transition: 'all 0.12s ease',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': {
                    bgcolor: '#292524',
                    boxShadow: '0 2px 8px rgba(28, 25, 23, 0.12)'
                  }
                },
                '&:active': {
                  transform: 'scale(0.98)'
                },
                '&.Mui-disabled': {
                  bgcolor: '#f5f5f4',
                  color: '#a8a29e',
                  border: '1px solid #e7e5e4'
                }
              }}
            >
              {submitting ? 'Verifying...' : 'Unlock'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={handleDemoLogin}
              disabled={submitting || demoSubmitting}
              startIcon={demoSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                height: 42,
                fontWeight: 600,
                borderRadius: '10px',
                fontSize: '0.875rem',
                color: '#44403c',
                borderColor: '#e7e5e4',
                bgcolor: '#ffffff',
                boxShadow: 'none',
                textTransform: 'none',
                touchAction: 'manipulation',
                transition: 'all 0.12s ease',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': {
                    bgcolor: '#faf9f6',
                    borderColor: '#d6d3d1',
                    color: '#1c1917'
                  }
                },
                '&:active': {
                  transform: 'scale(0.98)'
                },
                '&.Mui-disabled': {
                  borderColor: '#f5f5f4',
                  color: '#d6d3d1'
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
