import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PhoneOutlined as PhoneIcon,
  Add as AddIcon,
  DeleteOutlined as DeleteIcon,
  Person as PersonIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  LocationOn as LocationIcon,
  TrendingUp as TrendingUpIcon,
  InfoOutlined as InfoIcon,
  PersonOffOutlined as PersonOffIcon,
  HowToRegOutlined as HowToRegIcon
} from '@mui/icons-material';
import api from '../api/client';
import { formatDateIndian, formatMonthYear } from '../utils/dateUtils';
import WageHistoryModal from '../components/WageHistoryModal';

// Day-of-month and short weekday for a YYYY-MM-DD string, parsed without timezone shifts
const getDateParts = (dateStr) => {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return { day: formatDateIndian(dateStr), weekday: '' };
  }
  const [y, m, d] = dateStr.substring(0, 10).split('-').map(Number);
  return {
    day: String(d).padStart(2, '0'),
    weekday: new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short' })
  };
};

const WorkerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);

  // Monthly Worker Record State
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState(null);

  // Add Advance modal
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [advanceNote, setAdvanceNote] = useState('');
  const [advanceSaving, setAdvanceSaving] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Status Change Confirmation Dialog State
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Wage History & Rate Change Modal State
  const [wageHistoryOpen, setWageHistoryOpen] = useState(false);

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const handleConfirmStatusChange = async () => {
    if (!detail?.worker) return;
    setStatusLoading(true);
    try {
      const res = await api.patch(`/workers/${id}/toggle-status`);
      setDetail((prev) => ({
        ...prev,
        worker: { ...prev.worker, is_active: res.data.is_active }
      }));
      setSnackbar({
        open: true,
        message: `Marked ${detail.worker.name} as ${res.data.is_active ? 'active' : 'inactive'}.`,
        severity: 'success'
      });
      setStatusDialogOpen(false);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Failed to update worker status.',
        severity: 'error'
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/workers/${id}/detail`);
      setDetail(res.data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load worker details.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyRecord = async (year, month) => {
    try {
      setMonthlyLoading(true);
      setMonthlyError(null);
      const res = await api.get(`/workers/${id}/monthly`, {
        params: { year, month }
      });
      setMonthlyData(res.data);
    } catch (err) {
      setMonthlyError(err.response?.data?.detail || 'Failed to load records for this month.');
      setSnackbar({
        open: true,
        message: 'Failed to load records for the selected month.',
        severity: 'error'
      });
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchMonthlyRecord(selectedYear, selectedMonth);
    }
  }, [id, selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  const handleCreateAdvance = async () => {
    if (!advanceAmount || parseFloat(advanceAmount) <= 0) {
      setSnackbar({ open: true, message: 'Please enter a valid advance amount.', severity: 'error' });
      return;
    }

    setAdvanceSaving(true);
    try {
      await api.post('/advances', {
        worker_id: parseInt(id),
        amount: parseFloat(advanceAmount),
        date: advanceDate,
        note: advanceNote.trim() || null
      });

      setSnackbar({ open: true, message: 'Cash advance recorded.', severity: 'success' });
      setAdvanceDialogOpen(false);
      setAdvanceAmount('');
      setAdvanceNote('');
      fetchDetail();
      fetchMonthlyRecord(selectedYear, selectedMonth);
    } catch {
      setSnackbar({ open: true, message: 'Failed to record advance.', severity: 'error' });
    } finally {
      setAdvanceSaving(false);
    }
  };

  const handleDeleteAdvance = async (advanceId) => {
    try {
      await api.delete(`/advances/${advanceId}`);
      setSnackbar({ open: true, message: 'Advance transaction deleted.', severity: 'info' });
      fetchDetail();
      fetchMonthlyRecord(selectedYear, selectedMonth);
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete advance.', severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress size={30} sx={{ color: '#000000' }} />
      </Box>
    );
  }

  if (!detail) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2.5, bgcolor: '#ffdad6', color: '#93000a' }}>
        Worker not found.{' '}
        <Button size="small" onClick={() => navigate('/workers')} sx={{ color: '#000000', fontWeight: 700 }}>
          Return to Workers
        </Button>
      </Alert>
    );
  }

  const { worker } = detail;
  const now = new Date();
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1);
  const selectedMonthLabel = formatMonthYear(selectedYear, selectedMonth);

  const summary = monthlyData?.summary || {
    total_units: 0,
    gross_earnings: 0,
    total_advances: 0,
    net_payable: 0
  };
  const isPositiveNet = parseFloat(summary.net_payable || 0) >= 0;
  const attendanceList = monthlyData?.attendance || [];
  const advancesList = monthlyData?.advances || [];
  const isEmptyMonth = !monthlyLoading && attendanceList.length === 0 && advancesList.length === 0;

  const wageBreakdown = monthlyData?.wage_breakdown || [];
  const hasRateChange = wageBreakdown.length > 1;
  const shortMonthLabel = `${selectedMonthLabel.slice(0, 3)} ${selectedYear}`;

  const microLabelSx = {
    color: '#71717a',
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    lineHeight: 1.3
  };

  const actionButtonSx = {
    minHeight: 44,
    px: 1.75,
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    touchAction: 'manipulation',
    '& .MuiButton-startIcon': { mr: 0.75, '& svg': { fontSize: 18 } }
  };

  const headCellSx = {
    bgcolor: '#fafafa',
    color: '#71717a',
    fontWeight: 600,
    fontSize: '0.6875rem',
    borderBottom: '1px solid #e4e4e7'
  };

  const countBadgeSx = (selected) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    px: 0.6,
    borderRadius: 9999,
    fontSize: '0.6875rem',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    bgcolor: selected ? '#fff7ed' : '#e4e4e7',
    color: selected ? '#c2410c' : '#71717a'
  });

  const summaryStats = [
    {
      label: 'Units',
      value: parseFloat(summary.total_units || 0).toFixed(1),
      caption: shortMonthLabel
    },
    {
      label: 'Gross',
      value: formatCurrency(summary.gross_earnings),
      caption: hasRateChange ? `${wageBreakdown.length} wage rates` : 'Units × rate',
      captionColor: hasRateChange ? '#ea580c' : undefined,
      captionWeight: hasRateChange ? 700 : 500
    },
    {
      label: 'Advances',
      value: formatCurrency(summary.total_advances),
      valueColor: parseFloat(summary.total_advances || 0) > 0 ? '#dc2626' : '#09090b',
      caption: 'Deducted'
    }
  ];

  const renderDateTile = (date) => {
    const { day, weekday } = getDateParts(date);
    return (
      <Box
        sx={{
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: '10px',
          bgcolor: '#fafaf9',
          border: '1px solid #f4f4f5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: '0.9375rem', color: '#09090b', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
          {day}
        </Typography>
        {weekday && (
          <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.3 }}>
            {weekday}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 }, maxWidth: 960, width: '100%', mx: 'auto', pb: { xs: 4, sm: 6 } }}>
      {/* Top Bar: back navigation + status action */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, pt: 0.5 }}>
        <Button
          onClick={() => navigate('/workers')}
          startIcon={<ArrowBackIcon />}
          aria-label="Back to workers list"
          sx={{
            minHeight: 40,
            px: 1.25,
            ml: -1.25,
            color: '#71717a',
            fontSize: '0.8125rem',
            fontWeight: 600,
            touchAction: 'manipulation',
            '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } },
            '@media (hover: hover) and (pointer: fine)': {
              '&:hover': { bgcolor: '#f4f4f5', color: '#09090b' }
            }
          }}
        >
          Workers
        </Button>

        <Button
          variant="outlined"
          onClick={() => setStatusDialogOpen(true)}
          startIcon={worker.is_active ? <PersonOffIcon /> : <HowToRegIcon />}
          sx={{
            minHeight: 40,
            px: 1.5,
            borderRadius: '10px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#3f3f46',
            whiteSpace: 'nowrap',
            touchAction: 'manipulation',
            '& .MuiButton-startIcon': { mr: 0.6, '& svg': { fontSize: 17 } }
          }}
        >
          {worker.is_active ? 'Mark Inactive' : 'Mark Active'}
        </Button>
      </Box>

      {/* Profile Card */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Card elevation={0} sx={{ borderRadius: '16px', p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.75, sm: 2 } }}>
            <Box
              sx={{
                width: { xs: 56, sm: 64 },
                height: { xs: 56, sm: 64 },
                borderRadius: '14px',
                bgcolor: worker.is_active ? '#fff7ed' : '#f4f4f5',
                color: worker.is_active ? '#ea580c' : '#71717a',
                border: '1px solid',
                borderColor: worker.is_active ? '#fed7aa' : '#e4e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: { xs: '1.375rem', sm: '1.5rem' },
                flexShrink: 0,
                opacity: worker.is_active ? 1 : 0.8
              }}
            >
              {worker.name ? worker.name.charAt(0).toUpperCase() : <PersonIcon />}
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                component="h1"
                title={worker.name}
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.375rem', sm: '1.625rem' },
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  color: '#09090b',
                  overflowWrap: 'anywhere',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {worker.name}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1.25, rowGap: 0.5, mt: 0.75 }}>
                <Box
                  component="span"
                  sx={{
                    bgcolor: worker.is_active ? '#f0fdf4' : '#f4f4f5',
                    color: worker.is_active ? '#15803d' : '#71717a',
                    border: '1px solid',
                    borderColor: worker.is_active ? '#bbf7d0' : '#e4e4e7',
                    height: 22,
                    px: 1,
                    borderRadius: 9999,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.6,
                    flexShrink: 0
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: worker.is_active ? '#16a34a' : '#a1a1aa'
                    }}
                  />
                  {worker.is_active ? 'Active' : 'Inactive'}
                </Box>

                {worker.phone ? (
                  <Typography
                    component="a"
                    href={`tel:${worker.phone}`}
                    sx={{
                      color: '#52525b',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      minHeight: 28,
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      fontVariantNumeric: 'tabular-nums',
                      touchAction: 'manipulation',
                      '@media (hover: hover) and (pointer: fine)': {
                        '&:hover': { color: '#09090b', textDecoration: 'underline' }
                      }
                    }}
                  >
                    <PhoneIcon sx={{ fontSize: 15, color: '#71717a' }} />
                    {worker.phone}
                  </Typography>
                ) : (
                  <Typography
                    sx={{
                      color: '#a1a1aa',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      minHeight: 28,
                      fontSize: '0.8125rem',
                      fontWeight: 500
                    }}
                  >
                    <PhoneIcon sx={{ fontSize: 15 }} />
                    No phone number
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Wage + Primary Actions */}
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px solid #f4f4f5',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: { xs: 1.75, sm: 2 }
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={microLabelSx}>Current daily wage</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.35 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#09090b', lineHeight: 1.15, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(worker.daily_wage)}
                </Typography>
                <Typography sx={{ color: '#71717a', fontSize: '0.8125rem', fontWeight: 500 }}>
                  / day
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
                width: { xs: '100%', sm: 'auto' },
                '@media (max-width: 359px)': { gridTemplateColumns: '1fr' }
              }}
            >
              <Button
                variant="outlined"
                startIcon={<TrendingUpIcon />}
                onClick={() => setWageHistoryOpen(true)}
                sx={actionButtonSx}
              >
                Change Wage
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAdvanceDialogOpen(true)}
                sx={actionButtonSx}
              >
                Give Advance
              </Button>
            </Box>
          </Box>
        </Card>

        {/* Inactive Worker Notice */}
        {!worker.is_active && (
          <Box
            role="note"
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              px: 1.5,
              py: 1,
              bgcolor: '#f4f4f5',
              border: '1px solid #e4e4e7',
              borderRadius: '10px'
            }}
          >
            <InfoIcon sx={{ fontSize: 16, color: '#71717a', mt: '2px', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.78rem', color: '#52525b', lineHeight: 1.45 }}>
              Inactive workers can't receive new attendance. All historical shifts, wages and advances remain intact.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Month Selector */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 0.75,
          py: 0.5,
          bgcolor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e4e4e7'
        }}
      >
        <IconButton
          onClick={handlePrevMonth}
          disabled={monthlyLoading}
          aria-label="Previous Month"
          sx={{
            color: '#71717a',
            width: 40,
            height: 40,
            borderRadius: '10px',
            touchAction: 'manipulation',
            '@media (hover: hover) and (pointer: fine)': {
              '&:hover': { color: '#09090b', bgcolor: '#f4f4f5' }
            },
            '&.Mui-disabled': { color: '#d4d4d8' }
          }}
        >
          <PrevIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: '0.9375rem', sm: '1rem' }, fontWeight: 700, color: '#09090b', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            {selectedMonthLabel}
          </Typography>
          {monthlyLoading && (
            <CircularProgress size={14} sx={{ color: '#ea580c' }} />
          )}
          {!isCurrentMonth && (
            <Button
              size="small"
              onClick={handleCurrentMonth}
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                minHeight: 28,
                py: 0.25,
                px: 1.25,
                minWidth: 'auto',
                borderRadius: 9999,
                bgcolor: '#fff7ed',
                color: '#c2410c',
                border: '1px solid #fed7aa',
                touchAction: 'manipulation',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': { bgcolor: '#ffedd5' }
                }
              }}
            >
              Current
            </Button>
          )}
        </Box>

        <IconButton
          onClick={handleNextMonth}
          disabled={monthlyLoading}
          aria-label="Next Month"
          sx={{
            color: '#71717a',
            width: 40,
            height: 40,
            borderRadius: '10px',
            touchAction: 'manipulation',
            '@media (hover: hover) and (pointer: fine)': {
              '&:hover': { color: '#09090b', bgcolor: '#f4f4f5' }
            },
            '&.Mui-disabled': { color: '#d4d4d8' }
          }}
        >
          <NextIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Monthly Financial Summary */}
      <Card
        elevation={0}
        sx={{
          borderRadius: '16px',
          overflow: 'hidden',
          opacity: monthlyLoading ? 0.6 : 1,
          transition: 'opacity 200ms ease'
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {summaryStats.map((stat, idx) => (
            <Box
              key={stat.label}
              sx={{
                minWidth: 0,
                px: { xs: 1.5, sm: 2.5 },
                py: { xs: 1.75, sm: 2 },
                borderLeft: idx ? '1px solid #f4f4f5' : 'none'
              }}
            >
              <Typography noWrap sx={microLabelSx}>
                {stat.label}
              </Typography>
              <Typography
                noWrap
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1rem', sm: '1.375rem' },
                  color: stat.valueColor || '#09090b',
                  mt: 0.5,
                  lineHeight: 1.25,
                  letterSpacing: '-0.01em',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {stat.value}
              </Typography>
              <Typography
                noWrap
                sx={{
                  fontSize: '0.6875rem',
                  color: stat.captionColor || '#a1a1aa',
                  fontWeight: stat.captionWeight || 500,
                  mt: 0.25
                }}
              >
                {stat.caption}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Mid-Month Rate Breakdown */}
        {hasRateChange && (
          <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5, borderTop: '1px solid #f4f4f5' }}>
            <Typography sx={{ ...microLabelSx, color: '#c2410c', mb: 1 }}>
              Mid-month rate breakdown
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {wageBreakdown.map((wb, idx) => (
                <Box
                  key={idx}
                  sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5 }}
                >
                  <Typography sx={{ fontSize: '0.8125rem', color: '#52525b', fontVariantNumeric: 'tabular-nums', minWidth: 0 }}>
                    {parseFloat(wb.work_units).toFixed(1)} units × <Box component="span" sx={{ fontWeight: 700, color: '#09090b' }}>₹{parseFloat(wb.rate).toFixed(0)}/day</Box>
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#09090b', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    ₹{parseFloat(wb.earnings).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Net Payable */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: { xs: 1.5, sm: 2.5 },
            py: { xs: 1.75, sm: 2 },
            bgcolor: isPositiveNet ? '#fff7ed' : '#fef2f2',
            borderTop: '1px solid',
            borderColor: isPositiveNet ? '#fed7aa' : '#fecaca'
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ ...microLabelSx, fontWeight: 700, color: isPositiveNet ? '#c2410c' : '#b91c1c' }}>
              Net Payable
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: isPositiveNet ? '#9a3412' : '#991b1b', mt: 0.25 }}>
              {isPositiveNet ? 'Disbursable' : 'Advance Due'}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              color: isPositiveNet ? '#ea580c' : '#dc2626',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap'
            }}
          >
            {formatCurrency(summary.net_payable)}
          </Typography>
        </Box>
      </Card>

      {/* Tabs: Attendance vs Advances */}
      <Card elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden' }}>
        <Box sx={{ p: 1, borderBottom: '1px solid #f4f4f5' }}>
          <Box sx={{ p: '3px', bgcolor: '#f4f4f5', borderRadius: '10px' }}>
            <Tabs
              value={tabIndex}
              onChange={(e, val) => setTabIndex(val)}
              variant="fullWidth"
              sx={{
                minHeight: 38,
                '& .MuiTabs-indicator': {
                  height: '100%',
                  borderRadius: '8px',
                  bgcolor: '#ffffff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                  zIndex: 0
                },
                '& .MuiTab-root': {
                  zIndex: 1,
                  minHeight: 38,
                  py: 0,
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  color: '#71717a',
                  textTransform: 'none',
                  touchAction: 'manipulation',
                  '&.Mui-selected': { color: '#09090b', fontWeight: 700 }
                }
              }}
            >
              <Tab
                label={
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    Attendance
                    <Box component="span" sx={countBadgeSx(tabIndex === 0)}>{attendanceList.length}</Box>
                  </Box>
                }
              />
              <Tab
                label={
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    Advances
                    <Box component="span" sx={countBadgeSx(tabIndex === 1)}>{advancesList.length}</Box>
                  </Box>
                }
              />
            </Tabs>
          </Box>
        </Box>

        {monthlyError ? (
          <Box sx={{ py: 5, textAlign: 'center', px: 2 }}>
            <Typography sx={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 600 }}>
              {monthlyError}
            </Typography>
            <Button
              size="small"
              onClick={() => fetchMonthlyRecord(selectedYear, selectedMonth)}
              sx={{ mt: 1.5, minHeight: 36, color: '#09090b', fontWeight: 700 }}
            >
              Retry
            </Button>
          </Box>
        ) : isEmptyMonth ? (
          <Box sx={{ py: 5, textAlign: 'center', px: 2 }}>
            <Typography sx={{ color: '#71717a', fontSize: '0.875rem', fontWeight: 500 }}>
              No records for {selectedMonthLabel}
            </Typography>
          </Box>
        ) : (
          <>
            {/* Tab 0: Attendance */}
            {tabIndex === 0 && (
              <Box>
                {attendanceList.length === 0 ? (
                  <Box sx={{ py: 5, textAlign: 'center', px: 2 }}>
                    <Typography sx={{ color: '#71717a', fontSize: '0.875rem' }}>
                      No attendance records for {selectedMonthLabel}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* Mobile List View */}
                    <Box component="ul" sx={{ display: { xs: 'block', sm: 'none' }, listStyle: 'none', m: 0, p: 0 }}>
                      {attendanceList.map((att, idx) => {
                        const units = parseFloat(att.work_units || 0);
                        const hasSite = Boolean(att.site_name);
                        return (
                          <Box
                            component="li"
                            key={`${att.date}-${att.site_id || 'site'}-${idx}`}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              px: 2,
                              py: 1.5,
                              borderTop: idx ? '1px solid #f4f4f5' : 'none'
                            }}
                          >
                            {renderDateTile(att.date)}

                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                                {hasSite && (
                                  <LocationIcon sx={{ fontSize: 14, color: '#ea580c', flexShrink: 0 }} />
                                )}
                                <Typography
                                  sx={{
                                    fontSize: '0.875rem',
                                    fontWeight: hasSite ? 600 : 500,
                                    color: hasSite ? '#09090b' : '#a1a1aa',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1.3
                                  }}
                                >
                                  {att.site_name || (units === 0 ? 'Absent' : 'No site assigned')}
                                </Typography>
                              </Box>
                              <Typography sx={{ fontSize: '0.75rem', color: '#71717a', mt: 0.35, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
                                <Box component="span" sx={{ fontWeight: 700, color: units > 0 ? '#15803d' : '#a1a1aa' }}>
                                  {units.toFixed(1)} {units === 1 ? 'unit' : 'units'}
                                </Box>
                                {' · '}₹{parseFloat(att.daily_wage || worker.daily_wage).toFixed(0)}/day
                              </Typography>
                            </Box>

                            <Typography
                              sx={{
                                flexShrink: 0,
                                fontWeight: 700,
                                fontSize: '0.9375rem',
                                color: units > 0 ? '#09090b' : '#a1a1aa',
                                fontVariantNumeric: 'tabular-nums'
                              }}
                            >
                              {formatCurrency(att.earnings)}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>

                    {/* Tablet / Desktop Table View */}
                    <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={headCellSx}>Date</TableCell>
                            <TableCell sx={headCellSx}>Site</TableCell>
                            <TableCell align="right" sx={headCellSx}>Applied Rate</TableCell>
                            <TableCell align="right" sx={headCellSx}>Work Units</TableCell>
                            <TableCell align="right" sx={headCellSx}>Earnings</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {attendanceList.map((att, idx) => {
                            const units = parseFloat(att.work_units || 0);
                            const hasSite = Boolean(att.site_name);
                            const { weekday } = getDateParts(att.date);
                            return (
                              <TableRow
                                key={`${att.date}-${att.site_id || 'site'}-${idx}`}
                                hover
                                sx={{
                                  '&:hover': { bgcolor: '#fafafa' },
                                  '& td': { borderBottom: '1px solid #f4f4f5', py: 1.25 },
                                  '&:last-of-type td': { borderBottom: 'none' }
                                }}
                              >
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                  {formatDateIndian(att.date)}
                                  {weekday && (
                                    <Box component="span" sx={{ ml: 1, color: '#a1a1aa', fontWeight: 500, fontSize: '0.75rem' }}>
                                      {weekday}
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.8125rem' }}>
                                  {hasSite ? (
                                    <Box
                                      sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        bgcolor: '#fff7ed',
                                        border: '1px solid #fed7aa',
                                        borderRadius: '6px',
                                        px: 0.75,
                                        py: 0.25,
                                        maxWidth: 260
                                      }}
                                    >
                                      <LocationIcon sx={{ fontSize: 13, color: '#ea580c', flexShrink: 0 }} />
                                      <Typography
                                        sx={{
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          color: '#c2410c',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {att.site_name}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Typography sx={{ fontSize: '0.8125rem', color: '#a1a1aa' }}>
                                      {units === 0 ? 'Absent' : 'No site assigned'}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.8125rem', color: '#71717a', fontVariantNumeric: 'tabular-nums' }}>
                                  ₹{parseFloat(att.daily_wage || worker.daily_wage).toFixed(0)}/day
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: units > 0 ? '#15803d' : '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>
                                  {units.toFixed(1)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#09090b', fontVariantNumeric: 'tabular-nums' }}>
                                  {formatCurrency(att.earnings)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </Box>
            )}

            {/* Tab 1: Advances */}
            {tabIndex === 1 && (
              <Box>
                {advancesList.length === 0 ? (
                  <Box sx={{ py: 5, textAlign: 'center', px: 2 }}>
                    <Typography sx={{ color: '#71717a', fontSize: '0.875rem' }}>
                      No advances recorded this month
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* Mobile List View */}
                    <Box component="ul" sx={{ display: { xs: 'block', sm: 'none' }, listStyle: 'none', m: 0, p: 0 }}>
                      {advancesList.map((adv, idx) => (
                        <Box
                          component="li"
                          key={adv.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            pl: 2,
                            pr: 1,
                            py: 1.5,
                            borderTop: idx ? '1px solid #f4f4f5' : 'none'
                          }}
                        >
                          {renderDateTile(adv.date)}

                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              sx={{
                                fontSize: '0.875rem',
                                fontWeight: adv.note ? 600 : 500,
                                color: adv.note ? '#09090b' : '#a1a1aa',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                lineHeight: 1.3
                              }}
                            >
                              {adv.note || 'No note'}
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#71717a', mt: 0.35, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
                              {formatDateIndian(adv.date)}
                            </Typography>
                          </Box>

                          <Typography sx={{ flexShrink: 0, fontWeight: 700, fontSize: '0.9375rem', color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(adv.amount)}
                          </Typography>
                          <IconButton
                            onClick={() => handleDeleteAdvance(adv.id)}
                            aria-label="Delete advance"
                            sx={{
                              flexShrink: 0,
                              color: '#a1a1aa',
                              width: 40,
                              height: 40,
                              borderRadius: '10px',
                              touchAction: 'manipulation',
                              '@media (hover: hover) and (pointer: fine)': {
                                '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' }
                              }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>

                    {/* Tablet / Desktop Table View */}
                    <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={headCellSx}>Date</TableCell>
                            <TableCell align="right" sx={headCellSx}>Amount</TableCell>
                            <TableCell sx={headCellSx}>Note</TableCell>
                            <TableCell align="center" sx={headCellSx}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {advancesList.map((adv) => (
                            <TableRow
                              key={adv.id}
                              hover
                              sx={{
                                '&:hover': { bgcolor: '#fafafa' },
                                '& td': { borderBottom: '1px solid #f4f4f5' },
                                '&:last-of-type td': { borderBottom: 'none' }
                              }}
                            >
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                                {formatDateIndian(adv.date)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                                {formatCurrency(adv.amount)}
                              </TableCell>
                              <TableCell sx={{ color: '#71717a', fontSize: '0.8125rem' }}>{adv.note || '—'}</TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteAdvance(adv.id)}
                                  aria-label="Delete advance"
                                  sx={{
                                    color: '#71717a',
                                    touchAction: 'manipulation',
                                    '@media (hover: hover) and (pointer: fine)': {
                                      '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' }
                                    }
                                  }}
                                >
                                  <DeleteIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </Box>
            )}
          </>
        )}
      </Card>

      {/* Give Advance Modal */}
      <Dialog
        open={advanceDialogOpen}
        onClose={() => setAdvanceDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            border: '1px solid #e4e4e7',
            boxShadow: '0 16px 32px rgba(0,0,0,0.08)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#09090b' }}>
          Record Advance · {worker.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Amount (₹)"
              type="number"
              inputProps={{ inputMode: 'decimal', min: 0 }}
              required
              fullWidth
              autoFocus
              placeholder="e.g. 1500"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ color: '#09090b', fontWeight: 700 }}>₹</Typography>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#e4e4e7' },
                  '&.Mui-focused fieldset': { borderColor: '#ea580c' }
                },
                '& input': { fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }
              }}
            />

            <TextField
              label="Date"
              type="date"
              fullWidth
              value={advanceDate}
              onChange={(e) => setAdvanceDate(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#e4e4e7' },
                  '&.Mui-focused fieldset': { borderColor: '#ea580c' }
                },
                '& input': { fontSize: '1rem' }
              }}
            />

            <TextField
              label="Note (Optional)"
              fullWidth
              placeholder="e.g. Festival advance"
              value={advanceNote}
              onChange={(e) => setAdvanceNote(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#e4e4e7' },
                  '&.Mui-focused fieldset': { borderColor: '#ea580c' }
                },
                '& input': { fontSize: '1rem' }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setAdvanceDialogOpen(false)}
            variant="outlined"
            size="small"
            sx={{
              borderRadius: 2,
              borderColor: '#e4e4e7',
              color: '#09090b',
              fontWeight: 600,
              minHeight: 40,
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleCreateAdvance}
            disabled={advanceSaving || !advanceAmount}
            sx={{
              borderRadius: 2,
              bgcolor: '#09090b',
              color: '#ffffff',
              fontWeight: 700,
              minHeight: 40,
              px: 2.5,
              touchAction: 'manipulation',
              '&:hover': { bgcolor: '#27272a' },
              '&:active': { transform: 'scale(0.97)' }
            }}
          >
            {advanceSaving ? 'Recording...' : 'Save Advance'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Confirmation Modal */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => !statusLoading && setStatusDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            border: '1px solid #e4e4e7',
            boxShadow: '0 16px 32px rgba(0,0,0,0.08)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#09090b' }}>
          {worker?.is_active
            ? `Mark ${worker?.name} as inactive?`
            : `Mark ${worker?.name} as active?`}
        </DialogTitle>
        <DialogContent>
          {worker?.is_active ? (
            <Typography variant="body2" sx={{ color: '#71717a', lineHeight: 1.5 }}>
              This worker will no longer appear when recording new attendance. Their historical records will be preserved.
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: '#71717a', lineHeight: 1.5 }}>
              This worker will become available for recording attendance and issuing advances.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setStatusDialogOpen(false)}
            variant="outlined"
            size="small"
            disabled={statusLoading}
            sx={{
              borderRadius: 2,
              borderColor: '#e4e4e7',
              color: '#09090b',
              fontWeight: 600,
              minHeight: 40,
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleConfirmStatusChange}
            disabled={statusLoading}
            sx={{
              borderRadius: 2,
              bgcolor: '#09090b',
              color: '#ffffff',
              fontWeight: 700,
              minHeight: 40,
              px: 2,
              touchAction: 'manipulation',
              '&:hover': { bgcolor: '#27272a' },
              '&:active': { transform: 'scale(0.97)' }
            }}
          >
            {statusLoading
              ? 'Updating...'
              : worker?.is_active
              ? 'Mark Inactive'
              : 'Mark Active'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Wage History Modal */}
      <WageHistoryModal
        open={wageHistoryOpen}
        worker={detail?.worker}
        onClose={() => setWageHistoryOpen(false)}
        onWageUpdated={() => {
          fetchDetail();
          fetchMonthlyRecord(selectedYear, selectedMonth);
        }}
      />

      {/* Toast Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          sx={{
            width: '100%',
            borderRadius: 2,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkerDetail;
