import React from 'react';
import {
  Box,
  IconButton,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Reusable MonthSelector component matching Monthly Payroll's capsule design.
 * Full-width rounded pill container with previous/next arrows and a central
 * month-year dropdown selector.
 */
const MonthSelector = ({
  selectedYear,
  selectedMonth,
  onPrevMonth,
  onNextMonth,
  onChangeMonthYear,
  disabled = false
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1,
        bgcolor: '#ffffff',
        borderRadius: 9999,
        border: '1px solid #e4e4e7',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        width: '100%'
      }}
    >
      <IconButton
        onClick={onPrevMonth}
        disabled={disabled}
        size="small"
        sx={{
          color: '#71717a',
          touchAction: 'manipulation',
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': { color: '#09090b', bgcolor: '#f4f4f5' }
          },
          '&:active': { transform: 'scale(0.95)' }
        }}
        aria-label="Previous month"
      >
        <PrevIcon sx={{ fontSize: 18 }} />
      </IconButton>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <FormControl variant="standard">
          <Select
            disableUnderline
            disabled={disabled}
            value={`${selectedYear}-${selectedMonth}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              if (onChangeMonthYear) {
                onChangeMonthYear(y, m);
              }
            }}
            IconComponent={ArrowDownIcon}
            sx={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: '#09090b',
              '& .MuiSelect-select': { py: 0.25, pr: '22px !important' },
              '& .MuiSelect-icon': { color: '#71717a' }
            }}
            MenuProps={{
              slotProps: {
                paper: {
                  sx: {
                    maxHeight: 320,
                    borderRadius: 2,
                    border: '1px solid #e4e4e7',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
                  }
                }
              }
            }}
          >
            {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((m) => (
              <MenuItem
                key={`${selectedYear}-${m}`}
                value={`${selectedYear}-${m}`}
                sx={{ fontSize: '0.8125rem', color: '#09090b' }}
              >
                {MONTH_NAMES[m - 1]} {selectedYear}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <IconButton
        onClick={onNextMonth}
        disabled={disabled}
        size="small"
        sx={{
          color: '#71717a',
          touchAction: 'manipulation',
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': { color: '#09090b', bgcolor: '#f4f4f5' }
          },
          '&:active': { transform: 'scale(0.95)' }
        }}
        aria-label="Next month"
      >
        <NextIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
};

export default MonthSelector;
export { MONTH_NAMES };
