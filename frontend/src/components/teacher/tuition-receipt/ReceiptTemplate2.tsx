import React from 'react';
import { User, BookOpen, Calendar, Clock, CalendarDays, Edit3, Compass, CreditCard, CheckCircle2 } from 'lucide-react';
import { ReceiptData } from './types';

interface ReceiptTemplateProps {
  data: ReceiptData;
}

export const ReceiptTemplate2: React.FC<ReceiptTemplateProps> = ({ data }) => {
  const { toggles } = data;

  return (
    <div className="w-full bg-white text-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/90 font-sans select-text">
      {/* 1. TOP HEADER BANNER */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
          <span className="font-bold text-slate-800 text-sm tracking-tight">{data.teacherName}</span>
          {data.teacherPhone && (
            <span className="text-slate-600 font-semibold">SĐT: {data.teacherPhone}</span>
          )}
        </div>

        {/* Decorative centered title rule */}
        <div className="relative py-2 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300/80" />
          </div>
          <div className="relative bg-white px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide uppercase">
              {data.periodTitle || 'HỌC PHÍ'}
            </h2>
          </div>
        </div>
      </div>

      {/* 2. STUDENT & STUDY SUMMARY STRIP */}
      <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 mb-6 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
          {toggles.showStudent && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px] leading-tight">Họ và tên:</span>
                <span className="font-bold text-slate-900 text-sm">{data.studentName}</span>
              </div>
            </div>
          )}

          {toggles.showClass && (
            <div className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px] leading-tight">Lớp:</span>
                <span className="font-semibold text-slate-800 text-xs line-clamp-1">{data.className}</span>
              </div>
            </div>
          )}

          {toggles.showLessonCount && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px] leading-tight">Số buổi học:</span>
                <span className="font-bold text-slate-900 text-sm">{data.lessonCount} buổi</span>
              </div>
            </div>
          )}

          {toggles.showTotalHours && (
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px] leading-tight">Số giờ học:</span>
                <span className="font-bold text-slate-900 text-sm">{data.totalHours} giờ</span>
              </div>
            </div>
          )}
        </div>

        {/* Lesson Dates Row */}
        {toggles.showLessonDates && data.lessonDatesFormatted && (
          <div className="pt-2.5 border-t border-slate-200/60 flex items-center gap-2 text-xs text-slate-600">
            <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-500 shrink-0">Ngày học:</span>
            <span className="font-medium text-slate-700 leading-relaxed break-words">
              {data.lessonDatesFormatted}
            </span>
          </div>
        )}
      </div>

      {/* 3. MAIN BODY: 2 COLUMNS (Left: Evaluation & Roadmap, Right: Tuition & QR) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* LEFT COLUMN: Nhận xét học tập & Lộ trình (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-white">
          <div className="space-y-4">
            {/* PHẦN NHẬN XÉT HỌC TẬP */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black tracking-wider text-slate-700 uppercase pb-1.5 border-b border-slate-100">
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>NHẬN XÉT HỌC TẬP</span>
              </div>
              <div className="mt-2 text-xs">
                <span className="font-bold text-slate-800 block mb-0.5">Tổng quan:</span>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                  {data.generalComment || 'Chưa có nhận xét tổng quan cho kỳ học này.'}
                </p>
              </div>
            </div>

            {/* PHẦN LỘ TRÌNH */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-black tracking-wider text-slate-700 uppercase pb-1.5 border-b border-slate-100">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                <span>LỘ TRÌNH</span>
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                {data.roadmap || 'Chuẩn bị ôn luyện để chuẩn bị cho các bài kiểm tra sắp tới'}
              </p>
            </div>

            {/* SCHEDULE SECTION (If toggled) */}
            {toggles.showSchedule && data.lessons.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-black tracking-wider text-slate-700 uppercase pb-1.5 border-b border-slate-100">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>LỊCH HỌC CHI TIẾT ({data.lessons.length})</span>
                </div>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-1">
                  {data.lessons.map((l) => (
                    <div
                      key={l.id}
                      className="text-[11px] p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-700 truncate max-w-[170px]">
                        {l.date} ({l.startTime} - {l.endTime})
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {l.duration}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TỔNG HỌC PHÍ & VIETQR (5 cols) */}
        <div className="md:col-span-5 flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-white text-center">
          <div>
            {/* Total Tuition Box */}
            <div className="bg-[#1E3A8A] text-white rounded-xl p-3 shadow-sm mb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200 block">
                TỔNG HỌC PHÍ
              </span>
              <span className="text-xl sm:text-2xl font-black tracking-tight mt-0.5 block">
                {data.remainingAmount > 0
                  ? Number(data.remainingAmount).toLocaleString('vi-VN')
                  : Number(data.totalAmount).toLocaleString('vi-VN')} đ
              </span>
            </div>

            {/* Detailed Financial Breakdown if toggled */}
            {toggles.showTuitionDetails && (
              <div className="text-[11px] space-y-1 mb-3 text-left px-1">
                <div className="flex justify-between text-slate-500">
                  <span>Học phí gốc:</span>
                  <span className="font-semibold text-slate-800">
                    {Number(data.baseAmount).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                {toggles.showSurcharge && data.surcharge > 0 && (
                  <div className="flex justify-between text-indigo-600 font-semibold">
                    <span>Phụ thu:</span>
                    <span>+{Number(data.surcharge).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {toggles.showDiscount && data.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Giảm trừ:</span>
                    <span>-{Number(data.discount).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {data.paidAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Đã thanh toán:</span>
                    <span>{Number(data.paidAmount).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
              </div>
            )}

            {/* QR Code Container */}
            {toggles.showQr && data.qrUrl && (
              <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-2xs inline-block mb-2">
                <img
                  src={data.qrUrl}
                  alt="VietQR"
                  crossOrigin="anonymous"
                  className="w-36 h-36 sm:w-40 sm:h-40 object-contain mx-auto rounded-lg"
                />
              </div>
            )}

            {/* Bank Info */}
            <div className="text-xs space-y-0.5">
              <div className="font-mono font-black text-slate-900 tracking-wider text-sm">
                {data.accountNumber}
              </div>
              <div className="font-bold text-slate-700 text-xs">
                {data.bankName}
              </div>
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                {data.accountHolder}
              </div>
              {data.transferContent && (
                <div className="text-[10px] text-slate-400 mt-1 font-medium">
                  Nội dung: <span className="font-semibold text-slate-700">{data.transferContent}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. CLOSING MESSAGE */}
      {data.closingMessage && (
        <div className="mt-5 pt-3.5 border-t border-slate-200/70 text-center">
          <p className="text-xs text-slate-500 italic font-medium">
            "{data.closingMessage}"
          </p>
        </div>
      )}
    </div>
  );
};
