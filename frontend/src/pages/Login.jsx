import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid
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
  const { loginWithMpin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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

  const numpadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: '#f9f9ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2.5, sm: 3 },
        py: 4,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 380 }}>
        {/* App Title / Header Badge */}
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
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
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)'
            }}
          >
            <LockIcon sx={{ fontSize: 24 }} />
          </Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.5rem',
              color: '#151c27',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}
          >
            Attendly
          </Typography>
          <Typography
            sx={{
              color: '#555f6f',
              fontSize: '0.875rem',
              mt: 0.5,
              fontWeight: 400
            }}
          >
            Enter your MPIN to continue
          </Typography>
        </Box>

        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e2e8f8',
            boxShadow: '0 8px 24px rgba(21, 28, 39, 0.04)',
            bgcolor: '#ffffff'
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 3.5 }, textAlign: 'center' }}>
            {/* PIN Dots Display */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
                mb: 3,
                py: 1
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
                      border: isFilled ? 'none' : '1.5px solid #bdc7d9',
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
                  bgcolor: '#ffdad6',
                  color: '#93000a',
                  border: '1px solid #ffdad6',
                  '& .MuiAlert-icon': { color: '#ba1a1a' }
                }}
              >
                {error}
              </Alert>
            )}

            {/* Tactile Numeric Keypad (3x4 Grid) */}
            <Box sx={{ maxWidth: 300, mx: 'auto', mb: 2.5 }}>
              <Grid container spacing={1.25}>
                {numpadDigits.map((digit) => (
                  <Grid item xs={4} key={digit}>
                    <Button
                      fullWidth
                      onClick={() => handleDigitPress(digit)}
                      disabled={submitting}
                      sx={{
                        height: 58,
                        fontSize: '1.4rem',
                        fontWeight: 600,
                        color: '#151c27',
                        border: '1px solid #e2e8f8',
                        bgcolor: '#ffffff',
                        borderRadius: 2,
                        transition: 'all 0.12s ease',
                        '&:hover': {
                          bgcolor: '#f0f3ff',
                          borderColor: '#dce2f3',
                        },
                        '&:active': {
                          transform: 'scale(0.96)',
                          bgcolor: '#e2e8f8',
                        },
                      }}
                    >
                      {digit}
                    </Button>
                  </Grid>
                ))}

                {/* Bottom Row: Clear, 0, Backspace */}
                <Grid item xs={4}>
                  <Button
                    fullWidth
                    onClick={handleClear}
                    disabled={submitting || mpin.length === 0}
                    sx={{
                      height: 58,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#555f6f',
                      borderRadius: 2,
                      textTransform: 'none',
                      '&:hover': {
                        color: '#151c27',
                        bgcolor: '#f0f3ff'
                      },
                      '&:active': {
                        transform: 'scale(0.96)',
                      },
                    }}
                  >
                    Clear
                  </Button>
                </Grid>

                <Grid item xs={4}>
                  <Button
                    fullWidth
                    onClick={() => handleDigitPress('0')}
                    disabled={submitting}
                    sx={{
                      height: 58,
                      fontSize: '1.4rem',
                      fontWeight: 600,
                      color: '#151c27',
                      border: '1px solid #e2e8f8',
                      bgcolor: '#ffffff',
                      borderRadius: 2,
                      transition: 'all 0.12s ease',
                      '&:hover': {
                        bgcolor: '#f0f3ff',
                        borderColor: '#dce2f3',
                      },
                      '&:active': {
                        transform: 'scale(0.96)',
                        bgcolor: '#e2e8f8',
                      },
                    }}
                  >
                    0
                  </Button>
                </Grid>

                <Grid item xs={4}>
                  <Button
                    fullWidth
                    onClick={handleBackspace}
                    disabled={submitting || mpin.length === 0}
                    sx={{
                      height: 58,
                      color: '#555f6f',
                      border: '1px solid #e2e8f8',
                      bgcolor: '#ffffff',
                      borderRadius: 2,
                      transition: 'all 0.12s ease',
                      '&:hover': {
                        bgcolor: '#f0f3ff',
                        borderColor: '#dce2f3',
                        color: '#151c27'
                      },
                      '&:active': {
                        transform: 'scale(0.96)',
                        bgcolor: '#e2e8f8',
                      },
                    }}
                  >
                    <BackspaceIcon sx={{ fontSize: 20 }} />
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* Unlock Action Button */}
            <Button
              fullWidth
              size="large"
              variant="contained"
              onClick={() => handleSubmit()}
              disabled={submitting || mpin.length < 4}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                py: 1.5,
                fontWeight: 700,
                borderRadius: 2.5,
                fontSize: '0.9375rem',
                bgcolor: '#000000',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: '#1f2937'
                },
                '&:active': {
                  transform: 'scale(0.98)'
                },
                '&.Mui-disabled': {
                  bgcolor: '#f0f3ff',
                  color: '#bdc7d9'
                }
              }}
            >
              {submitting ? 'Verifying...' : 'Unlock'}
            </Button>

            {/* Dev Helper */}
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #f0f3ff' }}>
              <Typography
                variant="caption"
                onClick={() => {
                  setMpin('1234');
                  handleSubmit('1234');
                }}
                sx={{
                  color: '#76777c',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                  '&:hover': { color: '#000000', textDecoration: 'underline' }
                }}
              >
                Development PIN: 1234 (Click to fill)
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Login;
