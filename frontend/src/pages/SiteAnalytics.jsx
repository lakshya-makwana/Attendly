import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  LocationCityOutlined as SitesIcon,
  PrintOutlined as PrintIcon
} from '@mui/icons-material';
import api from '../api/client';

const SiteAnalytics = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentDate = new Date();

  const initialYear = parseInt(searchParams.get('year')) || currentDate.getFullYear();
  const initialMonth = parseInt(searchParams.get('month')) || currentDate.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Detail Modal for a specific site
  const [selectedSite, setSelectedSite] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchAnalytics = async (year, month) => {
    try {
      setLoading(true);
      const res = await api.get(`/sites/analytics?year=${year}&month=${month}`);
      setAnalyticsData(res.data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load site analytics.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedYear, selectedMonth);
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

  const handleOpenDetail = (site) => {
    setSelectedSite(site);
    setDetailModalOpen(true);
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 1200, width: '100%', mx: 'auto', pb: { xs: 4, sm: 6 } }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#09090b', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Site Analytics
          </Typography>
          <Typography sx={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}>
            Monthly workforce deployment and expenses by location
          </Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={() => navigate('/sites')}
          startIcon={<SitesIcon sx={{ fontSize: 16 }} />}
          sx={{
            color: '#09090b',
            borderColor: '#e4e4e7',
            fontSize: '0.775rem',
            fontWeight: 600,
            borderRadius: 2,
            bgcolor: '#ffffff',
            minHeight: 38,
            px: 2,
            touchAction: 'manipulation',
            transition: 'all 0.12s ease-out',
            '&:hover': { bgcolor: '#f4f4f5', borderColor: '#d4d4d8' },
            '&:active': { transform: 'scale(0.97)' }
          }}
        >
          Manage Sites
        </Button>
      </Box>

      {/* Month & Year Capsule */}
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
          disabled={loading}
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" variant="standard">
            <Select
              disableUnderline
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              sx={{
                fontWeight: 700,
                fontSize: { xs: '0.875rem', sm: '0.95rem' },
                color: '#09090b',
                '& .MuiSelect-select': { py: 0.25 }
              }}
            >
              {monthNames.map((name, i) => (
                <MenuItem key={i + 1} value={i + 1} sx={{ fontSize: '0.8125rem' }}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" variant="standard">
            <Select
              disableUnderline
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              sx={{
                fontWeight: 700,
                fontSize: { xs: '0.875rem', sm: '0.95rem' },
                color: '#09090b',
                '& .MuiSelect-select': { py: 0.25 }
              }}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <MenuItem key={y} value={y} sx={{ fontSize: '0.8125rem' }}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <IconButton
          onClick={handleNextMonth}
          disabled={loading}
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

      {/* 4 Summary Metrics Panel */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: { xs: 1.25, sm: 1.5 }
        }}
      >
        <Card
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Typography sx={{ color: '#71717a', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Active Sites
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.4rem' }, color: '#09090b', mt: 0.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {analyticsData?.total_sites_used || 0}
          </Typography>
          <Typography sx={{ color: '#a1a1aa', fontSize: '0.6875rem', mt: 0.25 }}>
            With labour logged
          </Typography>
        </Card>

        <Card
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Typography sx={{ color: '#71717a', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Unique Workers
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.4rem' }, color: '#09090b', mt: 0.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {analyticsData?.total_unique_workers || 0}
          </Typography>
          <Typography sx={{ color: '#a1a1aa', fontSize: '0.6875rem', mt: 0.25 }}>
            Deployed this month
          </Typography>
        </Card>

        <Card
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Typography sx={{ color: '#71717a', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Total Units
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.4rem' }, color: '#09090b', mt: 0.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {parseFloat(analyticsData?.total_work_units || 0).toFixed(1)}
          </Typography>
          <Typography sx={{ color: '#a1a1aa', fontSize: '0.6875rem', mt: 0.25 }}>
            Total man-days
          </Typography>
        </Card>

        {/* Total Expense with warm orange accent card */}
        <Card
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: '12px',
            border: '1px solid #fed7aa',
            bgcolor: '#fff7ed',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Typography sx={{ color: '#c2410c', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Total Expense
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.4rem' }, color: '#ea580c', mt: 0.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {formatCurrency(analyticsData?.total_labour_expense)}
          </Typography>
          <Typography sx={{ color: '#9a3412', fontSize: '0.6875rem', mt: 0.25, fontWeight: 600 }}>
            Monthly wage cost
          </Typography>
        </Card>
      </Box>

      {/* Sites Breakdown Cards Stream */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={30} sx={{ color: '#ea580c' }} />
        </Box>
      ) : !analyticsData || analyticsData.sites.length === 0 ? (
        <Alert
          severity="info"
          sx={{
            borderRadius: 2.5,
            bgcolor: '#ffffff',
            color: '#09090b',
            border: '1px solid #e4e4e7',
            fontSize: '0.8125rem'
          }}
        >
          No work sites configured.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {analyticsData.sites.map((site) => (
            <Card
              key={site.site_id}
              elevation={0}
              sx={{
                borderRadius: '12px',
                border: '1px solid #e4e4e7',
                bgcolor: '#ffffff',
                p: { xs: 1.75, sm: 2 },
                opacity: site.is_active ? 1 : 0.68,
                transition: 'border-color 0.14s ease-out, box-shadow 0.14s ease-out',
                '&:hover': {
                  borderColor: '#d4d4d8',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    title={site.site_name}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      color: '#09090b',
                      lineHeight: 1.25,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {site.site_name}
                  </Typography>
                  {site.address && (
                    <Typography
                      title={site.address}
                      sx={{
                        color: '#71717a',
                        fontSize: '0.75rem',
                        mt: 0.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {site.address}
                    </Typography>
                  )}
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleOpenDetail(site)}
                  sx={{
                    fontSize: '0.75rem',
                    px: 1.5,
                    py: 0.5,
                    minHeight: 34,
                    borderRadius: 2,
                    borderColor: '#e4e4e7',
                    color: '#09090b',
                    fontWeight: 600,
                    touchAction: 'manipulation',
                    transition: 'all 0.12s ease-out',
                    flexShrink: 0,
                    '&:hover': { bgcolor: '#f4f4f5', borderColor: '#d4d4d8' },
                    '&:active': { transform: 'scale(0.97)' }
                  }}
                >
                  View Report
                </Button>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, pt: 1.25, borderTop: '1px solid #f4f4f5' }}>
                <Box>
                  <Typography sx={{ color: '#71717a', fontSize: '0.6875rem', fontWeight: 600 }}>
                    Workers
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#09090b', mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
                    {site.unique_worker_count}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ color: '#71717a', fontSize: '0.6875rem', fontWeight: 600 }}>
                    Units
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#09090b', mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
                    {parseFloat(site.total_work_units).toFixed(1)}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ color: '#71717a', fontSize: '0.6875rem', fontWeight: 600 }}>
                    Labour Cost
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#ea580c', mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(site.total_labour_expense)}
                  </Typography>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Detailed Site Labour Report Modal */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="sm"
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
          {selectedSite?.site_name} — Site Report
        </DialogTitle>
        <DialogContent>
          {selectedSite && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ p: 1.5, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #fed7aa' }}>
                <Typography sx={{ color: '#c2410c', fontSize: '0.75rem', fontWeight: 700 }}>
                  Billing Month: {analyticsData?.month_name}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, flexWrap: 'wrap', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: '#71717a' }}>Workers:</span> <strong style={{ color: '#09090b' }}>{selectedSite.unique_worker_count}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: '#71717a' }}>Work Units:</span> <strong style={{ color: '#09090b' }}>{parseFloat(selectedSite.total_work_units).toFixed(1)}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: '#ea580c', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: '#71717a', fontWeight: 500 }}>Total Cost:</span> {formatCurrency(selectedSite.total_labour_expense)}
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#09090b' }}>
                Worker Deployment ({selectedSite.workers.length})
              </Typography>

              {selectedSite.workers.length === 0 ? (
                <Typography sx={{ color: '#71717a', textAlign: 'center', py: 3, fontSize: '0.8125rem' }}>
                  No workers logged attendance at this site in {analyticsData?.month_name}.
                </Typography>
              ) : (
                <TableContainer sx={{ border: '1px solid #e4e4e7', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#fafafa' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#71717a', borderBottom: '1px solid #e4e4e7' }}>Worker</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#71717a', borderBottom: '1px solid #e4e4e7' }}>Units</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#71717a', borderBottom: '1px solid #e4e4e7' }}>Rate</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#71717a', borderBottom: '1px solid #e4e4e7' }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedSite.workers.map((w) => (
                        <TableRow
                          key={w.worker_id}
                          hover
                          sx={{
                            '&:hover': { bgcolor: '#fafafa' },
                            '& td': { borderBottom: '1px solid #f4f4f5' }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                            {w.worker_name}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                            {parseFloat(w.work_units).toFixed(1)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8125rem', color: '#71717a', fontVariantNumeric: 'tabular-nums' }}>
                            ₹{parseFloat(w.daily_wage).toFixed(0)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#09090b', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(w.labour_expense)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDetailModalOpen(false)}
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
            Close
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
            onClick={() => window.print()}
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
            Print
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

export default SiteAnalytics;
