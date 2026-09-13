import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  LocationCityOutlined as SitesIcon,
  PrintOutlined as PrintIcon
} from '@mui/icons-material';
import api from '../api/client';
import { formatDateIndian } from '../utils/dateUtils';

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
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5">Site Analytics</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            Monthly workforce deployment and labour expenses by job site
          </Typography>
        </Box>

        <Button
          variant="outlined"
          color="inherit"
          onClick={() => navigate('/sites')}
          startIcon={<SitesIcon fontSize="small" />}
          sx={{ color: 'text.secondary', borderColor: '#cbd5e1' }}
        >
          Manage Sites
        </Button>
      </Box>

      {/* Month & Year Filter Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.25,
          bgcolor: '#ffffff',
          borderRadius: 1.5,
          border: '1px solid #e2e8f0'
        }}
      >
        <IconButton onClick={handlePrevMonth} size="small" sx={{ color: 'text.secondary' }}>
          <PrevIcon fontSize="small" />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              sx={{ fontWeight: 600, fontSize: '0.875rem' }}
            >
              {monthNames.map((name, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 90 }}>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              sx={{ fontWeight: 600, fontSize: '0.875rem' }}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <IconButton onClick={handleNextMonth} size="small" sx={{ color: 'text.secondary' }}>
          <NextIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* 4 Summary Metrics Panel */}
      <Grid container spacing={1.5}>
        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, borderColor: '#e2e8f0' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Active Sites
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25, fontFamily: 'monospace' }}>
              {analyticsData?.total_sites_used || 0}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              With labour logged
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, borderColor: '#e2e8f0' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Unique Workers
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25, fontFamily: 'monospace' }}>
              {analyticsData?.total_unique_workers || 0}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Deployed across sites
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, borderColor: '#e2e8f0' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Work Units
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25, fontFamily: 'monospace' }}>
              {parseFloat(analyticsData?.total_work_units || 0).toFixed(1)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Total man-days
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, borderColor: '#e2e8f0' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Labour Cost
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25, fontFamily: 'monospace', color: '#0f766e' }}>
              {formatCurrency(analyticsData?.total_labour_expense)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Monthly wage expense
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Sites Breakdown Table / Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : !analyticsData || analyticsData.sites.length === 0 ? (
        <Alert severity="info" sx={{ border: '1px solid #e2e8f0' }}>
          No work sites configured.
        </Alert>
      ) : (
        <>
          {/* Desktop Table */}
          <Paper
            variant="outlined"
            sx={{
              display: { xs: 'none', md: 'block' },
              overflow: 'hidden',
              borderColor: '#e2e8f0',
            }}
          >
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.25 }}>Site Name</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', py: 1.25, width: 130 }}>Workers</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#475569', py: 1.25, width: 140 }}>Work Units</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', py: 1.25, width: 180 }}>Labour Expense</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', py: 1.25, width: 100 }}>Breakdown</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyticsData.sites.map((site) => {
                    const hasActivity = site.total_work_units > 0;
                    return (
                      <TableRow
                        key={site.site_id}
                        hover
                        sx={{
                          opacity: site.is_active ? 1 : 0.65,
                          '&:last-child td': { borderBottom: 0 }
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {site.site_name}
                          </Typography>
                          {site.address && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                              {site.address}
                            </Typography>
                          )}
                          {!site.is_active && (
                            <Chip label="Archived" size="small" sx={{ height: 18, fontSize: '0.65rem', mt: 0.5 }} />
                          )}
                        </TableCell>

                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {site.unique_worker_count}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {parseFloat(site.total_work_units).toFixed(1)}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              fontFamily: 'monospace',
                              color: hasActivity ? '#0f766e' : 'text.secondary'
                            }}
                          >
                            {formatCurrency(site.total_labour_expense)}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleOpenDetail(site)}
                            sx={{ fontSize: '0.75rem', px: 1 }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Mobile Information Cards */}
          <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
            {analyticsData.sites.map((site) => (
              <Card
                key={site.site_id}
                variant="outlined"
                sx={{
                  borderColor: '#e2e8f0',
                  opacity: site.is_active ? 1 : 0.65,
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {site.site_name}
                      </Typography>
                      {site.address && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {site.address}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenDetail(site)}
                      sx={{ fontSize: '0.75rem', px: 1.5 }}
                    >
                      Details
                    </Button>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Workers
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {site.unique_worker_count}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Units
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {parseFloat(site.total_work_units).toFixed(1)}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Labour Cost
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f766e' }}>
                        {formatCurrency(site.total_labour_expense)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      {/* Detailed Site Labour Report Modal */}
      <Dialog open={detailModalOpen} onClose={() => setDetailModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {selectedSite?.site_name} — Site Report
        </DialogTitle>
        <DialogContent>
          {selectedSite && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {/* Site Metrics Header */}
              <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Billing Month: {analyticsData?.month_name}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="body2">
                    <span style={{ color: '#64748b' }}>Workers:</span> <strong>{selectedSite.unique_worker_count}</strong>
                  </Typography>
                  <Typography variant="body2">
                    <span style={{ color: '#64748b' }}>Work Units:</span> <strong>{parseFloat(selectedSite.total_work_units).toFixed(1)}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#0f766e', fontWeight: 700 }}>
                    <span style={{ color: '#64748b' }}>Total Cost:</span> {formatCurrency(selectedSite.total_labour_expense)}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Worker Roster ({selectedSite.workers.length})
              </Typography>

              {selectedSite.workers.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
                  No workers logged attendance at this site in {analyticsData?.month_name}.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderColor: '#e2e8f0' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Worker</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, color: '#475569' }}>Units</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#475569' }}>Daily Rate</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#475569' }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedSite.workers.map((w) => (
                        <React.Fragment key={w.worker_id}>
                          <TableRow hover>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {w.worker_name}
                            </TableCell>
                            <TableCell align="center" sx={{ fontFamily: 'monospace' }}>
                              {parseFloat(w.work_units).toFixed(1)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                              ₹{parseFloat(w.daily_wage).toFixed(0)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f766e' }}>
                              {formatCurrency(w.labour_expense)}
                            </TableCell>
                          </TableRow>
                          {/* Dates worked breakdown */}
                          <TableRow>
                            <TableCell colSpan={4} sx={{ py: 0.75, bgcolor: '#fcfcfc', borderBottom: '1px solid #f1f5f9' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                  Dates:
                                </Typography>
                                {w.dates_worked.map((dw, idx) => (
                                  <Box
                                    key={idx}
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      px: 0.75,
                                      py: 0.2,
                                      bgcolor: '#f1f5f9',
                                      borderRadius: 0.75,
                                      fontSize: '0.7rem',
                                      fontFamily: 'monospace',
                                      color: '#334155'
                                    }}
                                  >
                                    {formatDateIndian(dw.date)} ({parseFloat(dw.work_units)}d)
                                  </Box>
                                ))}
                              </Box>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDetailModalOpen(false)} sx={{ color: 'text.secondary' }}>
            Close
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<PrintIcon fontSize="small" />}
            onClick={() => window.print()}
            sx={{ borderColor: '#cbd5e1' }}
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
        <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SiteAnalytics;
