import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Divider
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 1200, width: '100%', mx: 'auto', pb: { xs: 4, sm: 6 } }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 0.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#09090b', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Work Sites
          </Typography>
          <Typography sx={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}>
            Manage active and archived construction locations
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
          Add Site
        </Button>
      </Box>

      {/* Sites Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={30} sx={{ color: '#ea580c' }} />
        </Box>
      ) : sites.length === 0 ? (
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
          No work sites configured. Click "Add Site" to create your first site.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {sites.map((site) => (
            <Card
              key={site.id}
              elevation={0}
              sx={{
                borderRadius: '12px',
                border: '1px solid #e4e4e7',
                bgcolor: '#ffffff',
                p: { xs: 1.75, sm: 2 },
                opacity: site.is_active ? 1 : 0.68,
                transition: 'border-color 0.14s ease-out, box-shadow 0.14s ease-out',
                '&:hover': {
                  borderColor: '#d4d4d8',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: '10px',
                      bgcolor: site.is_active ? '#fff7ed' : '#f4f4f5',
                      color: site.is_active ? '#ea580c' : '#71717a',
                      border: '1px solid',
                      borderColor: site.is_active ? '#fed7aa' : '#e4e4e7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <SitesIcon sx={{ fontSize: 22 }} />
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      title={site.name}
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
                      {site.name}
                    </Typography>
                    <Typography
                      title={site.address || 'No location specified'}
                      sx={{
                        color: '#71717a',
                        fontSize: '0.75rem',
                        mt: 0.25,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <LocationIcon sx={{ fontSize: 13, flexShrink: 0, color: '#71717a' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {site.address || 'No location specified'}
                      </span>
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    bgcolor: site.is_active ? '#f0fdf4' : '#f4f4f5',
                    color: site.is_active ? '#15803d' : '#71717a',
                    border: '1px solid',
                    borderColor: site.is_active ? '#bbf7d0' : '#e4e4e7',
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
                      bgcolor: site.is_active ? '#16a34a' : '#a1a1aa'
                    }}
                  />
                  {site.is_active ? 'Active' : 'Inactive'}
                </Box>
              </Box>

              <Divider sx={{ my: 1.25, borderColor: '#f4f4f5' }} />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleOpenEdit(site)}
                  startIcon={<EditIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    fontSize: '0.75rem',
                    px: 1.5,
                    py: 0.6,
                    minHeight: 36,
                    borderRadius: 2,
                    borderColor: '#e4e4e7',
                    color: '#09090b',
                    fontWeight: 600,
                    touchAction: 'manipulation',
                    transition: 'all 0.12s ease-out',
                    '&:hover': { bgcolor: '#f4f4f5', borderColor: '#d4d4d8' },
                    '&:active': { transform: 'scale(0.97)' }
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
                    py: 0.6,
                    minHeight: 36,
                    borderRadius: 2,
                    borderColor: '#e4e4e7',
                    color: '#71717a',
                    fontWeight: 600,
                    touchAction: 'manipulation',
                    transition: 'all 0.12s ease-out',
                    '&:hover': { bgcolor: '#f4f4f5', color: '#09090b', borderColor: '#d4d4d8' },
                    '&:active': { transform: 'scale(0.97)' }
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
                    py: 0.6,
                    minHeight: 36,
                    borderRadius: 2,
                    borderColor: '#fecaca',
                    color: '#dc2626',
                    fontWeight: 600,
                    touchAction: 'manipulation',
                    transition: 'all 0.12s ease-out',
                    '&:hover': { bgcolor: '#fef2f2', borderColor: '#fca5a5' },
                    '&:active': { transform: 'scale(0.97)' }
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
            border: '1px solid #e4e4e7',
            boxShadow: '0 16px 32px rgba(0,0,0,0.08)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#09090b' }}>
          {editingSite ? `Edit ${editingSite.name}` : 'Add Work Site'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Site Name"
              required
              fullWidth
              autoFocus
              placeholder="e.g. Bandra Residential Complex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText="Renaming preserves past attendance records."
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
              label="Address / Landmark"
              fullWidth
              placeholder="e.g. Near Metro Station"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              helperText="Optional location reference"
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
            onClick={handleSave}
            disabled={saving || !name.trim()}
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
            border: '1px solid #e4e4e7'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#09090b' }}>
          {deleteError ? 'Cannot Delete Site' : 'Delete Work Site'}
        </DialogTitle>
        <DialogContent>
          {deleteError ? (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, bgcolor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
              {deleteError}
            </Alert>
          ) : (
            <Typography variant="body2" sx={{ color: '#71717a', lineHeight: 1.5 }}>
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
          {deleteError ? (
            <Button
              variant="contained"
              size="small"
              onClick={handleDeactivateInstead}
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
              Deactivate Site Instead
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={handleDelete}
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

export default Sites;
