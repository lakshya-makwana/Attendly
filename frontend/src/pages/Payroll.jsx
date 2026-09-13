import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Print as PrintIcon,
  QueryStats as AnalyticsIcon,
  People as PeopleIcon,
  Payments as MoneyIcon,
  RemoveCircle as MinusIcon,
  Description as DocumentIcon,
  InfoOutlined as InfoIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';
import api from '../api/client';

const Payroll = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedSlipWorker, setSelectedSlipWorker] = useState(null);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [calcInfoOpen, setCalcInfoOpen] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchPayroll = async (year, month) => {
    try {
      setLoading(true);
      const res = await api.get(`/payroll/monthly?year=${year}&month=${month}`);
      setPayrollData(res.data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to compute monthly payroll.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleOpenSlip = (workerRow) => {
    setSelectedSlipWorker(workerRow);
    setSlipModalOpen(true);
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 640, mx: 'auto' }}>
      {/* 1. Page Header & Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Monthly Payroll
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.25, fontWeight: 500 }}>
            {monthNames[selectedMonth - 1]} {selectedYear}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AnalyticsIcon fontSize="small" />}
            onClick={() => navigate(`/analytics?year=${selectedYear}&month=${selectedMonth}`)}
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#334155',
              borderColor: '#cbd5e1',
              borderRadius: 1.5,
              textTransform: 'none',
              bgcolor: '#ffffff',
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
            }}
          >
            Site Analytics
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon fontSize="small" />}
            onClick={() => window.print()}
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#334155',
              borderColor: '#cbd5e1',
              borderRadius: 1.5,
              textTransform: 'none',
              bgcolor: '#ffffff',
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
            }}
          >
            Print
          </Button>
        </Box>
      </Box>

      {/* 2. Month Selector Card */}
      <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff', p: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton onClick={handlePrevMonth} size="small" sx={{ color: '#475569' }}>
            <PrevIcon fontSize="small" />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FormControl variant="standard">
              <Select
                disableUnderline
                value={`${selectedYear}-${selectedMonth}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-').map(Number);
                  setSelectedYear(y);
                  setSelectedMonth(m);
                }}
                IconComponent={ArrowDownIcon}
                sx={{
                  fontSize: '0.925rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  '& .MuiSelect-select': { py: 0.5, pr: '22px !important' }
                }}
              >
                {[
                  { y: 2026, m: 9 },
                  { y: 2026, m: 8 },
                  { y: 2026, m: 7 },
                  { y: 2026, m: 6 },
                  { y: 2026, m: 5 },
                  { y: 2026, m: 4 },
                  { y: 2026, m: 3 },
                  { y: 2026, m: 2 },
                  { y: 2026, m: 1 }
                ].map(({ y, m }) => (
                  <MenuItem key={`${y}-${m}`} value={`${y}-${m}`} sx={{ fontSize: '0.875rem' }}>
                    {monthNames[m - 1]} {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <IconButton onClick={handleNextMonth} size="small" sx={{ color: '#475569' }}>
            <NextIcon fontSize="small" />
          </IconButton>
        </Box>
      </Card>

      {/* 3. Payroll Summary Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Payroll Summary
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
            {payrollData?.worker_count || 0} workers · {parseFloat(payrollData?.total_work_units || 0).toFixed(1)} units
          </Typography>
        </Box>

        {/* 4 Summary Cards Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: 1.25
          }}
        >
          {/* Card 1: Total Work Units */}
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: '#e2e8f0',
              bgcolor: '#ffffff',
              p: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <PeopleIcon sx={{ color: '#0284c7', fontSize: 18 }} />
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.72rem' }}>
                Total Work Units
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
              {parseFloat(payrollData?.total_work_units || 0).toFixed(1)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
              Days worked
            </Typography>
          </Card>

          {/* Card 2: Gross Earnings */}
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: '#bbf7d0',
              bgcolor: '#f0fdf4',
              p: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <MoneyIcon sx={{ color: '#16a34a', fontSize: 18 }} />
              <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600, fontSize: '0.72rem' }}>
                Gross Earnings
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>
              {formatCurrency(payrollData?.total_gross_wages)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#166534', display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
              From {payrollData?.worker_count || 0} workers
            </Typography>
          </Card>

          {/* Card 3: Advances Deducted */}
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: '#fed7aa',
              bgcolor: '#fffbeb',
              p: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <MinusIcon sx={{ color: '#ea580c', fontSize: 18 }} />
              <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600, fontSize: '0.72rem' }}>
                Advances Deducted
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#d97706', fontFamily: 'monospace' }}>
              {formatCurrency(payrollData?.total_advances)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#9a3412', display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
              Cash loaned
            </Typography>
          </Card>

          {/* Card 4: Net Payable */}
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: '#86efac',
              bgcolor: '#ecfdf5',
              p: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <DocumentIcon sx={{ color: '#15803d', fontSize: 18 }} />
              <Typography variant="caption" sx={{ color: '#14532d', fontWeight: 700, fontSize: '0.72rem' }}>
                Net Payable
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#15803d', fontFamily: 'monospace' }}>
              {formatCurrency(payrollData?.total_net_payable)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#14532d', display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
              To be disbursed
            </Typography>
          </Card>
        </Box>
      </Box>

      {/* 4. Worker-wise Breakdown Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
          Worker-wise Breakdown
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !payrollData || payrollData.rows.length === 0 ? (
          <Alert severity="info" sx={{ border: '1px solid #e2e8f0' }}>
            No worker activity recorded for {monthNames[selectedMonth - 1]} {selectedYear}.
          </Alert>
        ) : (
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff', overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: { xs: 520, sm: '100%' } }}>
                <TableHead sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem', py: 1.25 }}>
                      Worker
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem', py: 1.25 }}>
                      Rate / day
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem', py: 1.25 }}>
                      Work Units
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem', py: 1.25 }}>
                      Gross
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem', py: 1.25 }}>
                      Advance
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem', py: 1.25 }}>
                      Net Payable
                    </TableCell>
                    <TableCell sx={{ width: 28, py: 1.25 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payrollData.rows.map((row, index) => {
                    const hasAdvance = parseFloat(row.total_advances || 0) > 0;
                    return (
                      <TableRow
                        key={row.worker_id}
                        onClick={() => handleOpenSlip(row)}
                        sx={{
                          cursor: 'pointer',
                          borderTop: index > 0 ? '1px solid #f1f5f9' : 'none',
                          '&:hover': { bgcolor: '#f8fafc' }
                        }}
                      >
                        {/* Worker Name */}
                        <TableCell sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem', py: 1.5 }}>
                          {row.worker_name}
                        </TableCell>

                        {/* Rate / day */}
                        <TableCell align="right" sx={{ color: '#334155', fontFamily: 'monospace', fontSize: '0.85rem', py: 1.5 }}>
                          {formatCurrency(row.daily_wage)}
                        </TableCell>

                        {/* Work Units */}
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#334155', fontFamily: 'monospace', fontSize: '0.85rem', py: 1.5 }}>
                          {parseFloat(row.total_work_units).toFixed(1)}
                        </TableCell>

                        {/* Gross */}
                        <TableCell align="right" sx={{ color: '#334155', fontFamily: 'monospace', fontSize: '0.85rem', py: 1.5 }}>
                          {formatCurrency(row.gross_earnings)}
                        </TableCell>

                        {/* Advance */}
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            color: hasAdvance ? '#d97706' : '#334155',
                            py: 1.5
                          }}
                        >
                          {formatCurrency(row.total_advances)}
                        </TableCell>

                        {/* Net Payable */}
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            color: '#16a34a',
                            py: 1.5
                          }}
                        >
                          {formatCurrency(row.net_payable)}
                        </TableCell>

                        {/* Chevron */}
                        <TableCell sx={{ py: 1.5, pr: 1.5, textAlign: 'center' }}>
                          <NextIcon sx={{ color: '#16a34a', fontSize: 16 }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </Box>

      {/* 5. Calculation Formula Info Box */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#f0f9ff',
          borderRadius: 2,
          border: '1px solid #bae6fd',
          p: 1.5,
          mt: 0.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <InfoIcon sx={{ color: '#0284c7', fontSize: 22 }} />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
              Calculation
            </Typography>
            <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.25, fontSize: '0.72rem' }}>
              Net Payable = (Work Units × Daily Wage) − Advances
            </Typography>
          </Box>
        </Box>

        <Typography
          variant="caption"
          onClick={() => setCalcInfoOpen(true)}
          sx={{
            color: '#0284c7',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          Learn more
        </Typography>
      </Box>

      {/* Salary Slip Modal */}
      <Dialog open={slipModalOpen} onClose={() => setSlipModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>Salary Slip</DialogTitle>
        <DialogContent>
          {selectedSlipWorker && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
              <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {selectedSlipWorker.worker_name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  Month: {monthNames[selectedMonth - 1]} {selectedYear}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  Daily Wage: {formatCurrency(selectedSlipWorker.daily_wage)} / day
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: '0.8125rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Work Units:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {parseFloat(selectedSlipWorker.total_work_units).toFixed(1)} days
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Rate calculation:</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                    {parseFloat(selectedSlipWorker.total_work_units).toFixed(1)} × {formatCurrency(selectedSlipWorker.daily_wage)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Gross Wages:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {formatCurrency(selectedSlipWorker.gross_earnings)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#ea580c' }}>Less Advances:</Typography>
                  <Typography variant="body2" sx={{ color: '#ea580c', fontFamily: 'monospace' }}>
                    −{formatCurrency(selectedSlipWorker.total_advances)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Net Payable:</Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                      color: parseFloat(selectedSlipWorker.net_payable) >= 0 ? '#15803d' : '#b91c1c',
                      fontFamily: 'monospace'
                    }}
                  >
                    {formatCurrency(selectedSlipWorker.net_payable)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setSlipModalOpen(false)} sx={{ color: '#64748b' }}>Close</Button>
          <Button variant="contained" onClick={() => window.print()} sx={{ fontWeight: 700 }}>
            Print Slip
          </Button>
        </DialogActions>
      </Dialog>

      {/* Calculation Learn More Modal */}
      <Dialog open={calcInfoOpen} onClose={() => setCalcInfoOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>How Payroll is Calculated</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.5 }}>
              Each worker's monthly payout is determined by exact logged work days minus all cash advances borrowed during the billing cycle:
            </Typography>

            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Formula:
              </Typography>
              <Typography variant="body2" sx={{ color: '#0f766e', fontWeight: 600, mt: 0.25 }}>
                Net Payable = Gross Earnings − Total Advances
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                Where Gross Earnings = Total Work Units × Daily Wage Rate
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Attendance work units support 0 (Absent), 0.5 (Half Day), 1 (Full Day), 1.5 (1.5 Days), and 2 (2 Days).
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCalcInfoOpen(false)} variant="contained" size="small">
            Understood
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
        <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Payroll;
