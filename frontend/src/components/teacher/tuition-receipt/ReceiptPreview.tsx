import React, { forwardRef } from 'react';
import { ReceiptData } from './types';
import { ReceiptTemplate1 } from './ReceiptTemplate1';
import { ReceiptTemplate2 } from './ReceiptTemplate2';

interface ReceiptPreviewProps {
  data: ReceiptData;
}

export const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptPreviewProps>(
  ({ data }, ref) => {
    const templateLabel =
      data.template === 'template-1' ? 'Mẫu 1 (Classic Banner)' : 'Mẫu 2 (Modern Card)';

    return (
      <div className="flex flex-col h-full">
        {/* Preview Header Status */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Phiếu hiển thị trực tiếp · {templateLabel}</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tự cập nhật ngay khi nội dung thay đổi.
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>TRỰC TIẾP</span>
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1 flex justify-center items-start">
          <div
            ref={ref}
            id="tuition-receipt-card"
            className="w-full max-w-xl transition-all duration-200"
          >
            {data.template === 'template-1' ? (
              <ReceiptTemplate1 data={data} />
            ) : (
              <ReceiptTemplate2 data={data} />
            )}
          </div>
        </div>
      </div>
    );
  }
);

ReceiptPreview.displayName = 'ReceiptPreview';
