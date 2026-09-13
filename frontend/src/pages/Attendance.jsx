import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import api from '../api/client';
import { formatDateIndian, getTodayInputDate } from '../utils/dateUtils';

const WORK_UNIT_VALUES = ['0', '0.5', '1', '1.5', '2'];

const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayInputDate);
  const [workers, setWorkers] = useState([]);
  const [sites, setSites] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [bulkSiteDialogOpen, setBulkSiteDialogOpen] = useState(false);
  const [bulkSiteId, setBulkSiteId] = useState('');

  const fetchData = async (dateStr) => {
    try {
      setLoading(true);
      const [sitesRes, attRes] = await Promise.all([
        api.get('/sites?active_only=true'),
        api.get(`/attendance/by-date?date=${dateStr}`)
      ]);

      setSites(sitesRes.data);
      setWorkers(attRes.data.workers);

      const initialMap = {};
      attRes.data.workers.forEach((w) => {
        initialMap[w.worker_id] = {
          work_units: w.work_units !== null && w.work_units !== undefined ? String(w.work_units) : null,
          site_id: w.site_id || (sitesRes.data.length > 0 ? sitesRes.data[0].id : null),
          notes: w.notes || ''
        };
      });
      setRecords(initialMap);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load attendance records.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const updateWorkerRecord = (workerId, field, value) => {
    setRecords((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [field]: value
      }
    }));
  };

  const handleMarkAllFullDay = () => {
    setRecords((prev) => {
      const updated = { ...prev };
      workers.forEach((w) => {
        updated[w.worker_id] = {
          ...updated[w.worker_id],
          work_units: '1',
          site_id: updated[w.worker_id]?.site_id || (sites.length > 0 ? sites[0].id : null)
        };
      });
      return updated;
    });
    setSnackbar({ open: true, message: 'Marked all workers as 1 (Full Day).', severity: 'info' });
  };

  const applyBulkSite = () => {
    if (!bulkSiteId) return;
    setRecords((prev) => {
      const updated = { ...prev };
      workers.forEach((w) => {
        updated[w.worker_id] = {
          ...updated[w.worker_id],
          site_id: parseInt(bulkSiteId)
        };
      });
      return updated;
    });
    setBulkSiteDialogOpen(false);
    setSnackbar({ open: true, message: 'Applied site to all workers.', severity: 'info' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloadRecords = [];
      Object.entries(records).forEach(([workerIdStr, data]) => {
        if (data.work_units !== null && data.work_units !== undefined) {
          const unitsFloat = parseFloat(data.work_units);
          payloadRecords.push({
            worker_id: parseInt(workerIdStr),
            site_id: unitsFloat > 0 ? data.site_id : null,
            work_units: unitsFloat,
            notes: data.notes || null
          });
        }
      });

      if (payloadRecords.length === 0) {
        setSnackbar({ open: true, message: 'No attendance marked to save.', severity: 'warning' });
        setSaving(false);
        return;
      }

      await api.post('/attendance/batch-save', {
        date: selectedDate,
        records: payloadRecords
      });

      setSnackbar({
        open: true,
        message: `Saved attendance for ${payloadRecords.length} workers.`,
        severity: 'success'
      });
      fetchData(selectedDate);
    } catch {
      setSnackbar({ open: true, message: 'Error saving attendance records.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const markedRecords = Object.values(records).filter((r) => r.work_units !== null && r.work_units !== undefined);
  const totalWorkUnits = markedRecords.reduce((sum, r) => sum + parseFloat(r.work_units || 0), 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 640, mx: 'auto', pb: 12 }}>
      {/* 1. Refined Attendance Header: Date Navigation & Bulk Actions */}
      <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff', p: 1.5 }}>
        {/* Date Row with Left/Right Arrows */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1.5 }}>
          <IconButton onClick={handlePrevDay} size="small" sx={{ color: '#475569' }}>
            <PrevIcon fontSize="small" />
          </IconButton>

          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', letterSpacing: 0.5 }}>
            {formatDateIndian(selectedDate)}
          </Typography>

          <IconButton onClick={handleNextDay} size="small" sx={{ color: '#475569' }}>
            <NextIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Action Buttons Row: All 1.0 & Set Site for All */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleMarkAllFullDay}
            startIcon={<CheckIcon fontSize="small" />}
            sx={{
              height: 36,
              borderRadius: 1.5,
              borderColor: '#cbd5e1',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.8125rem',
              bgcolor: '#ffffff',
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
            }}
          >
            All 1.0
          </Button>

          <Button
            size="small"
            variant="outlined"
            onClick={() => setBulkSiteDialogOpen(true)}
            startIcon={<LocationIcon fontSize="small" />}
            sx={{
              height: 36,
              borderRadius: 1.5,
              borderColor: '#cbd5e1',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.8125rem',
              bgcolor: '#ffffff',
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
            }}
          >
            Set Site for All
          </Button>
        </Box>
      </Card>

      {/* 2. Subheader: Daily Attendance Roster Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', px: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Daily Attendance Roster ({workers.length} Workers)
        </Typography>

        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>
            Total logged
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1.1 }}>
            {totalWorkUnits.toFixed(1)} units
          </Typography>
        </Box>
      </Box>

      {/* 3. Worker Attendance Cards List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : workers.length === 0 ? (
        <Alert severity="info" sx={{ border: '1px solid #e2e8f0' }}>No active workers found in roster.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {workers.map((worker) => {
            const currentRecord = records[worker.worker_id] || {};
            const currentUnits = currentRecord.work_units;
            const wage = parseFloat(worker.daily_wage || 0);
            const earned = currentUnits !== null ? parseFloat(currentUnits) * wage : wage;

            return (
              <Card
                key={worker.worker_id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  borderColor: '#e2e8f0',
                  bgcolor: '#ffffff',
                  p: 2
                }}
              >
                {/* Worker Name & Daily Rate / Today's Earnings */}
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  {worker.worker_name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mt: 0.25, display: 'block' }}>
                  ₹{wage.toFixed(0)}/day &nbsp;·&nbsp; <span style={{ color: '#16a34a', fontWeight: 700 }}>₹{earned.toFixed(0)}</span>
                </Typography>

                {/* Label: Work Units */}
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mt: 1.5, mb: 0.5, display: 'block' }}>
                  Work Units
                </Typography>

                {/* Segmented Control Work Unit Buttons (0, 0.5, 1, 1.5, 2) in single horizontal line */}
                <Box
                  sx={{
                    display: 'flex',
                    border: '1px solid #cbd5e1',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    bgcolor: '#ffffff',
                    width: '100%'
                  }}
                >
                  {WORK_UNIT_VALUES.map((val, idx) => {
                    const isSelected = String(currentUnits) === val;
                    return (
                      <Box
                        key={val}
                        onClick={() => updateWorkerRecord(worker.worker_id, 'work_units', val)}
                        sx={{
                          flex: 1,
                          py: 1,
                          textAlign: 'center',
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontSize: '0.875rem',
                          fontWeight: isSelected ? 800 : 600,
                          bgcolor: isSelected ? '#1e293b' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#1e293b',
                          borderRight: idx < WORK_UNIT_VALUES.length - 1 ? '1px solid #cbd5e1' : 'none',
                          transition: 'background-color 0.15s ease, color 0.15s ease',
                          '&:hover': {
                            bgcolor: isSelected ? '#0f172a' : '#f8fafc'
                          }
                        }}
                      >
                        {val}
                      </Box>
                    );
                  })}
                </Box>

                {/* Label: Work Site */}
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mt: 1.5, mb: 0.5, display: 'block' }}>
                  Work Site
                </Typography>

                {/* Work Site Selector directly below buttons */}
                <FormControl fullWidth size="small" disabled={currentUnits === '0'}>
                  <Select
                    value={currentRecord.site_id || ''}
                    onChange={(e) => updateWorkerRecord(worker.worker_id, 'site_id', e.target.value)}
                    sx={{
                      borderRadius: 1.5,
                      bgcolor: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0f172a'
                    }}
                  >
                    {sites.map((s) => (
                      <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.875rem' }}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* 4. Sticky Bottom Save Attendance Bar */}
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: { xs: 56, md: 0 }, // Sits cleanly above 56px bottom nav on mobile
          left: 0,
          right: 0,
          p: 1.5,
          bgcolor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.04)',
          zIndex: 1050,
        }}
      >
        <Box
          sx={{
            maxWidth: 640,
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {markedRecords.length} of {workers.length} Marked
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
              {totalWorkUnits.toFixed(1)} total units · {formatDateIndian(selectedDate)}
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving || loading}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon fontSize="small" />}
            sx={{
              px: 2.5,
              py: 1,
              bgcolor: '#0f172a',
              borderRadius: 2,
              fontWeight: 700,
              fontSize: '0.875rem',
              '&:hover': { bgcolor: '#1e293b' }
            }}
          >
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </Box>
      </Paper>

      {/* Set Site Modal */}
      <Dialog open={bulkSiteDialogOpen} onClose={() => setBulkSiteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>Set Site for All Workers</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Assign all workers to this site for {formatDateIndian(selectedDate)}.
          </Typography>

          <FormControl fullWidth size="small">
            <Select
              value={bulkSiteId}
              onChange={(e) => setBulkSiteId(e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>Select work site</MenuItem>
              {sites.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setBulkSiteDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={applyBulkSite} disabled={!bulkSiteId}>
            Apply to All
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

export default Attendance;
