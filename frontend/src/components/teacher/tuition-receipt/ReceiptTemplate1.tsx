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
  CreditCard,
  QrCode,
} from 'lucide-react';
import { ReceiptData } from './types';

interface ReceiptTemplateProps {
  data: ReceiptData;
}

/**
 * TEMPLATE 1 – CLASSIC EDUCATION
 * Style: Formal, clean, teacher-friendly, invoice-like sequential flow.
 * Header → Title → Student Info → Tuition Summary → Teacher Comments → Roadmap → QR & Bank Info → Closing
 */
export const ReceiptTemplate1: React.FC<ReceiptTemplateProps> = ({ data }) => {
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
      className="w-full bg-white text-slate-800 p-6 sm:p-9 rounded-2xl shadow-sm border border-slate-200 select-text relative overflow-visible"
      style={{
        height: 'auto',
        minHeight: 0,
        maxHeight: 'none',
        overflow: 'visible',
        fontFamily: '"Be Vietnam Pro", Inter, Roboto, system-ui, sans-serif',
      }}
    >
      {/* ==================== 1. QUIZMASTER HEADER ==================== */}
      <div className="border-b border-slate-200 pb-5 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shadow-2xs shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  {data.teacherName}
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                QuizMaster · Hệ thống Quản lý Giảng dạy & Đào tạo
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-700 block bg-blue-50 px-2.5 py-1 rounded border border-blue-100">
              PHIẾU HỌC PHÍ & BÁO CÁO HỌC TẬP
            </span>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              {data.teacherPhone ? `Hotline: ${data.teacherPhone}` : 'Giáo dục Chuyên nghiệp'}
            </div>
          </div>
        </div>

        {/* Title & Period */}
        <div className="text-center mt-5 pt-3 border-t border-slate-100">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wide uppercase">
            {data.periodTitle || 'THÔNG BÁO HỌC PHÍ'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Kỳ học: <span className="font-semibold text-slate-700">{data.startDate}</span> đến{' '}
            <span className="font-semibold text-slate-700">{data.endDate}</span>
          </p>
        </div>
      </div>

      {/* ==================== 2. STUDENT INFORMATION ==================== */}
      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 mb-5 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
          {toggles.showStudent && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
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
              <BookOpen className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px] leading-tight">Lớp / Môn:</span>
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

        {toggles.showLessonDates && data.lessonDatesFormatted && (
          <div className="pt-2.5 border-t border-slate-200/60 flex items-center gap-2 text-xs text-slate-600">
            <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" />
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

      {/* ==================== 3. TUITION SUMMARY (INVOICE BREAKDOWN) ==================== */}
      <div className="mb-5 p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              TỔNG HỌC PHÍ PHẢI ĐÓNG
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#1E3A8A] tracking-tight block mt-0.5">
              {data.remainingAmount > 0
                ? Number(data.remainingAmount).toLocaleString('vi-VN')
                : Number(data.totalAmount).toLocaleString('vi-VN')}{' '}
              đ
            </span>
          </div>

          {toggles.showTuitionDetails && (
            <div className="text-[11px] space-y-1 sm:text-right">
              <div className="text-slate-600">
                <span>Học phí áp dụng: </span>
                <span className="font-semibold text-slate-900">
                  {Number(data.baseAmount).toLocaleString('vi-VN')} đ
                </span>
              </div>
              {toggles.showSurcharge && data.surcharge > 0 && (
                <div className="text-indigo-700 font-semibold">
                  <span>Phụ thu: </span>
                  <span>+{Number(data.surcharge).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              {toggles.showDiscount && data.discount > 0 && (
                <div className="text-rose-600 font-semibold">
                  <span>Giảm học phí: </span>
                  <span>-{Number(data.discount).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              {data.paidAmount > 0 && (
                <div className="text-emerald-700 font-semibold">
                  <span>Đã thanh toán: </span>
                  <span>{Number(data.paidAmount).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================== 4. TEACHER COMMENTS ==================== */}
      {hasComments && (
        <div className="mb-5 p-4 sm:p-5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-800 uppercase pb-2 border-b border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>NHẬN XÉT CỦA GIÁO VIÊN</span>
          </div>
          <div className="mt-2.5 text-xs">
            <span className="font-bold text-slate-800 block mb-1">Tổng quan:</span>
            <p
              className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words font-medium pl-3 border-l-2 border-blue-600"
              style={{ overflowWrap: 'anywhere' }}
            >
              {commentText}
            </p>
          </div>
        </div>
      )}

      {/* ==================== 5. STUDY ROADMAP ==================== */}
      {hasRoadmap && (
        <div className="mb-5 p-4 sm:p-5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-800 uppercase pb-2 border-b border-slate-100">
            <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>LỘ TRÌNH / ĐỊNH HƯỚNG THỜI GIAN TỚI</span>
          </div>
          <p
            className="mt-2.5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words font-medium pl-3 border-l-2 border-indigo-600"
            style={{ overflowWrap: 'anywhere' }}
          >
            {roadmapText}
          </p>
        </div>
      )}

      {/* ==================== 6. DETAILED SCHEDULE (IF TOGGLED) ==================== */}
      {hasSchedule && (
        <div className="mb-5 p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-800 uppercase pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>LỊCH HỌC CHI TIẾT ({data.lessons.length})</span>
          </div>
          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.lessons.map((l) => (
              <div
                key={l.id}
                className="text-[11px] p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
              >
                <span className="font-semibold text-slate-700 truncate">
                  {l.date} ({l.startTime} – {l.endTime})
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-medium ml-2 shrink-0">
                  {l.duration} giờ
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== 7. PAYMENT QR & BANK INFORMATION ==================== */}
      <div className="mb-5 p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Bank Transfer Information */}
          <div className="w-full sm:flex-1 text-xs space-y-1.5 text-left">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#1E3A8A] block mb-1">
              THÔNG TIN THANH TOÁN
            </span>
            <div className="font-mono font-black text-slate-900 tracking-wider text-base">
              STK: {data.accountNumber}
            </div>
            <div className="font-bold text-slate-700 text-xs">{data.bankName}</div>
            <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
              CTK: {data.accountHolder}
            </div>
            {data.transferContent && (
              <div className="text-[10px] text-slate-600 mt-2 font-medium bg-white py-1.5 px-2.5 rounded border border-slate-200 inline-block">
                Nội dung chuyển khoản:{' '}
                <span className="font-bold text-[#1E3A8A]">{data.transferContent}</span>
              </div>
            )}
          </div>

          {/* QR Payment Box - Content-Driven, tight fit */}
          {toggles.showQr && data.qrUrl && (
            <div className="shrink-0 flex flex-col items-center text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-blue-600" />
                <span>MÃ VIETQR</span>
              </span>
              <div className="p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs w-fit h-auto">
                <img
                  src={data.qrUrl}
                  alt="VietQR"
                  data-receipt-qr="true"
                  crossOrigin="anonymous"
                  className="w-[180px] h-[180px] object-contain rounded-lg block"
                  style={{ width: '180px', height: '180px', maxWidth: '180px', maxHeight: '180px' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== 8. CLOSING MESSAGE ==================== */}
      {hasClosing && (
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black tracking-wider text-slate-700 uppercase mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            <span>LỜI NHẮN</span>
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
