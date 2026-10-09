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
  ChevronRight as NextIcon
} from '@mui/icons-material';
import api from '../api/client';
import { formatDateIndian, formatMonthYear } from '../utils/dateUtils';

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 1200, width: '100%', mx: 'auto', pb: { xs: 4, sm: 6 } }}>
      {/* Top Header Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: { xs: '1 1 100%', sm: 1 } }}>
          <IconButton
            size="small"
            onClick={() => navigate('/workers')}
            aria-label="Back to workers list"
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              border: '1px solid #e4e4e7',
              bgcolor: '#ffffff',
              color: '#09090b',
              flexShrink: 0,
              touchAction: 'manipulation',
              transition: 'all 0.12s ease-out',
              '&:hover': { bgcolor: '#f4f4f5' },
              '&:active': { transform: 'scale(0.96)' }
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: worker.is_active ? '#fff7ed' : '#f4f4f5',
                color: worker.is_active ? '#ea580c' : '#71717a',
                border: '1px solid',
                borderColor: worker.is_active ? '#fed7aa' : '#e4e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.05rem',
                flexShrink: 0
              }}
            >
              {worker.name ? worker.name.charAt(0).toUpperCase() : <PersonIcon />}
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography
                  title={worker.name}
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.15rem', sm: '1.3rem' },
                    color: '#09090b',
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {worker.name}
                </Typography>

                <Box
                  component="span"
                  sx={{
                    bgcolor: worker.is_active ? '#f0fdf4' : '#f4f4f5',
                    color: worker.is_active ? '#15803d' : '#71717a',
                    border: '1px solid',
                    borderColor: worker.is_active ? '#bbf7d0' : '#e4e4e7',
                    px: 1.25,
                    py: 0.35,
                    borderRadius: 1.5,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
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

                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setStatusDialogOpen(true)}
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    px: 1.25,
                    py: 0.35,
                    minHeight: 32,
                    borderRadius: 2,
                    textTransform: 'none',
                    borderColor: '#e4e4e7',
                    color: '#71717a',
                    bgcolor: '#ffffff',
                    whiteSpace: 'nowrap',
                    minWidth: 'auto',
                    touchAction: 'manipulation',
                    transition: 'all 0.12s ease-out',
                    '&:hover': {
                      bgcolor: '#f4f4f5',
                      color: '#09090b',
                      borderColor: '#d4d4d8'
                    },
                    '&:active': { transform: 'scale(0.97)' }
                  }}
                >
                  {worker.is_active ? 'Mark Inactive' : 'Mark Active'}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.35, flexWrap: 'wrap' }}>
                <Typography sx={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  Wage: <strong style={{ color: '#09090b' }}>₹{parseFloat(worker.daily_wage).toFixed(0)}/day</strong>
                </Typography>
                {worker.phone && (
                  <Typography
                    variant="caption"
                    component="a"
                    href={`tel:${worker.phone}`}
                    sx={{
                      color: '#71717a',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.35,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      fontVariantNumeric: 'tabular-nums',
                      '&:hover': { color: '#09090b', textDecoration: 'underline' }
                    }}
                  >
                    <PhoneIcon sx={{ fontSize: 13, color: '#71717a' }} /> {worker.phone}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => setAdvanceDialogOpen(true)}
          sx={{
            bgcolor: '#09090b',
            color: '#ffffff',
            fontSize: '0.8125rem',
            fontWeight: 700,
            px: 2,
            py: 0.85,
            minHeight: 40,
            borderRadius: 2.5,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            touchAction: 'manipulation',
            transition: 'transform 140ms ease-out, background-color 140ms ease-out',
            '&:hover': { bgcolor: '#27272a' },
            '&:active': { transform: 'scale(0.97)' }
          }}
        >
          Give Advance
        </Button>
      </Box>

      {/* Inactive Worker Warning Banner */}
      {!worker.is_active && (
        <Alert
          severity="info"
          sx={{
            borderRadius: 2.5,
            bgcolor: '#f4f4f5',
            color: '#71717a',
            border: '1px solid #e4e4e7',
            fontSize: '0.8125rem'
          }}
        >
          This worker is currently inactive and excluded from recording new attendance. All historical shifts, wages, and advances remain intact.
        </Alert>
      )}

      {/* Month Selector Capsule */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1.5, sm: 2 },
          py: 0.85,
          bgcolor: '#ffffff',
          borderRadius: 3,
          border: '1px solid #e4e4e7',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <IconButton
          onClick={handlePrevMonth}
          disabled={monthlyLoading}
          size="small"
          aria-label="Previous Month"
          sx={{
            color: '#71717a',
            width: 36,
            height: 36,
            touchAction: 'manipulation',
            '&:hover': { color: '#09090b', bgcolor: '#f4f4f5' },
            '&.Mui-disabled': { color: '#d4d4d8' }
          }}
        >
          <PrevIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Typography sx={{ fontSize: { xs: '0.875rem', sm: '0.95rem' }, fontWeight: 700, color: '#09090b', letterSpacing: '-0.01em' }}>
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
                py: 0.3,
                px: 1.25,
                minWidth: 'auto',
                borderRadius: 1.5,
                bgcolor: '#fff7ed',
                color: '#c2410c',
                border: '1px solid #fed7aa',
                textTransform: 'none',
                touchAction: 'manipulation',
                '&:hover': { bgcolor: '#ffedd5' },
                '&:active': { transform: 'scale(0.97)' }
              }}
            >
              Current
            </Button>
          )}
        </Box>

        <IconButton
          onClick={handleNextMonth}
          disabled={monthlyLoading}
          size="small"
          aria-label="Next Month"
          sx={{
            color: '#71717a',
            width: 36,
            height: 36,
            touchAction: 'manipulation',
            '&:hover': { color: '#09090b', bgcolor: '#f4f4f5' },
            '&.Mui-disabled': { color: '#d4d4d8' }
          }}
        >
          <NextIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Financial Summary Ledger Panel */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: { xs: 1.25, sm: 1.5 },
          opacity: monthlyLoading ? 0.6 : 1,
          transition: 'opacity 0.2s ease'
        }}
      >
        {/* Cell 1: Total Units */}
        <Card
          elevation={0}
          sx={{
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            bgcolor: '#ffffff',
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Typography sx={{ color: '#71717a', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Total Units
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.4rem' }, color: '#09090b', mt: 0.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {parseFloat(summary.total_units || 0).toFixed(1)}
          </Typography>
          <Typography sx={{ color: '#a1a1aa', fontSize: '0.6875rem', mt: 0.25 }}>
            {selectedMonthLabel}
          </Typography>
        </Card>

        {/* Cell 2: Gross Earnings */}
        <Card
          elevation={0}
          sx={{
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            bgcolor: '#ffffff',
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Typography sx={{ color: '#71717a', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Gross Earnings
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.4rem' }, color: '#09090b', mt: 0.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {formatCurrency(summary.gross_earnings)}
          </Typography>
          <Typography sx={{ color: '#a1a1aa', fontSize: '0.6875rem', mt: 0.25 }}>
            Units × Daily Rate
          </Typography>
        </Card>

        {/* Cell 3: Advances */}
        <Card
          elevation={0}
          sx={{
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            bgcolor: '#ffffff',
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Typography sx={{ color: '#71717a', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Advances
          </Typography>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.25rem', sm: '1.4rem' },
              color: parseFloat(summary.total_advances || 0) > 0 ? '#dc2626' : '#09090b',
              mt: 0.5,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2
            }}
          >
            {formatCurrency(summary.total_advances)}
          </Typography>
          <Typography sx={{ color: '#a1a1aa', fontSize: '0.6875rem', mt: 0.25 }}>
            Monthly Deductions
          </Typography>
        </Card>

        {/* Cell 4: Net Payable (Highlighted with warm orange accent when positive) */}
        <Card
          elevation={0}
          sx={{
            borderRadius: '12px',
            border: '1px solid',
            borderColor: isPositiveNet ? '#fed7aa' : '#fecaca',
            bgcolor: isPositiveNet ? '#fff7ed' : '#fef2f2',
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Typography
            sx={{
              color: isPositiveNet ? '#c2410c' : '#b91c1c',
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em'
            }}
          >
            Net Payable
          </Typography>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.25rem', sm: '1.4rem' },
              color: isPositiveNet ? '#ea580c' : '#dc2626',
              mt: 0.5,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2
            }}
          >
            {formatCurrency(summary.net_payable)}
          </Typography>
          <Typography sx={{ color: isPositiveNet ? '#9a3412' : '#991b1b', fontSize: '0.6875rem', mt: 0.25, fontWeight: 600 }}>
            {isPositiveNet ? 'Disbursable' : 'Advance Due'}
          </Typography>
        </Card>
      </Box>

      {/* Tabs: Attendance vs Advances */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #e4e4e7',
          bgcolor: '#ffffff',
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={tabIndex}
          onChange={(e, val) => setTabIndex(val)}
          sx={{
            borderBottom: '1px solid #e4e4e7',
            minHeight: 48,
            px: 1,
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: '#71717a',
              textTransform: 'none',
              minHeight: 48,
              touchAction: 'manipulation',
              '&.Mui-selected': { color: '#09090b' }
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#ea580c',
              height: 2.5
            }
          }}
        >
          <Tab label={`Attendance (${attendanceList.length})`} />
          <Tab label={`Advances (${advancesList.length})`} />
        </Tabs>

        {monthlyError ? (
          <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
            <Typography sx={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 600 }}>
              {monthlyError}
            </Typography>
            <Button
              size="small"
              onClick={() => fetchMonthlyRecord(selectedYear, selectedMonth)}
              sx={{ mt: 1.5, color: '#09090b', fontWeight: 700, textTransform: 'none' }}
            >
              Retry
            </Button>
          </Box>
        ) : isEmptyMonth ? (
          <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
            <Typography sx={{ color: '#71717a', fontSize: '0.875rem', fontWeight: 500 }}>
              No records for {selectedMonthLabel}
            </Typography>
          </Box>
        ) : (
          <>
            {/* Tab 0: Attendance */}
            {tabIndex === 0 && (
              <Box sx={{ p: 0 }}>
                {attendanceList.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
                    <Typography sx={{ color: '#71717a', fontSize: '0.875rem' }}>
                      No attendance records for {selectedMonthLabel}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* Mobile Cards View */}
                    <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1, p: 1.5 }}>
                      {attendanceList.map((att, idx) => {
                        const units = parseFloat(att.work_units || 0);
                        return (
                          <Box
                            key={`${att.date}-${att.site_id || 'site'}-${idx}`}
                            sx={{
                              p: 1.5,
                              bgcolor: '#fafafa',
                              borderRadius: 2,
                              border: '1px solid #f4f4f5',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#09090b', fontVariantNumeric: 'tabular-nums' }}>
                                {formatDateIndian(att.date)}
                              </Typography>
                              <Typography sx={{ fontSize: '0.72rem', color: '#71717a', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {att.site_name || (units === 0 ? 'Absent' : '—')}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  color: units > 0 ? '#15803d' : '#a1a1aa',
                                  fontVariantNumeric: 'tabular-nums'
                                }}
                              >
                                {units.toFixed(1)} Units
                              </Typography>
                              <Typography sx={{ fontSize: '0.72rem', color: '#71717a', mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
                                {formatCurrency(att.earnings)}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>

                    {/* Tablet / Desktop Table View */}
                    <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#fafafa', color: '#71717a', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #e4e4e7' }}>Date</TableCell>
                            <TableCell sx={{ bgcolor: '#fafafa', color: '#71717a', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #e4e4e7' }}>Site</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#fafafa', color: '#71717a', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #e4e4e7' }}>Work Units</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#fafafa', color: '#71717a', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #e4e4e7' }}>Earnings</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {attendanceList.map((att, idx) => {
                            const units = parseFloat(att.work_units || 0);
                            return (
                              <TableRow
                                key={`${att.date}-${att.site_id || 'site'}-${idx}`}
                                hover
                                sx={{
                                  '&:hover': { bgcolor: '#fafafa' },
                                  '& td': { borderBottom: '1px solid #f4f4f5' }
                                }}
                              >
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                                  {formatDateIndian(att.date)}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.8125rem', color: '#71717a' }}>
                                  {att.site_name || (units === 0 ? 'Absent' : '—')}
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
              <Box sx={{ p: 0 }}>
                {advancesList.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
                    <Typography sx={{ color: '#71717a', fontSize: '0.875rem' }}>
                      No advances recorded this month
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* Mobile Cards View */}
                    <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1, p: 1.5 }}>
                      {advancesList.map((adv) => (
                        <Box
                          key={adv.id}
                          sx={{
                            p: 1.5,
                            bgcolor: '#fafafa',
                            borderRadius: 2,
                            border: '1px solid #f4f4f5',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#09090b', fontVariantNumeric: 'tabular-nums' }}>
                              {formatDateIndian(adv.date)}
                            </Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: '#71717a', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {adv.note || 'No note'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.925rem', color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(adv.amount)}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteAdvance(adv.id)}
                              aria-label="Delete advance"
                              sx={{
                                color: '#71717a',
                                width: 34,
                                height: 34,
                                touchAction: 'manipulation',
                                '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' }
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {/* Tablet / Desktop Table View */}
                    <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#fafafa', color: '#71717a', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #e4e4e7' }}>Date</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#fafafa', color: '#71717a', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #e4e4e7' }}>Amount</TableCell>
                            <TableCell sx={{ bgcolor: '#fafafa', color: '#71717a', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #e4e4e7' }}>Note</TableCell>
                            <TableCell align="center" sx={{ bgcolor: '#fafafa', color: '#71717a', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #e4e4e7' }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {advancesList.map((adv) => (
                            <TableRow
                              key={adv.id}
                              hover
                              sx={{
                                '&:hover': { bgcolor: '#fafafa' },
                                '& td': { borderBottom: '1px solid #f4f4f5' }
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
                                    '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' }
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
