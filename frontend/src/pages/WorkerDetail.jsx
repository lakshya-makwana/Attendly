import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
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
  DeleteOutlined as DeleteIcon
} from '@mui/icons-material';
import api from '../api/client';
import { formatDateIndian } from '../utils/dateUtils';

const WorkerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);

  // Add Advance modal
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [advanceNote, setAdvanceNote] = useState('');
  const [advanceSaving, setAdvanceSaving] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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

  useEffect(() => {
    fetchDetail();
  }, [id]);

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
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete advance.', severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!detail) {
    return (
      <Alert severity="error">
        Worker not found.{' '}
        <Button size="small" onClick={() => navigate('/workers')}>Return to Workers</Button>
      </Alert>
    );
  }

  const { worker } = detail;
  const isPositiveNet = parseFloat(detail.month_net_payable || 0) >= 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Top Header Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => navigate('/workers')}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h5">{worker.name}</Typography>
              <Chip
                label={worker.is_active ? 'Active' : 'Inactive'}
                size="small"
                sx={{ height: 20, fontSize: '0.6875rem' }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.25 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Rate: <strong>₹{parseFloat(worker.daily_wage).toFixed(0)}/day</strong>
              </Typography>
              {worker.phone && (
                <Typography
                  variant="caption"
                  component="a"
                  href={`tel:${worker.phone}`}
                  sx={{ color: 'text.secondary', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.3 }}
                >
                  <PhoneIcon sx={{ fontSize: '0.8rem' }} /> {worker.phone}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => setAdvanceDialogOpen(true)}
          sx={{ fontSize: '0.8125rem' }}
        >
          Give Advance
        </Button>
      </Box>

      {/* Financial Summary Ledger Panel */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Grid container>
            <Grid item xs={6} sm={3} sx={{ p: 2, borderRight: '1px solid #e2e8f0', borderBottom: { xs: '1px solid #e2e8f0', sm: 'none' } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Month Work Units
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
                {parseFloat(detail.month_total_work_units || 0).toFixed(1)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {detail.current_month}
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} sx={{ p: 2, borderRight: { sm: '1px solid #e2e8f0' }, borderBottom: { xs: '1px solid #e2e8f0', sm: 'none' } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Gross Earnings
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
                ₹{parseFloat(detail.month_gross_earnings || 0).toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Units × Daily rate
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} sx={{ p: 2, borderRight: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Month Advances
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25, color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>
                −₹{parseFloat(detail.month_total_advances || 0).toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                All-time: ₹{parseFloat(detail.all_time_total_advances || 0).toFixed(0)}
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} sx={{ p: 2, bgcolor: isPositiveNet ? '#f8fafc' : '#fef2f2' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Net Payable
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mt: 0.25,
                  color: isPositiveNet ? '#15803d' : '#b91c1c',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                ₹{parseFloat(detail.month_net_payable || 0).toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {isPositiveNet ? 'Disbursable' : 'Advance Due'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs: Attendance History vs Advances History */}
      <Card sx={{ overflow: 'hidden' }}>
        <Tabs
          value={tabIndex}
          onChange={(e, val) => setTabIndex(val)}
          sx={{ borderBottom: '1px solid #e2e8f0', minHeight: 44 }}
        >
          <Tab
            label={`Attendance History (${detail.recent_attendance.length})`}
            sx={{ fontWeight: 600, fontSize: '0.8125rem', minHeight: 44 }}
          />
          <Tab
            label={`Advances Ledger (${detail.recent_advances.length})`}
            sx={{ fontWeight: 600, fontSize: '0.8125rem', minHeight: 44 }}
          />
        </Tabs>

        {/* Tab 0: Attendance History Table */}
        {tabIndex === 0 && (
          <Box sx={{ p: 0 }}>
            {detail.recent_attendance.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>No attendance records found.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Work Site</TableCell>
                      <TableCell align="right">Work Units</TableCell>
                      <TableCell align="right">Earnings</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.recent_attendance.map((att) => {
                      const units = parseFloat(att.work_units || 0);
                      return (
                        <TableRow key={att.id} hover>
                          <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatDateIndian(att.date)}
                          </TableCell>
                          <TableCell>{att.site_name || (units === 0 ? 'Absent' : '—')}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {units.toFixed(1)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            ₹{parseFloat(att.wage_earned || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Tab 1: Advances History Table */}
        {tabIndex === 1 && (
          <Box sx={{ p: 0 }}>
            {detail.recent_advances.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>No advance transactions recorded.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Note</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.recent_advances.map((adv) => (
                      <TableRow key={adv.id} hover>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatDateIndian(adv.date)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>
                          ₹{parseFloat(adv.amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{adv.note || '—'}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteAdvance(adv.id)}
                            sx={{ color: '#64748b', '&:hover': { color: '#b91c1c' } }}
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Card>

      {/* Give Advance Modal */}
      <Dialog open={advanceDialogOpen} onClose={() => setAdvanceDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Record Advance · {worker.name}</DialogTitle>
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
            />

            <TextField
              label="Date"
              type="date"
              fullWidth
              value={advanceDate}
              onChange={(e) => setAdvanceDate(e.target.value)}
            />

            <TextField
              label="Note (Optional)"
              fullWidth
              placeholder="e.g. Festival advance"
              value={advanceNote}
              onChange={(e) => setAdvanceNote(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAdvanceDialogOpen(false)} size="small" variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleCreateAdvance}
            disabled={advanceSaving || !advanceAmount}
          >
            {advanceSaving ? 'Recording...' : 'Save'}
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
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 1, fontSize: '0.8125rem' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkerDetail;
