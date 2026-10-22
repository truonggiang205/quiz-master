import React, { forwardRef } from 'react';
import { ReceiptData } from './types';
import { ReceiptTemplate1 } from './ReceiptTemplate1';
import { ReceiptTemplate2 } from './ReceiptTemplate2';
import { ReceiptTemplate3 } from './ReceiptTemplate3';

interface ReceiptPreviewProps {
  data: ReceiptData;
}

export const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptPreviewProps>(
  ({ data }, ref) => {
    const templateLabel =
      data.template === 'template-1'
        ? 'Mẫu 1 — Classic Education'
        : data.template === 'template-2'
        ? 'Mẫu 2 — Modern Education Card'
        : 'Mẫu 3 — Education Report';

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Preview Header Status */}
        <div className="print:hidden flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Phiếu hiển thị trực tiếp · {templateLabel}</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tự cập nhật ngay khi nội dung thay đổi · Khổ chuẩn A4 (794px)
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>TRỰC TIẾP</span>
          </div>
        </div>

        {/* Scrollable Receipt Area with neutral canvas background */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4 md:p-6 flex justify-center items-start bg-slate-200/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
          <div
            ref={ref}
            id="tuition-receipt-card"
            data-testid="receipt-export-root"
            className="w-full max-w-[794px] bg-white rounded-3xl shadow-md border border-slate-200/90"
            style={{
              height: 'auto',
              minHeight: 0,
              maxHeight: 'none',
              overflow: 'visible',
            }}
          >
            {data.template === 'template-1' ? (
              <ReceiptTemplate1 data={data} />
            ) : data.template === 'template-2' ? (
              <ReceiptTemplate2 data={data} />
            ) : (
              <ReceiptTemplate3 data={data} />
            )}
          </div>
        </div>
      </div>
    );
  }
);

ReceiptPreview.displayName = 'ReceiptPreview';

