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
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  InputAdornment,
  Switch,
  FormControlLabel,
  Divider,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  PhoneOutlined as PhoneIcon,
  EditOutlined as EditIcon,
  DeleteOutlined as DeleteIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import api from '../api/client';

const Workers = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Add/Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', daily_wage: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workers');
      setWorkers(res.data);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to fetch workers.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

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
      fetchWorkers();
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
      fetchWorkers();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete worker.', severity: 'error' });
    }
  };

  const filteredWorkers = workers.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.phone && w.phone.includes(searchTerm));
    if (showInactive) return matchesSearch;
    return matchesSearch && w.is_active;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5">Workers</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            Manage workforce daily rates and contact details
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon fontSize="small" />}
          onClick={handleOpenAdd}
          sx={{ fontSize: '0.8125rem', px: 2 }}
        >
          Add Worker
        </Button>
      </Box>

      {/* Filter and Search Bar */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1, minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
          }
          label={<Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Show Inactive</Typography>}
        />
      </Box>

      {/* Workers Roster */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress size={28} />
        </Box>
      ) : filteredWorkers.length === 0 ? (
        <Alert severity="info">No workers match your search.</Alert>
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          {filteredWorkers.map((worker, index) => (
            <Box key={worker.id}>
              {index > 0 && <Divider />}
              <Box
                onClick={() => navigate(`/workers/${worker.id}`)}
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  opacity: worker.is_active ? 1 : 0.65,
                  '&:hover': { bgcolor: '#f8fafc' }
                }}
              >
                {/* Name & Phone */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {worker.name}
                    </Typography>
                    {!worker.is_active && (
                      <Chip label="Inactive" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.25 }}>
                    {worker.phone ? (
                      <Typography
                        variant="caption"
                        component="a"
                        href={`tel:${worker.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ color: 'text.secondary', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.3 }}
                      >
                        <PhoneIcon sx={{ fontSize: '0.8rem' }} /> {worker.phone}
                      </Typography>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        No phone
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Wage & Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    ₹{parseFloat(worker.daily_wage).toFixed(0)}/day
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={(e) => handleOpenEdit(worker, e)}
                    sx={{ color: '#64748b' }}
                  >
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>

                  <IconButton
                    size="small"
                    onClick={(e) => handleOpenDelete(worker, e)}
                    sx={{ color: '#64748b', '&:hover': { color: '#b91c1c' } }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>

                  <ChevronRightIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                </Box>
              </Box>
            </Box>
          ))}
        </Card>
      )}

      {/* Add / Edit Worker Modal */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
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
            />

            <TextField
              label="Phone Number"
              fullWidth
              placeholder="e.g. 9820112233"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              helperText="Contact info only"
            />

            <TextField
              label="Daily Wage (₹)"
              required
              fullWidth
              type="number"
              placeholder="e.g. 800"
              value={formData.daily_wage}
              onChange={(e) => setFormData({ ...formData, daily_wage: e.target.value })}
              error={!!formErrors.daily_wage}
              helperText={formErrors.daily_wage || 'Standard rate for 1 work unit'}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} size="small" variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveWorker}
            disabled={saving}
          >
            {saving ? 'Saving...' : editingWorker ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Delete Worker?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Permanently delete <strong>{workerToDelete?.name}</strong> and all associated attendance and advance records?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} size="small" variant="outlined">Cancel</Button>
          <Button variant="contained" color="error" size="small" onClick={handleDeleteWorker}>
            Delete
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

export default Workers;
