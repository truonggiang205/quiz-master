import React from 'react';
import {
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  Clock,
  CalendarDays,
  CheckCircle2,
  Compass,
  MessageSquare,
  CreditCard,
  QrCode,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { ReceiptData } from './types';

interface ReceiptTemplateProps {
  data: ReceiptData;
}

export const ReceiptTemplate3: React.FC<ReceiptTemplateProps> = ({ data }) => {
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
      className="w-full bg-white text-slate-800 p-6 sm:p-9 rounded-2xl shadow-sm border-2 border-slate-300 select-text relative overflow-visible"
      style={{
        height: 'auto',
        minHeight: 0,
        maxHeight: 'none',
        overflow: 'visible',
        fontFamily: '"Be Vietnam Pro", "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      }}
    >
      {/* ==================== FORMAL ACADEMIC HEADER ==================== */}
      <div className="border-b-2 border-[#1E3A8A] pb-5 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-[#1E3A8A]">
                QUIZMASTER EDUCATION
              </div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                {data.teacherName}
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Hệ thống Quản lý Giảng dạy & Đào tạo Chuẩn hóa
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-xs font-bold text-slate-700">
              {data.teacherPhone ? `Hotline: ${data.teacherPhone}` : 'Phòng Đào tạo'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Mã hồ sơ: HP-{data.studentId.substring(0, 8).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Strong Document Title */}
        <div className="text-center mt-5 pt-3 border-t border-slate-200">
          <h2 className="text-xl sm:text-2xl font-black text-[#1E3A8A] tracking-wider uppercase">
            {data.periodTitle || 'PHIẾU HỌC PHÍ & BÁO CÁO HỌC TẬP'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Kỳ học: <span className="font-semibold text-slate-700">{data.startDate}</span> đến{' '}
            <span className="font-semibold text-slate-700">{data.endDate}</span>
          </p>
        </div>
      </div>

      {/* ==================== 1. THÔNG TIN HỌC TẬP (FORMAL TABLE) ==================== */}
      <div className="mb-6">
        <div className="bg-[#1E3A8A] text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          <span>1. THÔNG TIN HỌC TẬP</span>
        </div>
        <div className="border border-t-0 border-slate-200 rounded-b-lg overflow-hidden bg-slate-50/40">
          <div className="grid grid-cols-4 divide-x divide-slate-200 text-xs">
            {toggles.showStudent && (
              <div className="p-3">
                <span className="text-[11px] text-slate-400 block font-medium">Họ và tên:</span>
                <span
                  className="font-bold text-slate-900 text-sm break-words"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {data.studentName}
                </span>
              </div>
            )}
            {toggles.showClass && (
              <div className="p-3">
                <span className="text-[11px] text-slate-400 block font-medium">Lớp / Khóa học:</span>
                <span
                  className="font-semibold text-slate-800 text-xs break-words"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {data.className}
                </span>
              </div>
            )}
            {toggles.showLessonCount && (
              <div className="p-3">
                <span className="text-[11px] text-slate-400 block font-medium">Số buổi học:</span>
                <span className="font-bold text-slate-900 text-sm">{data.lessonCount} buổi</span>
              </div>
            )}
            {toggles.showTotalHours && (
              <div className="p-3">
                <span className="text-[11px] text-slate-400 block font-medium">Tổng thời lượng:</span>
                <span className="font-bold text-slate-900 text-sm">{data.totalHours} giờ</span>
              </div>
            )}
          </div>
          {toggles.showLessonDates && data.lessonDatesFormatted && (
            <div className="p-3 border-t border-slate-200 bg-white text-xs flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#1E3A8A] shrink-0" />
              <span className="font-semibold text-slate-500 shrink-0">Các ngày học:</span>
              <span
                className="font-medium text-slate-800 leading-relaxed break-words"
                style={{ overflowWrap: 'anywhere' }}
              >
                {data.lessonDatesFormatted}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ==================== 2. NHẬN XÉT CỦA GIÁO VIÊN ==================== */}
      {hasComments && (
        <div className="mb-6">
          <div className="bg-[#1E3A8A] text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>2. NHẬN XÉT CỦA GIÁO VIÊN</span>
          </div>
          <div className="border border-t-0 border-slate-200 rounded-b-lg p-4 bg-white text-xs space-y-1">
            <div className="font-bold text-slate-800 text-xs">Tổng quan đánh giá:</div>
            <p
              className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words font-medium pl-3 border-l-2 border-[#1E3A8A]"
              style={{ overflowWrap: 'anywhere' }}
            >
              {commentText}
            </p>
          </div>
        </div>
      )}

      {/* ==================== 3. LỘ TRÌNH HỌC TẬP ==================== */}
      {hasRoadmap && (
        <div className="mb-6">
          <div className="bg-[#1E3A8A] text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-3.5 h-3.5" />
            <span>3. LỘ TRÌNH & MỤC TIÊU TIẾP THEO</span>
          </div>
          <div className="border border-t-0 border-slate-200 rounded-b-lg p-4 bg-white text-xs">
            <p
              className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words font-medium pl-3 border-l-2 border-indigo-600"
              style={{ overflowWrap: 'anywhere' }}
            >
              {roadmapText}
            </p>
          </div>
        </div>
      )}

      {/* ==================== 4. LỊCH HỌC (LESSON LOG) ==================== */}
      {hasSchedule && (
        <div className="mb-6">
          <div className="bg-[#1E3A8A] text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>4. NHẬT KÝ CÁC BUỔI HỌC ({data.lessons.length})</span>
          </div>
          <div className="border border-t-0 border-slate-200 rounded-b-lg overflow-hidden bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold">
                  <th className="py-2 px-3">STT</th>
                  <th className="py-2 px-3">Ngày học</th>
                  <th className="py-2 px-3">Thời gian</th>
                  <th className="py-2 px-3 text-right">Thời lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lessons.map((l, idx) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{l.date}</td>
                    <td className="py-2 px-3 text-slate-600">
                      {l.startTime} – {l.endTime}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                      {l.duration} giờ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== 5. THÔNG TIN THANH TOÁN (FORMAL INVOICE) ==================== */}
      <div className="mb-6">
        <div className="bg-[#1E3A8A] text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5" />
          <span>5. THÔNG TIN THANH TOÁN & HỌC PHÍ</span>
        </div>
        <div className="border border-t-0 border-slate-200 rounded-b-lg p-4 bg-white">
          <div className="flex flex-row items-stretch gap-5">
            {/* Financial Details Table */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <table className="w-full text-xs mb-3 border-collapse">
                <tbody className="divide-y divide-slate-100">
                  {toggles.showTuitionDetails && (
                    <>
                      <tr>
                        <td className="py-1.5 text-slate-500">Học phí định mức:</td>
                        <td className="py-1.5 text-right font-semibold text-slate-800">
                          {Number(data.baseAmount).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                      {toggles.showSurcharge && data.surcharge > 0 && (
                        <tr>
                          <td className="py-1.5 text-indigo-700 font-medium">Khoản phụ thu:</td>
                          <td className="py-1.5 text-right font-semibold text-indigo-700">
                            +{Number(data.surcharge).toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      )}
                      {toggles.showDiscount && data.discount > 0 && (
                        <tr>
                          <td className="py-1.5 text-rose-600 font-medium">Khoản miễn giảm:</td>
                          <td className="py-1.5 text-right font-semibold text-rose-600">
                            -{Number(data.discount).toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      )}
                      {data.paidAmount > 0 && (
                        <tr>
                          <td className="py-1.5 text-emerald-700 font-medium">Đã thanh toán:</td>
                          <td className="py-1.5 text-right font-semibold text-emerald-700">
                            {Number(data.paidAmount).toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                  <tr className="border-t-2 border-slate-200">
                    <td className="py-2 text-sm font-black text-[#1E3A8A] uppercase">
                      TỔNG HỌC PHÍ PHẢI ĐÓNG:
                    </td>
                    <td className="py-2 text-right text-base font-black text-[#1E3A8A]">
                      {data.remainingAmount > 0
                        ? Number(data.remainingAmount).toLocaleString('vi-VN')
                        : Number(data.totalAmount).toLocaleString('vi-VN')}{' '}
                      đ
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Bank Details */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tài khoản:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {data.accountNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngân hàng:</span>
                  <span className="font-bold text-slate-800">{data.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Chủ tài khoản:</span>
                  <span className="font-bold text-slate-800 uppercase">{data.accountHolder}</span>
                </div>
                {data.transferContent && (
                  <div className="pt-1.5 border-t border-slate-200/60 flex justify-between items-center">
                    <span className="text-slate-500">Cú pháp:</span>
                    <span className="font-bold text-[#1E3A8A] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {data.transferContent}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* QR Payment Box */}
            {toggles.showQr && data.qrUrl && (
              <div className="w-[230px] shrink-0 flex flex-col items-center justify-center text-center p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#1E3A8A] mb-2 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>MÃ VIETQR CHÍNH THỨC</span>
                </span>

                <div className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs mb-2 mx-auto w-fit h-auto flex items-center justify-center">
                  <img
                    src={data.qrUrl}
                    alt="VietQR"
                    data-receipt-qr="true"
                    crossOrigin="anonymous"
                    className="w-[180px] h-[180px] object-contain rounded-lg block"
                    style={{ width: '180px', height: '180px', maxWidth: '180px', maxHeight: '180px' }}
                  />
                </div>

                <div className="text-[10px] text-slate-500 font-medium">
                  Quét mã qua ứng dụng ngân hàng để tự động điền STK & số tiền
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== 6. LỜI NHẮN TỪ GIÁO VIÊN & CHỮ KÝ ==================== */}
      {hasClosing && (
        <div className="mb-4">
          <div className="bg-[#1E3A8A] text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>6. LỜI NHẮN TỪ GIÁO VIÊN</span>
          </div>
          <div className="border border-t-0 border-slate-200 rounded-b-lg p-4 bg-white text-xs">
            <p
              className="text-slate-600 italic font-medium leading-relaxed whitespace-pre-wrap break-words pl-3 border-l-2 border-slate-400"
              style={{ overflowWrap: 'anywhere' }}
            >
              "{closingText}"
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">
                  Giáo viên phụ trách
                </span>
                <span className="font-extrabold text-slate-800 text-xs block mt-0.5">
                  {data.teacherName}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
