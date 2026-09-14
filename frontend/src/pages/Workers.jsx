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
  InputAdornment,
  Switch,
  FormControlLabel
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
    } catch {
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
    } catch {
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 1200, width: '100%', mx: 'auto', pb: { xs: 4, sm: 6 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#151c27', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Workers
          </Typography>
          <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}>
            Manage workforce roster, wages, and contacts
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
            minWidth: { xs: '100%', sm: 240 },
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              bgcolor: '#ffffff'
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#555f6f', fontSize: 18 }} />
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
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#000000',
                  '& + .MuiSwitch-track': { bgcolor: '#000000' }
                }
              }}
            />
          }
          label={<Typography sx={{ color: '#555f6f', fontWeight: 600, fontSize: '0.75rem' }}>Show Inactive</Typography>}
        />
      </Box>

      {/* Workers Roster */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={30} sx={{ color: '#000000' }} />
        </Box>
      ) : filteredWorkers.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2.5, bgcolor: '#f0f3ff', color: '#151c27', border: '1px solid #e2e8f8' }}>
          No workers match your search.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {filteredWorkers.map((worker) => (
            <Card
              key={worker.id}
              elevation={0}
              onClick={() => navigate(`/workers/${worker.id}`)}
              sx={{
                borderRadius: 3,
                border: '1px solid #e2e8f8',
                bgcolor: '#ffffff',
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                opacity: worker.is_active ? 1 : 0.65,
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: '#f0f3ff', borderColor: '#dce2f3' },
                '&:active': { transform: 'scale(0.99)' }
              }}
            >
              {/* Worker Avatar, Name & Phone */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '12px',
                    bgcolor: '#f0f3ff',
                    color: '#151c27',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    flexShrink: 0
                  }}
                >
                  {worker.name ? worker.name.charAt(0).toUpperCase() : <PersonIcon />}
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#151c27', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {worker.name}
                    </Typography>
                    {!worker.is_active && (
                      <Box
                        component="span"
                        sx={{
                          bgcolor: '#e2e8f8',
                          color: '#555f6f',
                          px: 1,
                          py: 0.2,
                          borderRadius: 1,
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        Inactive
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.25 }}>
                    {worker.phone ? (
                      <Typography
                        variant="caption"
                        component="a"
                        href={`tel:${worker.phone}`}
                        onClick={(e) => e.stopPropagation()}
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
                    ) : (
                      <Typography variant="caption" sx={{ color: '#76777c', fontSize: '0.75rem' }}>
                        No phone
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Wage & Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, ml: 1 }}>
                <Box
                  sx={{
                    bgcolor: '#f0f3ff',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1.5,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#151c27'
                  }}
                >
                  ₹{parseFloat(worker.daily_wage).toFixed(0)}/day
                </Box>

                <IconButton
                  size="small"
                  onClick={(e) => handleOpenEdit(worker, e)}
                  sx={{ color: '#555f6f', '&:hover': { color: '#151c27', bgcolor: '#e7eefe' } }}
                >
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={(e) => handleOpenDelete(worker, e)}
                  sx={{ color: '#555f6f', '&:hover': { color: '#ba1a1a', bgcolor: '#ffdad6' } }}
                >
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>

                <ChevronRightIcon sx={{ color: '#bdc7d9', fontSize: 18 }} />
              </Box>
            </Card>
          ))}
        </Box>
      )}

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
            border: '1px solid #e2e8f8',
            boxShadow: '0 16px 32px rgba(0,0,0,0.08)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 1, color: '#151c27' }}>
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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Phone Number"
              fullWidth
              placeholder="e.g. 9820112233"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              helperText="Contact info only"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 2, borderColor: '#dce2f3', color: '#151c27', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveWorker}
            disabled={saving}
            sx={{ borderRadius: 2, bgcolor: '#000000', color: '#ffffff', fontWeight: 700 }}
          >
            {saving ? 'Saving...' : editingWorker ? 'Update' : 'Save'}
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
            border: '1px solid #e2e8f8'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#151c27' }}>
          Delete Worker?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#555f6f' }}>
            Permanently delete <strong>{workerToDelete?.name}</strong> and all associated attendance and advance records?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 2, borderColor: '#dce2f3', color: '#151c27' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleDeleteWorker}
            sx={{ borderRadius: 2, bgcolor: '#ba1a1a', color: '#ffffff', fontWeight: 700, '&:hover': { bgcolor: '#93000a' } }}
          >
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
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Workers;
