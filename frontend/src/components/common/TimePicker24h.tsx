import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

interface TimePicker24hProps {
  value: string; // Format: "HH:mm" (24h)
  onChange: (time: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  startTimeReference?: string; // Optional: if provided, suggests duration offsets
  className?: string;
}

// Common 24h tutoring session times
const COMMON_TIMES_24H = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'
];

export const TimePicker24h: React.FC<TimePicker24hProps> = ({
  value = '18:00',
  onChange,
  placeholder = 'HH:mm (24h)',
  required = false,
  disabled = false,
  startTimeReference,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync internal state with external value
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll active time into view when opening
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen]);

  // Handle typing directly in 24h format
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9:]/g, '');

    // Auto-colon after 2 digits if typing
    if (raw.length === 2 && !raw.includes(':') && inputValue.length === 1) {
      raw = raw + ':';
    }

    if (raw.length > 5) raw = raw.slice(0, 5);

    setInputValue(raw);

    // Validate 24h format: HH:mm where 00 <= HH <= 23, 00 <= mm <= 59
    const match = raw.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
    if (match) {
      const hh = match[1].padStart(2, '0');
      const mm = match[2];
      onChange(`${hh}:${mm}`);
    }
  };

  const handleBlur = () => {
    // If input is incomplete or invalid, reset to current valid value or normalize
    const match = inputValue.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
    if (match) {
      const normalized = `${match[1].padStart(2, '0')}:${match[2]}`;
      setInputValue(normalized);
      onChange(normalized);
    } else {
      setInputValue(value);
    }
  };

  const handleSelect = (timeStr: string) => {
    setInputValue(timeStr);
    onChange(timeStr);
    setIsOpen(false);
  };

  // Helper duration presets if startTimeReference is provided
  const durationPresets = React.useMemo(() => {
    if (!startTimeReference) return [];
    const [sH, sM] = startTimeReference.split(':').map(Number);
    if (isNaN(sH) || isNaN(sM)) return [];

    const startMinutes = sH * 60 + sM;
    const durations = [
      { label: '+45p', mins: 45 },
      { label: '+1h', mins: 60 },
      { label: '+1h30', mins: 90 },
      { label: '+2h', mins: 120 },
    ];

    return durations.map((d) => {
      const totalM = (startMinutes + d.mins) % (24 * 60);
      const h = Math.floor(totalM / 60);
      const m = totalM % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      return {
        label: `${d.label} (${timeStr})`,
        timeStr,
      };
    });
  }, [startTimeReference]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input container */}
      <div
        className={`flex items-center gap-2 w-full bg-slate-50 dark:bg-slate-800 border ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        } rounded-xl px-3 py-2 transition-all cursor-pointer`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <Clock className="w-4 h-4 text-slate-400 shrink-0" />

        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={5}
          className="w-full bg-transparent text-sm font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none tracking-wider"
        />

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
            24h
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-500' : ''
            }`}
          />
        </div>

        {/* Hidden/accessible native input for E2E testing and automation compatibility */}
        <input
          type="time"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setInputValue(e.target.value);
          }}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
      </div>

      {/* Floating 24h Time Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Duration Helper Buttons (for End Time) */}
          {durationPresets.length > 0 && (
            <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-1.5">
                Gợi ý thời lượng:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelect(preset.timeStr)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors flex items-center justify-between ${
                      value === preset.timeStr
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {value === preset.timeStr && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 24-Hour Time Slots List */}
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Khung giờ (24h):
            </span>
            <span className="text-[10px] text-slate-400 font-mono">00:00 - 23:30</span>
          </div>

          <div
            ref={listRef}
            className="max-h-48 overflow-y-auto grid grid-cols-3 gap-1 pr-1 custom-scrollbar"
          >
            {COMMON_TIMES_24H.map((time) => {
              const isSelected = value === time;
              return (
                <button
                  key={time}
                  type="button"
                  data-active={isSelected ? 'true' : 'false'}
                  onClick={() => handleSelect(time)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium transition-colors text-center ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
