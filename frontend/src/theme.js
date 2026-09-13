import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f172a',       // Slate 900 - authoritative, calm, neutral
      light: '#334155',
      dark: '#020617',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569',       // Slate 600
      light: '#64748b',
      dark: '#1e293b',
      contrastText: '#ffffff',
    },
    success: {
      main: '#15803d',       // Emerald 700
      light: '#22c55e',
      dark: '#166534',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#b45309',       // Amber 700
      light: '#d97706',
      dark: '#92400e',
      contrastText: '#ffffff',
    },
    error: {
      main: '#b91c1c',       // Red 700
      light: '#dc2626',
      dark: '#991b1b',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',    // Slate 50 - crisp, non-distracting
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',    // Slate 900
      secondary: '#64748b',  // Slate 500
    },
    divider: '#e2e8f0',      // Slate 200
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h5: {
      fontWeight: 700,
      fontSize: '1.25rem',
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      color: '#0f172a',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.05rem',
      lineHeight: 1.35,
      letterSpacing: '-0.01em',
      color: '#0f172a',
    },
    subtitle1: {
      fontWeight: 600,
      fontSize: '0.925rem',
      lineHeight: 1.4,
      color: '#0f172a',
    },
    subtitle2: {
      fontWeight: 600,
      fontSize: '0.8125rem',
      lineHeight: 1.4,
      color: '#475569',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#0f172a',
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
      color: '#64748b',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      color: '#64748b',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.875rem',
    },
  },
  shape: {
    borderRadius: 6, // Restrained, standard professional SaaS radius
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f8fafc',
          color: '#0f172a',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          letterSpacing: '0.01em',
          padding: '8px 16px',
        },
        containedPrimary: {
          backgroundColor: '#0f172a',
          '&:hover': {
            backgroundColor: '#1e293b',
          },
        },
        outlined: {
          borderColor: '#cbd5e1',
          color: '#0f172a',
          backgroundColor: '#ffffff',
          '&:hover': {
            borderColor: '#94a3b8',
            backgroundColor: '#f8fafc',
          },
        },
        sizeSmall: {
          padding: '4px 10px',
          fontSize: '0.75rem',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#e2e8f0',
          padding: '10px 14px',
          fontSize: '0.8125rem',
        },
        head: {
          backgroundColor: '#f8fafc',
          color: '#475569',
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontWeight: 600,
          fontSize: '0.75rem',
          height: 24,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            backgroundColor: '#ffffff',
            '& fieldset': {
              borderColor: '#cbd5e1',
            },
            '&:hover fieldset': {
              borderColor: '#94a3b8',
            },
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: '#ffffff',
        },
      },
    },
  },
});

export default theme;
