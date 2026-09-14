import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteOutlined as DeleteIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import api from '../api/client';
import { formatDateIndian } from '../utils/dateUtils';

const Advances = () => {
  const [advances, setAdvances] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  // Add Advance Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [advRes, workersRes] = await Promise.all([
        api.get('/advances'),
        api.get('/workers?active_only=true')
      ]);
      setAdvances(advRes.data);
      setWorkers(workersRes.data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load advances.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setWorkerId(workers.length > 0 ? workers[0].id : '');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setDialogOpen(true);
  };

  const handleSaveAdvance = async () => {
    if (!workerId || !amount || parseFloat(amount) <= 0) {
      setSnackbar({ open: true, message: 'Please select a worker and valid amount.', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      await api.post('/advances', {
        worker_id: parseInt(workerId),
        amount: parseFloat(amount),
        date: date,
        note: note.trim() || null
      });

      setSnackbar({ open: true, message: 'Advance payment recorded successfully.', severity: 'success' });
      setDialogOpen(false);
      fetchData();
    } catch {
      setSnackbar({ open: true, message: 'Failed to record advance.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (advId) => {
    try {
      await api.delete(`/advances/${advId}`);
      setSnackbar({ open: true, message: 'Advance entry deleted.', severity: 'info' });
      fetchData();
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete advance.', severity: 'error' });
    }
  };

  const filteredAdvances = advances.filter((adv) => {
    if (!selectedWorkerId) return true;
    return adv.worker_id === parseInt(selectedWorkerId);
  });

  const totalFilteredAmount = filteredAdvances.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const quickAmounts = ['500', '1000', '2000', '5000'];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 1200, width: '100%', mx: 'auto', pb: { xs: 4, sm: 6 } }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#151c27', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Advances
          </Typography>
          <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}>
            Cash advances given to workers, automatically deducted from payroll
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 18 }} />}
          onClick={handleOpenAdd}
          sx={{
            bgcolor: '#000000',
            color: '#ffffff',
            fontSize: '0.8125rem',
            fontWeight: 700,
            px: 2,
            py: 0.85,
            borderRadius: 2.5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            '&:hover': { bgcolor: '#1f2937' },
            '&:active': { transform: 'scale(0.97)' }
          }}
        >
          Give Advance
        </Button>
      </Box>

      {/* Filter & Metric Summary Card */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #e2e8f8',
          bgcolor: '#ffffff',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 220 } }}>
          <FormControl size="small" sx={{ flex: 1, minWidth: { xs: 160, sm: 180 } }}>
            <InputLabel id="filter-worker-label" sx={{ fontSize: '0.8125rem' }}>Filter Worker</InputLabel>
            <Select
              labelId="filter-worker-label"
              value={selectedWorkerId}
              label="Filter Worker"
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              sx={{ borderRadius: 2, fontSize: '0.8125rem' }}
            >
              <MenuItem value="">All Workers</MenuItem>
              {workers.map((w) => (
                <MenuItem key={w.id} value={w.id} sx={{ fontSize: '0.8125rem' }}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedWorkerId && (
            <Button
              size="small"
              onClick={() => setSelectedWorkerId('')}
              sx={{ color: '#555f6f', fontSize: '0.75rem', minWidth: 'auto', p: 0.5 }}
            >
              Reset
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'flex-end' }, width: { xs: '100%', sm: 'auto' }, gap: 2 }}>
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography sx={{ color: '#555f6f', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Total Advances
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#151c27' }}>
              {formatCurrency(totalFilteredAmount)}
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: '#f0f3ff',
              color: '#151c27',
              px: 1.5,
              py: 0.5,
              borderRadius: 1.5,
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            {filteredAdvances.length} entries
          </Box>
        </Box>
      </Card>

      {/* Advances Content Stream */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={30} sx={{ color: '#000000' }} />
        </Box>
      ) : filteredAdvances.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2.5, bgcolor: '#f0f3ff', color: '#151c27', border: '1px solid #e2e8f8' }}>
          No advance transactions found. Click "Give Advance" to record a payment.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {filteredAdvances.map((adv) => (
            <Card
              key={adv.id}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid #e2e8f8',
                bgcolor: '#ffffff',
                p: 2,
                transition: 'all 0.15s ease'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '12px',
                      bgcolor: '#f0f3ff',
                      color: '#151c27',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}
                  >
                    {adv.worker_name ? adv.worker_name.charAt(0).toUpperCase() : <PersonIcon />}
                  </Box>

                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#151c27', lineHeight: 1.2 }}>
                      {adv.worker_name}
                    </Typography>
                    <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarIcon sx={{ fontSize: 13 }} />
                      {formatDateIndian(adv.date)}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#ba1a1a' }}>
                    {formatCurrency(adv.amount)}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={() => handleDelete(adv.id)}
                    sx={{ color: '#76777c', '&:hover': { color: '#ba1a1a', bgcolor: '#ffdad6' } }}
                    title="Delete entry"
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>

              {adv.note && (
                <>
                  <Divider sx={{ my: 1.25, borderColor: '#f0f3ff' }} />
                  <Typography sx={{ color: '#555f6f', fontSize: '0.8125rem' }}>
                    {adv.note}
                  </Typography>
                </>
              )}
            </Card>
          ))}
        </Box>
      )}

      {/* Give Advance Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
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
          Give Advance
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel id="worker-select-label">Worker</InputLabel>
              <Select
                labelId="worker-select-label"
                value={workerId}
                label="Worker"
                onChange={(e) => setWorkerId(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {workers.map((w) => (
                  <MenuItem key={w.id} value={w.id} sx={{ fontSize: '0.8125rem' }}>
                    {w.name} (Daily Rate: ₹{parseFloat(w.daily_wage).toFixed(0)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Quick Amount Preset Chips */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {quickAmounts.map((q) => (
                <Box
                  key={q}
                  onClick={() => setAmount(q)}
                  sx={{
                    flex: 1,
                    py: 0.75,
                    borderRadius: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    bgcolor: amount === q ? '#000000' : '#f0f3ff',
                    color: amount === q ? '#ffffff' : '#151c27',
                    border: '1px solid #e2e8f8',
                    transition: 'all 0.12s ease',
                    '&:hover': { bgcolor: amount === q ? '#000000' : '#e7eefe' },
                    '&:active': { transform: 'scale(0.96)' }
                  }}
                >
                  ₹{q}
                </Box>
              ))}
            </Box>

            <TextField
              label="Advance Amount (₹)"
              type="number"
              required
              fullWidth
              size="small"
              placeholder="e.g. 2000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Payment Date"
              type="date"
              fullWidth
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Note (Optional)"
              fullWidth
              size="small"
              placeholder="e.g. Festival advance, Medical emergency"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 2, borderColor: '#dce2f3', color: '#151c27' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveAdvance}
            disabled={saving || !amount || !workerId}
            sx={{ borderRadius: 2, bgcolor: '#000000', color: '#ffffff', fontWeight: 700 }}
          >
            {saving ? 'Recording...' : 'Record Advance'}
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

export default Advances;
