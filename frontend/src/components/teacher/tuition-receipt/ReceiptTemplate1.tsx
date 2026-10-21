import React from 'react';
import { Award, User, BookOpen, Calendar, Clock, CalendarDays, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';
import { ReceiptData } from './types';

interface ReceiptTemplateProps {
  data: ReceiptData;
}

export const ReceiptTemplate1: React.FC<ReceiptTemplateProps> = ({ data }) => {
  const { toggles } = data;

  return (
    <div className="w-full bg-white text-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-indigo-100 font-sans select-text">
      {/* 1. CLASSIC NAVY BANNER HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white">{data.teacherName}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
              Hệ thống Quản lý Giảng dạy & Đào tạo QuizMaster
            </p>
          </div>
        </div>

        <div className="text-right sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 block">
            THÔNG BÁO CHÍNH THỨC
          </span>
          <div className="text-xs font-semibold text-white/90 mt-0.5">
            {data.teacherPhone ? `Hotline: ${data.teacherPhone}` : 'Phiếu Học Phí & Đánh Giá'}
          </div>
        </div>
      </div>

      {/* 2. TITLE BAR */}
      <div className="text-center mb-6 pb-3 border-b border-slate-100">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
          {data.periodTitle || 'PHIẾU HỌC PHÍ'}
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Thời gian theo dõi: {data.startDate} đến {data.endDate}
        </p>
      </div>

      {/* 3. STUDENT PROFILE & STUDY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/70 mb-6 text-xs">
        {toggles.showStudent && (
          <div>
            <span className="text-slate-400 block text-[11px]">Học sinh</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{data.studentName}</span>
          </div>
        )}

        {toggles.showClass && (
          <div>
            <span className="text-slate-400 block text-[11px]">Lớp học</span>
            <span className="font-semibold text-slate-800 text-xs mt-0.5 block truncate">{data.className}</span>
          </div>
        )}

        {toggles.showLessonCount && (
          <div>
            <span className="text-slate-400 block text-[11px]">Số buổi học</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{data.lessonCount} buổi</span>
          </div>
        )}

        {toggles.showTotalHours && (
          <div>
            <span className="text-slate-400 block text-[11px]">Tổng thời lượng</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{data.totalHours} giờ</span>
          </div>
        )}

        {toggles.showLessonDates && data.lessonDatesFormatted && (
          <div className="col-span-2 sm:col-span-4 pt-2.5 border-t border-indigo-100/60 flex items-center gap-2 text-slate-600">
            <CalendarDays className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="font-semibold text-slate-500 shrink-0">Các ngày học:</span>
            <span className="font-medium text-slate-800 break-words">{data.lessonDatesFormatted}</span>
          </div>
        )}
      </div>

      {/* 4. LEARNING EVALUATION & ROADMAP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>NHẬN XÉT HỌC TẬP</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium">
            {data.generalComment || 'Học sinh chuyên cần và chấp hành tốt nội quy lớp học.'}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>LỘ TRÌNH VÀ KẾ HOẠCH</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium">
            {data.roadmap || 'Chuẩn bị ôn luyện để chuẩn bị cho các bài kiểm tra sắp tới'}
          </p>
        </div>
      </div>

      {/* 5. FINANCIAL BREAKDOWN & VIETQR PAYMENT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 mb-5 items-center">
        {/* Left: Financial Statement (7 cols) */}
        <div className="md:col-span-7 space-y-2 text-xs">
          <div className="font-bold text-slate-800 text-sm mb-2 uppercase tracking-wide">
            Chi tiết học phí
          </div>

          <div className="flex justify-between py-1 border-b border-slate-200/60 text-slate-600">
            <span>Học phí cơ bản ({data.lessonCount} buổi):</span>
            <span className="font-semibold text-slate-800">
              {Number(data.baseAmount).toLocaleString('vi-VN')} đ
            </span>
          </div>

          {toggles.showSurcharge && data.surcharge > 0 && (
            <div className="flex justify-between py-1 border-b border-slate-200/60 text-indigo-700">
              <span>Phụ thu / Lớp kèm bổ sung:</span>
              <span className="font-semibold">+{Number(data.surcharge).toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          {toggles.showDiscount && data.discount > 0 && (
            <div className="flex justify-between py-1 border-b border-slate-200/60 text-rose-600">
              <span>Giảm trừ học phí / Ưu đãi:</span>
              <span className="font-semibold">-{Number(data.discount).toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          {data.paidAmount > 0 && (
            <div className="flex justify-between py-1 border-b border-slate-200/60 text-emerald-700 font-semibold">
              <span>Đã xác nhận thanh toán:</span>
              <span>{Number(data.paidAmount).toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <span className="font-black text-slate-900 text-sm uppercase">
              Tổng số tiền cần đóng:
            </span>
            <span className="text-xl font-black text-[#1E3A8A]">
              {data.remainingAmount > 0
                ? Number(data.remainingAmount).toLocaleString('vi-VN')
                : Number(data.totalAmount).toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        {/* Right: QR Code Box (5 cols) */}
        <div className="md:col-span-5 bg-white p-4 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center">
          {toggles.showQr && data.qrUrl ? (
            <div>
              <img
                src={data.qrUrl}
                alt="VietQR"
                crossOrigin="anonymous"
                className="w-32 h-32 sm:w-36 sm:h-36 object-contain mx-auto rounded-lg mb-2 shadow-2xs border border-slate-100 p-1"
              />
              <div className="text-xs font-mono font-bold text-slate-900">
                STK: {data.accountNumber}
              </div>
              <div className="text-[11px] font-semibold text-slate-600">
                {data.bankName} - {data.accountHolder}
              </div>
            </div>
          ) : (
            <div className="py-8 text-slate-400 text-xs">
              <QrCode className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <span>Thanh toán trực tiếp bằng tiền mặt</span>
            </div>
          )}
        </div>
      </div>

      {/* 6. CLOSING MESSAGE */}
      {data.closingMessage && (
        <div className="pt-3 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 italic font-medium">
            "{data.closingMessage}"
          </p>
        </div>
      )}
    </div>
  );
};
