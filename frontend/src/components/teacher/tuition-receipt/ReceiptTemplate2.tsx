import React from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  CalendarDays,
  CheckCircle2,
  Compass,
  MessageSquare,
  ShieldCheck,
  User,
  QrCode,
} from 'lucide-react';
import { ReceiptData } from './types';

interface ReceiptTemplateProps {
  data: ReceiptData;
}

export const ReceiptTemplate2: React.FC<ReceiptTemplateProps> = ({ data }) => {
  const { toggles } = data;

  const commentText = (data.learningComment ?? data.generalComment ?? '').trim();
  const roadmapText = (data.learningRoadmap ?? data.roadmap ?? '').trim();
  const closingText = (data.closingMessage ?? '').trim();

  const hasComments = toggles.showComments && !!commentText;
  const hasRoadmap = toggles.showRoadmap && !!roadmapText;
  const hasSchedule = toggles.showSchedule && data.lessons.length > 0;
  const hasClosing = toggles.showClosingMessage && !!closingText;

  return (
    <div
      className="w-full bg-white text-slate-800 p-6 sm:p-9 rounded-3xl shadow-sm border border-slate-200/90 select-text relative overflow-visible"
      style={{
        height: 'auto',
        minHeight: 0,
        maxHeight: 'none',
        overflow: 'visible',
        fontFamily: '"Be Vietnam Pro", "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      }}
    >
      {/* ==================== 1. CLEAN SOFT HEADER ==================== */}
      <div className="border-b border-slate-100 pb-5 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  {data.teacherName}
                </span>
                <ShieldCheck className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                QuizMaster · Hệ thống Quản lý Giảng dạy & Đào tạo
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-[10px] font-bold tracking-wider text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-100 uppercase">
              BÁO CÁO HỌC TẬP & PHIẾU THU
            </span>
            {data.teacherPhone && (
              <div className="text-xs text-slate-500 font-medium mt-1">
                Hotline: {data.teacherPhone}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mt-5 pt-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide uppercase">
            {data.periodTitle || 'HỌC PHÍ & BÁO CÁO HỌC TẬP'}
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Kỳ học: <span className="font-semibold text-slate-600">{data.startDate}</span> –{' '}
            <span className="font-semibold text-slate-600">{data.endDate}</span>
          </p>
        </div>
      </div>

      {/* ==================== 2. STUDENT INFORMATION ==================== */}
      <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 mb-6 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
          {toggles.showStudent && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px] leading-tight">Học sinh:</span>
                <span
                  className="font-bold text-slate-900 text-sm break-words"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {data.studentName}
                </span>
              </div>
            </div>
          )}

          {toggles.showClass && (
            <div className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px] leading-tight">Lớp học:</span>
                <span
                  className="font-semibold text-slate-800 text-xs break-words"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {data.className}
                </span>
              </div>
            </div>
          )}

          {toggles.showLessonCount && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px] leading-tight">Số buổi học:</span>
                <span className="font-bold text-slate-900 text-sm">{data.lessonCount} buổi</span>
              </div>
            </div>
          )}

          {toggles.showTotalHours && (
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px] leading-tight">Số giờ học:</span>
                <span className="font-bold text-slate-900 text-sm">{data.totalHours} giờ</span>
              </div>
            </div>
          )}
        </div>

        {toggles.showLessonDates && data.lessonDatesFormatted && (
          <div className="pt-2.5 border-t border-slate-200/50 flex items-center gap-2 text-xs text-slate-600">
            <CalendarDays className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="font-semibold text-slate-500 shrink-0">Ngày học:</span>
            <span
              className="font-medium text-slate-800 leading-relaxed break-words"
              style={{ overflowWrap: 'anywhere' }}
            >
              {data.lessonDatesFormatted}
            </span>
          </div>
        )}
      </div>

      {/* ==================== 3. TEACHER EVALUATION (NHẬN XÉT CỦA GIÁO VIÊN) ==================== */}
      {hasComments && (
        <div className="mb-5 p-5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-800 uppercase pb-2 border-b border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>NHẬN XÉT CỦA GIÁO VIÊN</span>
          </div>
          <div className="mt-3 text-xs">
            <span className="font-bold text-slate-800 block mb-1">Tổng quan:</span>
            <p
              className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words font-medium pl-3 border-l-2 border-blue-500"
              style={{ overflowWrap: 'anywhere' }}
            >
              {commentText}
            </p>
          </div>
        </div>
      )}

      {/* ==================== 4. LEARNING ROADMAP (LỘ TRÌNH / ĐỊNH HƯỚNG) ==================== */}
      {hasRoadmap && (
        <div className="mb-5 p-5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-800 uppercase pb-2 border-b border-slate-100">
            <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>LỘ TRÌNH / ĐỊNH HƯỚNG THỜI GIAN TỚI</span>
          </div>
          <p
            className="mt-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words font-medium pl-3 border-l-2 border-indigo-500"
            style={{ overflowWrap: 'anywhere' }}
          >
            {roadmapText}
          </p>
        </div>
      )}

      {/* ==================== 5. DETAILED SCHEDULE (LỊCH HỌC CHI TIẾT) ==================== */}
      {hasSchedule && (
        <div className="mb-5 p-5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-800 uppercase pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>LỊCH HỌC CHI TIẾT ({data.lessons.length})</span>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.lessons.map((l) => (
              <div
                key={l.id}
                className="text-[11px] p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
              >
                <span className="font-semibold text-slate-700 truncate">
                  {l.date} ({l.startTime} - {l.endTime})
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-medium ml-2 shrink-0">
                  {l.duration} giờ
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== 6. PAYMENT SUMMARY & QR PAYMENT ==================== */}
      <div className="mb-5 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Left: Financial Summary */}
          <div className={`${toggles.showQr && data.qrUrl ? 'md:col-span-7' : 'md:col-span-12'}`}>
            <div className="bg-[#1E3A8A] text-white rounded-xl p-4 shadow-sm mb-3.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200 block">
                TỔNG HỌC PHÍ
              </span>
              <span className="text-2xl sm:text-3xl font-black tracking-tight mt-1 block">
                {data.remainingAmount > 0
                  ? Number(data.remainingAmount).toLocaleString('vi-VN')
                  : Number(data.totalAmount).toLocaleString('vi-VN')}{' '}
                đ
              </span>
            </div>

            {toggles.showTuitionDetails && (
              <div className="text-[11px] space-y-1.5 p-3 rounded-xl bg-white border border-slate-200/70">
                <div className="flex justify-between text-slate-600">
                  <span>Học phí áp dụng:</span>
                  <span className="font-semibold text-slate-900">
                    {Number(data.baseAmount).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                {toggles.showSurcharge && data.surcharge > 0 && (
                  <div className="flex justify-between text-indigo-700 font-semibold">
                    <span>Phụ thu:</span>
                    <span>+{Number(data.surcharge).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {toggles.showDiscount && data.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Giảm học phí:</span>
                    <span>-{Number(data.discount).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {data.paidAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Đã thanh toán:</span>
                    <span>{Number(data.paidAmount).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                  <span>Còn lại cần đóng:</span>
                  <span className="text-blue-700">
                    {Number(data.remainingAmount).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: QR Code & Bank Info */}
          {toggles.showQr && data.qrUrl && (
            <div className="md:col-span-5 flex flex-col items-center text-center p-3 rounded-xl bg-white border border-slate-200/70">
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-700 mb-1.5 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" />
                <span>QR THANH TOÁN</span>
              </span>

              <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs mb-2">
                <img
                  src={data.qrUrl}
                  alt="VietQR"
                  data-qr="true"
                  crossOrigin="anonymous"
                  className="w-40 h-40 sm:w-44 sm:h-44 object-contain mx-auto rounded-lg"
                />
              </div>

              <div className="text-xs space-y-0.5">
                <div className="font-mono font-black text-slate-900 text-sm">
                  STK: {data.accountNumber}
                </div>
                <div className="font-bold text-slate-700 text-[11px]">{data.bankName}</div>
                <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wide">
                  CTK: {data.accountHolder}
                </div>
                {data.transferContent && (
                  <div className="text-[10px] text-slate-500 mt-1 font-medium bg-slate-50 py-0.5 px-2 rounded border border-slate-100">
                    Nội dung:{' '}
                    <span className="font-semibold text-slate-800">{data.transferContent}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== 7. CLOSING MESSAGE ==================== */}
      {hasClosing && (
        <div className="p-4 rounded-2xl border border-slate-200/70 bg-white text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black tracking-wider text-slate-700 uppercase mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            <span>LỜI NHẮN TỪ GIÁO VIÊN</span>
          </div>
          <p
            className="text-xs text-slate-600 italic font-medium leading-relaxed whitespace-pre-wrap break-words max-w-xl mx-auto"
            style={{ overflowWrap: 'anywhere' }}
          >
            "{closingText}"
          </p>
        </div>
      )}
    </div>
  );
};
