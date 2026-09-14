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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  CheckCircle as CheckCircleIcon,
  Check as CheckIcon,
  LocationOn as LocationIcon,
  DoneAll as DoneAllIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon
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
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('all');

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

  const fullDayCount = markedRecords.filter((r) => parseFloat(r.work_units) >= 1).length;
  const halfDayCount = markedRecords.filter((r) => parseFloat(r.work_units) > 0 && parseFloat(r.work_units) < 1).length;
  const absentCount = markedRecords.filter((r) => parseFloat(r.work_units) === 0).length;
  const percentDone = workers.length > 0 ? Math.round((markedRecords.length / workers.length) * 100) : 0;

  // Filter workers by selected site chip
  const filteredWorkers = workers.filter((w) => {
    if (selectedSiteFilter === 'all') return true;
    const rec = records[w.worker_id];
    return rec?.site_id === selectedSiteFilter;
  });

  const isToday = selectedDate === getTodayInputDate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: { xs: 600, md: 800 }, width: '100%', mx: 'auto', pb: { xs: 'calc(140px + env(safe-area-inset-bottom, 0px))', md: 10 } }}>
      {/* 1. Top Operational Bar: Date Capsule & Live Sync State */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            bgcolor: '#f0f3ff',
            px: 1.5,
            py: 0.75,
            borderRadius: 9999,
            border: '1px solid #e2e8f8'
          }}
        >
          <IconButton
            onClick={handlePrevDay}
            size="small"
            sx={{
              width: 28,
              height: 28,
              p: 0,
              color: '#555f6f',
              '&:hover': { color: '#151c27', bgcolor: '#e7eefe' },
              '&:active': { transform: 'scale(0.95)' }
            }}
          >
            <PrevIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5 }}>
            <CalendarIcon sx={{ fontSize: 16, color: '#000000' }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#151c27' }}>
              {formatDateIndian(selectedDate)}
            </Typography>
            {isToday && (
              <Box
                component="span"
                sx={{
                  bgcolor: '#d6e0f3',
                  color: '#596373',
                  px: 1.25,
                  py: 0.25,
                  borderRadius: 9999,
                  fontSize: '0.6875rem',
                  fontWeight: 700
                }}
              >
                Today
              </Box>
            )}
          </Box>

          <IconButton
            onClick={handleNextDay}
            size="small"
            sx={{
              width: 28,
              height: 28,
              p: 0,
              color: '#555f6f',
              '&:hover': { color: '#151c27', bgcolor: '#e7eefe' },
              '&:active': { transform: 'scale(0.95)' }
            }}
          >
            <NextIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Live Sync Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: '#000000',
              boxShadow: '0 0 0 3px rgba(0,0,0,0.1)'
            }}
          />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#555f6f' }}>
            Live Sync
          </Typography>
        </Box>
      </Box>

      {/* 2. Site Filter Chips (Horizontal Scroll) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          overflowX: 'auto',
          py: 0.5,
          '::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        <Box
          onClick={() => setSelectedSiteFilter('all')}
          sx={{
            flexShrink: 0,
            cursor: 'pointer',
            bgcolor: selectedSiteFilter === 'all' ? '#000000' : '#f0f3ff',
            color: selectedSiteFilter === 'all' ? '#ffffff' : '#151c27',
            px: 2,
            py: 0.85,
            borderRadius: 9999,
            fontSize: '0.75rem',
            fontWeight: 700,
            transition: 'all 0.15s ease',
            border: '1px solid',
            borderColor: selectedSiteFilter === 'all' ? '#000000' : '#e2e8f8',
            '&:active': { transform: 'scale(0.96)' }
          }}
        >
          All Sites
        </Box>

        {sites.map((site) => {
          const isSelected = selectedSiteFilter === site.id;
          const siteWorkerCount = workers.filter((w) => records[w.worker_id]?.site_id === site.id).length;

          return (
            <Box
              key={site.id}
              onClick={() => setSelectedSiteFilter(site.id)}
              sx={{
                flexShrink: 0,
                cursor: 'pointer',
                bgcolor: isSelected ? '#000000' : '#f0f3ff',
                color: isSelected ? '#ffffff' : '#151c27',
                px: 2,
                py: 0.85,
                borderRadius: 9999,
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
                border: '1px solid',
                borderColor: isSelected ? '#000000' : '#e2e8f8',
                '&:hover': { bgcolor: isSelected ? '#1f2937' : '#e7eefe' },
                '&:active': { transform: 'scale(0.96)' }
              }}
            >
              {site.name}
              <Box
                component="span"
                sx={{
                  ml: 0.75,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: isSelected ? '#dce2f3' : '#555f6f'
                }}
              >
                {siteWorkerCount}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* 3. Roster Overview Metrics Card */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #e2e8f8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          bgcolor: '#ffffff',
          p: 2.25
        }}
      >
        {/* Top Metric Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#151c27', lineHeight: 1 }}>
              {markedRecords.length}
            </Typography>
            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem', color: '#555f6f' }}>
              / {workers.length} Marked · {totalWorkUnits.toFixed(1)} units
            </Typography>
          </Box>

          <Box
            sx={{
              bgcolor: '#f0f3ff',
              color: '#151c27',
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            {percentDone}% Done
          </Box>
        </Box>

        {/* Segmented Micro Progress Bar */}
        <Box
          sx={{
            width: '100%',
            height: 6,
            bgcolor: '#e2e8f8',
            borderRadius: 9999,
            overflow: 'hidden',
            display: 'flex',
            my: 1.5
          }}
        >
          <Box
            sx={{
              height: '100%',
              bgcolor: '#000000',
              width: workers.length > 0 ? `${(fullDayCount / workers.length) * 100}%` : '0%',
              transition: 'width 0.4s ease'
            }}
          />
          <Box
            sx={{
              height: '100%',
              bgcolor: '#555f6f',
              width: workers.length > 0 ? `${(halfDayCount / workers.length) * 100}%` : '0%',
              transition: 'width 0.4s ease'
            }}
          />
          <Box
            sx={{
              height: '100%',
              bgcolor: '#dce2f3',
              width: workers.length > 0 ? `${(absentCount / workers.length) * 100}%` : '0%',
              transition: 'width 0.4s ease'
            }}
          />
        </Box>

        {/* 3 Quick Breakdown Metrics Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, pt: 0.5 }}>
          <Box sx={{ bgcolor: '#f0f3ff', p: 1.25, borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#555f6f' }}>
              Full Day (1.0)
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#151c27', mt: 0.25 }}>
              {fullDayCount}
            </Typography>
          </Box>

          <Box sx={{ bgcolor: '#f0f3ff', p: 1.25, borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#555f6f' }}>
              Half Day (0.5)
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#151c27', mt: 0.25 }}>
              {halfDayCount}
            </Typography>
          </Box>

          <Box sx={{ bgcolor: '#f0f3ff', p: 1.25, borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#555f6f' }}>
              Absent (0)
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#151c27', mt: 0.25 }}>
              {absentCount}
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* 4. Section Label & Fast Action */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, pt: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#555f6f' }}>
            Roster Units
          </Typography>
          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#bdc7d9' }} />
          <Typography sx={{ fontSize: '0.75rem', color: '#555f6f', fontWeight: 500 }}>
            {filteredWorkers.length} visible
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            size="small"
            onClick={handleMarkAllFullDay}
            startIcon={<DoneAllIcon sx={{ fontSize: 16 }} />}
            sx={{
              color: '#000000',
              fontWeight: 700,
              fontSize: '0.75rem',
              p: 0,
              minWidth: 0,
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
            }}
          >
            All 1.0
          </Button>

          <Button
            size="small"
            onClick={() => setBulkSiteDialogOpen(true)}
            startIcon={<LocationIcon sx={{ fontSize: 15 }} />}
            sx={{
              color: '#555f6f',
              fontWeight: 600,
              fontSize: '0.75rem',
              p: 0,
              minWidth: 0,
              '&:hover': { color: '#000000', bgcolor: 'transparent' }
            }}
          >
            Bulk Site
          </Button>
        </Box>
      </Box>

      {/* 5. Worker Attendance Cards Stream */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={30} sx={{ color: '#000000' }} />
        </Box>
      ) : filteredWorkers.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2, bgcolor: '#f0f3ff', color: '#151c27', border: '1px solid #e2e8f8' }}>
          No workers found for the selected filter.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          {filteredWorkers.map((worker) => {
            const currentRecord = records[worker.worker_id] || {};
            const currentUnits = currentRecord.work_units;
            const wage = parseFloat(worker.daily_wage || 0);
            const earned = currentUnits !== null ? parseFloat(currentUnits) * wage : wage;
            const currentSite = sites.find((s) => s.id === currentRecord.site_id);
            const isUnmarked = currentUnits === null || currentUnits === undefined;

            return (
              <Card
                key={worker.worker_id}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid #e2e8f8',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                  bgcolor: isUnmarked ? '#f0f3ff' : '#ffffff',
                  p: 2.25,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.75,
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Worker Top Info */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {/* Worker Avatar */}
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '12px',
                        bgcolor: isUnmarked ? '#e2e8f8' : '#f0f3ff',
                        color: '#151c27',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        flexShrink: 0
                      }}
                    >
                      {worker.worker_name ? worker.worker_name.charAt(0).toUpperCase() : <PersonIcon />}
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#151c27', lineHeight: 1.2 }}>
                        {worker.worker_name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#555f6f', mt: 0.25 }}>
                        {worker.role || 'Worker'} {currentSite ? `• ${currentSite.name}` : ''}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Status Badge */}
                  <Box
                    sx={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1.5,
                      bgcolor:
                        isUnmarked
                          ? '#e2e8f8'
                          : parseFloat(currentUnits) >= 1
                          ? '#000000'
                          : parseFloat(currentUnits) > 0
                          ? '#d6e0f3'
                          : '#ffdad6',
                      color:
                        isUnmarked
                          ? '#555f6f'
                          : parseFloat(currentUnits) >= 1
                          ? '#ffffff'
                          : parseFloat(currentUnits) > 0
                          ? '#596373'
                          : '#ba1a1a'
                    }}
                  >
                    {isUnmarked ? 'Pending' : `${currentUnits} Unit`}
                  </Box>
                </Box>

                {/* Tri-state / Multi-state Segmented Unit Toggle */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${WORK_UNIT_VALUES.length}, 1fr)`,
                    gap: 0.5,
                    bgcolor: isUnmarked ? '#ffffff' : '#f0f3ff',
                    p: 0.75,
                    borderRadius: 2.5,
                    border: '1px solid #e2e8f8'
                  }}
                >
                  {WORK_UNIT_VALUES.map((val) => {
                    const isSelected = String(currentUnits) === val;
                    return (
                      <Box
                        key={val}
                        onClick={() => updateWorkerRecord(worker.worker_id, 'work_units', val)}
                        sx={{
                          py: 1,
                          borderRadius: 2,
                          textAlign: 'center',
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontSize: '0.8125rem',
                          fontWeight: isSelected ? 700 : 500,
                          bgcolor: isSelected ? '#000000' : 'transparent',
                          color: isSelected ? '#ffffff' : '#555f6f',
                          boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                          transition: 'all 0.12s ease',
                          '&:hover': {
                            bgcolor: isSelected ? '#000000' : '#e7eefe',
                            color: isSelected ? '#ffffff' : '#151c27'
                          },
                          '&:active': { transform: 'scale(0.95)' }
                        }}
                      >
                        {isSelected && <CheckIcon sx={{ fontSize: 14 }} />}
                        {val}
                      </Box>
                    );
                  })}
                </Box>

                {/* Worker Site & Rate Row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 160 }}>
                    <FormControl size="small" fullWidth disabled={currentUnits === '0'}>
                      <Select
                        value={currentRecord.site_id || ''}
                        onChange={(e) => updateWorkerRecord(worker.worker_id, 'site_id', e.target.value)}
                        sx={{
                          borderRadius: 2,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          bgcolor: '#ffffff',
                          '& .MuiSelect-select': { py: 0.75, px: 1.25 }
                        }}
                      >
                        {sites.map((s) => (
                          <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.8125rem' }}>
                            {s.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#151c27' }}>
                      ₹{wage.toFixed(0)}/day
                    </Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: '#555f6f' }}>
                      Earned: <span style={{ fontWeight: 700, color: '#151c27' }}>₹{earned.toFixed(0)}</span>
                    </Typography>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* 6. Floating Sticky Action Button (Stitch Positioned above bottom nav) */}
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 'calc(60px + env(safe-area-inset-bottom, 0px) + 12px)', md: 24 },
          left: 0,
          right: 0,
          px: 2.5,
          zIndex: 900,
          maxWidth: 500,
          mx: 'auto',
          pointerEvents: 'none'
        }}
      >
        <Box
          sx={{
            pointerEvents: 'auto',
            bgcolor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            p: 1,
            borderRadius: 3,
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            border: '1px solid #e2e8f8'
          }}
        >
          <Button
            fullWidth
            onClick={handleSave}
            disabled={saving || loading}
            sx={{
              bgcolor: '#000000',
              color: '#ffffff',
              py: 1.5,
              px: 2.5,
              borderRadius: 2.5,
              fontWeight: 700,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: '#1f2937' },
              '&:active': { transform: 'scale(0.98)' },
              '&.Mui-disabled': { bgcolor: '#e2e8f8', color: '#76777c' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              {saving ? (
                <CircularProgress size={18} sx={{ color: '#ffffff' }} />
              ) : (
                <CheckCircleIcon sx={{ fontSize: 20, color: '#ffffff' }} />
              )}
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#ffffff' }}>
                {saving ? 'Saving...' : 'Save Attendance'}
              </Typography>
            </Box>

            <Box
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                px: 1.5,
                py: 0.35,
                borderRadius: 9999,
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {markedRecords.length} Marked
            </Box>
          </Button>
        </Box>
      </Box>

      {/* Set Site Modal */}
      <Dialog
        open={bulkSiteDialogOpen}
        onClose={() => setBulkSiteDialogOpen(false)}
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
          Set Site for All Workers
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#555f6f', mb: 2 }}>
            Assign all workers to this site for {formatDateIndian(selectedDate)}.
          </Typography>

          <FormControl fullWidth size="small">
            <Select
              value={bulkSiteId}
              onChange={(e) => setBulkSiteId(e.target.value)}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="" disabled>Select work site</MenuItem>
              {sites.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setBulkSiteDialogOpen(false)}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 2, borderColor: '#dce2f3', color: '#151c27', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={applyBulkSite}
            disabled={!bulkSiteId}
            size="small"
            sx={{ borderRadius: 2, bgcolor: '#000000', color: '#ffffff', fontWeight: 600 }}
          >
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
        <Alert
          severity={snackbar.severity}
          sx={{
            width: '100%',
            fontWeight: 600,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Attendance;
