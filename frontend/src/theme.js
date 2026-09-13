import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',       // Obsidian black
      light: '#1f2937',
      dark: '#000000',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#555f6f',       // Stitch secondary
      light: '#76777c',
      dark: '#3d4756',
      contrastText: '#ffffff',
    },
    success: {
      main: '#0b0f17',       // Monochrome high emphasis
      light: '#16a34a',
      dark: '#14532d',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#d97706',
      light: '#f59e0b',
      dark: '#b45309',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ba1a1a',       // Stitch error
      light: '#dc2626',
      dark: '#93000a',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f9f9ff',    // Stitch surface
      paper: '#ffffff',      // Stitch surface-container-lowest
    },
    text: {
      primary: '#151c27',    // Stitch on-surface
      secondary: '#555f6f',  // Stitch secondary
    },
    divider: '#e2e8f8',      // Stitch hairline border
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h5: {
      fontWeight: 700,
      fontSize: '1.35rem',
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      color: '#151c27',
    },
    h6: {
      fontWeight: 700,
      fontSize: '1.1rem',
      lineHeight: 1.35,
      letterSpacing: '-0.01em',
      color: '#151c27',
    },
    subtitle1: {
      fontWeight: 600,
      fontSize: '0.95rem',
      lineHeight: 1.4,
      color: '#151c27',
    },
    subtitle2: {
      fontWeight: 600,
      fontSize: '0.8125rem',
      lineHeight: 1.4,
      color: '#555f6f',
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#151c27',
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
      color: '#555f6f',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      color: '#555f6f',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.875rem',
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f9f9ff',
          color: '#151c27',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          letterSpacing: '0.01em',
          padding: '8px 16px',
          textTransform: 'none',
          transition: 'all 0.15s ease',
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        containedPrimary: {
          backgroundColor: '#000000',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#1f2937',
          },
        },
        outlined: {
          borderColor: '#dce2f3',
          color: '#151c27',
          backgroundColor: '#ffffff',
          '&:hover': {
            borderColor: '#bdc7d9',
            backgroundColor: '#f0f3ff',
          },
        },
        sizeSmall: {
          padding: '5px 12px',
          fontSize: '0.775rem',
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
          borderRadius: 12,
          border: '1px solid #e2e8f8',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#e2e8f8',
          padding: '11px 14px',
          fontSize: '0.8125rem',
        },
        head: {
          backgroundColor: '#f0f3ff',
          color: '#555f6f',
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.75rem',
          height: 26,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 16px 32px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e2e8f8',
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
            borderRadius: 10,
            backgroundColor: '#ffffff',
            '& fieldset': {
              borderColor: '#dce2f3',
            },
            '&:hover fieldset': {
              borderColor: '#555f6f',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#000000',
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
          borderRadius: 10,
          backgroundColor: '#ffffff',
          '& fieldset': {
            borderColor: '#dce2f3',
          },
          '&:hover fieldset': {
            borderColor: '#555f6f',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#000000',
          },
        },
      },
    },
  },
});

export default theme;
