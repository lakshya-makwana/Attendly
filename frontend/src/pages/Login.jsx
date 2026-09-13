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
        minHeight: '100vh',
        bgcolor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 360 }}>
        {/* App Title / Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 1.25,
            }}
          >
            <LockIcon sx={{ fontSize: 20 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
            Contractor Pro
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8125rem' }}>
            Enter your MPIN to continue
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 }, textAlign: 'center' }}>
            {/* PIN Dots Display */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mb: 2, py: 1 }}>
              {[0, 1, 2, 3].map((index) => (
                <Box
                  key={index}
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '1.5px solid',
                    borderColor: index < mpin.length ? '#0f172a' : '#cbd5e1',
                    bgcolor: index < mpin.length ? '#0f172a' : 'transparent',
                    transition: 'all 0.1s ease',
                  }}
                />
              ))}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2, py: 0.5, fontSize: '0.8125rem', borderRadius: 1 }}>
                {error}
              </Alert>
            )}

            {/* Numeric Keypad */}
            <Box sx={{ maxWidth: 280, mx: 'auto', mb: 2 }}>
              <Grid container spacing={1}>
                {numpadDigits.map((digit) => (
                  <Grid item xs={4} key={digit}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => handleDigitPress(digit)}
                      disabled={submitting}
                      sx={{
                        height: 50,
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        borderRadius: 1.5,
                        '&:hover': {
                          bgcolor: '#f1f5f9',
                          borderColor: '#cbd5e1',
                        },
                        '&:active': {
                          bgcolor: '#e2e8f0',
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
                    variant="text"
                    onClick={handleClear}
                    disabled={submitting || mpin.length === 0}
                    sx={{
                      height: 50,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#64748b',
                    }}
                  >
                    Clear
                  </Button>
                </Grid>

                <Grid item xs={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => handleDigitPress('0')}
                    disabled={submitting}
                    sx={{
                      height: 50,
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      borderColor: '#e2e8f0',
                      bgcolor: '#ffffff',
                      borderRadius: 1.5,
                      '&:hover': {
                        bgcolor: '#f1f5f9',
                        borderColor: '#cbd5e1',
                      },
                    }}
                  >
                    0
                  </Button>
                </Grid>

                <Grid item xs={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleBackspace}
                    disabled={submitting || mpin.length === 0}
                    sx={{
                      height: 50,
                      color: '#64748b',
                      borderColor: '#e2e8f0',
                      bgcolor: '#ffffff',
                      borderRadius: 1.5,
                      '&:hover': {
                        bgcolor: '#f1f5f9',
                        borderColor: '#cbd5e1',
                      },
                    }}
                  >
                    <BackspaceIcon fontSize="small" />
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* Unlock Action Button */}
            <Button
              fullWidth
              size="medium"
              variant="contained"
              color="primary"
              onClick={() => handleSubmit()}
              disabled={submitting || mpin.length < 4}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{
                py: 1.25,
                fontWeight: 600,
                borderRadius: 1.5,
                fontSize: '0.875rem'
              }}
            >
              {submitting ? 'Verifying...' : 'Unlock'}
            </Button>

            {/* Dev Helper */}
            <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
              <Typography
                variant="caption"
                onClick={() => {
                  setMpin('1234');
                  handleSubmit('1234');
                }}
                sx={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  '&:hover': { color: '#0f172a', textDecoration: 'underline' }
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
