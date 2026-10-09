import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  PhoneOutlined as PhoneIcon,
  EditOutlined as EditIcon,
  DeleteOutlined as DeleteIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import api from '../api/client';

const Workers = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  // Add/Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', daily_wage: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);

  // Status Change Confirmation Dialog State
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusWorker, setStatusWorker] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchWorkers = async (filter = statusFilter) => {
    try {
      setLoading(true);
      let url = '/workers';
      if (filter === 'active') {
        url = '/workers?is_active=true';
      } else if (filter === 'inactive') {
        url = '/workers?is_active=false';
      }
      const res = await api.get(url);
      setWorkers(res.data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to fetch workers.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers(statusFilter);
  }, [statusFilter]);

  const handleOpenAdd = () => {
    setEditingWorker(null);
    setFormData({ name: '', phone: '', daily_wage: '' });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (worker, e) => {
    e.stopPropagation();
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      phone: worker.phone || '',
      daily_wage: worker.daily_wage.toString()
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenDelete = (worker, e) => {
    e.stopPropagation();
    setWorkerToDelete(worker);
    setDeleteDialogOpen(true);
  };

  const handleOpenStatusConfirm = (worker, e) => {
    e.stopPropagation();
    setStatusWorker(worker);
    setStatusDialogOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusWorker) return;
    const workerToUpdate = statusWorker;
    const newStatus = !workerToUpdate.is_active;
    setStatusLoading(true);

    try {
      await api.patch(`/workers/${workerToUpdate.id}/toggle-status`);
      setSnackbar({
        open: true,
        message: `Marked ${workerToUpdate.name} as ${newStatus ? 'active' : 'inactive'}.`,
        severity: 'success'
      });
      setStatusDialogOpen(false);
      setStatusWorker(null);

      // Keep current filter sensible without full reload
      if (statusFilter === 'all') {
        setWorkers((prev) =>
          prev.map((w) => (w.id === workerToUpdate.id ? { ...w, is_active: newStatus } : w))
        );
      } else {
        // If viewing 'active' or 'inactive', remove worker that no longer belongs to this filter
        setWorkers((prev) => prev.filter((w) => w.id !== workerToUpdate.id));
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Failed to update worker status.',
        severity: 'error'
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Worker name is required';
    if (!formData.daily_wage || parseFloat(formData.daily_wage) < 0) {
      errors.daily_wage = 'Valid daily wage is required (₹0 or greater)';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveWorker = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        daily_wage: parseFloat(formData.daily_wage)
      };

      if (editingWorker) {
        await api.put(`/workers/${editingWorker.id}`, payload);
        setSnackbar({ open: true, message: 'Worker updated successfully.', severity: 'success' });
      } else {
        await api.post('/workers', payload);
        setSnackbar({ open: true, message: 'Worker added successfully.', severity: 'success' });
      }
      setDialogOpen(false);
      fetchWorkers(statusFilter);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Failed to save worker.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorker = async () => {
    if (!workerToDelete) return;
    try {
      await api.delete(`/workers/${workerToDelete.id}`);
      setSnackbar({ open: true, message: 'Worker deleted successfully.', severity: 'success' });
      setDeleteDialogOpen(false);
      fetchWorkers(statusFilter);
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete worker.', severity: 'error' });
    }
  };

  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.phone && w.phone.includes(searchTerm));
    return matchesSearch;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 1200, width: '100%', mx: 'auto', pb: { xs: 4, sm: 6 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#09090b', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Workers
          </Typography>
          <Typography sx={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}>
            Manage workforce roster, wages, and contacts
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
          Add Worker
        </Button>
      </Box>

      {/* Filter and Search Bar */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            flex: { xs: '1 1 100%', sm: 1 },
            minWidth: { xs: '100%', sm: 220 },
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              bgcolor: '#ffffff',
              fontSize: '0.875rem',
              '& fieldset': { borderColor: '#e4e4e7' },
              '&:hover fieldset': { borderColor: '#d4d4d8' },
              '&.Mui-focused fieldset': { borderColor: '#ea580c' }
            },
            '& input': {
              fontSize: '1rem',
              py: 1.2
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#71717a', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
        />

        {/* 3 Status Filters: [ All ] [ Active ] [ Inactive ] */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            alignItems: 'center',
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
            overflowX: 'auto',
            pb: { xs: 0.5, sm: 0 }
          }}
        >
          {[
            { key: 'all', label: 'All Workers' },
            { key: 'active', label: 'Active' },
            { key: 'inactive', label: 'Inactive' }
          ].map((f) => {
            const isSelected = statusFilter === f.key;
            return (
              <Button
                key={f.key}
                size="small"
                onClick={() => setStatusFilter(f.key)}
                sx={{
                  flex: { xs: 1, sm: 'initial' },
                  bgcolor: isSelected ? '#09090b' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#71717a',
                  border: '1px solid',
                  borderColor: isSelected ? '#09090b' : '#e4e4e7',
                  borderRadius: 2,
                  px: 2,
                  py: 0.8,
                  minHeight: 38,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  minWidth: 'auto',
                  touchAction: 'manipulation',
                  transition: 'all 0.14s ease-out',
                  '&:hover': {
                    bgcolor: isSelected ? '#27272a' : '#fafafa',
                    color: isSelected ? '#ffffff' : '#09090b'
                  },
                  '&:active': { transform: 'scale(0.97)' }
                }}
              >
                {f.label}
              </Button>
            );
          })}
        </Box>
      </Box>

      {/* Workers Roster */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={30} sx={{ color: '#ea580c' }} />
        </Box>
      ) : filteredWorkers.length === 0 ? (
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
          {statusFilter === 'inactive'
            ? 'No inactive workers found.'
            : statusFilter === 'active'
            ? 'No active workers found.'
            : 'No workers match your search.'}
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {filteredWorkers.map((worker) => (
            <Card
              key={worker.id}
              elevation={0}
              onClick={() => navigate(`/workers/${worker.id}`)}
              sx={{
                borderRadius: '12px',
                border: '1px solid #e4e4e7',
                bgcolor: '#ffffff',
                p: { xs: 1.75, sm: 2 },
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                cursor: 'pointer',
                opacity: worker.is_active ? 1 : 0.72,
                transition: 'border-color 0.14s ease-out, box-shadow 0.14s ease-out',
                '&:hover': {
                  borderColor: '#d4d4d8',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                },
                '&:active': { transform: 'scale(0.99)' }
              }}
            >
              {/* Top Row: Avatar + Name + Status Badge */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: '10px',
                      bgcolor: worker.is_active ? '#fff7ed' : '#f4f4f5',
                      color: worker.is_active ? '#ea580c' : '#71717a',
                      border: '1px solid',
                      borderColor: worker.is_active ? '#fed7aa' : '#e4e4e7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      flexShrink: 0
                    }}
                  >
                    {worker.name ? worker.name.charAt(0).toUpperCase() : <PersonIcon sx={{ fontSize: 20 }} />}
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      title={worker.name}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        color: '#09090b',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {worker.name}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.35, flexWrap: 'wrap' }}>
                      <Typography
                        sx={{
                          color: '#09090b',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        ₹{parseFloat(worker.daily_wage).toFixed(0)}/day
                      </Typography>

                      {worker.phone ? (
                        <Typography
                          variant="caption"
                          component="a"
                          href={`tel:${worker.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            color: '#71717a',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.35,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            fontVariantNumeric: 'tabular-nums',
                            '&:hover': { color: '#09090b', textDecoration: 'underline' }
                          }}
                        >
                          <PhoneIcon sx={{ fontSize: 13, color: '#71717a' }} /> {worker.phone}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#a1a1aa', fontSize: '0.75rem' }}>
                          No phone
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Status Indicator Pill */}
                <Box
                  sx={{
                    bgcolor: worker.is_active ? '#f0fdf4' : '#f4f4f5',
                    color: worker.is_active ? '#15803d' : '#71717a',
                    border: '1px solid',
                    borderColor: worker.is_active ? '#bbf7d0' : '#e4e4e7',
                    px: 1.25,
                    py: 0.4,
                    borderRadius: 1.5,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    flexShrink: 0,
                    userSelect: 'none'
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: worker.is_active ? '#16a34a' : '#a1a1aa'
                    }}
                  />
                  {worker.is_active ? 'Active' : 'Inactive'}
                </Box>
              </Box>

              {/* Bottom Action Row: Status button, Edit, Delete, Chevron */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  pt: 1,
                  borderTop: '1px solid #f4f4f5',
                  gap: 1
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => handleOpenStatusConfirm(worker, e)}
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    px: 1.5,
                    py: 0.6,
                    minHeight: 36,
                    borderRadius: 2,
                    textTransform: 'none',
                    borderColor: '#e4e4e7',
                    color: '#71717a',
                    bgcolor: '#ffffff',
                    whiteSpace: 'nowrap',
                    touchAction: 'manipulation',
                    transition: 'all 0.12s ease-out',
                    '&:hover': {
                      bgcolor: '#f4f4f5',
                      color: '#09090b',
                      borderColor: '#d4d4d8'
                    },
                    '&:active': { transform: 'scale(0.97)' }
                  }}
                >
                  {worker.is_active ? 'Mark Inactive' : 'Mark Active'}
                </Button>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => handleOpenEdit(worker, e)}
                    aria-label={`Edit ${worker.name}`}
                    sx={{
                      width: 36,
                      height: 36,
                      color: '#71717a',
                      touchAction: 'manipulation',
                      '&:hover': { color: '#09090b', bgcolor: '#f4f4f5' }
                    }}
                  >
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>

                  <IconButton
                    size="small"
                    onClick={(e) => handleOpenDelete(worker, e)}
                    aria-label={`Delete ${worker.name}`}
                    sx={{
                      width: 36,
                      height: 36,
                      color: '#71717a',
                      touchAction: 'manipulation',
                      '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' }
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>

                  <ChevronRightIcon sx={{ color: '#d4d4d8', fontSize: 18, ml: 0.5 }} />
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Status Change Confirmation Modal */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => !statusLoading && setStatusDialogOpen(false)}
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
          {statusWorker?.is_active
            ? `Mark ${statusWorker?.name} as inactive?`
            : `Mark ${statusWorker?.name} as active?`}
        </DialogTitle>
        <DialogContent>
          {statusWorker?.is_active ? (
            <Typography variant="body2" sx={{ color: '#71717a', lineHeight: 1.5 }}>
              This worker will no longer appear when recording new attendance. Their historical records will be preserved.
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: '#71717a', lineHeight: 1.5 }}>
              This worker will become available for recording attendance and issuing advances.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setStatusDialogOpen(false)}
            variant="outlined"
            size="small"
            disabled={statusLoading}
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
            onClick={handleConfirmStatusChange}
            disabled={statusLoading}
            sx={{
              borderRadius: 2,
              bgcolor: '#09090b',
              color: '#ffffff',
              fontWeight: 700,
              minHeight: 40,
              px: 2,
              touchAction: 'manipulation',
              '&:hover': { bgcolor: '#27272a' },
              '&:active': { transform: 'scale(0.97)' }
            }}
          >
            {statusLoading
              ? 'Updating...'
              : statusWorker?.is_active
              ? 'Mark Inactive'
              : 'Mark Active'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit Worker Modal */}
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
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 1, color: '#09090b' }}>
          {editingWorker ? 'Edit Worker' : 'Add Worker'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Worker Name"
              required
              fullWidth
              autoFocus
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!formErrors.name}
              helperText={formErrors.name}
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
              label="Phone Number"
              fullWidth
              type="tel"
              placeholder="e.g. 9820112233"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              helperText="Contact info only"
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
              label="Daily Wage (₹)"
              required
              fullWidth
              type="number"
              inputProps={{ inputMode: 'decimal', min: 0 }}
              placeholder="e.g. 800"
              value={formData.daily_wage}
              onChange={(e) => setFormData({ ...formData, daily_wage: e.target.value })}
              error={!!formErrors.daily_wage}
              helperText={formErrors.daily_wage || 'Standard rate for 1 work unit'}
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
            onClick={handleSaveWorker}
            disabled={saving}
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
            {saving ? 'Saving...' : editingWorker ? 'Update Worker' : 'Save Worker'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
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
          Delete Worker?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#71717a', lineHeight: 1.5 }}>
            Permanently delete <strong>{workerToDelete?.name}</strong> and all associated attendance and advance records? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
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
            onClick={handleDeleteWorker}
            sx={{
              borderRadius: 2,
              bgcolor: '#dc2626',
              color: '#ffffff',
              fontWeight: 700,
              minHeight: 40,
              px: 2,
              touchAction: 'manipulation',
              '&:hover': { bgcolor: '#b91c1c' },
              '&:active': { transform: 'scale(0.97)' }
            }}
          >
            Delete Worker
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

export default Workers;
