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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 1200, width: '100%', mx: 'auto', pb: { xs: 4, sm: 6 } }}>
      {/* 1. Page Header & Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#151c27', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Monthly Payroll
          </Typography>
          <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}>
            {monthNames[selectedMonth - 1]} {selectedYear}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AnalyticsIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate(`/analytics?year=${selectedYear}&month=${selectedMonth}`)}
            sx={{
              fontSize: '0.775rem',
              fontWeight: 600,
              color: '#151c27',
              borderColor: '#dce2f3',
              borderRadius: 2,
              bgcolor: '#ffffff',
              '&:hover': { bgcolor: '#f0f3ff' }
            }}
          >
            Analytics
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
            onClick={() => window.print()}
            sx={{
              fontSize: '0.775rem',
              fontWeight: 600,
              color: '#151c27',
              borderColor: '#dce2f3',
              borderRadius: 2,
              bgcolor: '#ffffff',
              '&:hover': { bgcolor: '#f0f3ff' }
            }}
          >
            Print
          </Button>
        </Box>
      </Box>

      {/* 2. Month Selector Capsule */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          bgcolor: '#f0f3ff',
          borderRadius: 9999,
          border: '1px solid #e2e8f8'
        }}
      >
        <IconButton
          onClick={handlePrevMonth}
          size="small"
          sx={{ color: '#555f6f', '&:hover': { color: '#151c27', bgcolor: '#e7eefe' } }}
        >
          <PrevIcon sx={{ fontSize: 18 }} />
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
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#151c27',
                '& .MuiSelect-select': { py: 0.25, pr: '22px !important' }
              }}
            >
              {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((m) => (
                <MenuItem key={`${selectedYear}-${m}`} value={`${selectedYear}-${m}`} sx={{ fontSize: '0.8125rem' }}>
                  {monthNames[m - 1]} {selectedYear}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <IconButton
          onClick={handleNextMonth}
          size="small"
          sx={{ color: '#555f6f', '&:hover': { color: '#151c27', bgcolor: '#e7eefe' } }}
        >
          <NextIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* 3. Payroll Summary Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#555f6f' }}>
            Payroll Summary
          </Typography>
          <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', fontWeight: 600 }}>
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
            elevation={0}
            sx={{
              borderRadius: 2.5,
              border: '1px solid #e2e8f8',
              bgcolor: '#ffffff',
              p: 1.75
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
              <PeopleIcon sx={{ color: '#555f6f', fontSize: 17 }} />
              <Typography sx={{ color: '#555f6f', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                Units Logged
              </Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#151c27' }}>
              {parseFloat(payrollData?.total_work_units || 0).toFixed(1)}
            </Typography>
            <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
              Days worked
            </Typography>
          </Card>

          {/* Card 2: Gross Earnings */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 2.5,
              border: '1px solid #e2e8f8',
              bgcolor: '#ffffff',
              p: 1.75
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
              <MoneyIcon sx={{ color: '#555f6f', fontSize: 17 }} />
              <Typography sx={{ color: '#555f6f', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                Gross Labour
              </Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#151c27' }}>
              {formatCurrency(payrollData?.total_gross_wages)}
            </Typography>
            <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
              Earned wages
            </Typography>
          </Card>

          {/* Card 3: Advances Deducted */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 2.5,
              border: '1px solid #e2e8f8',
              bgcolor: '#ffffff',
              p: 1.75
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
              <MinusIcon sx={{ color: '#555f6f', fontSize: 17 }} />
              <Typography sx={{ color: '#555f6f', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                Advances
              </Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#ba1a1a' }}>
              {formatCurrency(payrollData?.total_advances)}
            </Typography>
            <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
              Cash deductions
            </Typography>
          </Card>

          {/* Card 4: Net Payable */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 2.5,
              border: '1px solid #000000',
              bgcolor: '#000000',
              color: '#ffffff',
              p: 1.75
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
              <DocumentIcon sx={{ color: '#ffffff', fontSize: 17 }} />
              <Typography sx={{ color: '#dce2f3', fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                Net Payable
              </Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#ffffff' }}>
              {formatCurrency(payrollData?.total_net_payable)}
            </Typography>
            <Typography sx={{ color: '#bdc7d9', fontSize: '0.6875rem', mt: 0.25 }}>
              Disbursable total
            </Typography>
          </Card>
        </Box>
      </Box>

      {/* 4. Worker-wise Breakdown Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#555f6f', px: 0.5 }}>
          Worker-wise Breakdown
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={30} sx={{ color: '#000000' }} />
          </Box>
        ) : !payrollData || payrollData.rows.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2.5, bgcolor: '#f0f3ff', color: '#151c27', border: '1px solid #e2e8f8' }}>
            No worker activity recorded for {monthNames[selectedMonth - 1]} {selectedYear}.
          </Alert>
        ) : (
          <>
            {/* Mobile Worker Cards (< 600px) */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1.5 }}>
              {payrollData.rows.map((row) => {
                const hasAdvance = parseFloat(row.total_advances || 0) > 0;
                return (
                  <Card
                    key={row.worker_id}
                    elevation={0}
                    onClick={() => handleOpenSlip(row)}
                    sx={{
                      borderRadius: 3,
                      border: '1px solid #e2e8f8',
                      bgcolor: '#ffffff',
                      p: 2,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:active': { transform: 'scale(0.98)', bgcolor: '#f0f3ff' }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: '#f0f3ff',
                            color: '#151c27',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}
                        >
                          {row.worker_name ? row.worker_name.charAt(0).toUpperCase() : 'W'}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: '#151c27', fontSize: '0.925rem', lineHeight: 1.2 }}>
                            {row.worker_name}
                          </Typography>
                          <Typography sx={{ color: '#555f6f', fontSize: '0.72rem', mt: 0.25 }}>
                            Wage: {formatCurrency(row.daily_wage)}/day
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#151c27' }}>
                          {formatCurrency(row.net_payable)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#555f6f', textTransform: 'uppercase' }}>
                          Net Payable
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 1,
                        p: 1.25,
                        bgcolor: '#f9f9ff',
                        borderRadius: 2,
                        border: '1px solid #f0f3ff'
                      }}
                    >
                      <Box>
                        <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem' }}>Units</Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#151c27', mt: 0.25 }}>
                          {parseFloat(row.total_work_units).toFixed(1)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem' }}>Gross</Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#151c27', mt: 0.25 }}>
                          {formatCurrency(row.gross_earnings)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem' }}>Advances</Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: hasAdvance ? '#ba1a1a' : '#555f6f', mt: 0.25 }}>
                          {hasAdvance ? `-${formatCurrency(row.total_advances)}` : '₹0'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 1.25, color: '#000000', fontSize: '0.75rem', fontWeight: 600 }}>
                      <span>View Salary Slip</span>
                      <NextIcon sx={{ fontSize: 14 }} />
                    </Box>
                  </Card>
                );
              })}
            </Box>

            {/* Desktop / Tablet Data Table (>= 600px) */}
            <Card
              elevation={0}
              sx={{
                display: { xs: 'none', sm: 'block' },
                borderRadius: 3,
                border: '1px solid #e2e8f8',
                bgcolor: '#ffffff',
                overflow: 'hidden'
              }}
            >
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead sx={{ bgcolor: '#f0f3ff' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#555f6f', fontSize: '0.72rem', py: 1.25 }}>
                        Worker
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#555f6f', fontSize: '0.72rem', py: 1.25 }}>
                        Rate/day
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#555f6f', fontSize: '0.72rem', py: 1.25 }}>
                        Units
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#555f6f', fontSize: '0.72rem', py: 1.25 }}>
                        Gross
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#555f6f', fontSize: '0.72rem', py: 1.25 }}>
                        Advances
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#555f6f', fontSize: '0.72rem', py: 1.25 }}>
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
                            borderTop: index > 0 ? '1px solid #f0f3ff' : 'none',
                            transition: 'background-color 0.12s ease',
                            '&:hover': { bgcolor: '#f0f3ff' }
                          }}
                        >
                          {/* Worker Name */}
                          <TableCell sx={{ fontWeight: 700, color: '#151c27', fontSize: '0.85rem', py: 1.5 }}>
                            {row.worker_name}
                          </TableCell>

                          {/* Rate / day */}
                          <TableCell align="right" sx={{ color: '#555f6f', fontSize: '0.85rem', py: 1.5 }}>
                            {formatCurrency(row.daily_wage)}
                          </TableCell>

                          {/* Work Units */}
                          <TableCell align="right" sx={{ fontWeight: 700, color: '#151c27', fontSize: '0.85rem', py: 1.5 }}>
                            {parseFloat(row.total_work_units).toFixed(1)}
                          </TableCell>

                          {/* Gross */}
                          <TableCell align="right" sx={{ color: '#151c27', fontSize: '0.85rem', py: 1.5 }}>
                            {formatCurrency(row.gross_earnings)}
                          </TableCell>

                          {/* Advance */}
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              color: hasAdvance ? '#ba1a1a' : '#555f6f',
                              py: 1.5
                            }}
                          >
                            {formatCurrency(row.total_advances)}
                          </TableCell>

                          {/* Net Payable */}
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: '#151c27',
                              py: 1.5
                            }}
                          >
                            {formatCurrency(row.net_payable)}
                          </TableCell>

                          {/* Chevron */}
                          <TableCell sx={{ py: 1.5, pr: 1.5, textAlign: 'center' }}>
                            <NextIcon sx={{ color: '#bdc7d9', fontSize: 16 }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </>
        )}
      </Box>

      {/* 5. Calculation Formula Info Box */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#f0f3ff',
          borderRadius: 2.5,
          border: '1px solid #e2e8f8',
          p: 1.5,
          mt: 0.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <InfoIcon sx={{ color: '#151c27', fontSize: 20 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#151c27', fontSize: '0.75rem', lineHeight: 1.2 }}>
              Calculation Standard
            </Typography>
            <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', mt: 0.25 }}>
              Net Payable = (Work Units × Daily Wage) − Advances
            </Typography>
          </Box>
        </Box>

        <Typography
          onClick={() => setCalcInfoOpen(true)}
          sx={{
            color: '#000000',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          Details
        </Typography>
      </Box>

      {/* Salary Slip Modal */}
      <Dialog
        open={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
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
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 1, color: '#151c27' }}>Salary Slip</DialogTitle>
        <DialogContent>
          {selectedSlipWorker && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
              <Box sx={{ bgcolor: '#f0f3ff', p: 1.5, borderRadius: 2, border: '1px solid #e2e8f8' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#151c27' }}>
                  {selectedSlipWorker.worker_name}
                </Typography>
                <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', mt: 0.25 }}>
                  Month: {monthNames[selectedMonth - 1]} {selectedYear}
                </Typography>
                <Typography sx={{ color: '#555f6f', fontSize: '0.75rem' }}>
                  Daily Wage: {formatCurrency(selectedSlipWorker.daily_wage)} / day
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: '0.8125rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ color: '#555f6f' }}>Work Units:</Typography>
                  <Typography sx={{ fontWeight: 700, color: '#151c27' }}>
                    {parseFloat(selectedSlipWorker.total_work_units).toFixed(1)} days
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ color: '#555f6f' }}>Formula:</Typography>
                  <Typography sx={{ color: '#555f6f' }}>
                    {parseFloat(selectedSlipWorker.total_work_units).toFixed(1)} × {formatCurrency(selectedSlipWorker.daily_wage)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 0.5, borderColor: '#f0f3ff' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 700, color: '#151c27' }}>Gross Wages:</Typography>
                  <Typography sx={{ fontWeight: 700, color: '#151c27' }}>
                    {formatCurrency(selectedSlipWorker.gross_earnings)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ color: '#ba1a1a', fontWeight: 600 }}>Less Advances:</Typography>
                  <Typography sx={{ color: '#ba1a1a', fontWeight: 700 }}>
                    −{formatCurrency(selectedSlipWorker.total_advances)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 0.5, borderColor: '#f0f3ff' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#151c27' }}>Net Payable:</Typography>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: '1.25rem',
                      color: '#151c27'
                    }}
                  >
                    {formatCurrency(selectedSlipWorker.net_payable)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setSlipModalOpen(false)}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 2, borderColor: '#dce2f3', color: '#151c27' }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
            onClick={() => window.print()}
            sx={{ borderRadius: 2, bgcolor: '#000000', color: '#ffffff', fontWeight: 700 }}
          >
            Print Slip
          </Button>
        </DialogActions>
      </Dialog>

      {/* Calculation Learn More Modal */}
      <Dialog
        open={calcInfoOpen}
        onClose={() => setCalcInfoOpen(false)}
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
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#151c27' }}>How Payroll is Calculated</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
            <Typography sx={{ color: '#555f6f', fontSize: '0.8125rem', lineHeight: 1.5 }}>
              Each worker's monthly payout is determined by exact logged work days minus all cash advances borrowed during the billing cycle:
            </Typography>

            <Box sx={{ p: 1.5, bgcolor: '#f0f3ff', borderRadius: 2, border: '1px solid #e2e8f8' }}>
              <Typography sx={{ fontWeight: 700, color: '#151c27', fontSize: '0.8125rem' }}>
                Formula:
              </Typography>
              <Typography sx={{ color: '#151c27', fontWeight: 700, mt: 0.25, fontSize: '0.875rem' }}>
                Net Payable = Gross Earnings − Total Advances
              </Typography>
              <Typography sx={{ color: '#555f6f', mt: 0.5, fontSize: '0.72rem' }}>
                Where Gross Earnings = Total Work Units × Daily Wage Rate
              </Typography>
            </Box>

            <Typography sx={{ color: '#555f6f', fontSize: '0.75rem' }}>
              Attendance work units support 0 (Absent), 0.5 (Half Day), 1 (Full Day), 1.5 (1.5 Days), and 2 (2 Days).
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setCalcInfoOpen(false)}
            variant="contained"
            size="small"
            sx={{ borderRadius: 2, bgcolor: '#000000', color: '#ffffff', fontWeight: 700 }}
          >
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
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Payroll;
