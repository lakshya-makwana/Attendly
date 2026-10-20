import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  History as HistoryIcon,
  ArrowBack as BackIcon,
  DeleteOutlined as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  Event as EventIcon
} from '@mui/icons-material';
import api from '../api/client';
import { formatDateIndian } from '../utils/dateUtils';

const WageHistoryModal = ({
  open,
  onClose,
  worker,
  onWageUpdated
}) => {
  const [wages, setWages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'add'
  const [newWage, setNewWage] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchWageHistory = useCallback(async () => {
    if (!worker?.id) return;
    setLoading(true);
    setErrorNotice('');
    try {
      const res = await api.get(`/workers/${worker.id}/wages`);
      setWages(res.data || []);
    } catch {
      setErrorNotice('Failed to load wage history records.');
    } finally {
      setLoading(false);
    }
  }, [worker?.id]);

  useEffect(() => {
    if (open && worker?.id) {
      setView('list');
      setNewWage('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setFormError('');
      setErrorNotice('');
      setSuccessNotice('');
      fetchWageHistory();
    }
  }, [open, worker?.id, fetchWageHistory]);

  const handleOpenAdd = () => {
    setNewWage('');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setFormError('');
    setErrorNotice('');
    setSuccessNotice('');
    setView('add');
  };

  const handleSaveWage = async () => {
    const wageNum = parseFloat(newWage);
    if (isNaN(wageNum) || wageNum <= 0) {
      setFormError('Please enter a valid daily wage rate (greater than ₹0).');
      return;
    }
    if (!effectiveDate) {
      setFormError('Please select a valid effective date.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setErrorNotice('');
    try {
      await api.post(`/workers/${worker.id}/wages`, {
        daily_wage: wageNum,
        effective_from: effectiveDate
      });
      setSuccessNotice(`Wage rate of ₹${wageNum.toFixed(0)}/day recorded successfully.`);
      setView('list');
      await fetchWageHistory();
      if (onWageUpdated) {
        onWageUpdated();
      }
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save wage change.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWage = async (wageId) => {
    if (wages.length <= 1) {
      setErrorNotice("Cannot delete the worker's sole wage record.");
      return;
    }
    setDeletingId(wageId);
    setErrorNotice('');
    try {
      await api.delete(`/workers/${worker.id}/wages/${wageId}`);
      setSuccessNotice('Wage record deleted successfully.');
      await fetchWageHistory();
      if (onWageUpdated) {
        onWageUpdated();
      }
    } catch (err) {
      setErrorNotice(err.response?.data?.detail || 'Failed to delete wage record.');
    } finally {
      setDeletingId(null);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Determine current active wage index (latest with effective_from <= today)
  let currentActiveIndex = -1;
  for (let i = 0; i < wages.length; i++) {
    if (wages[i].effective_from <= todayStr) {
      currentActiveIndex = i;
      break;
    }
  }
  // If none <= today, the oldest is the baseline
  if (currentActiveIndex === -1 && wages.length > 0) {
    currentActiveIndex = wages.length - 1;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          border: '1px solid #e4e4e7',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          pt: 1.5,
          px: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {view === 'add' ? (
            <IconButton
              size="small"
              onClick={() => {
                setView('list');
                setFormError('');
              }}
              sx={{ color: '#71717a' }}
            >
              <BackIcon sx={{ fontSize: 20 }} />
            </IconButton>
          ) : (
            <HistoryIcon sx={{ fontSize: 22, color: '#ea580c' }} />
          )}
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#09090b', lineHeight: 1.2 }}>
              {view === 'add' ? 'Update Wage Rate' : 'Wage History'}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#71717a' }}>
              {worker?.name || 'Worker'}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#a1a1aa' }}>
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, py: 1 }}>
        {errorNotice && (
          <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.78rem' }}>
            {errorNotice}
          </Alert>
        )}
        {successNotice && (
          <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.78rem' }}>
            {successNotice}
          </Alert>
        )}

        {view === 'list' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: '#fafafa',
                p: 1.5,
                borderRadius: 2,
                border: '1px solid #f4f4f5'
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Daily Wage
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#09090b', fontVariantNumeric: 'tabular-nums' }}>
                  ₹{parseFloat(worker?.daily_wage || 0).toFixed(0)}
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#71717a' }}> / day</span>
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={handleOpenAdd}
                sx={{
                  bgcolor: '#ea580c',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  px: 1.5,
                  py: 0.7,
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: 'none',
                  touchAction: 'manipulation',
                  transition: 'transform 140ms ease-out, background-color 140ms ease-out',
                  '&:hover': { bgcolor: '#c2410c' },
                  '&:active': { transform: 'scale(0.97)' }
                }}
              >
                Change Rate
              </Button>
            </Box>

            <Divider sx={{ borderColor: '#f4f4f5' }} />

            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Historical & Scheduled Rates
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} sx={{ color: '#ea580c' }} />
              </Box>
            ) : wages.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.8125rem', color: '#71717a' }}>
                  No historical rate changes recorded.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 260, overflowY: 'auto', pr: 0.5 }}>
                {wages.map((w, idx) => {
                  const isCurrent = idx === currentActiveIndex;
                  const isFuture = w.effective_from > todayStr;
                  const isPast = !isCurrent && !isFuture;

                  return (
                    <Box
                      key={w.id}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: isCurrent ? '#fed7aa' : '#e4e4e7',
                        bgcolor: isCurrent ? '#fff7ed' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.9375rem',
                              color: isCurrent ? '#ea580c' : '#09090b',
                              fontVariantNumeric: 'tabular-nums'
                            }}
                          >
                            ₹{parseFloat(w.daily_wage).toFixed(0)}
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#71717a' }}> / day</span>
                          </Typography>

                          {isCurrent && (
                            <Chip
                              label="Current Rate"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                bgcolor: '#ffedd5',
                                color: '#9a3412',
                                border: '1px solid #fed7aa'
                              }}
                            />
                          )}
                          {isFuture && (
                            <Chip
                              label="Scheduled"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                bgcolor: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe'
                              }}
                            />
                          )}
                          {isPast && (
                            <Chip
                              label="Past Rate"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                bgcolor: '#f4f4f5',
                                color: '#71717a',
                                border: '1px solid #e4e4e7'
                              }}
                            />
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.35 }}>
                          <EventIcon sx={{ fontSize: 13, color: '#71717a' }} />
                          <Typography sx={{ fontSize: '0.75rem', color: '#71717a' }}>
                            Effective from <strong>{formatDateIndian(w.effective_from)}</strong>
                          </Typography>
                        </Box>
                      </Box>

                      {wages.length > 1 && (
                        <IconButton
                          size="small"
                          disabled={deletingId === w.id}
                          onClick={() => handleDeleteWage(w.id)}
                          aria-label="Delete wage rate"
                          sx={{
                            color: '#a1a1aa',
                            touchAction: 'manipulation',
                            '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' }
                          }}
                        >
                          {deletingId === w.id ? (
                            <CircularProgress size={16} sx={{ color: '#dc2626' }} />
                          ) : (
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        ) : (
          /* Add / Update Rate Form View */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ bgcolor: '#fafafa', p: 1.25, borderRadius: 2, border: '1px solid #f4f4f5' }}>
              <Typography sx={{ fontSize: '0.75rem', color: '#71717a' }}>
                Current Rate: <strong style={{ color: '#09090b' }}>₹{parseFloat(worker?.daily_wage || 0).toFixed(0)}/day</strong>
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#a1a1aa', mt: 0.25 }}>
                Shifts on or after the effective date will use the new wage. Past shifts remain unchanged.
              </Typography>
            </Box>

            <TextField
              label="New Daily Wage"
              required
              fullWidth
              autoFocus
              type="number"
              inputProps={{ inputMode: 'decimal', min: 0 }}
              placeholder="e.g. 850"
              value={newWage}
              onChange={(e) => setNewWage(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ color: '#09090b', fontWeight: 700 }}>₹</Typography>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography sx={{ color: '#71717a', fontSize: '0.75rem' }}>/ day</Typography>
                  </InputAdornment>
                )
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
              label="Effective From Date"
              required
              fullWidth
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Determines exactly when this wage begins applying."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#e4e4e7' },
                  '&.Mui-focused fieldset': { borderColor: '#ea580c' }
                },
                '& input': { fontSize: '0.95rem' }
              }}
            />

            {formError && (
              <Alert severity="error" sx={{ borderRadius: 2, fontSize: '0.78rem' }}>
                {formError}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 1.5, pt: 0.5 }}>
        {view === 'add' ? (
          <>
            <Button
              onClick={() => {
                setView('list');
                setFormError('');
              }}
              variant="outlined"
              size="small"
              sx={{
                borderRadius: 2,
                borderColor: '#e4e4e7',
                color: '#09090b',
                fontWeight: 600,
                minHeight: 38,
                px: 2,
                textTransform: 'none'
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={submitting}
              onClick={handleSaveWage}
              sx={{
                borderRadius: 2,
                bgcolor: '#09090b',
                color: '#ffffff',
                fontWeight: 700,
                minHeight: 38,
                px: 2.5,
                textTransform: 'none',
                touchAction: 'manipulation',
                transition: 'transform 140ms ease-out, background-color 140ms ease-out',
                '&:hover': { bgcolor: '#27272a' },
                '&:active': { transform: 'scale(0.97)' }
              }}
            >
              {submitting ? 'Saving...' : 'Apply New Wage'}
            </Button>
          </>
        ) : (
          <Button
            onClick={onClose}
            variant="outlined"
            size="small"
            fullWidth
            sx={{
              borderRadius: 2,
              borderColor: '#e4e4e7',
              color: '#09090b',
              fontWeight: 600,
              minHeight: 38,
              textTransform: 'none'
            }}
          >
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WageHistoryModal;
