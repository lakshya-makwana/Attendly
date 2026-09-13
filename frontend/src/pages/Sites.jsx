import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Add as AddIcon,
  LocationCity as SitesIcon,
  LocationOn as LocationIcon,
  EditOutlined as EditIcon,
  DeleteOutlined as DeleteIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon
} from '@mui/icons-material';
import api from '../api/client';

const Sites = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchSites = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sites');
      setSites(res.data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load sites.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleOpenAdd = () => {
    setEditingSite(null);
    setName('');
    setAddress('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (site) => {
    setEditingSite(site);
    setName(site.name);
    setAddress(site.address || '');
    setDialogOpen(true);
  };

  const handleOpenDelete = (site) => {
    setSiteToDelete(site);
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingSite) {
        await api.put(`/sites/${editingSite.id}`, {
          name: name.trim(),
          address: address.trim() || null
        });
        setSnackbar({ open: true, message: `Work site '${name.trim()}' updated successfully.`, severity: 'success' });
      } else {
        await api.post('/sites', {
          name: name.trim(),
          address: address.trim() || null
        });
        setSnackbar({ open: true, message: 'New work site added successfully.', severity: 'success' });
      }
      setDialogOpen(false);
      fetchSites();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Failed to save site.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (site) => {
    try {
      await api.patch(`/sites/${site.id}/toggle-status`);
      setSnackbar({
        open: true,
        message: `${site.name} is now ${site.is_active ? 'Inactive' : 'Active'}`,
        severity: 'info'
      });
      fetchSites();
    } catch {
      setSnackbar({ open: true, message: 'Failed to change site status.', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!siteToDelete) return;
    setDeleteError('');
    try {
      await api.delete(`/sites/${siteToDelete.id}`);
      setSnackbar({ open: true, message: `Site '${siteToDelete.name}' deleted successfully.`, severity: 'success' });
      setDeleteDialogOpen(false);
      fetchSites();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Cannot delete site with existing attendance. Please deactivate instead.';
      setDeleteError(msg);
    }
  };

  const handleDeactivateInstead = async () => {
    if (!siteToDelete) return;
    try {
      if (siteToDelete.is_active) {
        await api.patch(`/sites/${siteToDelete.id}/toggle-status`);
      }
      setSnackbar({ open: true, message: `Site '${siteToDelete.name}' deactivated successfully.`, severity: 'info' });
      setDeleteDialogOpen(false);
      fetchSites();
    } catch {
      setSnackbar({ open: true, message: 'Failed to deactivate site.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 640, mx: 'auto', pb: 8 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#151c27', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Work Sites
          </Typography>
          <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}>
            Manage active and archived construction locations
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
          Add Site
        </Button>
      </Box>

      {/* Sites Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={30} sx={{ color: '#000000' }} />
        </Box>
      ) : sites.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2.5, bgcolor: '#f0f3ff', color: '#151c27', border: '1px solid #e2e8f8' }}>
          No work sites configured. Click "Add Site" to create your first site.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          {sites.map((site) => (
            <Card
              key={site.id}
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
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                      flexShrink: 0
                    }}
                  >
                    <SitesIcon sx={{ fontSize: 22 }} />
                  </Box>

                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#151c27', lineHeight: 1.2 }}>
                      {site.name}
                    </Typography>
                    <Typography sx={{ color: '#555f6f', fontSize: '0.75rem', mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationIcon sx={{ fontSize: 13 }} />
                      {site.address || 'No location specified'}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    px: 1.5,
                    py: 0.4,
                    borderRadius: 1.5,
                    bgcolor: site.is_active ? '#f0f3ff' : '#e2e8f8',
                    color: site.is_active ? '#151c27' : '#555f6f'
                  }}
                >
                  {site.is_active ? 'Active' : 'Inactive'}
                </Box>
              </Box>

              <Divider sx={{ my: 1.25, borderColor: '#f0f3ff' }} />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleOpenEdit(site)}
                  startIcon={<EditIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    fontSize: '0.75rem',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    borderColor: '#dce2f3',
                    color: '#151c27',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#f0f3ff' }
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleToggleStatus(site)}
                  startIcon={site.is_active ? <ToggleOffIcon sx={{ fontSize: 16 }} /> : <ToggleOnIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    fontSize: '0.75rem',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    borderColor: '#dce2f3',
                    color: '#555f6f',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#f0f3ff', color: '#151c27' }
                  }}
                >
                  {site.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => handleOpenDelete(site)}
                  startIcon={<DeleteIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    fontSize: '0.75rem',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    borderColor: '#ffdad6',
                    color: '#ba1a1a',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#ffdad6' }
                  }}
                >
                  Delete
                </Button>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Add / Edit Site Dialog */}
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
          {editingSite ? `Edit ${editingSite.name}` : 'Add Work Site'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Site Name"
              required
              fullWidth
              autoFocus
              size="small"
              placeholder="e.g. Bandra Residential Complex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText="Renaming preserves past attendance records."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              label="Address / Landmark"
              fullWidth
              size="small"
              placeholder="e.g. Near Metro Station"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              helperText="Optional location reference"
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
            onClick={handleSave}
            disabled={saving || !name.trim()}
            sx={{ borderRadius: 2, bgcolor: '#000000', color: '#ffffff', fontWeight: 700 }}
          >
            {saving ? 'Saving...' : editingSite ? 'Update Site' : 'Add Site'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete / Deactivate Confirmation Dialog */}
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
          {deleteError ? 'Cannot Delete Site' : 'Delete Work Site'}
        </DialogTitle>
        <DialogContent>
          {deleteError ? (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              {deleteError}
            </Alert>
          ) : (
            <Typography variant="body2" sx={{ color: '#555f6f' }}>
              Are you sure you want to delete <strong>{siteToDelete?.name}</strong>?
              If attendance was ever recorded at this site, deletion will be blocked to maintain historical records.
            </Typography>
          )}
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
          {deleteError ? (
            <Button
              variant="contained"
              size="small"
              onClick={handleDeactivateInstead}
              sx={{ borderRadius: 2, bgcolor: '#000000', color: '#ffffff', fontWeight: 700 }}
            >
              Deactivate Site Instead
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={handleDelete}
              sx={{ borderRadius: 2, bgcolor: '#ba1a1a', color: '#ffffff', fontWeight: 700, '&:hover': { bgcolor: '#93000a' } }}
            >
              Delete Site
            </Button>
          )}
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

export default Sites;
