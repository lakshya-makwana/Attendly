import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  MenuItem,
  Select,
  FormControl,
  IconButton
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  CurrencyRupee as CurrencyRupeeIcon,
  AccountBalanceWallet as WalletIcon,
  Paid as PaidIcon,
  People as PeopleIcon,
  FactCheck as FactCheckIcon,
  LocationOn as LocationOnIcon,
  LocationCity as SitesIcon,
  PersonAdd as PersonAddIcon,
  ChevronRight as ChevronRightIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';
import api from '../api/client';
import { formatDateIndian } from '../utils/dateUtils';

const Dashboard = () => {
  const navigate = useNavigate();
  const currentDate = new Date();

  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  const [metrics, setMetrics] = useState(null);
  const [siteAnalytics, setSiteAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async (year, month) => {
    try {
      setLoading(true);
      setError('');
      const [dashRes, analyticsRes] = await Promise.all([
        api.get('/dashboard'),
        api.get(`/sites/analytics?year=${year}&month=${month}`).catch(() => ({ data: null }))
      ]);
      setMetrics(dashRes.data);
      setSiteAnalytics(analyticsRes.data);
    } catch (err) {
      setError('Failed to load operations dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  const todayIndianDate = metrics?.today ? formatDateIndian(metrics.today) : '';
  const monthWorkUnits = siteAnalytics?.total_work_units !== undefined
    ? parseFloat(siteAnalytics.total_work_units).toFixed(1)
    : parseFloat(metrics?.today_total_work_units || 0).toFixed(1);

  // Month financial values
  const grossLabour = metrics?.current_month_gross || 0;
  const advances = metrics?.current_month_advances || 0;
  const netPayable = metrics?.current_month_net || 0;

  // Active sites list from analytics
  const activeSitesList = siteAnalytics?.sites?.filter(s => s.is_active || s.total_work_units > 0) || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 640, mx: 'auto' }}>
      {/* 1. Header & Context Month Selector */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Overview
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FormControl variant="standard" sx={{ minWidth: 140 }}>
            <Select
              disableUnderline
              value={`${selectedYear}-${selectedMonth}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                setSelectedYear(y);
                setSelectedMonth(m);
              }}
              IconComponent={ArrowDownIcon}
              sx={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#475569',
                '& .MuiSelect-select': { py: 0, pr: '20px !important' }
              }}
            >
              {[
                { y: 2026, m: 9 },
                { y: 2026, m: 8 },
                { y: 2026, m: 7 },
                { y: 2026, m: 6 },
                { y: 2026, m: 5 },
                { y: 2026, m: 4 },
                { y: 2026, m: 3 },
                { y: 2026, m: 2 },
                { y: 2026, m: 1 }
              ].map(({ y, m }) => (
                <MenuItem key={`${y}-${m}`} value={`${y}-${m}`} sx={{ fontSize: '0.875rem' }}>
                  {monthNames[m - 1]} {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {/* 2. Financial Summary 2x2 Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
        {/* Tile 1: Total Work Units */}
        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff' }}>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.75rem' }}>
              Total Work Units
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.75 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                {monthWorkUnits}
              </Typography>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  bgcolor: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <BarChartIcon sx={{ fontSize: 20 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Tile 2: Gross Labour */}
        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff' }}>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.75rem' }}>
              Gross Labour
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.75 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                {formatCurrency(grossLabour)}
              </Typography>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  bgcolor: '#f0f9ff',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CurrencyRupeeIcon sx={{ fontSize: 20 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Tile 3: Advances */}
        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff' }}>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.75rem' }}>
              Advances
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.75 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#d97706', fontFamily: 'monospace' }}>
                {formatCurrency(advances)}
              </Typography>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  bgcolor: '#fffbeb',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <PaidIcon sx={{ fontSize: 20 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Tile 4: Net Payable */}
        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff' }}>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.75rem' }}>
              Net Payable
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.75 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>
                {formatCurrency(netPayable)}
              </Typography>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  bgcolor: '#ecfdf5',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <WalletIcon sx={{ fontSize: 20 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 3. Today's Activity Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Today's Activity
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontFamily: 'monospace' }}>
            {todayIndianDate}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
          {/* Box 1: Workers */}
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {metrics?.today_marked_workers ?? 0}
                </Typography>
                <PeopleIcon sx={{ color: '#0284c7', fontSize: 18 }} />
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mt: 0.5, display: 'block' }}>
                Workers
              </Typography>
            </CardContent>
          </Card>

          {/* Box 2: Units */}
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {parseFloat(metrics?.today_total_work_units || 0).toFixed(1)}
                </Typography>
                <FactCheckIcon sx={{ color: '#0f172a', fontSize: 18 }} />
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mt: 0.5, display: 'block' }}>
                Units
              </Typography>
            </CardContent>
          </Card>

          {/* Box 3: Active Site */}
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {metrics?.active_sites ?? 0}
                </Typography>
                <LocationOnIcon sx={{ color: '#0284c7', fontSize: 18 }} />
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mt: 0.5, display: 'block' }}>
                Active Site
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* 4. Site Overview Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Site Overview
          </Typography>
          <Typography
            variant="caption"
            onClick={() => navigate('/analytics')}
            sx={{ color: '#0284c7', fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          >
            View All
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff', overflow: 'hidden' }}>
          {activeSitesList.length === 0 ? (
            <Box sx={{ p: 2.5, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                No active work sites configured.
              </Typography>
            </Box>
          ) : (
            activeSitesList.slice(0, 4).map((site, index) => (
              <Box key={site.site_id}>
                {index > 0 && <Divider sx={{ borderColor: '#f1f5f9' }} />}
                <Box
                  onClick={() => navigate(`/analytics?year=${selectedYear}&month=${selectedMonth}`)}
                  sx={{
                    p: 1.75,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f8fafc' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: '#f1f5f9',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <SitesIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                        {site.site_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                        {site.unique_worker_count} workers · {parseFloat(site.total_work_units).toFixed(1)} units
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>
                      {formatCurrency(site.total_labour_expense)}
                    </Typography>
                    <ChevronRightIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                  </Box>
                </Box>
              </Box>
            ))
          )}
        </Card>
      </Box>

      {/* 5. Quick Actions Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
          Quick Actions
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          {/* Action 1: Mark Attendance */}
          <Card
            variant="outlined"
            onClick={() => navigate('/attendance')}
            sx={{
              borderRadius: 2,
              borderColor: '#e2e8f0',
              bgcolor: '#ffffff',
              cursor: 'pointer',
              textAlign: 'center',
              p: 1.25,
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 0.75
              }}
            >
              <FactCheckIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2, display: 'block', fontSize: '0.72rem' }}>
              Mark Attendance
            </Typography>
          </Card>

          {/* Action 2: Add Worker */}
          <Card
            variant="outlined"
            onClick={() => navigate('/workers')}
            sx={{
              borderRadius: 2,
              borderColor: '#e2e8f0',
              bgcolor: '#ffffff',
              cursor: 'pointer',
              textAlign: 'center',
              p: 1.25,
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#f5f3ff',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 0.75
              }}
            >
              <PersonAddIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2, display: 'block', fontSize: '0.72rem' }}>
              Add Worker
            </Typography>
          </Card>

          {/* Action 3: Give Advance */}
          <Card
            variant="outlined"
            onClick={() => navigate('/advances')}
            sx={{
              borderRadius: 2,
              borderColor: '#e2e8f0',
              bgcolor: '#ffffff',
              cursor: 'pointer',
              textAlign: 'center',
              p: 1.25,
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#fff7ed',
                color: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 0.75
              }}
            >
              <WalletIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2, display: 'block', fontSize: '0.72rem' }}>
              Give Advance
            </Typography>
          </Card>

          {/* Action 4: Manage Sites */}
          <Card
            variant="outlined"
            onClick={() => navigate('/sites')}
            sx={{
              borderRadius: 2,
              borderColor: '#e2e8f0',
              bgcolor: '#ffffff',
              cursor: 'pointer',
              textAlign: 'center',
              p: 1.25,
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 0.75
              }}
            >
              <SitesIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2, display: 'block', fontSize: '0.72rem' }}>
              Manage Sites
            </Typography>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
