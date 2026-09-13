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
  Divider
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
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 640, mx: 'auto', pb: 8 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#151c27', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Site Analytics
          </Typography>
          <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}>
            Monthly workforce deployment and expenses by location
          </Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={() => navigate('/sites')}
          startIcon={<SitesIcon sx={{ fontSize: 16 }} />}
          sx={{
            color: '#151c27',
            borderColor: '#dce2f3',
            fontSize: '0.775rem',
            fontWeight: 600,
            borderRadius: 2,
            bgcolor: '#ffffff',
            '&:hover': { bgcolor: '#f0f3ff' }
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" variant="standard">
            <Select
              disableUnderline
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#151c27' }}
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
              sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#151c27' }}
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
          size="small"
          sx={{ color: '#555f6f', '&:hover': { color: '#151c27', bgcolor: '#e7eefe' } }}
        >
          <NextIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* 4 Summary Metrics Panel */}
      <Grid container spacing={1.25}>
        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ p: 1.75, borderRadius: 2.5, border: '1px solid #e2e8f8', bgcolor: '#ffffff' }}>
            <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Active Sites
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#151c27', mt: 0.5 }}>
              {analyticsData?.total_sites_used || 0}
            </Typography>
            <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
              With labour logged
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ p: 1.75, borderRadius: 2.5, border: '1px solid #e2e8f8', bgcolor: '#ffffff' }}>
            <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Unique Workers
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#151c27', mt: 0.5 }}>
              {analyticsData?.total_unique_workers || 0}
            </Typography>
            <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
              Deployed this month
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ p: 1.75, borderRadius: 2.5, border: '1px solid #e2e8f8', bgcolor: '#ffffff' }}>
            <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Total Units
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#151c27', mt: 0.5 }}>
              {parseFloat(analyticsData?.total_work_units || 0).toFixed(1)}
            </Typography>
            <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
              Total man-days
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ p: 1.75, borderRadius: 2.5, border: '1px solid #e2e8f8', bgcolor: '#ffffff' }}>
            <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Total Expense
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#151c27', mt: 0.5 }}>
              {formatCurrency(analyticsData?.total_labour_expense)}
            </Typography>
            <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
              Monthly wage cost
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Sites Breakdown Cards Stream */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={30} sx={{ color: '#000000' }} />
        </Box>
      ) : !analyticsData || analyticsData.sites.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2.5, bgcolor: '#f0f3ff', color: '#151c27', border: '1px solid #e2e8f8' }}>
          No work sites configured.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {analyticsData.sites.map((site) => (
            <Card
              key={site.site_id}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid #e2e8f8',
                bgcolor: '#ffffff',
                p: 2,
                opacity: site.is_active ? 1 : 0.65,
                transition: 'all 0.15s ease'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#151c27', lineHeight: 1.2 }}>
                    {site.site_name}
                  </Typography>
                  {site.address && (
                    <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', mt: 0.25 }}>
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
                    py: 0.4,
                    borderRadius: 2,
                    borderColor: '#dce2f3',
                    color: '#151c27',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#f0f3ff' }
                  }}
                >
                  Details
                </Button>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, pt: 1.25, borderTop: '1px solid #f0f3ff' }}>
                <Box>
                  <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600 }}>
                    Workers
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#151c27', mt: 0.25 }}>
                    {site.unique_worker_count}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600 }}>
                    Units
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#151c27', mt: 0.25 }}>
                    {parseFloat(site.total_work_units).toFixed(1)}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600 }}>
                    Labour Cost
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#151c27', mt: 0.25 }}>
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
            border: '1px solid #e2e8f8'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#151c27' }}>
          {selectedSite?.site_name} — Site Report
        </DialogTitle>
        <DialogContent>
          {selectedSite && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ p: 1.5, bgcolor: '#f0f3ff', borderRadius: 2, border: '1px solid #e2e8f8' }}>
                <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', fontWeight: 600 }}>
                  Billing Month: {analyticsData?.month_name}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, flexWrap: 'wrap', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.8125rem' }}>
                    <span style={{ color: '#555f6f' }}>Workers:</span> <strong>{selectedSite.unique_worker_count}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem' }}>
                    <span style={{ color: '#555f6f' }}>Work Units:</span> <strong>{parseFloat(selectedSite.total_work_units).toFixed(1)}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#151c27' }}>
                    <span style={{ color: '#555f6f' }}>Total Cost:</span> {formatCurrency(selectedSite.total_labour_expense)}
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#151c27' }}>
                Worker Deployment ({selectedSite.workers.length})
              </Typography>

              {selectedSite.workers.length === 0 ? (
                <Typography sx={{ color: '#555f6f', textAlign: 'center', py: 3, fontSize: '0.8125rem' }}>
                  No workers logged attendance at this site in {analyticsData?.month_name}.
                </Typography>
              ) : (
                <TableContainer sx={{ border: '1px solid #e2e8f8', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f0f3ff' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#555f6f' }}>Worker</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#555f6f' }}>Units</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#555f6f' }}>Rate</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#555f6f' }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedSite.workers.map((w) => (
                        <TableRow key={w.worker_id} hover>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                            {w.worker_name}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                            {parseFloat(w.work_units).toFixed(1)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8125rem', color: '#555f6f' }}>
                            ₹{parseFloat(w.daily_wage).toFixed(0)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#151c27' }}>
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
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SiteAnalytics;
