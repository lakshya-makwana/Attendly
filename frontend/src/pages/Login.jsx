import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const MPIN_LENGTH = 4;

const Login = () => {
  const [mpin, setMpin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const mpinRef = useRef('');
  const submittingRef = useRef(false);
  const shakeTimerRef = useRef(null);
  const keypadRef = useRef(null);

  const { loginWithMpin, loginDemo } = useAuth();
  const navigate = useNavigate();

  const triggerShake = useCallback(() => {
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    setShake(true);
    shakeTimerRef.current = setTimeout(() => {
      setShake(false);
    }, 350);
  }, []);

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  const executeLogin = useCallback(async (pinOverride) => {
    if (submittingRef.current) return;

    const pinToSubmit = pinOverride !== undefined ? pinOverride : mpinRef.current;
    if (pinToSubmit.length < MPIN_LENGTH) {
      setError(`Enter ${MPIN_LENGTH} digits`);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      let res;
      // MPIN 1234 authenticates to the existing DEMO account via existing backend endpoint
      if (pinToSubmit === '1234') {
        res = await loginDemo();
      } else {
        // Any other 4-digit MPIN is validated by backend against the administrator credentials
        res = await loginWithMpin(pinToSubmit);
      }

      if (res.success) {
        navigate('/', { replace: true });
        return;
      }

      // Distinguish network/server errors from incorrect MPIN
      const isNetwork = Boolean(res.isNetworkError || res.message?.toLowerCase().includes('network'));
      const isServerError = Boolean((res.status && res.status >= 500) || res.message?.toLowerCase().includes('server'));

      if (isNetwork) {
        setError(res.message || 'Network error. Please check your connection and try again.');
      } else if (isServerError) {
        setError(res.message || 'Server error. Please try again later.');
      } else {
        // Authentication failed due to incorrect MPIN
        setError('Incorrect MPIN. Please try again.');
        mpinRef.current = '';
        setMpin('');
        triggerShake();
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      keypadRef.current?.focus();
    }
  }, [loginDemo, loginWithMpin, navigate, triggerShake]);

  const handleDigitPress = useCallback((digit) => {
    if (submittingRef.current) return;

    if (shake) {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      setShake(false);
    }

    const current = mpinRef.current;
    if (current.length < MPIN_LENGTH) {
      const nextPin = current + digit;
      mpinRef.current = nextPin;
      setMpin(nextPin);
      setError('');

      if (nextPin.length === MPIN_LENGTH) {
        executeLogin(nextPin);
      }
    } else if (error) {
      // If a non-clearing error occurred, pressing a digit starts fresh
      mpinRef.current = digit;
      setMpin(digit);
      setError('');
    }
  }, [error, executeLogin, shake]);

  const handleBackspace = useCallback(() => {
    if (submittingRef.current) return;

    if (shake) {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      setShake(false);
    }

    setError('');
    const nextPin = mpinRef.current.slice(0, -1);
    mpinRef.current = nextPin;
    setMpin(nextPin);
  }, [shake]);

  const handleClear = useCallback(() => {
    if (submittingRef.current) return;

    if (shake) {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      setShake(false);
    }

    setError('');
    mpinRef.current = '';
    setMpin('');
  }, [shake]);

  // Hardware keyboard and paste handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore modified keys (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (submittingRef.current) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (mpinRef.current.length === MPIN_LENGTH) {
          executeLogin();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    const handlePaste = (e) => {
      if (submittingRef.current) return;
      const pasted = e.clipboardData?.getData('text') || '';
      const cleanDigits = pasted.replace(/\D/g, '').slice(0, MPIN_LENGTH);
      if (cleanDigits.length > 0) {
        e.preventDefault();
        setError('');
        mpinRef.current = cleanDigits;
        setMpin(cleanDigits);
        if (cleanDigits.length === MPIN_LENGTH) {
          executeLogin(cleanDigits);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [executeLogin, handleBackspace, handleClear, handleDigitPress]);

  const numpadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const keyButtonSx = {
    width: '100%',
    height: { xs: 52, sm: 58 },
    borderRadius: '12px',
    fontSize: { xs: '1.45rem', sm: '1.6rem' },
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    color: '#18181b',
    bgcolor: '#ffffff',
    border: '1px solid #e4e4e7',
    boxShadow: '0 1px 2px rgba(28, 25, 23, 0.04)',
    minWidth: 0,
    p: 0,
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    transition: 'transform 100ms ease, background-color 100ms ease, border-color 100ms ease, color 100ms ease',
    '@media (hover: hover) and (pointer: fine)': {
      '&:hover': {
        bgcolor: '#faf9f6',
        borderColor: '#d4d4d8'
      }
    },
    '&:active': {
      transform: 'scale(0.96)',
      bgcolor: '#fff7ed',
      borderColor: '#fed7aa',
      color: '#ea580c'
    },
    '&.Mui-disabled': {
      color: '#d4d4d8',
      bgcolor: '#faf9f6',
      borderColor: '#f4f4f5'
    },
    '&:focus-visible, &.Mui-focusVisible': {
      outline: '2px solid #ea580c',
      outlineOffset: '2px'
    }
  };

  const utilityButtonSx = {
    ...keyButtonSx,
    bgcolor: '#faf9f6',
    color: '#52525b',
    fontSize: { xs: '0.875rem', sm: '0.95rem' },
    fontWeight: 600,
    textTransform: 'none',
    letterSpacing: '0.01em',
    '@media (hover: hover) and (pointer: fine)': {
      '&:hover': {
        bgcolor: '#f4f4f5',
        borderColor: '#d4d4d8',
        color: '#18181b'
      }
    },
    '&:active': {
      transform: 'scale(0.96)',
      bgcolor: '#f4f4f5',
      borderColor: '#d4d4d8',
      color: '#18181b'
    }
  };

  const backspaceButtonSx = {
    ...keyButtonSx,
    bgcolor: '#faf9f6',
    color: '#52525b',
    '@media (hover: hover) and (pointer: fine)': {
      '&:hover': {
        bgcolor: '#f4f4f5',
        borderColor: '#d4d4d8',
        color: '#18181b'
      }
    },
    '&:active': {
      transform: 'scale(0.96)',
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 5 },
        pt: 'max(24px, env(safe-area-inset-top, 24px))',
        pb: 'max(24px, env(safe-area-inset-bottom, 24px))',
        outline: 'none',
        '&:focus': { outline: 'none' }
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: 348, sm: 384, md: 400 },
          textAlign: 'center',
          my: 'auto'
        }}
      >
        {/* Attendly Branding & Lock Icon */}
        <Box
          sx={{
            position: 'relative',
            width: { xs: 48, sm: 54 },
            height: { xs: 48, sm: 54 },
            borderRadius: '14px',
            bgcolor: '#18181b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1.5,
            boxShadow: '0 4px 14px rgba(24, 24, 27, 0.12)'
          }}
        >
          <LockIcon sx={{ fontSize: { xs: 22, sm: 25 } }} />
          <Box
            sx={{
              position: 'absolute',
              top: { xs: 6, sm: 7 },
              right: { xs: 6, sm: 7 },
              width: { xs: 7, sm: 8 },
              height: { xs: 7, sm: 8 },
              borderRadius: '50%',
              bgcolor: '#ea580c',
              boxShadow: '0 0 0 2px #18181b'
            }}
          />
        </Box>
        <Typography
          component="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.45rem', sm: '1.65rem' },
            color: '#09090b',
            letterSpacing: '-0.025em',
            lineHeight: 1.2
          }}
        >
          Attendly
        </Typography>
        <Typography
          sx={{
            color: '#71717a',
            fontSize: { xs: '0.8125rem', sm: '0.875rem' },
            fontWeight: 500,
            mt: 0.5,
            mb: { xs: 2.25, sm: 2.75 }
          }}
        >
          Enter your MPIN to continue
        </Typography>

        <Card
          ref={keypadRef}
          tabIndex={-1}
          elevation={0}
          sx={{
            borderRadius: { xs: '16px', sm: '18px' },
            border: '1px solid #e4e4e7',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03), 0 6px 20px -4px rgba(0, 0, 0, 0.05)',
            bgcolor: '#ffffff',
            p: { xs: 2.25, sm: 3 },
            outline: 'none',
            '&:focus': { outline: 'none' }
          }}
        >
          {/* Four Square MPIN Blocks in ONE Horizontal Row */}
          <Box
            role="group"
            aria-label="MPIN Entry"
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: { xs: 1.25, sm: 1.75, md: 2 },
              mb: { xs: 2.25, sm: 2.75 },
              py: 0.5,
              userSelect: 'none',
              WebkitUserSelect: 'none',
              animation: shake ? 'mpinShake 320ms cubic-bezier(0.36, 0.07, 0.19, 0.97)' : 'none',
              '@keyframes mpinShake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '20%': { transform: 'translateX(-6px)' },
                '40%': { transform: 'translateX(6px)' },
                '60%': { transform: 'translateX(-3px)' },
                '80%': { transform: 'translateX(3px)' }
              },
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none'
              }
            }}
          >
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < mpin.length;
              const isActive = index === mpin.length && !shake;
              return (
                <Box
                  key={index}
                  aria-label={`Digit ${index + 1} of 4${isFilled ? ' filled' : ''}`}
                  sx={{
                    width: { xs: 52, sm: 58, md: 62 },
                    height: { xs: 52, sm: 58, md: 62 },
                    borderRadius: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: shake
                      ? '#fff7ed'
                      : isFilled || isActive
                      ? '#ffffff'
                      : '#faf9f6',
                    border: shake
                      ? '2px solid #ea580c'
                      : isActive
                      ? '2px solid #ea580c'
                      : isFilled
                      ? '2px solid #18181b'
                      : '1.5px solid #d4d4d8',
                    boxShadow: shake
                      ? '0 0 10px rgba(234, 88, 12, 0.25)'
                      : isActive
                      ? '0 0 0 3px rgba(234, 88, 12, 0.14)'
                      : isFilled
                      ? '0 2px 6px rgba(24, 24, 27, 0.08)'
                      : '0 1px 2px rgba(0, 0, 0, 0.02)',
                    transition: 'border-color 120ms ease, background-color 120ms ease, box-shadow 120ms ease',
                    '@media (prefers-reduced-motion: reduce)': {
                      transition: 'none'
                    }
                  }}
                >
                  {isFilled && (
                    <Box
                      sx={{
                        width: { xs: 13, sm: 15 },
                        height: { xs: 13, sm: 15 },
                        borderRadius: '50%',
                        bgcolor: '#18181b',
                        animation: 'popIn 120ms cubic-bezier(0.23, 1, 0.32, 1)',
                        '@keyframes popIn': {
                          from: { transform: 'scale(0.8)', opacity: 0 },
                          to: { transform: 'scale(1)', opacity: 1 }
                        },
                        '@media (prefers-reduced-motion: reduce)': {
                          animation: 'none'
                        }
                      }}
                    />
                  )}
                </Box>
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
                bgcolor: '#fff7ed',
                color: '#9a3412',
                border: '1px solid #fed7aa',
                '& .MuiAlert-icon': {
                  color: '#ea580c'
                },
                alignItems: 'center'
              }}
            >
              {error}
            </Alert>
          )}

          {/* Submitting Loading Indicator */}
          {submitting && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 1.5
              }}
            >
              <CircularProgress size={16} sx={{ color: '#ea580c' }} />
              <Typography sx={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>
                Verifying...
              </Typography>
            </Box>
          )}

          {/* 3-Column Keypad: Visible immediately when page loads */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: { xs: 1, sm: 1.25 },
              width: '100%'
            }}
          >
            {numpadDigits.map((digit) => (
              <Button
                key={digit}
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleDigitPress(digit);
                }}
                disabled={submitting}
                sx={keyButtonSx}
                aria-label={`Digit ${digit}`}
              >
                {digit}
              </Button>
            ))}

            {/* Row 4: Exact Arrangement [ Clear ] [ 0 ] [ Delete ] */}
            {/* Left: Clear */}
            <Button
              onClick={(e) => {
                e.currentTarget.blur();
                handleClear();
              }}
              disabled={submitting || mpin.length === 0}
              sx={utilityButtonSx}
              aria-label="Clear all MPIN digits"
            >
              Clear
            </Button>

            {/* Centre: 0 */}
            <Button
              onClick={(e) => {
                e.currentTarget.blur();
                handleDigitPress('0');
              }}
              disabled={submitting}
              sx={keyButtonSx}
              aria-label="Digit 0"
            >
              0
            </Button>

            {/* Right: Delete / Backspace */}
            <Button
              onClick={(e) => {
                e.currentTarget.blur();
                handleBackspace();
              }}
              disabled={submitting || mpin.length === 0}
              sx={backspaceButtonSx}
              aria-label="Delete last digit"
            >
              <BackspaceIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
            </Button>
          </Box>

          {/* Demo Password Hint centered below keypad */}
          <Typography
            sx={{
              color: '#71717a',
              fontSize: '0.8125rem',
              fontWeight: 500,
              textAlign: 'center',
              mt: { xs: 2.25, sm: 2.75 },
              userSelect: 'none',
              letterSpacing: '0.01em'
            }}
          >
            Demo password: 1234
          </Typography>
        </Card>
      </Box>
    </Box>
  );
};

export default Login;
