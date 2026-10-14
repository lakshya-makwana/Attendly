import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  PictureAsPdfOutlined as PdfIcon,
  TableChartOutlined as ExcelIcon,
  Close as CloseIcon,
  PrintOutlined as PrintIcon,
  ChevronRight as ArrowRightIcon
} from '@mui/icons-material';

/**
 * ExportFormatModal
 * Clean, mobile-friendly export format selection dialog for Attendly.
 *
 * Options:
 * 1. PDF Document (.pdf) - Print, share, or save the report.
 * 2. Excel Spreadsheet (.xlsx) - Download or share the report data.
 * Optional: Direct browser print shortcut.
 */
const ExportFormatModal = ({
  open,
  onClose,
  onSelectFormat,
  onDirectPrint,
  title = 'Export Document',
  subtitle = '',
  isGenerating = false,
  generatingFormat = null // 'pdf' | 'excel' | 'print'
}) => {
  return (
    <Dialog
      open={open}
      onClose={isGenerating ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            p: 1,
            border: '1px solid #e4e4e7',
            boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
            bgcolor: '#ffffff'
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          pb: 0.5,
          pt: 1.5,
          px: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}
      >
        <Box sx={{ minWidth: 0, pr: 1 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.15rem',
              color: '#09090b',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#71717a',
                fontWeight: 500,
                mt: 0.5,
                lineHeight: 1.3
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          disabled={isGenerating}
          aria-label="Close export dialog"
          sx={{
            color: '#71717a',
            p: 0.75,
            '&:hover': { bgcolor: '#f4f4f5' }
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, pt: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* 1. PDF Document Option */}
          <Box
            component="button"
            type="button"
            onClick={() => onSelectFormat('pdf')}
            disabled={isGenerating}
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              p: 1.75,
              borderRadius: 2.5,
              border: '1.5px solid #e4e4e7',
              bgcolor: '#ffffff',
              textAlign: 'left',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              touchAction: 'manipulation',
              transition: 'all 0.15s ease-out',
              opacity: isGenerating && generatingFormat !== 'pdf' ? 0.5 : 1,
              '@media (hover: hover) and (pointer: fine)': {
                '&:hover': {
                  borderColor: '#ea580c',
                  bgcolor: '#fffaf5'
                }
              },
              '&:active': {
                transform: isGenerating ? 'none' : 'scale(0.98)'
              }
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: '#fff1f2',
                color: '#e11d48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mr: 1.75
              }}
            >
              <PdfIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.925rem', color: '#09090b', lineHeight: 1.25 }}>
                PDF Document (.pdf)
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#71717a', mt: 0.25, lineHeight: 1.3 }}>
                Print, share, or save the report.
              </Typography>
            </Box>
            {isGenerating && generatingFormat === 'pdf' ? (
              <CircularProgress size={18} sx={{ color: '#ea580c', ml: 1 }} />
            ) : (
              <ArrowRightIcon sx={{ color: '#a1a1aa', fontSize: 20, ml: 1 }} />
            )}
          </Box>

          {/* 2. Excel Spreadsheet Option */}
          <Box
            component="button"
            type="button"
            onClick={() => onSelectFormat('excel')}
            disabled={isGenerating}
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              p: 1.75,
              borderRadius: 2.5,
              border: '1.5px solid #e4e4e7',
              bgcolor: '#ffffff',
              textAlign: 'left',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              touchAction: 'manipulation',
              transition: 'all 0.15s ease-out',
              opacity: isGenerating && generatingFormat !== 'excel' ? 0.5 : 1,
              '@media (hover: hover) and (pointer: fine)': {
                '&:hover': {
                  borderColor: '#16a34a',
                  bgcolor: '#f0fdf4'
                }
              },
              '&:active': {
                transform: isGenerating ? 'none' : 'scale(0.98)'
              }
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mr: 1.75
              }}
            >
              <ExcelIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.925rem', color: '#09090b', lineHeight: 1.25 }}>
                Excel Spreadsheet (.xlsx)
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#71717a', mt: 0.25, lineHeight: 1.3 }}>
                Download or share the report data.
              </Typography>
            </Box>
            {isGenerating && generatingFormat === 'excel' ? (
              <CircularProgress size={18} sx={{ color: '#16a34a', ml: 1 }} />
            ) : (
              <ArrowRightIcon sx={{ color: '#a1a1aa', fontSize: 20, ml: 1 }} />
            )}
          </Box>

          {/* Direct Browser Print (Option if provided) */}
          {onDirectPrint && (
            <Button
              variant="text"
              size="small"
              startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
              onClick={onDirectPrint}
              disabled={isGenerating}
              sx={{
                alignSelf: 'center',
                mt: 0.5,
                color: '#71717a',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { color: '#09090b', bgcolor: 'transparent' }
              }}
            >
              Or print directly in browser
            </Button>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 1.5, pt: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          fullWidth
          disabled={isGenerating}
          sx={{
            borderRadius: 2,
            borderColor: '#e4e4e7',
            color: '#09090b',
            fontWeight: 600,
            minHeight: 44,
            fontSize: '0.85rem',
            touchAction: 'manipulation',
            '@media (hover: hover) and (pointer: fine)': {
              '&:hover': { bgcolor: '#f4f4f5', borderColor: '#d4d4d8' }
            },
            '&:active': { transform: 'scale(0.97)' }
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportFormatModal;
