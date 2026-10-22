import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ArrowLeft,
  User,
  BookOpen,
  Calendar,
  Clock,
  CalendarDays,
  CreditCard,
  Percent,
  PlusCircle,
  QrCode,
  Edit3,
  Compass,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Printer,
  Save,
  RotateCcw,
  Trash2,
  Plus,
  Check,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/auth.store';
import { TeachingService } from '../../../services/teaching.service';
import { StudentService } from '../../../services/student.service';
import { API_BASE_URL } from '../../../services/api';
import { Lesson, TuitionRow, TeacherBankInfo } from '../../../types/teaching';
import {
  ReceiptData,
  ReceiptToggles,
  ReceiptTemplateType,
  QuickPresetItem,
  ReceiptDraft,
} from './types';
import {
  getStoredQuickPresets,
  saveStoredQuickPresets,
  resetStoredQuickPresets,
  loadReceiptDraft,
  saveReceiptDraft,
} from './receiptDraftStorage';
import { ReceiptPreview } from './ReceiptPreview';
import { exportReceiptToPng, exportReceiptToBlob } from './receiptExport';

interface TuitionReceiptBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: TuitionRow | null;
  selectedMonth: string; // YYYY-MM
  bankInfo: TeacherBankInfo;
  onOpenBankSetup?: () => void;
  onToast?: (toast: { type: 'success' | 'error' | 'info'; title: string }) => void;
}

export const TuitionReceiptBuilderModal: React.FC<TuitionReceiptBuilderModalProps> = ({
  isOpen,
  onClose,
  student,
  selectedMonth,
  bankInfo,
  onOpenBankSetup,
  onToast,
}) => {
  const { user } = useAuthStore();
  const receiptCardRef = useRef<HTMLDivElement>(null);

  // 1. Template Selection ('template-1' | 'template-2' | 'template-3')
  const [template, setTemplate] = useState<ReceiptTemplateType>('template-2');

  // 2. Section Visibility Toggles
  const [toggles, setToggles] = useState<ReceiptToggles>({
    showStudent: true,
    showClass: true,
    showPrepaid: true,
    showTuitionRate: true,
    showLessonCount: true,
    showTotalHours: true,
    showLessonDates: true,
    showDiscount: true,
    showSurcharge: true,
    showQr: true,
    showSchedule: false,
    showTuitionDetails: true,
    showComments: true,
    showRoadmap: true,
    showClosingMessage: true,
  });

  // 3. Period info
  const [periodTitle, setPeriodTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 4. Learning comments & Roadmap
  const [generalComment, setGeneralComment] = useState(
    'Em có tiến bộ rõ rệt, tốc độ làm bài và độ chính xác được cải thiện.\nEm cần chủ động hoàn thành đầy đủ bài tập.'
  );
  const [roadmap, setRoadmap] = useState(
    'Chuẩn bị ôn luyện để chuẩn bị cho các bài kiểm tra sắp tới'
  );
  const [closingMessage, setClosingMessage] = useState(
    'Cảm ơn phụ huynh đã đồng hành cùng em trong quá trình học tập.'
  );
  const [prepaidText, setPrepaidText] = useState('Không có khoản đóng trước');

  // 5. Lessons & Student phone fetched from API
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [studentPhone, setStudentPhone] = useState<string>('');
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 6. Accordion states for section 3 & 4
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isTuitionDetailsOpen, setIsTuitionDetailsOpen] = useState(false);

  // 7. Quick Presets state
  const [presets, setPresets] = useState<{
    general: QuickPresetItem[];
    roadmap: QuickPresetItem[];
  }>(getStoredQuickPresets);
  const [activePresetTab, setActivePresetTab] = useState<'general' | 'roadmap'>('general');
  const [newPresetText, setNewPresetText] = useState('');

  // 8. Draft status & export status
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // 9. Mobile/tablet responsive tab ('editor' | 'preview')
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  // Lock body scroll when full-screen workspace is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close workspace on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize or Load Draft when student or selectedMonth changes
  useEffect(() => {
    if (!student || !isOpen) return;

    // Default dates for the month
    const [yStr, mStr] = selectedMonth.split('-');
    const year = parseInt(yStr, 10) || new Date().getFullYear();
    const month = parseInt(mStr, 10) || new Date().getMonth() + 1;
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDate = new Date(year, month, 0).getDate();
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;
    const defaultTitle = `HỌC PHÍ THÁNG ${month}/${year}`;

    // Check if draft exists
    const teacherId = user?.id || 'teacher';
    const draft = loadReceiptDraft(teacherId, student.studentId, selectedMonth);

    if (draft) {
      setTemplate(draft.template || 'template-2');
      setToggles({
        ...toggles,
        ...(draft.toggles || {}),
        showComments: draft.toggles?.showComments !== undefined ? draft.toggles.showComments : true,
        showRoadmap: draft.toggles?.showRoadmap !== undefined ? draft.toggles.showRoadmap : true,
        showClosingMessage: draft.toggles?.showClosingMessage !== undefined ? draft.toggles.showClosingMessage : true,
      });
      setPeriodTitle(draft.periodTitle || defaultTitle);
      setStartDate(draft.startDate || firstDay);
      setEndDate(draft.endDate || lastDay);
      setGeneralComment(draft.learningComment ?? draft.generalComment ?? generalComment);
      setRoadmap(draft.learningRoadmap ?? draft.roadmap ?? roadmap);
      setClosingMessage(draft.closingMessage ?? closingMessage);
      if (draft.prepaidText) setPrepaidText(draft.prepaidText);
      setDraftSavedAt(draft.updatedAt || null);
    } else {
      setTemplate('template-2');
      setPeriodTitle(defaultTitle);
      setStartDate(firstDay);
      setEndDate(lastDay);
      setGeneralComment(
        'Em có tiến bộ rõ rệt, tốc độ làm bài và độ chính xác được cải thiện.\nEm cần chủ động hoàn thành đầy đủ bài tập.'
      );
      setRoadmap('Chuẩn bị ôn luyện để chuẩn bị cho các bài kiểm tra sắp tới');
      setClosingMessage('Cảm ơn phụ huynh đã đồng hành cùng em trong quá trình học tập.');
      setPrepaidText('Không có khoản đóng trước');
      setDraftSavedAt(null);
    }

    // Fetch lessons for dates & schedule
    setLoadingDetails(true);
    TeachingService.getLessons({
      studentId: student.studentId,
      classId: student.classId,
      month: selectedMonth,
    })
      .then((data) => {
        setLessons(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to load lessons for receipt builder', err);
      })
      .finally(() => {
        setLoadingDetails(false);
      });

    // Fetch student phone
    StudentService.getStudentDetail(student.studentId)
      .then((detail) => {
        if (detail?.student?.phone) setStudentPhone(detail.student.phone);
        else if (detail?.student?.parentPhone) setStudentPhone(detail.student.parentPhone);
      })
      .catch(() => {
        // ignore
      });
  }, [student, selectedMonth, isOpen, user?.id]);

  // Unique sorted lesson dates formatted as "04/10 - 08/10 - 14/10..."
  const lessonDatesFormatted = useMemo(() => {
    if (!lessons || lessons.length === 0) return '';
    const active = lessons.filter(
      (l) => l.status !== 'CANCELLED' && (!selectedMonth || l.date.startsWith(selectedMonth))
    );
    const dates = Array.from(new Set(active.map((l) => l.date))).sort();
    return dates
      .map((d) => {
        const parts = d.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
        return d;
      })
      .join(' - ');
  }, [lessons, selectedMonth]);

  // Formatted tuition rate
  const tuitionRateFormatted = useMemo(() => {
    if (lessons && lessons.length > 0) {
      const active = lessons.filter((l) => l.status !== 'CANCELLED');
      if (active.length > 0 && active[0].feePerLesson) {
        return `${Number(active[0].feePerLesson).toLocaleString('vi-VN')} đ`;
      }
    }
    if (student && student.lessonCount > 0) {
      const rate = Math.round(student.baseAmount / student.lessonCount);
      return `${rate.toLocaleString('vi-VN')} đ`;
    }
    return '250.000 đ';
  }, [lessons, student]);

  // VietQR Code generation via existing backend proxy (100% PRESERVED LOGIC)
  const qrUrl = useMemo(() => {
    if (!student || !bankInfo.bankCode || !bankInfo.accountNumber) return '';
    const amount =
      student.remainingAmount > 0 ? student.remainingAmount : student.totalAmount;
    const addInfo = `HP ${student.studentName} ${selectedMonth.replace('-', '')}`.substring(
      0,
      25
    );
    const params = new URLSearchParams({
      bankCode: bankInfo.bankCode,
      accountNumber: bankInfo.accountNumber,
      amount: String(amount),
      addInfo,
      accountName: bankInfo.accountHolder || '',
      v: '2',
    });
    return `${API_BASE_URL}/teacher/tuition/qr?${params.toString()}`;
  }, [student, bankInfo, selectedMonth]);

  // Assembled ReceiptData for live preview
  const receiptData: ReceiptData = useMemo(() => {
    if (!student) {
      return {} as ReceiptData;
    }

    return {
      studentId: student.studentId,
      studentName: student.studentName,
      studentPhone,
      className: student.className,
      prepaidText,
      tuitionRateFormatted,
      startDate,
      endDate,
      periodTitle,
      lessonCount: student.lessonCount,
      totalHours: student.totalHours,
      lessonDatesFormatted,
      lessons,
      learningComment: generalComment,
      generalComment,
      learningRoadmap: roadmap,
      roadmap,
      closingMessage,
      baseAmount: student.baseAmount,
      surcharge: student.surcharge,
      discount: student.discount,
      totalAmount: student.totalAmount,
      paidAmount: student.paidAmount,
      remainingAmount: student.remainingAmount,
      bankName: bankInfo.bankName,
      bankCode: bankInfo.bankCode,
      accountNumber: bankInfo.accountNumber,
      accountHolder: bankInfo.accountHolder,
      transferContent: `HP ${student.studentName} ${selectedMonth.replace('-', '')}`,
      qrUrl,
      teacherName: user?.name || bankInfo.accountHolder || 'Phương Anh',
      teacherPhone: user?.phone || '0582080327',
      template,
      toggles,
    };
  }, [
    student,
    studentPhone,
    prepaidText,
    tuitionRateFormatted,
    startDate,
    endDate,
    periodTitle,
    lessonDatesFormatted,
    lessons,
    generalComment,
    roadmap,
    closingMessage,
    bankInfo,
    selectedMonth,
    qrUrl,
    user,
    template,
    toggles,
  ]);

  // Toggle helper
  const handleToggle = (key: keyof ReceiptToggles) => {
    setToggles((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Quick Preset actions
  const handleInsertPreset = (text: string) => {
    if (activePresetTab === 'general') {
      setGeneralComment((prev) => {
        if (!prev.trim()) return text;
        return `${prev}\n${text}`;
      });
    } else {
      setRoadmap((prev) => {
        if (!prev.trim()) return text;
        return `${prev}\n${text}`;
      });
    }
    if (onToast) {
      onToast({
        type: 'info',
        title: `Đã chèn câu mẫu vào ${
          activePresetTab === 'general' ? 'Tổng quan' : 'Lộ trình'
        }`,
      });
    }
  };

  const handleSaveNewPreset = () => {
    if (!newPresetText.trim()) return;
    const newItem: QuickPresetItem = {
      id: `custom-preset-${Date.now()}`,
      category: activePresetTab,
      text: newPresetText.trim(),
      isCustom: true,
    };
    const updated = {
      ...presets,
      [activePresetTab]: [newItem, ...presets[activePresetTab]],
    };
    setPresets(updated);
    saveStoredQuickPresets(updated);
    setNewPresetText('');
    if (onToast) {
      onToast({ type: 'success', title: 'Đã lưu câu mẫu mới thành công!' });
    }
  };

  const handleDeletePreset = (id: string) => {
    const updated = {
      ...presets,
      [activePresetTab]: presets[activePresetTab].filter((p) => p.id !== id),
    };
    setPresets(updated);
    saveStoredQuickPresets(updated);
    if (onToast) {
      onToast({ type: 'info', title: 'Đã xóa câu mẫu' });
    }
  };

  const handleResetPresets = () => {
    const res = resetStoredQuickPresets();
    setPresets(res);
    if (onToast) {
      onToast({ type: 'info', title: 'Đã khôi phục các câu mẫu ban đầu' });
    }
  };

  // Draft save action
  const handleSaveDraft = () => {
    if (!student) return;
    const teacherId = user?.id || 'teacher';
    const nowStr = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const draft: ReceiptDraft = {
      studentId: student.studentId,
      month: selectedMonth,
      template,
      toggles,
      periodTitle,
      startDate,
      endDate,
      learningComment: generalComment,
      generalComment,
      learningRoadmap: roadmap,
      roadmap,
      closingMessage,
      prepaidText,
      tuitionRateFormatted,
      updatedAt: nowStr,
    };
    saveReceiptDraft(teacherId, student.studentId, selectedMonth, draft);
    setDraftSavedAt(nowStr);
    if (onToast) {
      onToast({ type: 'success', title: `Đã lưu bản nháp thành công lúc ${nowStr}!` });
    }
  };

  // Export Receipt as PNG
  const handleDownloadImage = async () => {
    if (!receiptCardRef.current || !student) return;
    setIsExporting(true);

    try {
      const cleanStudentName = student.studentName.replace(/\s+/g, '_');
      const filename = `PhieuHocPhi_${cleanStudentName}_${selectedMonth}.png`;
      const fallbackInfo = {
        accountNumber: bankInfo.accountNumber,
        bankName: bankInfo.bankName,
        accountHolder: bankInfo.accountHolder,
        transferContent: `HP ${student.studentName} ${selectedMonth.replace('-', '')}`.substring(
          0,
          25
        ),
        amountFormatted: Number(
          student.remainingAmount > 0 ? student.remainingAmount : student.totalAmount
        ).toLocaleString('vi-VN'),
      };

      await exportReceiptToPng(receiptCardRef.current, filename, fallbackInfo);

      if (onToast) {
        onToast({ type: 'success', title: 'Đã xuất phiếu học phí dạng ảnh thành công!' });
      }
    } catch (err) {
      console.error('Failed to export receipt image', err);
      if (onToast) {
        onToast({ type: 'error', title: 'Lỗi khi tạo ảnh phiếu học phí' });
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Receipt Image to Clipboard
  const handleCopyImage = async () => {
    if (!receiptCardRef.current || !student) return;
    setIsExporting(true);

    try {
      const fallbackInfo = {
        accountNumber: bankInfo.accountNumber,
        bankName: bankInfo.bankName,
        accountHolder: bankInfo.accountHolder,
        transferContent: `HP ${student.studentName} ${selectedMonth.replace('-', '')}`.substring(
          0,
          25
        ),
        amountFormatted: Number(
          student.remainingAmount > 0 ? student.remainingAmount : student.totalAmount
        ).toLocaleString('vi-VN'),
      };

      const blob = await exportReceiptToBlob(receiptCardRef.current, fallbackInfo);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      if (onToast) {
        onToast({
          type: 'success',
          title: 'Đã sao chép ảnh phiếu học phí vào bộ nhớ tạm (Clipboard)!',
        });
      }
    } catch (err) {
      console.error('Failed to copy receipt image', err);
      if (onToast) {
        onToast({
          type: 'error',
          title: 'Không thể sao chép ảnh (trình duyệt không hỗ trợ trực tiếp)',
        });
      }
    } finally {
      setIsExporting(false);
    }
  };


  // Print Receipt / PDF
  const handlePrintPdf = () => {
    window.print();
  };

  if (!isOpen || !student) return null;

  return createPortal(
    <div
      className="fixed inset-0 w-screen h-[100dvh] z-[9999] bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden font-sans select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Tạo và xuất phiếu học phí"
    >
      {/* Print Stylesheet for clean A4 PDF Export */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #tuition-receipt-card,
          #tuition-receipt-card * {
            visibility: visible !important;
          }
          #tuition-receipt-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* ==================== 1. WORKSPACE FIXED HEADER (64px - 72px) ==================== */}
      <header className="h-16 md:h-[68px] shrink-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between gap-3 shadow-2xs">
        {/* Left Side: Back Arrow + Breadcrumbs + Student Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 md:w-auto md:h-auto md:px-3 md:py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs shrink-0"
            title="Quay lại trang Học phí (Esc)"
          >
            <ArrowLeft className="w-4 h-4 md:mr-1.5 text-slate-500" />
            <span className="hidden md:inline">Quay lại</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0" />

          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium leading-none mb-1">
              <span>Học phí</span>
              <span>/</span>
              <span className="text-[#1E3A8A] dark:text-blue-400 font-semibold">Tạo phiếu</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white tracking-tight shrink-0">
                Tạo Phiếu Học Phí
              </h1>
              <span className="text-xs text-slate-300 dark:text-slate-600 hidden sm:inline">·</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate hidden sm:inline">
                {student.studentName} · STK {bankInfo.accountNumber}
                {bankInfo.bankCode ? ` (${bankInfo.bankCode})` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Template Selector */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0">
          <span className="text-[11px] font-bold text-slate-500 pl-2 pr-1 hidden lg:inline">
            Mẫu phiếu:
          </span>
          <button
            type="button"
            onClick={() => setTemplate('template-1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              template === 'template-1'
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Mẫu 1: Classic Education (Hóa đơn truyền thống & trang trọng)"
          >
            Mẫu 1
          </button>
          <button
            type="button"
            onClick={() => setTemplate('template-2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              template === 'template-2'
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Mẫu 2: Modern Education Card (Khuyên dùng)"
          >
            <span>Mẫu 2</span>
            <span className="text-[9px] bg-amber-400 text-slate-900 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              Khuyên dùng
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTemplate('template-3')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              template === 'template-3'
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Mẫu 3: Education Report (Báo cáo học tập & Học phí)"
          >
            Mẫu 3
          </button>
        </div>

        {/* Right Corner: Close Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
            title="Đóng workspace (Esc)"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Đóng</span>
          </button>
        </div>
      </header>

      {/* ==================== MOBILE / TABLET SUBHEADER TABS (< LG) ==================== */}
      <div className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between gap-2 z-20">
        {/* Template Quick Switcher for Mobile */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setTemplate('template-1')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              template === 'template-1'
                ? 'bg-[#1E3A8A] text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Mẫu 1
          </button>
          <button
            type="button"
            onClick={() => setTemplate('template-2')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              template === 'template-2'
                ? 'bg-[#1E3A8A] text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Mẫu 2 (Gợi ý)
          </button>
          <button
            type="button"
            onClick={() => setTemplate('template-3')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              template === 'template-3'
                ? 'bg-[#1E3A8A] text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Mẫu 3
          </button>
        </div>

        {/* View Mode Toggle (Editor vs Preview) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            className={`px-3 py-1 rounded-md transition-all ${
              mobileTab === 'editor'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Chỉnh sửa
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
              mobileTab === 'preview'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Xem trước</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        </div>
      </div>

      {/* ==================== 2. MAIN 2-COLUMN WORKSPACE BODY ==================== */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* ==================== LEFT COLUMN: EDITOR PANEL ==================== */}
        <div
          className={`w-full lg:w-[44%] xl:w-[42%] min-w-0 lg:min-w-[430px] lg:max-w-[580px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden ${
            mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6 min-h-0 select-text">
            {/* CARD 1: THÔNG TIN HỌC SINH (TOGGLES) */}
            <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Thông tin học sinh
                </h3>
                <p className="text-[11px] text-slate-400">
                  Chọn thông tin hiển thị trên phiếu
                </p>
              </div>

              {/* 2-Column Grid of Toggle Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Học sinh */}
                <div
                  onClick={() => handleToggle('showStudent')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Học sinh</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                      {student.studentName}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showStudent}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 2. Lớp / Môn */}
                <div
                  onClick={() => handleToggle('showClass')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Lớp / Môn</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block max-w-[130px]">
                      {student.className}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showClass}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 3. Khoản đóng trước */}
                <div
                  onClick={() => handleToggle('showPrepaid')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Khoản đóng trước</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block max-w-[130px]">
                      {prepaidText}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showPrepaid}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 4. Học phí áp dụng */}
                <div
                  onClick={() => handleToggle('showTuitionRate')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Học phí áp dụng</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                      {tuitionRateFormatted}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showTuitionRate}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 5. Số buổi học */}
                <div
                  onClick={() => handleToggle('showLessonCount')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Số buổi học</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {student.lessonCount}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showLessonCount}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 6. Số giờ tích lũy */}
                <div
                  onClick={() => handleToggle('showTotalHours')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Số giờ tích lũy</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {student.totalHours} giờ
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showTotalHours}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 7. Ngày học */}
                <div
                  onClick={() => handleToggle('showLessonDates')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Ngày học</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {toggles.showLessonDates ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showLessonDates}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 8. Giảm học phí */}
                <div
                  onClick={() => handleToggle('showDiscount')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Giảm học phí</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {Number(student.discount || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showDiscount}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 9. Phụ thu */}
                <div
                  onClick={() => handleToggle('showSurcharge')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Phụ thu</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {Number(student.surcharge || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showSurcharge}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 10. QR code */}
                <div
                  onClick={() => handleToggle('showQr')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Mã VietQR</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {toggles.showQr ? 'Bật mã QR' : 'Tắt mã QR'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showQr}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 11. Nhận xét học tập */}
                <div
                  onClick={() => handleToggle('showComments')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Nhận xét học tập</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {toggles.showComments ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showComments}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 12. Lộ trình học tập */}
                <div
                  onClick={() => handleToggle('showRoadmap')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Lộ trình học tập</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {toggles.showRoadmap ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showRoadmap}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>

                {/* 13. Lời nhắn cuối */}
                <div
                  onClick={() => handleToggle('showClosingMessage')}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div className="pr-2">
                    <span className="text-[11px] text-slate-400 block">Lời nhắn cuối</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {toggles.showClosingMessage ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={toggles.showClosingMessage}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 01: THÔNG TIN KỲ HỌC */}
            <div className="bg-white dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#1E3A8A] text-white text-[10px] font-black flex items-center justify-center">
                  01
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Thông tin kỳ học
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Chọn khoảng thời gian và tiêu đề của phiếu
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Tiêu đề kỳ học
                </label>
                <input
                  type="text"
                  value={periodTitle}
                  onChange={(e) => setPeriodTitle(e.target.value)}
                  aria-label="Tiêu đề kỳ học"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                />
              </div>
            </div>

            {/* SECTION 02: NỘI DUNG ĐÁNH GIÁ (MẪU NHẬN XÉT NHANH) */}
            <div className="bg-white dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#1E3A8A] text-white text-[10px] font-black flex items-center justify-center">
                  02
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Nội dung đánh giá
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Phiếu bên phải cập nhật ngay khi bạn nhập
                  </p>
                </div>
              </div>

              {/* Mẫu nhận xét nhanh Box */}
              <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Mẫu nhận xét nhanh
                  </span>
                  <button
                    type="button"
                    onClick={handleResetPresets}
                    className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Khôi phục mẫu gốc</span>
                  </button>
                </div>

                {/* Subtitle */}
                <p className="text-[11px] text-slate-500">
                  Chọn câu mẫu rồi sửa trực tiếp trong ô nhận xét nếu cần.
                </p>

                {/* Preset Category Tabs */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePresetTab('general')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activePresetTab === 'general'
                        ? 'bg-[#1E3A8A] text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    Tổng quan
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePresetTab('roadmap')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activePresetTab === 'roadmap'
                        ? 'bg-[#1E3A8A] text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    LỘ TRÌNH
                  </button>
                </div>

                {/* Grid of Preset Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {presets[activePresetTab].map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between text-xs space-y-2 hover:border-blue-300 transition-colors shadow-2xs"
                    >
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px] font-medium">
                        {p.text}
                      </p>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleInsertPreset(p.text)}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Chèn vào {activePresetTab === 'general' ? 'Tổng quan' : 'Lộ trình'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(p.id)}
                          className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors"
                          title="Xóa câu mẫu này"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Thêm câu mẫu mới */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Thêm câu mẫu mới
                  </label>
                  <textarea
                    rows={2}
                    value={newPresetText}
                    onChange={(e) => setNewPresetText(e.target.value)}
                    aria-label={`Thêm câu mẫu mới cho ${
                      activePresetTab === 'general' ? 'Tổng quan' : 'Lộ trình'
                    }`}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Tối đa 600 ký tự</span>
                    <button
                      type="button"
                      onClick={handleSaveNewPreset}
                      disabled={!newPresetText.trim()}
                      className="px-3 py-1.5 rounded-lg bg-[#1E3A8A] hover:bg-blue-800 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      Lưu câu mẫu
                    </button>
                  </div>
                </div>
              </div>

              {/* PHẦN 01 NHẬN XÉT HỌC TẬP */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                    <span>PHẦN 01: NHẬN XÉT HỌC TẬP</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggle('showComments')}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                      toggles.showComments
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {toggles.showComments ? 'Đang bật' : 'Đang tắt'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={generalComment}
                  onChange={(e) => setGeneralComment(e.target.value)}
                  aria-label="Nhận xét tổng quan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* PHẦN 02 LỘ TRÌNH */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-500" />
                    <span>PHẦN 02: LỘ TRÌNH</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggle('showRoadmap')}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                      toggles.showRoadmap
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {toggles.showRoadmap ? 'Đang bật' : 'Đang tắt'}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={roadmap}
                  onChange={(e) => setRoadmap(e.target.value)}
                  aria-label="Lộ trình ôn luyện và mục tiêu"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* PHẦN 03 LỊCH HỌC (ACCORDION) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsScheduleOpen(!isScheduleOpen);
                    handleToggle('showSchedule');
                  }}
                  className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600"
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    <span>PHẦN 03: LỊCH HỌC</span>
                  </span>
                  {isScheduleOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {isScheduleOpen && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1.5">
                    <p className="text-[11px] text-slate-500">
                      Hiển thị danh sách {lessons.length} buổi học trong kỳ trên phiếu.
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {lessons.map((l) => (
                        <div
                          key={l.id}
                          className="flex justify-between items-center text-[11px] p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600"
                        >
                          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                            {l.date} - {l.title}
                          </span>
                          <span className="text-slate-500 font-mono">
                            {l.startTime} - {l.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* PHẦN 04 HỌC PHÍ (ACCORDION) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsTuitionDetailsOpen(!isTuitionDetailsOpen);
                    handleToggle('showTuitionDetails');
                  }}
                  className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600"
                >
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-purple-500" />
                    <span>PHẦN 04: HỌC PHÍ</span>
                  </span>
                  {isTuitionDetailsOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {isTuitionDetailsOpen && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Học phí gốc:</span>
                      <span className="font-bold">
                        {Number(student.baseAmount).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    {student.surcharge > 0 && (
                      <div className="flex justify-between text-indigo-600">
                        <span>Phụ thu:</span>
                        <span>+{Number(student.surcharge).toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                    {student.discount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Giảm trừ:</span>
                        <span>-{Number(student.discount).toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span>Tổng cần thu:</span>
                      <span className="text-blue-600 font-black">
                        {Number(student.remainingAmount).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* CÂU KẾT */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    CÂU KẾT / LỜI NHẮN
                  </label>
                  <button
                    type="button"
                    onClick={() => handleToggle('showClosingMessage')}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                      toggles.showClosingMessage
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {toggles.showClosingMessage ? 'Đang bật' : 'Đang tắt'}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={closingMessage}
                  onChange={(e) => setClosingMessage(e.target.value)}
                  aria-label="Lời nhắn cuối phiếu dành cho phụ huynh"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ==================== RIGHT COLUMN: LIVE PREVIEW PANEL ==================== */}
        <div
          className={`flex-1 min-w-0 min-h-0 bg-slate-100/90 dark:bg-slate-950 flex flex-col overflow-hidden p-3 sm:p-5 md:p-6 ${
            mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <ReceiptPreview ref={receiptCardRef} data={receiptData} />
        </div>
      </main>

      {/* ==================== 3. FIXED FOOTER ACTION BAR ==================== */}
      <footer className="h-16 md:h-18 px-4 md:px-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0 z-30 shadow-2xs">
        {/* Draft Status Note & Left Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span>Lưu bản nháp</span>
          </button>

          <span className="text-[11px] text-slate-400 hidden xl:inline">
            {draftSavedAt ? `(Đã lưu bản nháp lúc ${draftSavedAt})` : 'Chưa lưu bản nháp kỳ này'}
          </span>
        </div>

        {/* Right Actions: Export CTAs */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={handlePrintPdf}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs flex items-center gap-1.5"
            title="Xuất phiếu PDF qua hộp thoại in của trình duyệt"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Xuất PDF</span>
          </button>

          <button
            type="button"
            onClick={handleCopyImage}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
            title="Sao chép ảnh phiếu vào clipboard để gửi Zalo / Messenger"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy ảnh</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1E3A8A] hover:bg-blue-800 text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50 tracking-wide"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Đang tạo ảnh...' : 'Xuất phiếu (ảnh)'}</span>
          </button>
        </div>
      </footer>
    </div>,
    document.body
  );
};
