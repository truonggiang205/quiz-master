import React, { useState, useEffect, forwardRef } from 'react';

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'defaultValue'> {
  value?: number | null;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  allowDecimals?: boolean;
  precision?: number;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      min,
      max,
      step,
      allowDecimals = true,
      precision,
      className = '',
      onBlur,
      onFocus,
      ...restProps
    },
    ref,
  ) => {
    // Tự động cho phép số thập phân nếu step là số thập phân
    const isDecimalAllowed =
      allowDecimals ||
      (step !== undefined && (typeof step === 'string' ? step.includes('.') : step % 1 !== 0));

    const formatValueToString = (val: number | null | undefined): string => {
      if (val === undefined || val === null || isNaN(val)) {
        return '';
      }
      return String(val);
    };

    const [rawText, setRawText] = useState<string>(() => formatValueToString(value));
    const [isFocused, setIsFocused] = useState<boolean>(false);

    // Đồng bộ giá trị từ bên ngoài khi không trong trạng thái focus
    useEffect(() => {
      if (!isFocused) {
        setRawText(formatValueToString(value));
      }
    }, [value, isFocused]);

    const cleanInput = (text: string): string => {
      // Thay thế dấu phẩy bằng dấu chấm thập phân
      let cleaned = text.replace(/,/g, '.');

      // Tự loại bỏ số 0 thừa ở đầu (007 -> 7, nhưng giữ 0.5, 0.)
      if (/^0\d+/.test(cleaned)) {
        cleaned = cleaned.replace(/^0+(?=\d)/, '');
      } else if (/^-0\d+/.test(cleaned)) {
        cleaned = cleaned.replace(/^-0+(?=\d)/, '-');
      }

      return cleaned;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const incoming = e.target.value;

      // 1. Nếu người dùng xóa hết -> cho phép hiển thị ô rỗng
      if (incoming === '') {
        setRawText('');
        return;
      }

      const cleaned = cleanInput(incoming);

      // 2. Kiểm tra định dạng hợp lệ
      const canBeNegative = min === undefined || min < 0;
      const regex = isDecimalAllowed
        ? canBeNegative
          ? /^-?\d*(\.\d*)?$/
          : /^\d*(\.\d*)?$/
        : canBeNegative
        ? /^-?\d*$/
        : /^\d*$/;

      if (!regex.test(cleaned)) {
        return; // Không khớp định dạng số
      }

      setRawText(cleaned);

      // 3. Nếu là số hoàn chỉnh, phát tín hiệu onChange
      if (cleaned !== '-' && cleaned !== '.' && !cleaned.endsWith('.')) {
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed) && isFinite(parsed)) {
          onChange?.(parsed);
        }
      }
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);

      let targetVal: number;
      const trimmed = rawText.trim();

      if (trimmed === '' || trimmed === '-' || trimmed === '.') {
        // Rỗng -> quay về defaultValue hoặc min hoặc 0
        targetVal = defaultValue ?? (min !== undefined ? min : 0);
      } else {
        const parsed = parseFloat(trimmed);
        if (isNaN(parsed) || !isFinite(parsed)) {
          targetVal = defaultValue ?? (min !== undefined ? min : 0);
        } else {
          targetVal = parsed;
        }
      }

      // Giới hạn min / max
      if (min !== undefined && targetVal < min) {
        targetVal = min;
      }
      if (max !== undefined && targetVal > max) {
        targetVal = max;
      }

      // Làm tròn theo precision nếu có
      if (precision !== undefined) {
        targetVal = Number(targetVal.toFixed(precision));
      }

      setRawText(String(targetVal));
      onChange?.(targetVal);

      if (onBlur) {
        onBlur(e);
      }
    };

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (onFocus) {
        onFocus(e);
      }
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode={isDecimalAllowed ? 'decimal' : 'numeric'}
        value={rawText}
        onChange={handleChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        className={className}
        {...restProps}
      />
    );
  },
);

NumberInput.displayName = 'NumberInput';
