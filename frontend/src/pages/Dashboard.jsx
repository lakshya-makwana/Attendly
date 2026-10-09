import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CircularProgress,
  Alert,
  Divider,
  MenuItem,
  Select,
  FormControl
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
    } catch {
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
        <CircularProgress size={32} sx={{ color: '#09090b' }} />
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 1200, width: '100%', mx: 'auto', pb: { xs: 4, sm: 6 } }}>
      {/* 1. Header & Context Month Selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5, gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.5rem' }, color: '#09090b', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Overview
          </Typography>
          <Typography sx={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 500, mt: 0.25 }}>
            Operations & Financial Snapshot
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            bgcolor: '#ffffff',
            px: 1.5,
            py: 0.5,
            borderRadius: 9999,
            border: '1px solid #e4e4e7',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <FormControl variant="standard">
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
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#09090b',
                '& .MuiSelect-select': { py: 0.25, pr: '22px !important' },
                '& .MuiSelect-icon': { color: '#71717a' }
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
                <MenuItem key={`${y}-${m}`} value={`${y}-${m}`} sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#09090b' }}>
                  {monthNames[m - 1]} {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2, bgcolor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '0.8125rem' }}>
          {error}
        </Alert>
      )}

      {/* 2. Financial Summary 4-Column Grid on Desktop / 2x2 on Mobile */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 1.5, sm: 2 } }}>
        {/* Tile 1: Total Work Units */}
        <Card
          elevation={0}
          sx={{
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            bgcolor: '#ffffff',
            p: { xs: 1.75, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography sx={{ color: '#71717a', fontWeight: 600, fontSize: '0.75rem' }}>
              Total Work Units
            </Typography>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: '#f4f4f5',
                color: '#09090b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BarChartIcon sx={{ fontSize: 18 }} />
            </Box>
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#09090b', mt: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {monthWorkUnits}
          </Typography>
        </Card>

        {/* Tile 2: Gross Labour */}
        <Card
          elevation={0}
          sx={{
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            bgcolor: '#ffffff',
            p: { xs: 1.75, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography sx={{ color: '#71717a', fontWeight: 600, fontSize: '0.75rem' }}>
              Gross Labour
            </Typography>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: '#f4f4f5',
                color: '#09090b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CurrencyRupeeIcon sx={{ fontSize: 18 }} />
            </Box>
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#09090b', mt: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {formatCurrency(grossLabour)}
          </Typography>
        </Card>

        {/* Tile 3: Advances */}
        <Card
          elevation={0}
          sx={{
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            bgcolor: '#ffffff',
            p: { xs: 1.75, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography sx={{ color: '#71717a', fontWeight: 600, fontSize: '0.75rem' }}>
              Advances Deducted
            </Typography>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: '#f4f4f5',
                color: '#09090b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PaidIcon sx={{ fontSize: 18 }} />
            </Box>
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#09090b', mt: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {formatCurrency(advances)}
          </Typography>
        </Card>

        {/* Tile 4: Net Payable */}
        <Card
          elevation={0}
          sx={{
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
            bgcolor: '#ffffff',
            p: { xs: 1.75, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography sx={{ color: '#71717a', fontWeight: 600, fontSize: '0.75rem' }}>
              Net Payable
            </Typography>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: '#fff7ed',
                color: '#ea580c',
                border: '1px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <WalletIcon sx={{ fontSize: 18 }} />
            </Box>
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#09090b', mt: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {formatCurrency(netPayable)}
          </Typography>
        </Card>
      </Box>

      {/* 3. Operations & Sites Section (Stacked on Mobile, 2-Columns on Desktop) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1.1fr' },
          gap: { xs: 2.5, md: 3 },
          alignItems: 'start'
        }}
      >
        {/* Left Column: Today's Activity & Quick Actions */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Today's Activity */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ea580c' }} />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#71717a' }}>
                  Today's Activity
                </Typography>
              </Box>
              <Typography sx={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {todayIndianDate}
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25 }}>
              {/* Box 1: Workers */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  bgcolor: '#ffffff',
                  p: 1.5
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#09090b', fontVariantNumeric: 'tabular-nums' }}>
                    {metrics?.today_marked_workers ?? 0}
                  </Typography>
                  <PeopleIcon sx={{ color: '#71717a', fontSize: 18 }} />
                </Box>
                <Typography sx={{ color: '#71717a', fontWeight: 600, mt: 0.5, fontSize: '0.6875rem' }}>
                  Marked Workers
                </Typography>
              </Card>

              {/* Box 2: Units */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  bgcolor: '#ffffff',
                  p: 1.5
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#09090b', fontVariantNumeric: 'tabular-nums' }}>
                    {parseFloat(metrics?.today_total_work_units || 0).toFixed(1)}
                  </Typography>
                  <FactCheckIcon sx={{ color: '#71717a', fontSize: 18 }} />
                </Box>
                <Typography sx={{ color: '#71717a', fontWeight: 600, mt: 0.5, fontSize: '0.6875rem' }}>
                  Today Units
                </Typography>
              </Card>

              {/* Box 3: Active Site */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  bgcolor: '#ffffff',
                  p: 1.5
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#09090b', fontVariantNumeric: 'tabular-nums' }}>
                    {metrics?.active_sites ?? 0}
                  </Typography>
                  <LocationOnIcon sx={{ color: '#71717a', fontSize: 18 }} />
                </Box>
                <Typography sx={{ color: '#71717a', fontWeight: 600, mt: 0.5, fontSize: '0.6875rem' }}>
                  Active Sites
                </Typography>
              </Card>
            </Box>
          </Box>

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#71717a', px: 0.5 }}>
              Quick Actions
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(4, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.25 }}>
              {/* Action 1: Mark Attendance */}
              <Card
                elevation={0}
                onClick={() => navigate('/attendance')}
                sx={{
                  borderRadius: '12px',
                  border: '1px solid #e4e4e7',
                  bgcolor: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  p: { xs: 1.25, sm: 1.5 },
                  minHeight: 76,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 140ms ease-out, border-color 140ms ease-out, transform 140ms ease-out',
                  '@media (hover: hover) and (pointer: fine)': {
                    '&:hover': { bgcolor: '#f4f4f5', borderColor: '#d4d4d8' }
                  },
                  '&:active': { transform: 'scale(0.96)' },
                  touchAction: 'manipulation'
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    bgcolor: '#f4f4f5',
                    color: '#09090b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 0.75
                  }}
                >
                  <FactCheckIcon sx={{ fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontWeight: 600, color: '#09090b', lineHeight: 1.2, display: 'block', fontSize: '0.75rem' }}>
                  Attendance
                </Typography>
              </Card>

              {/* Action 2: Add Worker */}
              <Card
                elevation={0}
                onClick={() => navigate('/workers')}
                sx={{
                  borderRadius: '12px',
                  border: '1px solid #e4e4e7',
                  bgcolor: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  p: { xs: 1.25, sm: 1.5 },
                  minHeight: 76,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 140ms ease-out, border-color 140ms ease-out, transform 140ms ease-out',
                  '@media (hover: hover) and (pointer: fine)': {
                    '&:hover': { bgcolor: '#f4f4f5', borderColor: '#d4d4d8' }
                  },
                  '&:active': { transform: 'scale(0.96)' },
                  touchAction: 'manipulation'
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    bgcolor: '#f4f4f5',
                    color: '#09090b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 0.75
                  }}
                >
                  <PersonAddIcon sx={{ fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontWeight: 600, color: '#09090b', lineHeight: 1.2, display: 'block', fontSize: '0.75rem' }}>
                  Workers
                </Typography>
              </Card>

              {/* Action 3: Give Advance */}
              <Card
                elevation={0}
                onClick={() => navigate('/advances')}
                sx={{
                  borderRadius: '12px',
                  border: '1px solid #e4e4e7',
                  bgcolor: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  p: { xs: 1.25, sm: 1.5 },
                  minHeight: 76,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 140ms ease-out, border-color 140ms ease-out, transform 140ms ease-out',
                  '@media (hover: hover) and (pointer: fine)': {
                    '&:hover': { bgcolor: '#f4f4f5', borderColor: '#d4d4d8' }
                  },
                  '&:active': { transform: 'scale(0.96)' },
                  touchAction: 'manipulation'
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    bgcolor: '#f4f4f5',
                    color: '#09090b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 0.75
                  }}
                >
                  <WalletIcon sx={{ fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontWeight: 600, color: '#09090b', lineHeight: 1.2, display: 'block', fontSize: '0.75rem' }}>
                  Advances
                </Typography>
              </Card>

              {/* Action 4: Manage Sites */}
              <Card
                elevation={0}
                onClick={() => navigate('/sites')}
                sx={{
                  borderRadius: '12px',
                  border: '1px solid #e4e4e7',
                  bgcolor: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  p: { xs: 1.25, sm: 1.5 },
                  minHeight: 76,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 140ms ease-out, border-color 140ms ease-out, transform 140ms ease-out',
                  '@media (hover: hover) and (pointer: fine)': {
                    '&:hover': { bgcolor: '#f4f4f5', borderColor: '#d4d4d8' }
                  },
                  '&:active': { transform: 'scale(0.96)' },
                  touchAction: 'manipulation'
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    bgcolor: '#f4f4f5',
                    color: '#09090b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 0.75
                  }}
                >
                  <SitesIcon sx={{ fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontWeight: 600, color: '#09090b', lineHeight: 1.2, display: 'block', fontSize: '0.75rem' }}>
                  Sites
                </Typography>
              </Card>
            </Box>
          </Box>
        </Box>

        {/* Right Column: Site Overview */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#71717a' }}>
              Site Overview
            </Typography>
            <Typography
              onClick={() => navigate('/analytics')}
              sx={{ color: '#09090b', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              View All
            </Typography>
          </Box>

          <Card
            elevation={0}
            sx={{
              borderRadius: '12px',
              border: '1px solid #e4e4e7',
              bgcolor: '#ffffff',
              overflow: 'hidden'
            }}
          >
            {activeSitesList.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    bgcolor: '#f4f4f5',
                    color: '#71717a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <SitesIcon sx={{ fontSize: 20 }} />
                </Box>
                <Typography sx={{ color: '#09090b', fontSize: '0.875rem', fontWeight: 600 }}>
                  No active work sites
                </Typography>
                <Typography sx={{ color: '#71717a', fontSize: '0.75rem' }}>
                  Sites with recorded attendance or active status will appear here.
                </Typography>
              </Box>
            ) : (
              activeSitesList.slice(0, 5).map((site, index) => (
                <Box key={site.site_id}>
                  {index > 0 && <Divider sx={{ borderColor: '#f4f4f5' }} />}
                  <Box
                    onClick={() => navigate(`/analytics?year=${selectedYear}&month=${selectedMonth}`)}
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background-color 140ms ease-out',
                      '@media (hover: hover) and (pointer: fine)': {
                        '&:hover': { bgcolor: '#f8f9fa' }
                      },
                      '&:active': { bgcolor: '#f4f4f5' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '8px',
                          bgcolor: '#f4f4f5',
                          color: '#09090b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <SitesIcon sx={{ fontSize: 18 }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, color: '#09090b', fontSize: '0.875rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {site.site_name}
                        </Typography>
                        <Typography sx={{ color: '#71717a', fontSize: '0.75rem', mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
                          {site.unique_worker_count} workers · {parseFloat(site.total_work_units).toFixed(1)} units
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, ml: 1.5 }}>
                      <Typography sx={{ fontWeight: 700, color: '#09090b', fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(site.total_labour_expense)}
                      </Typography>
                      <ChevronRightIcon sx={{ color: '#a1a1aa', fontSize: 18 }} />
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;

