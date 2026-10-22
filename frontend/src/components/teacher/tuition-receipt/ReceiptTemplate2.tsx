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

/**
 * TEMPLATE 2 – MODERN EDUCATION CARD (MAIN RECOMMENDED TEMPLATE)
 * Style: Modern, premium, minimal, parent-friendly.
 * Two-Column:
 * LEFT: Teacher evaluation, Roadmap, Learning schedule, Message
 * RIGHT: Total tuition, QR, Bank information, Transfer content
 */
export const ReceiptTemplate2: React.FC<ReceiptTemplateProps> = ({ data }) => {
  const { toggles } = data;

  const commentText = (data.learningComment ?? data.generalComment ?? '').trim();
  const roadmapText = (data.learningRoadmap ?? data.roadmap ?? '').trim();
  const closingText = (data.closingMessage ?? '').trim();

  const hasComments = toggles.showComments && !!commentText;
  const hasRoadmap = toggles.showRoadmap && !!roadmapText;
  const hasSchedule = toggles.showSchedule && data.lessons.length > 0;
  const hasClosing = toggles.showClosingMessage && !!closingText;
  const hasLeftColumn = hasComments || hasRoadmap || hasSchedule || hasClosing;

  return (
    <div
      className="w-full bg-white text-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/90 select-text relative overflow-visible"
      style={{
        height: 'auto',
        minHeight: 0,
        maxHeight: 'none',
        overflow: 'visible',
        fontFamily: '"Be Vietnam Pro", Inter, Roboto, system-ui, sans-serif',
      }}
    >
      {/* ==================== 1. MODERN HEADER ==================== */}
      <div className="border-b border-slate-200 pb-5 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shadow-2xs shrink-0">
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
                Hệ thống Quản lý Giảng dạy & Đào tạo QuizMaster
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 block bg-blue-50 px-2.5 py-1 rounded border border-blue-100">
              THÔNG BÁO HỌC PHÍ & BÁO CÁO HỌC TẬP
            </span>
            <div className="text-xs font-semibold text-slate-700 mt-1">
              {data.teacherPhone ? `Hotline: ${data.teacherPhone}` : 'Giáo dục Chuyên nghiệp'}
            </div>
          </div>
        </div>

        {/* Large Clean Title */}
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

      {/* ==================== 2. STUDENT KPI SUMMARY STRIP ==================== */}
      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 mb-6 shadow-2xs">
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

        {/* Lesson Dates Row */}
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

      {/* ==================== 3. MAIN CONTENT: 2 BALANCED COLUMNS ==================== */}
      <div className="grid grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Nhận xét học tập, Lộ trình, Lịch học, Lời nhắn */}
        {hasLeftColumn && (
          <div className="col-span-7 flex flex-col justify-start p-5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-4">
            {/* NHẬN XÉT CỦA GIÁO VIÊN */}
            {hasComments && (
              <div>
                <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-800 uppercase pb-2 border-b border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>NHẬN XÉT CỦA GIÁO VIÊN</span>
                </div>
                <div className="mt-2 text-xs">
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

            {/* LỘ TRÌNH VÀ ĐỊNH HƯỚNG */}
            {hasRoadmap && (
              <div className={hasComments ? 'pt-3 border-t border-slate-100' : ''}>
                <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-800 uppercase pb-2 border-b border-slate-100">
                  <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>LỘ TRÌNH / ĐỊNH HƯỚNG THỜI GIAN TỚI</span>
                </div>
                <p
                  className="mt-2 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words font-medium pl-3 border-l-2 border-indigo-600"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {roadmapText}
                </p>
              </div>
            )}

            {/* LỊCH HỌC CHI TIẾT */}
            {hasSchedule && (
              <div className={hasComments || hasRoadmap ? 'pt-3 border-t border-slate-100' : ''}>
                <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-800 uppercase pb-2 border-b border-slate-100">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>LỊCH HỌC CHI TIẾT ({data.lessons.length})</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {data.lessons.map((l) => (
                    <div
                      key={l.id}
                      className="text-[11px] p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-700 truncate max-w-[200px]">
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

            {/* LỜI NHẮN */}
            {hasClosing && (
              <div
                className={
                  hasComments || hasRoadmap || hasSchedule ? 'pt-3 border-t border-slate-100' : ''
                }
              >
                <div className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-800 uppercase pb-1.5 border-b border-slate-100">
                  <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>LỜI NHẮN</span>
                </div>
                <p
                  className="mt-2 text-xs text-slate-600 italic font-medium leading-relaxed whitespace-pre-wrap break-words"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  "{closingText}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: Tổng học phí, Chi tiết, QR, STK, Ngân hàng */}
        <div
          className={`${
            hasLeftColumn ? 'col-span-5' : 'col-span-12 max-w-sm mx-auto'
          } flex flex-col justify-start p-5 rounded-2xl border border-slate-200/80 bg-white text-center shadow-2xs h-auto`}
        >
          <div>
            {/* Total Tuition Box */}
            <div className="bg-[#1E3A8A] text-white rounded-xl p-3.5 shadow-sm mb-3.5">
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

            {/* Detailed Financial Breakdown */}
            {toggles.showTuitionDetails && (
              <div className="text-[11px] space-y-1.5 mb-3.5 text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
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
              </div>
            )}

            {/* QR Payment Code Box - Controlled 180px, Tight Fit, Content-Driven Height */}
            {toggles.showQr && data.qrUrl && (
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs mb-3 mx-auto w-fit h-auto">
                <img
                  src={data.qrUrl}
                  alt="VietQR"
                  data-receipt-qr="true"
                  crossOrigin="anonymous"
                  className="w-[180px] h-[180px] object-contain rounded-lg block"
                  style={{ width: '180px', height: '180px', maxWidth: '180px', maxHeight: '180px' }}
                />
              </div>
            )}

            {/* Bank Info */}
            <div className="text-xs space-y-1">
              <div className="font-mono font-black text-slate-900 tracking-wider text-sm">
                STK: {data.accountNumber}
              </div>
              <div className="font-bold text-slate-700 text-xs">{data.bankName}</div>
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                CTK: {data.accountHolder}
              </div>
              {data.transferContent && (
                <div className="text-[10px] text-slate-600 mt-2 font-medium bg-slate-50 py-1.5 px-2 rounded border border-slate-100">
                  Nội dung:{' '}
                  <span className="font-bold text-[#1E3A8A]">{data.transferContent}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
