import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',       // High-contrast obsidian black
      light: '#27272a',
      dark: '#000000',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#71717a',       // Neutral zinc secondary
      light: '#a1a1aa',
      dark: '#3f3f46',
      contrastText: '#ffffff',
    },
    success: {
      main: '#16a34a',       // Semantic success
      light: '#22c55e',
      dark: '#15803d',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#d97706',       // Semantic warning
      light: '#f59e0b',
      dark: '#b45309',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc2626',       // Semantic error
      light: '#ef4444',
      dark: '#991b1b',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8f9fa',    // Neutral light-grey canvas
      paper: '#ffffff',      // Crisp white surface
    },
    text: {
      primary: '#09090b',    // High-contrast neutral dark text
      secondary: '#71717a',  // Muted secondary text
    },
    divider: '#e4e4e7',      // Subtle hairline neutral border
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h5: {
      fontWeight: 700,
      fontSize: '1.35rem',
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      color: '#09090b',
    },
    h6: {
      fontWeight: 700,
      fontSize: '1.1rem',
      lineHeight: 1.35,
      letterSpacing: '-0.01em',
      color: '#09090b',
    },
    subtitle1: {
      fontWeight: 600,
      fontSize: '0.95rem',
      lineHeight: 1.4,
      color: '#09090b',
    },
    subtitle2: {
      fontWeight: 600,
      fontSize: '0.8125rem',
      lineHeight: 1.4,
      color: '#71717a',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#09090b',
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
      color: '#71717a',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      color: '#71717a',
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
          backgroundColor: '#f8f9fa',
          color: '#09090b',
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
          transition: 'transform 140ms cubic-bezier(0.23, 1, 0.32, 1), background-color 140ms ease-out, border-color 140ms ease-out, color 140ms ease-out',
          '&:active': {
            transform: 'scale(0.97)',
          },
        },
        containedPrimary: {
          backgroundColor: '#000000',
          color: '#ffffff',
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': {
              backgroundColor: '#27272a',
            },
          },
        },
        outlined: {
          borderColor: '#e4e4e7',
          color: '#09090b',
          backgroundColor: '#ffffff',
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': {
              borderColor: '#a1a1aa',
              backgroundColor: '#f4f4f5',
            },
          },
        },
        sizeSmall: {
          padding: '5px 12px',
          fontSize: '0.775rem',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'transform 140ms cubic-bezier(0.23, 1, 0.32, 1), background-color 140ms ease-out, color 140ms ease-out',
          '&:active': {
            transform: 'scale(0.95)',
          },
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': {
              backgroundColor: '#f4f4f5',
            },
          },
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
          border: '1px solid #e4e4e7',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#e4e4e7',
          padding: '11px 14px',
          fontSize: '0.8125rem',
          fontVariantNumeric: 'tabular-nums',
        },
        head: {
          backgroundColor: '#f4f4f5',
          color: '#71717a',
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
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e4e4e7',
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
              borderColor: '#e4e4e7',
              transition: 'border-color 140ms ease-out',
            },
            '@media (hover: hover) and (pointer: fine)': {
              '&:hover fieldset': {
                borderColor: '#a1a1aa',
              },
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
            borderColor: '#e4e4e7',
            transition: 'border-color 140ms ease-out',
          },
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover fieldset': {
              borderColor: '#a1a1aa',
            },
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
