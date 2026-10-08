import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            size="small"
            onClick={() => navigate('/workers')}
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              border: '1px solid #e2e8f8',
              bgcolor: '#ffffff',
              color: '#151c27',
              '&:hover': { bgcolor: '#f0f3ff' }
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: '#f0f3ff',
                color: '#151c27',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
                flexShrink: 0
              }}
            >
              {worker.name ? worker.name.charAt(0).toUpperCase() : <PersonIcon />}
            </Box>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.25rem' }, color: '#151c27', lineHeight: 1.2 }}>
                  {worker.name}
                </Typography>
                <Box
                  component="span"
                  sx={{
                    bgcolor: worker.is_active ? '#f0f3ff' : '#f4f6f8',
                    color: worker.is_active ? '#151c27' : '#555f6f',
                    border: '1px solid',
                    borderColor: worker.is_active ? '#dce2f3' : '#e2e8f8',
                    px: 1.25,
                    py: 0.25,
                    borderRadius: 1.5,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <Box component="span" sx={{ fontSize: '0.625rem', lineHeight: 1 }}>
                    {worker.is_active ? '●' : '○'}
                  </Box>
                  {worker.is_active ? 'Active' : 'Inactive'}
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setStatusDialogOpen(true)}
                  sx={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    px: 1.25,
                    py: 0.25,
                    borderRadius: 2,
                    textTransform: 'none',
                    borderColor: '#dce2f3',
                    color: '#555f6f',
                    bgcolor: '#ffffff',
                    whiteSpace: 'nowrap',
                    minWidth: 'auto',
                    '&:hover': {
                      bgcolor: '#f0f3ff',
                      color: '#151c27',
                      borderColor: '#bdc7d9'
                    }
                  }}
                >
                  {worker.is_active ? 'Mark Inactive' : 'Mark Active'}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.25 }}>
                <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', fontWeight: 600 }}>
                  Rate: <strong>₹{parseFloat(worker.daily_wage).toFixed(0)}/day</strong>
                </Typography>
                {worker.phone && (
                  <Typography
                    variant="caption"
                    component="a"
                    href={`tel:${worker.phone}`}
                    sx={{
                      color: '#555f6f',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.3,
                      fontSize: '0.75rem',
                      '&:hover': { color: '#000000', textDecoration: 'underline' }
                    }}
                  >
                    <PhoneIcon sx={{ fontSize: 13 }} /> {worker.phone}
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
            bgcolor: '#000000',
            color: '#ffffff',
            fontSize: '0.775rem',
            fontWeight: 700,
            px: 2,
            py: 0.75,
            borderRadius: 2,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            '&:hover': { bgcolor: '#1f2937' }
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
            bgcolor: '#f4f6f8',
            color: '#555f6f',
            border: '1px solid #e2e8f8',
            fontSize: '0.8125rem'
          }}
        >
          This worker is currently inactive and excluded from recording new attendance. All historical shifts, wages, and advances remain intact.
        </Alert>
      )}

      {/* Month Selector */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1.25, sm: 2 },
          py: 0.85,
          bgcolor: '#f0f3ff',
          borderRadius: 3,
          border: '1px solid #e2e8f8'
        }}
      >
        <IconButton
          onClick={handlePrevMonth}
          disabled={monthlyLoading}
          size="small"
          aria-label="Previous Month"
          sx={{ color: '#555f6f', '&:hover': { color: '#151c27', bgcolor: '#e7eefe' }, '&.Mui-disabled': { color: '#bdc7d9' } }}
        >
          <PrevIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: { xs: '0.875rem', sm: '0.95rem' }, fontWeight: 800, color: '#151c27', letterSpacing: '-0.01em' }}>
            {selectedMonthLabel}
          </Typography>
          {monthlyLoading && (
            <CircularProgress size={14} sx={{ color: '#151c27' }} />
          )}
          {!isCurrentMonth && (
            <Button
              size="small"
              onClick={handleCurrentMonth}
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                py: 0.2,
                px: 1,
                minWidth: 'auto',
                borderRadius: 1.5,
                bgcolor: '#ffffff',
                color: '#151c27',
                border: '1px solid #dce2f3',
                textTransform: 'none',
                '&:hover': { bgcolor: '#f0f3ff' }
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
          sx={{ color: '#555f6f', '&:hover': { color: '#151c27', bgcolor: '#e7eefe' }, '&.Mui-disabled': { color: '#bdc7d9' } }}
        >
          <NextIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Financial Summary Ledger Panel */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #e2e8f8',
          bgcolor: '#ffffff',
          overflow: 'hidden',
          opacity: monthlyLoading ? 0.6 : 1,
          transition: 'opacity 0.2s ease'
        }}
      >
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Grid container>
            <Grid item xs={6} sm={3} sx={{ p: { xs: 1.5, sm: 2 }, borderRight: '1px solid #e2e8f8', borderBottom: { xs: '1px solid #e2e8f8', sm: 'none' } }}>
              <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Total Units
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: '#151c27', mt: 0.5 }}>
                {parseFloat(summary.total_units || 0).toFixed(1)}
              </Typography>
              <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
                {selectedMonthLabel}
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} sx={{ p: { xs: 1.5, sm: 2 }, borderRight: { sm: '1px solid #e2e8f8' }, borderBottom: { xs: '1px solid #e2e8f8', sm: 'none' } }}>
              <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Gross Earnings
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: '#151c27', mt: 0.5 }}>
                {formatCurrency(summary.gross_earnings)}
              </Typography>
              <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
                Units × Daily rate
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} sx={{ p: { xs: 1.5, sm: 2 }, borderRight: '1px solid #e2e8f8' }}>
              <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Advances
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: parseFloat(summary.total_advances || 0) > 0 ? '#ba1a1a' : '#151c27', mt: 0.5 }}>
                {formatCurrency(summary.total_advances)}
              </Typography>
              <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
                Monthly deductions
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: isPositiveNet ? '#f0f3ff' : '#ffdad6' }}>
              <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Net Payable
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.25rem' }, color: isPositiveNet ? '#151c27' : '#93000a', mt: 0.5 }}>
                {formatCurrency(summary.net_payable)}
              </Typography>
              <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', mt: 0.25, fontWeight: 600 }}>
                {isPositiveNet ? 'Disbursable' : 'Advance Due'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs: Attendance vs Advances */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #e2e8f8',
          bgcolor: '#ffffff',
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={tabIndex}
          onChange={(e, val) => setTabIndex(val)}
          sx={{
            borderBottom: '1px solid #e2e8f8',
            minHeight: 48,
            px: 1,
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: '#555f6f',
              textTransform: 'none',
              minHeight: 48,
              '&.Mui-selected': { color: '#000000' }
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#000000',
              height: 2.5
            }
          }}
        >
          <Tab label={`Attendance (${attendanceList.length})`} />
          <Tab label={`Advances (${advancesList.length})`} />
        </Tabs>

        {monthlyError ? (
          <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
            <Typography sx={{ color: '#ba1a1a', fontSize: '0.875rem', fontWeight: 600 }}>
              {monthlyError}
            </Typography>
            <Button
              size="small"
              onClick={() => fetchMonthlyRecord(selectedYear, selectedMonth)}
              sx={{ mt: 1.5, color: '#151c27', fontWeight: 700, textTransform: 'none' }}
            >
              Retry
            </Button>
          </Box>
        ) : isEmptyMonth ? (
          <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
            <Typography sx={{ color: '#555f6f', fontSize: '0.875rem', fontWeight: 600 }}>
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
                    <Typography sx={{ color: '#555f6f', fontSize: '0.875rem' }}>
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
                              bgcolor: '#f9f9ff',
                              borderRadius: 2,
                              border: '1px solid #f0f3ff',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#151c27' }}>
                                {formatDateIndian(att.date)}
                              </Typography>
                              <Typography sx={{ fontSize: '0.72rem', color: '#555f6f', mt: 0.25, wordBreak: 'break-word' }}>
                                {att.site_name || (units === 0 ? 'Absent' : '—')}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#151c27' }}>
                                {units.toFixed(1)} Units
                              </Typography>
                              <Typography sx={{ fontSize: '0.72rem', color: '#555f6f', mt: 0.25 }}>
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
                            <TableCell sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Date</TableCell>
                            <TableCell sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Site</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Work Units</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Earnings</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {attendanceList.map((att, idx) => {
                            const units = parseFloat(att.work_units || 0);
                            return (
                              <TableRow key={`${att.date}-${att.site_id || 'site'}-${idx}`} hover sx={{ '&:hover': { bgcolor: '#f0f3ff' } }}>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                                  {formatDateIndian(att.date)}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.8125rem', color: '#555f6f' }}>
                                  {att.site_name || (units === 0 ? 'Absent' : '—')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#151c27' }}>
                                  {units.toFixed(1)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#151c27' }}>
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
                    <Typography sx={{ color: '#555f6f', fontSize: '0.875rem' }}>
                      No advances this month
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
                            bgcolor: '#f9f9ff',
                            borderRadius: 2,
                            border: '1px solid #f0f3ff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#151c27' }}>
                              {formatDateIndian(adv.date)}
                            </Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: '#555f6f', mt: 0.25, wordBreak: 'break-word' }}>
                              {adv.note || 'No note'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.925rem', color: '#ba1a1a' }}>
                              {formatCurrency(adv.amount)}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteAdvance(adv.id)}
                              sx={{ color: '#555f6f', '&:hover': { color: '#ba1a1a', bgcolor: '#ffdad6' } }}
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
                            <TableCell sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Date</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Amount</TableCell>
                            <TableCell sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Note</TableCell>
                            <TableCell align="center" sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {advancesList.map((adv) => (
                            <TableRow key={adv.id} hover sx={{ '&:hover': { bgcolor: '#f0f3ff' } }}>
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                                {formatDateIndian(adv.date)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: '#ba1a1a', fontSize: '0.8125rem' }}>
                                {formatCurrency(adv.amount)}
                              </TableCell>
                              <TableCell sx={{ color: '#555f6f', fontSize: '0.8125rem' }}>{adv.note || '—'}</TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteAdvance(adv.id)}
                                  sx={{ color: '#555f6f', '&:hover': { color: '#ba1a1a', bgcolor: '#ffdad6' } }}
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
            border: '1px solid #e2e8f8'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#151c27' }}>
          Record Advance · {worker.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Amount (₹)"
              type="number"
              required
              fullWidth
              autoFocus
              placeholder="e.g. 1500"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Date"
              type="date"
              fullWidth
              value={advanceDate}
              onChange={(e) => setAdvanceDate(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Note (Optional)"
              fullWidth
              placeholder="e.g. Festival advance"
              value={advanceNote}
              onChange={(e) => setAdvanceNote(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setAdvanceDialogOpen(false)}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 2, borderColor: '#dce2f3', color: '#151c27' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleCreateAdvance}
            disabled={advanceSaving || !advanceAmount}
            sx={{ borderRadius: 2, bgcolor: '#000000', color: '#ffffff', fontWeight: 700 }}
          >
            {advanceSaving ? 'Recording...' : 'Save'}
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
            border: '1px solid #e2e8f8',
            boxShadow: '0 16px 32px rgba(0,0,0,0.08)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#151c27' }}>
          {worker?.is_active
            ? `Mark ${worker?.name} as inactive?`
            : `Mark ${worker?.name} as active?`}
        </DialogTitle>
        <DialogContent>
          {worker?.is_active ? (
            <Typography variant="body2" sx={{ color: '#555f6f', lineHeight: 1.5 }}>
              This worker will no longer appear when recording new attendance. Their historical records will be preserved.
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: '#555f6f', lineHeight: 1.5 }}>
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
            sx={{ borderRadius: 2, borderColor: '#dce2f3', color: '#151c27', fontWeight: 600 }}
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
              bgcolor: '#000000',
              color: '#ffffff',
              fontWeight: 700,
              '&:hover': { bgcolor: '#1f2937' }
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
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkerDetail;
