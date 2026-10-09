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

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [advanceToDelete, setAdvanceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleOpenDelete = (adv) => {
    setAdvanceToDelete(adv);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!advanceToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/advances/${advanceToDelete.id}`);
      setSnackbar({ open: true, message: 'Advance entry deleted.', severity: 'info' });
      setDeleteDialogOpen(false);
      setAdvanceToDelete(null);
      fetchData();
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete advance.', severity: 'error' });
    } finally {
      setDeleting(false);
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
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#09090b', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Advances
          </Typography>
          <Typography sx={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}>
            Cash advances given to workers, automatically deducted from payroll
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 18 }} />}
          onClick={handleOpenAdd}
          sx={{
            bgcolor: '#09090b',
            color: '#ffffff',
            fontSize: '0.8125rem',
            fontWeight: 700,
            px: 2,
            py: 1,
            minHeight: 42,
            borderRadius: 2.5,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            touchAction: 'manipulation',
            transition: 'transform 140ms ease-out, background-color 140ms ease-out',
            '&:hover': { bgcolor: '#27272a' },
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
          borderRadius: '12px',
          border: '1px solid #e4e4e7',
          bgcolor: '#ffffff',
          p: { xs: 1.75, sm: 2 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 240 } }}>
          <FormControl size="small" sx={{ flex: 1, minWidth: { xs: 160, sm: 190 } }}>
            <InputLabel id="filter-worker-label" sx={{ fontSize: '0.8125rem' }}>Filter Worker</InputLabel>
            <Select
              labelId="filter-worker-label"
              value={selectedWorkerId}
              label="Filter Worker"
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              sx={{
                borderRadius: 2,
                fontSize: '0.875rem',
                '& fieldset': { borderColor: '#e4e4e7' },
                '&:hover fieldset': { borderColor: '#d4d4d8' },
                '&.Mui-focused fieldset': { borderColor: '#ea580c' }
              }}
            >
              <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>All Workers</MenuItem>
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
              sx={{
                color: '#71717a',
                fontSize: '0.75rem',
                fontWeight: 600,
                minWidth: 'auto',
                p: 0.75,
                borderRadius: 1.5,
                '&:hover': { color: '#09090b', bgcolor: '#f4f4f5' }
              }}
            >
              Reset
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'flex-end' }, width: { xs: '100%', sm: 'auto' }, gap: 2.5 }}>
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography sx={{ color: '#71717a', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Total Advances
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.4rem' }, color: '#09090b', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
              {formatCurrency(totalFilteredAmount)}
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: '#f4f4f5',
              color: '#71717a',
              border: '1px solid #e4e4e7',
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              fontSize: '0.75rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {filteredAdvances.length} entries
          </Box>
        </Box>
      </Card>

      {/* Advances Content Stream */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={30} sx={{ color: '#ea580c' }} />
        </Box>
      ) : filteredAdvances.length === 0 ? (
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
          No advance transactions found. Click "Give Advance" to record a payment.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {filteredAdvances.map((adv) => (
            <Card
              key={adv.id}
              elevation={0}
              sx={{
                borderRadius: '12px',
                border: '1px solid #e4e4e7',
                bgcolor: '#ffffff',
                p: { xs: 1.75, sm: 2 },
                transition: 'border-color 0.14s ease-out, box-shadow 0.14s ease-out',
                '&:hover': {
                  borderColor: '#d4d4d8',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: '10px',
                      bgcolor: '#fff7ed',
                      color: '#ea580c',
                      border: '1px solid #fed7aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      flexShrink: 0
                    }}
                  >
                    {adv.worker_name ? adv.worker_name.charAt(0).toUpperCase() : <PersonIcon sx={{ fontSize: 20 }} />}
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      title={adv.worker_name}
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
                      {adv.worker_name}
                    </Typography>
                    <Typography
                      sx={{
                        color: '#71717a',
                        fontSize: '0.75rem',
                        mt: 0.25,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      <CalendarIcon sx={{ fontSize: 13, flexShrink: 0, color: '#71717a' }} />
                      {formatDateIndian(adv.date)}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: '1.05rem',
                      color: '#dc2626',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {formatCurrency(adv.amount)}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={() => handleOpenDelete(adv)}
                    aria-label={`Delete advance of ${formatCurrency(adv.amount)} for ${adv.worker_name}`}
                    sx={{
                      color: '#71717a',
                      width: 36,
                      height: 36,
                      touchAction: 'manipulation',
                      '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' },
                      '&:active': { transform: 'scale(0.96)' }
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>

              {adv.note && (
                <>
                  <Divider sx={{ my: 1.25, borderColor: '#f4f4f5' }} />
                  <Typography sx={{ color: '#71717a', fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            border: '1px solid #e4e4e7',
            boxShadow: '0 16px 32px rgba(0,0,0,0.08)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#09090b' }}>
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
                sx={{
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#e4e4e7' },
                  '&.Mui-focused fieldset': { borderColor: '#ea580c' }
                }}
              >
                {workers.map((w) => (
                  <MenuItem key={w.id} value={w.id} sx={{ fontSize: '0.8125rem' }}>
                    {w.name} (Daily Rate: ₹{parseFloat(w.daily_wage).toFixed(0)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Quick Amount Preset Chips with warm orange accent active state */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {quickAmounts.map((q) => {
                const isSelected = amount === q;
                return (
                  <Box
                    key={q}
                    onClick={() => setAmount(q)}
                    sx={{
                      flex: 1,
                      py: 0.85,
                      borderRadius: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      userSelect: 'none',
                      touchAction: 'manipulation',
                      bgcolor: isSelected ? '#fff7ed' : '#f4f4f5',
                      color: isSelected ? '#ea580c' : '#09090b',
                      border: '1px solid',
                      borderColor: isSelected ? '#fed7aa' : '#e4e4e7',
                      transition: 'all 0.12s ease-out',
                      '&:hover': {
                        bgcolor: isSelected ? '#ffedd5' : '#e4e4e7'
                      },
                      '&:active': { transform: 'scale(0.96)' }
                    }}
                  >
                    ₹{q}
                  </Box>
                );
              })}
            </Box>

            <TextField
              label="Advance Amount (₹)"
              type="number"
              inputProps={{ inputMode: 'decimal', min: 0 }}
              required
              fullWidth
              size="small"
              placeholder="e.g. 2000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ color: '#09090b', fontWeight: 700 }}>₹</Typography>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#e4e4e7' },
                  '&.Mui-focused fieldset': { borderColor: '#ea580c' }
                },
                '& input': { fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }
              }}
            />

            <TextField
              label="Payment Date"
              type="date"
              fullWidth
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#e4e4e7' },
                  '&.Mui-focused fieldset': { borderColor: '#ea580c' }
                },
                '& input': { fontSize: '1rem' }
              }}
            />

            <TextField
              label="Note (Optional)"
              fullWidth
              size="small"
              placeholder="e.g. Festival advance, Medical emergency"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#e4e4e7' },
                  '&.Mui-focused fieldset': { borderColor: '#ea580c' }
                },
                '& input': { fontSize: '1rem' }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDialogOpen(false)}
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
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveAdvance}
            disabled={saving || !amount || !workerId}
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
            {saving ? 'Recording...' : 'Record Advance'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="xs"
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
          Delete Advance Entry?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#71717a', lineHeight: 1.5 }}>
            Are you sure you want to delete this advance payment of{' '}
            <strong style={{ color: '#09090b' }}>
              {advanceToDelete ? formatCurrency(advanceToDelete.amount) : ''}
            </strong>{' '}
            given to <strong style={{ color: '#09090b' }}>{advanceToDelete?.worker_name}</strong> on{' '}
            {advanceToDelete ? formatDateIndian(advanceToDelete.date) : ''}? This deduction will be removed from payroll.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            size="small"
            disabled={deleting}
            sx={{
              borderRadius: 2,
              borderColor: '#e4e4e7',
              color: '#09090b',
              fontWeight: 600,
              minHeight: 40,
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleConfirmDelete}
            disabled={deleting}
            sx={{
              borderRadius: 2,
              bgcolor: '#dc2626',
              color: '#ffffff',
              fontWeight: 700,
              minHeight: 40,
              px: 2.5,
              touchAction: 'manipulation',
              '&:hover': { bgcolor: '#b91c1c' },
              '&:active': { transform: 'scale(0.97)' }
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Advance'}
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

export default Advances;
