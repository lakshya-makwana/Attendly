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
  Person as PersonIcon
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
  const isPositiveNet = parseFloat(detail.month_net_payable || 0) >= 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 640, mx: 'auto', pb: 8 }}>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#151c27', lineHeight: 1.2 }}>
                  {worker.name}
                </Typography>
                <Box
                  component="span"
                  sx={{
                    bgcolor: worker.is_active ? '#f0f3ff' : '#e2e8f8',
                    color: worker.is_active ? '#151c27' : '#555f6f',
                    px: 1.25,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: '0.6875rem',
                    fontWeight: 700
                  }}
                >
                  {worker.is_active ? 'Active' : 'Inactive'}
                </Box>
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

      {/* Financial Summary Ledger Panel */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #e2e8f8',
          bgcolor: '#ffffff',
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Grid container>
            <Grid item xs={6} sm={3} sx={{ p: 2, borderRight: '1px solid #e2e8f8', borderBottom: { xs: '1px solid #e2e8f8', sm: 'none' } }}>
              <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Month Work Units
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#151c27', mt: 0.5 }}>
                {parseFloat(detail.month_total_work_units || 0).toFixed(1)}
              </Typography>
              <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
                {detail.current_month}
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} sx={{ p: 2, borderRight: { sm: '1px solid #e2e8f8' }, borderBottom: { xs: '1px solid #e2e8f8', sm: 'none' } }}>
              <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Gross Earnings
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#151c27', mt: 0.5 }}>
                ₹{parseFloat(detail.month_gross_earnings || 0).toFixed(0)}
              </Typography>
              <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
                Units × Daily rate
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} sx={{ p: 2, borderRight: '1px solid #e2e8f8' }}>
              <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Month Advances
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#ba1a1a', mt: 0.5 }}>
                −₹{parseFloat(detail.month_total_advances || 0).toFixed(0)}
              </Typography>
              <Typography sx={{ color: '#76777c', fontSize: '0.6875rem', mt: 0.25 }}>
                All-time: ₹{parseFloat(detail.all_time_total_advances || 0).toFixed(0)}
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} sx={{ p: 2, bgcolor: isPositiveNet ? '#f0f3ff' : '#ffdad6' }}>
              <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Net Payable
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: isPositiveNet ? '#151c27' : '#93000a', mt: 0.5 }}>
                ₹{parseFloat(detail.month_net_payable || 0).toFixed(0)}
              </Typography>
              <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', mt: 0.25, fontWeight: 600 }}>
                {isPositiveNet ? 'Disbursable' : 'Advance Due'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs: Attendance History vs Advances History */}
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
          <Tab label={`Attendance History (${detail.recent_attendance.length})`} />
          <Tab label={`Advances Ledger (${detail.recent_advances.length})`} />
        </Tabs>

        {/* Tab 0: Attendance History Table */}
        {tabIndex === 0 && (
          <Box sx={{ p: 0 }}>
            {detail.recent_attendance.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ color: '#555f6f', fontSize: '0.875rem' }}>No attendance records found.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Date</TableCell>
                      <TableCell sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Work Site</TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Work Units</TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#f0f3ff', color: '#555f6f', fontWeight: 700, fontSize: '0.72rem' }}>Earnings</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.recent_attendance.map((att) => {
                      const units = parseFloat(att.work_units || 0);
                      return (
                        <TableRow key={att.id} hover sx={{ '&:hover': { bgcolor: '#f0f3ff' } }}>
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
                            ₹{parseFloat(att.wage_earned || 0).toFixed(0)}
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
                <Typography sx={{ color: '#555f6f', fontSize: '0.875rem' }}>No advance transactions recorded.</Typography>
              </Box>
            ) : (
              <TableContainer>
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
                    {detail.recent_advances.map((adv) => (
                      <TableRow key={adv.id} hover sx={{ '&:hover': { bgcolor: '#f0f3ff' } }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                          {formatDateIndian(adv.date)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#ba1a1a', fontSize: '0.8125rem' }}>
                          ₹{parseFloat(adv.amount || 0).toFixed(0)}
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
            )}
          </Box>
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
