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
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  EditOutlined as EditIcon,
  DeleteOutlined as DeleteIcon,
  LocationCityOutlined as SitesIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon
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
    } catch (err) {
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
        // In-place update preserving site_id and all historical attendance/analytics
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
    } catch (err) {
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
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to deactivate site.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5">Work Sites</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            Manage active and archived job locations
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon fontSize="small" />}
          onClick={handleOpenAdd}
        >
          Add Site
        </Button>
      </Box>

      {/* Sites Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : sites.length === 0 ? (
        <Alert severity="info" sx={{ border: '1px solid #e2e8f0' }}>
          No work sites configured. Click "Add Site" to create your first site.
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
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.25 }}>Site Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.25 }}>Location / Landmark</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.25 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', py: 1.25 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow
                      key={site.id}
                      hover
                      sx={{
                        opacity: site.is_active ? 1 : 0.65,
                        '&:last-child td': { borderBottom: 0 }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {site.name}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {site.address || '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={site.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            bgcolor: site.is_active ? '#ecfdf5' : '#f1f5f9',
                            color: site.is_active ? '#065f46' : '#64748b',
                            border: `1px solid ${site.is_active ? '#a7f3d0' : '#e2e8f0'}`
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleOpenEdit(site)}
                            sx={{ color: 'text.secondary', minWidth: 'auto', px: 1, fontSize: '0.8rem' }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleToggleStatus(site)}
                            sx={{
                              color: site.is_active ? '#b45309' : '#059669',
                              minWidth: 'auto',
                              px: 1,
                              fontSize: '0.8rem'
                            }}
                          >
                            {site.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            color="error"
                            onClick={() => handleOpenDelete(site)}
                            sx={{ minWidth: 'auto', px: 1, fontSize: '0.8rem' }}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Mobile Card / List View */}
          <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
            {sites.map((site) => (
              <Card
                key={site.id}
                variant="outlined"
                sx={{
                  borderColor: '#e2e8f0',
                  opacity: site.is_active ? 1 : 0.65,
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                        {site.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                        {site.address || 'No location specified'}
                      </Typography>
                    </Box>
                    <Chip
                      label={site.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: site.is_active ? '#ecfdf5' : '#f1f5f9',
                        color: site.is_active ? '#065f46' : '#64748b',
                        border: `1px solid ${site.is_active ? '#a7f3d0' : '#e2e8f0'}`
                      }}
                    />
                  </Box>

                  <Divider sx={{ my: 1.25, borderColor: '#f1f5f9' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenEdit(site)}
                      sx={{ fontSize: '0.75rem', px: 1.5 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color={site.is_active ? 'inherit' : 'success'}
                      onClick={() => handleToggleStatus(site)}
                      sx={{ fontSize: '0.75rem', px: 1.5 }}
                    >
                      {site.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleOpenDelete(site)}
                      sx={{ fontSize: '0.75rem', px: 1.5 }}
                    >
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      {/* Add / Edit Site Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
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
            />

            <TextField
              label="Address / Landmark"
              fullWidth
              size="small"
              placeholder="e.g. Near Metro Station"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              helperText="Optional location reference"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving...' : editingSite ? 'Update Site' : 'Add Site'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete / Deactivate Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {deleteError ? 'Cannot Delete Site' : 'Delete Work Site'}
        </DialogTitle>
        <DialogContent>
          {deleteError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Are you sure you want to delete <strong>{siteToDelete?.name}</strong>?
              If attendance was ever recorded at this site, deletion will be blocked to maintain historical records.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          {deleteError ? (
            <Button variant="contained" color="warning" onClick={handleDeactivateInstead}>
              Deactivate Site Instead
            </Button>
          ) : (
            <Button variant="contained" color="error" onClick={handleDelete}>
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
        <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Sites;
