import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteOutlined as DeleteIcon,
  FilterList as FilterIcon
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5">Advances</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            Cash advances given to workers, automatically deducted from monthly payroll
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon fontSize="small" />}
          onClick={handleOpenAdd}
        >
          Give Advance
        </Button>
      </Box>

      {/* Filter & Metric Summary Bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
          p: 1.5,
          bgcolor: '#ffffff',
          borderRadius: 1.5,
          border: '1px solid #e2e8f0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 220 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="filter-worker-label">Filter by Worker</InputLabel>
            <Select
              labelId="filter-worker-label"
              value={selectedWorkerId}
              label="Filter by Worker"
              onChange={(e) => setSelectedWorkerId(e.target.value)}
            >
              <MenuItem value="">All Workers</MenuItem>
              {workers.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedWorkerId && (
            <Button size="small" onClick={() => setSelectedWorkerId('')} sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
              Reset
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Advances
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'monospace' }}>
              {formatCurrency(totalFilteredAmount)}
            </Typography>
          </Box>
          <Chip
            label={`${filteredAdvances.length} entries`}
            size="small"
            sx={{ bgcolor: '#f1f5f9', fontWeight: 600, color: '#475569' }}
          />
        </Box>
      </Box>

      {/* Content Area */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : filteredAdvances.length === 0 ? (
        <Alert severity="info" sx={{ border: '1px solid #e2e8f0' }}>
          No advance transactions found. Click "Give Advance" to record a payment.
        </Alert>
      ) : (
        <>
          {/* Desktop Table View */}
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
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.25, width: 130 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.25 }}>Worker</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', py: 1.25, width: 150 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.25 }}>Note</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', py: 1.25, width: 80 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAdvances.map((adv) => (
                    <TableRow
                      key={adv.id}
                      hover
                      sx={{ '&:last-child td': { borderBottom: 0 } }}
                    >
                      <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                        {formatDateIndian(adv.date)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {adv.worker_name}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontFamily: 'monospace', color: '#b45309' }}>
                        {formatCurrency(adv.amount)}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {adv.note || '—'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="default"
                          onClick={() => handleDelete(adv.id)}
                          sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}
                          title="Delete entry"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Mobile Card / List View */}
          <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
            {filteredAdvances.map((adv) => (
              <Card
                key={adv.id}
                variant="outlined"
                sx={{ borderColor: '#e2e8f0' }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {adv.worker_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', mt: 0.25, display: 'block' }}>
                        {formatDateIndian(adv.date)}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#b45309', fontFamily: 'monospace' }}>
                        {formatCurrency(adv.amount)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(adv.id)}
                        sx={{ color: '#94a3b8', p: 0.5, mt: 0.25, '&:hover': { color: '#ef4444' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {adv.note && (
                    <>
                      <Divider sx={{ my: 1, borderColor: '#f1f5f9' }} />
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                        {adv.note}
                      </Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      {/* Give Advance Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Give Advance</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel id="worker-select-label">Worker</InputLabel>
              <Select
                labelId="worker-select-label"
                value={workerId}
                label="Worker"
                onChange={(e) => setWorkerId(e.target.value)}
              >
                {workers.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name} (Daily Rate: ₹{parseFloat(w.daily_wage).toFixed(0)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Advance Amount (₹)"
              type="number"
              required
              fullWidth
              size="small"
              autoFocus
              placeholder="e.g. 2000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />

            <TextField
              label="Payment Date"
              type="date"
              fullWidth
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <TextField
              label="Note (Optional)"
              fullWidth
              size="small"
              placeholder="e.g. Festival advance, Medical emergency"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAdvance}
            disabled={saving || !amount || !workerId}
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
        <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Advances;
