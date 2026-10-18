import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Plus,
  Download,
  Upload,
  Search,
  Calendar,
  Edit2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings2,
  Clock,
  Sparkles,
  BookOpen,
  MessageSquare,
  StickyNote,
  CheckSquare,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { TeachingService } from '../../services/teaching.service';
import { ClassroomService } from '../../services/classroom.service';
import { Modal } from '../../components/common/Modal';
import { UserAvatar } from '../../components/common/UserAvatar';
import type { LearningLog, Lesson, SaveLearningLogPayload } from '../../types/teaching';
import type { Classroom } from '../../types/classroom';
import { useSearchParams } from 'react-router-dom';

interface RosterStudent {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  className: string;
  classId: string;
  subject?: string;
  accentColor?: string;
}

interface ColumnPreferences {
  fee: boolean;
  content: boolean;
  homework: boolean;
  attitude: boolean;
  comment: boolean;
  note: boolean;
}

const CLASS_ACCENT_COLORS = [
  '#6366F1', // indigo
  '#3B82F6', // blue
  '#10B981', // emerald
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EC4899', // pink
  '#06B6D4', // cyan
];

export const TeacherLearningLogsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialLessonId = searchParams.get('lessonId') || '';
  const initialClassId = searchParams.get('classId') || 'ALL';

  const [logs, setLogs] = useState<LearningLog[]>([]);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Active student selection
  const [activeStudentId, setActiveStudentId] = useState<string>('');

  // Month state (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7),
  );

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterLessonId, setFilterLessonId] = useState<string>(initialLessonId);

  // Column preferences
  const [columns, setColumns] = useState<ColumnPreferences>({
    fee: true,
    content: true,
    homework: true,
    attitude: true,
    comment: true,
    note: true,
  });
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  // Accordion state for class groups in left sidebar
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LearningLog | null>(null);

  // Log Edit Form
  const [editFormData, setEditFormData] = useState<SaveLearningLogPayload>({
    lessonId: '',
    studentId: '',
    content: '',
    homework: '',
    attitude: 'Tốt',
    comment: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Responsive layout state (breakpoint at lg: 1024px)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Excel Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; errors: string[] } | null>(null);

  // Ref for DOM snapshot capture
  const captureRef = useRef<HTMLDivElement>(null);
  const exportDocRef = useRef<HTMLDivElement>(null);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  // Close column picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
        setIsColumnPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load teacher classes
  useEffect(() => {
    ClassroomService.getTeacherClasses()
      .then((data) => {
        setClasses(data);
        const initExpanded: Record<string, boolean> = {};
        data.forEach((c) => {
          initExpanded[c.id] = true;
        });
        setExpandedClasses(initExpanded);
      })
      .catch((err) => console.error('Failed to load classes', err));
  }, []);

  // Load teacher lessons for the selected month and class
  useEffect(() => {
    TeachingService.getLessons({
      classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
      month: selectedMonth || undefined,
    })
      .then((data) => setLessons(data))
      .catch((err) => console.error('Failed to load lessons', err));
  }, [selectedClassId, selectedMonth]);

  // Fetch logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await TeachingService.getLogs({
        month: selectedMonth || undefined,
        classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
        lessonId: filterLessonId || undefined,
        search: searchKeyword || undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch learning logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedMonth, selectedClassId, filterLessonId, searchKeyword]);

  // Build full list of students across classes and logs
  const rosterStudents = useMemo(() => {
    const studentMap = new Map<string, RosterStudent>();

    // 1. Add students from loaded classes
    classes.forEach((cls, classIdx) => {
      const accent = CLASS_ACCENT_COLORS[classIdx % CLASS_ACCENT_COLORS.length];
      if (cls.students && cls.students.length > 0) {
        cls.students.forEach((s) => {
          if (!studentMap.has(s.id)) {
            studentMap.set(s.id, {
              id: s.id,
              name: s.name,
              email: s.email,
              avatar: s.avatar,
              className: cls.name,
              classId: cls.id,
              subject: cls.subject || 'Tổng hợp',
              accentColor: accent,
            });
          }
        });
      }
    });

    // 2. Add students found in logs (e.g. from tests or historical records)
    logs.forEach((log) => {
      if (log.student && !studentMap.has(log.student.id)) {
        studentMap.set(log.student.id, {
          id: log.student.id,
          name: log.student.name,
          email: log.student.email,
          avatar: log.student.avatar,
          className: log.class?.name || 'Lớp học',
          classId: log.classId,
          subject: log.class?.subject || 'Tổng hợp',
          accentColor: CLASS_ACCENT_COLORS[0],
        });
      }
    });

    // 3. Add students found in lesson participants
    lessons.forEach((l) => {
      if (l.participants) {
        l.participants.forEach((p) => {
          if (p.student && !studentMap.has(p.student.id)) {
            studentMap.set(p.student.id, {
              id: p.student.id,
              name: p.student.name,
              email: p.student.email,
              avatar: p.student.avatar,
              className: l.class?.name || 'Lớp học',
              classId: l.classId,
              subject: l.class?.subject || 'Tổng hợp',
              accentColor: CLASS_ACCENT_COLORS[1],
            });
          }
        });
      }
    });

    return Array.from(studentMap.values());
  }, [classes, logs, lessons]);

  // Set default active student
  useEffect(() => {
    if (activeStudentId && rosterStudents.some((s) => s.id === activeStudentId)) {
      return;
    }
    // If a search keyword matches a log, prioritize that log's student
    if (searchKeyword && logs.length > 0) {
      const match = logs.find(
        (l) =>
          l.content?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          l.student?.name?.toLowerCase().includes(searchKeyword.toLowerCase()),
      );
      if (match?.student?.id) {
        setActiveStudentId(match.student.id);
        return;
      }
    }
    // Or if logs exist, default to first student with log
    if (logs.length > 0 && logs[0].student?.id) {
      setActiveStudentId(logs[0].student.id);
      return;
    }
    // Otherwise first roster student
    if (rosterStudents.length > 0) {
      setActiveStudentId(rosterStudents[0].id);
    }
  }, [rosterStudents, logs, searchKeyword]);

  // Filter roster students by search keyword and class filter
  const visibleStudents = useMemo(() => {
    return rosterStudents.filter((student) => {
      if (selectedClassId !== 'ALL' && student.classId !== selectedClassId) {
        return false;
      }
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchesName = student.name.toLowerCase().includes(query);
        const matchesEmail = student.email?.toLowerCase().includes(query);
        const matchesSubject = student.subject?.toLowerCase().includes(query);
        const matchesClass = student.className.toLowerCase().includes(query);
        const matchesLog = logs.some(
          (l) =>
            l.studentId === student.id &&
            (l.content?.toLowerCase().includes(query) ||
              l.homework?.toLowerCase().includes(query) ||
              l.comment?.toLowerCase().includes(query)),
        );
        return matchesName || matchesEmail || matchesSubject || matchesClass || matchesLog;
      }
      return true;
    });
  }, [rosterStudents, selectedClassId, searchKeyword, logs]);

  // Group visible students by class
  const classGroups = useMemo(() => {
    const map = new Map<string, { classId: string; className: string; accentColor: string; students: RosterStudent[] }>();
    visibleStudents.forEach((student) => {
      if (!map.has(student.classId)) {
        map.set(student.classId, {
          classId: student.classId,
          className: student.className,
          accentColor: student.accentColor || '#6366F1',
          students: [],
        });
      }
      map.get(student.classId)!.students.push(student);
    });
    return Array.from(map.values());
  }, [visibleStudents]);

  // Active student object
  const activeStudent = useMemo(() => {
    return (
      rosterStudents.find((s) => s.id === activeStudentId) ||
      (rosterStudents.length > 0 ? rosterStudents[0] : null)
    );
  }, [rosterStudents, activeStudentId]);

  // Student descriptive subtitle (e.g. Gia sư cá nhân • Kèm 1-1: Hà Trường Giang)
  const studentSubtitle = useMemo(() => {
    if (!activeStudent) return 'Theo dõi tiến trình bài tập và nhận xét';
    if (activeStudent.subject && activeStudent.subject !== 'Tổng hợp') {
      return `${activeStudent.subject} • ${activeStudent.className}`;
    }
    if (activeStudent.className.toLowerCase().includes('kèm 1-1')) {
      return `Gia sư cá nhân • ${activeStudent.className}`;
    }
    return `${activeStudent.subject || 'Tổng hợp'} • ${activeStudent.className}`;
  }, [activeStudent]);

  // Horizontal student tabs: students from the active student's class, or all visible students
  const stripStudents = useMemo(() => {
    if (!activeStudent) return visibleStudents;
    const sameClass = visibleStudents.filter((s) => s.classId === activeStudent.classId);
    return sameClass.length > 0 ? sameClass : visibleStudents;
  }, [visibleStudents, activeStudent]);

  // Switch student index
  const handleShiftStudent = (delta: number) => {
    if (stripStudents.length === 0) return;
    const currentIdx = stripStudents.findIndex((s) => s.id === activeStudentId);
    let newIdx = currentIdx + delta;
    if (newIdx < 0) newIdx = stripStudents.length - 1;
    if (newIdx >= stripStudents.length) newIdx = 0;
    setActiveStudentId(stripStudents[newIdx].id);
  };

  // Build sessions table rows for active student in the selected month
  const studentSessions = useMemo(() => {
    if (!activeStudent) return [];

    // Filter lessons belonging to this student in selected month
    const matchedLessons = lessons.filter((lesson) => {
      if (selectedMonth && !lesson.date.startsWith(selectedMonth)) return false;
      const isParticipant = lesson.participants?.some((p) => p.studentId === activeStudent.id);
      const isPrivate = lesson.classId === `private-${activeStudent.id}`;
      const isSameClass = lesson.classId === activeStudent.classId;
      return isParticipant || isPrivate || isSameClass;
    });

    matchedLessons.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    const rows = matchedLessons.map((lesson, idx) => {
      const log =
        logs.find((l) => l.lessonId === lesson.id && l.studentId === activeStudent.id) ||
        lesson.learningLogs?.find((l) => l.studentId === activeStudent.id);

      return {
        index: idx + 1,
        lesson,
        log,
        lessonId: lesson.id,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        fee: lesson.feePerLesson,
        content: log?.content || lesson.content || '',
        homework: log?.homework || lesson.homework || '',
        attitude: log?.attitude || '-',
        comment: log?.comment || '',
        note: log?.note || lesson.notes || '',
      };
    });

    // Check if there are logs in `logs` for this student that did not match a lesson in `matchedLessons`
    const coveredLessonIds = new Set(rows.map((r) => r.lessonId));
    const extraLogs = logs.filter(
      (l) =>
        l.studentId === activeStudent.id &&
        (!selectedMonth || (l.lesson?.date && l.lesson.date.startsWith(selectedMonth))) &&
        !coveredLessonIds.has(l.lessonId),
    );

    extraLogs.forEach((l) => {
      rows.push({
        index: rows.length + 1,
        lesson: l.lesson as Lesson,
        log: l,
        lessonId: l.lessonId,
        date: l.lesson?.date || '',
        startTime: l.lesson?.startTime || '08:00',
        endTime: l.lesson?.endTime || '10:00',
        fee: l.lesson?.feePerLesson || 0,
        content: l.content || '',
        homework: l.homework || '',
        attitude: l.attitude || 'Tốt',
        comment: l.comment || '',
        note: l.note || '',
      });
    });

    return rows;
  }, [activeStudent, lessons, logs, selectedMonth]);

  // Filtered rows if search keyword is present
  const displayedSessions = useMemo(() => {
    if (!searchKeyword.trim()) return studentSessions;
    const query = searchKeyword.toLowerCase();
    return studentSessions.filter(
      (s) =>
        s.content.toLowerCase().includes(query) ||
        s.homework.toLowerCase().includes(query) ||
        s.comment.toLowerCase().includes(query) ||
        s.note.toLowerCase().includes(query) ||
        activeStudent?.name.toLowerCase().includes(query),
    );
  }, [studentSessions, searchKeyword, activeStudent]);

  // Calculate total fee of the student in the selected month
  const totalFeeInMonth = useMemo(() => {
    return studentSessions.reduce((acc, s) => acc + (s.fee || 0), 0);
  }, [studentSessions]);

  // Month navigation helpers
  const shiftMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const formattedMonthLabel = useMemo(() => {
    if (!selectedMonth) return 'Tất cả các tháng';
    const [y, m] = selectedMonth.split('-').map(Number);
    return `Tháng ${m}/${y}`;
  }, [selectedMonth]);

  // Format Day of Week in Vietnamese
  const getDayOfWeekName = (dateStr: string): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    switch (day) {
      case 0:
        return 'CN';
      case 1:
        return 'Thứ 2';
      case 2:
        return 'Thứ 3';
      case 3:
        return 'Thứ 4';
      case 4:
        return 'Thứ 5';
      case 5:
        return 'Thứ 6';
      case 6:
        return 'Thứ 7';
      default:
        return '';
    }
  };

  const formatDayMonth = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  const formatCurrency = (val?: number): string => {
    if (val == null || isNaN(val)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
  };

  const getInitials = (name?: string): string => {
    if (!name) return 'HS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Open Edit / Create Log Modal
  const handleOpenEdit = (sessionOrLog?: any) => {
    setFormError(null);
    if (sessionOrLog && sessionOrLog.lessonId) {
      const existingLog = sessionOrLog.log;
      setSelectedLog(existingLog || null);
      setEditFormData({
        lessonId: sessionOrLog.lessonId,
        studentId: activeStudent?.id || sessionOrLog.log?.studentId || '',
        content: existingLog?.content || sessionOrLog.content || '',
        homework: existingLog?.homework || sessionOrLog.homework || '',
        attitude: existingLog?.attitude || (sessionOrLog.attitude !== '-' ? sessionOrLog.attitude : 'Tốt'),
        comment: existingLog?.comment || sessionOrLog.comment || '',
        note: existingLog?.note || sessionOrLog.note || '',
      });
    } else if (sessionOrLog && sessionOrLog.id) {
      setSelectedLog(sessionOrLog);
      setEditFormData({
        lessonId: sessionOrLog.lessonId,
        studentId: sessionOrLog.studentId,
        content: sessionOrLog.content || '',
        homework: sessionOrLog.homework || '',
        attitude: sessionOrLog.attitude || 'Tốt',
        comment: sessionOrLog.comment || '',
        note: sessionOrLog.note || '',
      });
    } else {
      setSelectedLog(null);
      const defaultLesson = lessons[0];
      const defaultStudent = activeStudent?.id || defaultLesson?.participants?.[0]?.studentId || '';
      setEditFormData({
        lessonId: defaultLesson?.id || '',
        studentId: defaultStudent,
        content: '',
        homework: '',
        attitude: 'Tốt',
        comment: '',
        note: '',
      });
    }
    setIsEditModalOpen(true);
  };

  // Save log submit
  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await TeachingService.saveLog(editFormData);
      setIsEditModalOpen(false);
      fetchLogs();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu nhật ký');
    } finally {
      setSubmitting(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const blob = await TeachingService.exportLogs({
        month: selectedMonth || undefined,
        classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
        studentId: activeStudent?.id || undefined,
      });

      // Format clean, standardized filename according to education report standards
      let fileName = 'NhatKyHocTap';
      if (activeStudent?.name) {
        const cleanName = activeStudent.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        if (cleanName) {
          fileName += `_${cleanName}`;
        }
        if (selectedMonth) {
          fileName += `_${selectedMonth}`;
        }
      } else if (selectedMonth && /^\d{4}-\d{2}$/.test(selectedMonth)) {
        const [y, m] = selectedMonth.split('-');
        fileName += `_Thang${m}_${y}`;
      } else if (selectedMonth) {
        fileName += `_${selectedMonth}`;
      } else {
        fileName += '_TatCa';
      }
      fileName += '.xlsx';

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export logs', err);
      alert('Không thể xuất file Excel');
    }
  };

  // Import Excel
  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);
    try {
      const res = await TeachingService.importLogs(importFile);
      setImportResult(res);
      fetchLogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi nhập file Excel');
    } finally {
      setImporting(false);
    }
  };

  // Export image preview using html2canvas on dedicated export document
  const handleGenerateImage = async () => {
    setIsExportingImage(true);
    // Allow state update to mount exportDocRef
    await new Promise((resolve) => setTimeout(resolve, 80));

    const targetElement = exportDocRef.current || captureRef.current;
    if (!targetElement) {
      setIsExportingImage(false);
      return;
    }
    try {
      // 1. Wait for document fonts to be ready
      if (document.fonts) {
        await document.fonts.ready;
      }
      // 2. Wait for all images inside targetElement to finish loading
      const images = Array.from(targetElement.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve(true);
          return new Promise((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
          });
        }),
      );

      // 3. Small tick to allow layout stabilization
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1080,
        ignoreElements: (element) => element.classList.contains('log-export-hide'),
      });
      const dataUrl = canvas.toDataURL('image/png');
      setImagePreviewUrl(dataUrl);
      setIsImagePreviewOpen(true);
    } catch (err) {
      console.error('Failed to generate log image', err);
      alert('Không thể tạo ảnh nhật ký học tập');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Download rendered image
  const handleDownloadImage = () => {
    if (!imagePreviewUrl) return;
    const a = document.createElement('a');
    a.href = imagePreviewUrl;
    const studentNameSlug = activeStudent?.name ? activeStudent.name.replace(/\s+/g, '_') : 'HocSinh';
    a.download = `NhatKy_${studentNameSlug}_${selectedMonth}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* 1. TOP HEADER & MONTH NAVIGATOR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Nhật Ký Học Tập
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Theo dõi chi tiết tiến trình bài tập, ý thức học tập và nhận xét qua từng buổi học.
            </p>
          </div>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          <button
            onClick={() => shiftMonth(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm transition-colors"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{formattedMonthLabel}</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Chọn tháng"
            />
          </div>

          <button
            onClick={() => shiftMonth(1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm transition-colors"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MASTER-DETAIL TWO-COLUMN LAYOUT (Strict minmax(0, 1fr) prevents container overflow) */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
        {/* LEFT COLUMN: ROSTER ACCORDION PANEL */}
        <aside className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          {/* Search box (Placeholder matches Playwright test) */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm tên học sinh hoặc nội dung..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Class Filter Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Lọc theo lớp
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="ALL">Tất cả lớp học ({rosterStudents.length} học sinh)</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.students?.length || 0} học sinh)
                </option>
              ))}
            </select>
          </div>

          {/* Class Groups Accordion List */}
          <div className="space-y-2.5 pt-1 max-h-[620px] overflow-y-auto pr-1">
            {classGroups.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Không tìm thấy học sinh nào.
              </div>
            ) : (
              classGroups.map((group) => {
                const isExpanded = expandedClasses[group.classId] ?? true;
                return (
                  <div
                    key={group.classId}
                    className="border border-slate-200/70 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30"
                  >
                    {/* Group Header Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedClasses((prev) => ({
                          ...prev,
                          [group.classId]: !isExpanded,
                        }))
                      }
                      className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: group.accentColor }}
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {group.className}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {group.students.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Student items inside class */}
                    {isExpanded && (
                      <div className="p-1 space-y-1 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800">
                        {group.students.map((student) => {
                          const isActive = student.id === activeStudentId;
                          return (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => setActiveStudentId(student.id)}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all relative ${
                                isActive
                                  ? 'bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 shadow-xs'
                                  : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/50 border border-transparent'
                              }`}
                            >
                              {isActive && (
                                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r" />
                              )}
                              <UserAvatar
                                user={student}
                                size="md"
                                ring={isActive}
                                ringColor="ring-blue-300 dark:ring-blue-700"
                                className="shadow-xs"
                              />
                              <div className="min-w-0 flex-1">
                                <div
                                  className={`text-xs font-bold leading-tight truncate ${
                                    isActive
                                      ? 'text-blue-950 dark:text-blue-100'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {student.name}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                  {student.subject || student.className}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: MAIN JOURNAL CARD */}
        <main className="w-full min-w-0 space-y-4">
          {/* Top Selection Toolbar: Navigation strip & structured functional actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            {/* Horizontal student tabs with prev/next navigation */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => handleShiftStudent(-1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 transition-colors"
                title="Học sinh trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none flex-1">
                {stripStudents.map((s) => {
                  const isActive = s.id === activeStudentId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveStudentId(s.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                          : 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
                      }`}
                    >
                      <UserAvatar
                        user={s}
                        size={20}
                        className="shadow-xs"
                      />
                      <span>{s.name}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleShiftStudent(1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 transition-colors"
                title="Học sinh tiếp theo"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action Buttons with clear hierarchy */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
              {/* Column Visibility Picker Dropdown */}
              <div className="relative" ref={columnPickerRef}>
                <button
                  type="button"
                  onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hiển thị</span>
                </button>

                {isColumnPickerOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-3 z-30 space-y-2">
                    <div className="text-[11px] font-bold text-slate-800 dark:text-white pb-1 border-b border-slate-100 dark:border-slate-700">
                      Chọn các cột hiển thị
                    </div>
                    {[
                      { key: 'fee', label: 'SỐ TIỀN MỖI BUỔI' },
                      { key: 'content', label: 'NỘI DUNG' },
                      { key: 'homework', label: 'BTVN' },
                      { key: 'attitude', label: 'Ý THỨC' },
                      { key: 'comment', label: 'NHẬN XÉT' },
                      { key: 'note', label: 'GHI CHÚ' },
                    ].map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1.5 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={columns[col.key as keyof ColumnPreferences]}
                          onChange={(e) =>
                            setColumns({
                              ...columns,
                              [col.key]: e.target.checked,
                            })
                          }
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                        />
                        <span className="font-semibold text-[11px]">{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Tertiary: Export Image */}
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={isExportingImage || !activeStudent}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Xuất ảnh nhật ký để gửi phụ huynh"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>{isExportingImage ? 'Đang xuất...' : 'Xuất ảnh'}</span>
              </button>

              {/* Secondary: Export Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>

              {/* Secondary: Import Excel */}
              <button
                type="button"
                onClick={() => {
                  setImportFile(null);
                  setImportResult(null);
                  setIsImportModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Nhập Excel</span>
              </button>

              {/* Primary Action: Ghi nhật ký */}
              <button
                type="button"
                onClick={() => handleOpenEdit()}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ghi nhật ký</span>
              </button>
            </div>
          </div>

          {/* MAIN CAPTURE CARD (Modern Education Dashboard / Soft Editorial UI) */}
          <div
            id="logExportCapture"
            ref={captureRef}
            className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
          >
            {/* Academic Education Header with Real Student Avatar & Clean Hierarchy */}
            <div className="bg-gradient-to-r from-blue-50/80 via-sky-50/50 to-white dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900 border-b border-blue-100 dark:border-slate-800 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[72px]">
              <div className="flex items-center gap-3.5 min-w-0">
                {activeStudent && (
                  <UserAvatar
                    user={activeStudent}
                    size="lg"
                    ring
                    ringColor="ring-blue-200 dark:ring-blue-800"
                    className="shadow-xs shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight break-words">
                    {activeStudent ? activeStudent.name : 'NHẬT KÝ HỌC TẬP'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 break-words whitespace-normal leading-relaxed">
                    {studentSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800">
                  {studentSessions.length} Buổi học
                </span>
                {columns.fee && totalFeeInMonth > 0 && (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                    {formatCurrency(totalFeeInMonth)}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700">
                  {formattedMonthLabel.toUpperCase()}
                </span>
              </div>
            </div>

            {/* EMPTY STATE */}
            {displayedSessions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/60 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Chưa có nhật ký học tập nào
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchKeyword
                    ? `Không tìm thấy nhật ký phù hợp với từ khóa "${searchKeyword}".`
                    : `Chưa có buổi học nào được ghi nhận cho học sinh này trong ${formattedMonthLabel}.`}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleOpenEdit()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Ghi nhật ký buổi học
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* DESKTOP TABLE: table-fixed + 100% total column distribution guarantees NO horizontal scrollbar */}
                {!isMobile ? (
                  <div className="w-full">
                    <table
                      id="studentLogsTable"
                      className="w-full table-fixed text-left border-collapse text-xs"
                    >
                      <thead>
                        <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                          <th className="py-3 px-3 w-[7%] text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>STT</span>
                            </div>
                          </th>
                          <th className="py-3 px-3 w-[13%]">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>NGÀY</span>
                            </div>
                          </th>
                          {columns.content && (
                            <th className="py-3 px-3.5 w-[24%]">
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                                <span>NỘI DUNG</span>
                              </div>
                            </th>
                          )}
                          {columns.homework && (
                            <th className="py-3 px-3 w-[11%]">
                              <div className="flex items-center gap-1">
                                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                                <span>BTVN</span>
                              </div>
                            </th>
                          )}
                          {columns.attitude && (
                            <th className="py-3 px-3 w-[10%] text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>Ý THỨC</span>
                              </div>
                            </th>
                          )}
                          {columns.comment && (
                            <th className="py-3 px-3.5 w-[22%]">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                                <span>NHẬN XÉT</span>
                              </div>
                            </th>
                          )}
                          {columns.note && (
                            <th className="py-3 px-3 w-[9%]">
                              <div className="flex items-center gap-1">
                                <StickyNote className="w-3.5 h-3.5 text-slate-400" />
                                <span>GHI CHÚ</span>
                              </div>
                            </th>
                          )}
                          <th className="py-3 px-2 w-[4%] text-center log-export-hide">
                            <span>SỬA</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {displayedSessions.map((session) => {
                          const dayName = getDayOfWeekName(session.date);
                          const dayMonth = formatDayMonth(session.date);

                          // Homework badge analysis
                          const hwText = (session.homework || '').trim();
                          const isPercentage = /^\d+%$/.test(hwText);
                          const percentVal = isPercentage ? parseInt(hwText, 10) : null;

                          return (
                            <tr
                              key={session.lessonId || session.index}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors align-top"
                            >
                              {/* 1. STT / Buổi học */}
                              <td className="py-3.5 px-3 text-center align-top">
                                <div className="session-number font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  Buổi {session.index}
                                </div>
                              </td>

                              {/* 2. NGÀY (Vertical block layout - Zero collision between time and weekday) */}
                              <td className="py-3.5 px-3 align-top">
                                <div className="session-meta flex flex-col space-y-1">
                                  <div className="session-date font-bold text-slate-900 dark:text-slate-100 text-xs">
                                    {dayMonth}
                                  </div>
                                  <div className="session-time text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
                                    {session.startTime} – {session.endTime}
                                  </div>
                                  <div className="session-weekday text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                    {dayName}
                                  </div>
                                  {columns.fee && session.fee ? (
                                    <div className="session-fee text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                      {formatCurrency(session.fee)}
                                    </div>
                                  ) : null}
                                </div>
                              </td>

                              {/* 3. NỘI DUNG (Natural wrapping without ellipsis or truncation) */}
                              {columns.content && (
                                <td className="py-3.5 px-3.5 align-top text-slate-800 dark:text-slate-200 leading-relaxed text-xs break-words">
                                  <div className="whitespace-pre-line overflow-wrap-anywhere">
                                    {session.content ? (
                                      session.content
                                    ) : (
                                      <span className="text-slate-400 italic">Chưa ghi nội dung</span>
                                    )}
                                  </div>
                                </td>
                              )}

                              {/* 4. BTVN */}
                              {columns.homework && (
                                <td className="py-3.5 px-3 align-top leading-relaxed text-xs break-words">
                                  <div className="whitespace-pre-line overflow-wrap-anywhere">
                                    {session.homework ? (
                                      isPercentage ? (
                                        <span
                                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                            (percentVal ?? 0) >= 80
                                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                              : (percentVal ?? 0) >= 50
                                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                          }`}
                                        >
                                          {session.homework}
                                        </span>
                                      ) : (
                                        <div className="text-slate-700 dark:text-slate-300">
                                          {session.homework}
                                        </div>
                                      )
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </div>
                                </td>
                              )}

                              {/* 5. Ý THỨC (Soft Education Pills) */}
                              {columns.attitude && (
                                <td className="py-3.5 px-3 align-top text-center">
                                  {session.attitude && session.attitude !== '-' ? (
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                        session.attitude === 'Tốt'
                                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                          : session.attitude === 'Khá'
                                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                          : session.attitude === 'Trung bình'
                                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                      }`}
                                    >
                                      {session.attitude}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              )}

                              {/* 6. NHẬN XÉT (Natural wrapping, no crop) */}
                              {columns.comment && (
                                <td className="py-3.5 px-3.5 align-top text-slate-700 dark:text-slate-300 leading-relaxed text-xs break-words">
                                  <div className="whitespace-pre-line overflow-wrap-anywhere">
                                    {session.comment ? (
                                      session.comment
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </div>
                                </td>
                              )}

                              {/* 7. GHI CHÚ (Natural wrapping) */}
                              {columns.note && (
                                <td className="py-3.5 px-3 align-top text-slate-500 dark:text-slate-400 text-xs break-words">
                                  <div className="whitespace-pre-line overflow-wrap-anywhere">
                                    {session.note ? (
                                      session.note
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </div>
                                </td>
                              )}

                              {/* 8. SỬA / THAO TÁC */}
                              <td className="py-3.5 px-2 align-top text-center log-export-hide">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(session)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center justify-center"
                                  title="Sửa nhật ký buổi học"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* MOBILE CARD VIEW: Stacked Row / Card layout for perfect readability on mobile without horizontal scrolling */
                  <div className="p-4 space-y-4">
                    {displayedSessions.map((session) => {
                      const dayName = getDayOfWeekName(session.date);
                      const dayMonth = formatDayMonth(session.date);
                      const hwText = (session.homework || '').trim();
                      const isPercentage = /^\d+%$/.test(hwText);
                      const percentVal = isPercentage ? parseInt(hwText, 10) : null;

                      return (
                        <div
                          key={session.lessonId || session.index}
                          className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3"
                        >
                          {/* Mobile Card Header */}
                          <div className="flex items-start justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 gap-2">
                            <div className="session-meta space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="session-number font-bold text-slate-900 dark:text-white text-xs">
                                  Buổi {session.index}
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="session-date font-bold text-blue-600 dark:text-blue-400 text-xs">
                                  {dayMonth}
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="session-weekday font-medium text-slate-600 dark:text-slate-300 text-xs">
                                  {dayName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span className="session-time font-medium">
                                  {session.startTime} – {session.endTime}
                                </span>
                                {columns.fee && session.fee ? (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <span className="session-fee font-semibold text-blue-600 dark:text-blue-400">
                                      {formatCurrency(session.fee)}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {columns.attitude && session.attitude && session.attitude !== '-' && (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                    session.attitude === 'Tốt'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                      : session.attitude === 'Khá'
                                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                      : session.attitude === 'Trung bình'
                                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                  }`}
                                >
                                  {session.attitude}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(session)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                                title="Sửa nhật ký"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Mobile Card Body with full text wrapping and no horizontal scroll */}
                          {columns.content && (
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <BookOpen className="w-3 h-3 text-blue-500" />
                                <span>Nội dung bài học</span>
                              </div>
                              <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed break-words">
                                {session.content || <span className="text-slate-400 italic">Chưa ghi nội dung</span>}
                              </p>
                            </div>
                          )}

                          {columns.homework && (
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <CheckSquare className="w-3 h-3 text-blue-500" />
                                <span>BTVN</span>
                              </div>
                              {session.homework ? (
                                isPercentage ? (
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                      (percentVal ?? 0) >= 80
                                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                        : (percentVal ?? 0) >= 50
                                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    }`}
                                  >
                                    {session.homework}
                                  </span>
                                ) : (
                                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed break-words">
                                    {session.homework}
                                  </p>
                                )
                              ) : (
                                <p className="text-xs text-slate-400">—</p>
                              )}
                            </div>
                          )}

                          {columns.comment && (
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-emerald-500" />
                                <span>Nhận xét</span>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed break-words">
                                {session.comment || <span className="text-slate-400">—</span>}
                              </p>
                            </div>
                          )}

                          {columns.note && (
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <StickyNote className="w-3 h-3 text-slate-400" />
                                <span>Ghi chú</span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed break-words">
                                {session.note || <span className="text-slate-400">—</span>}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* DEDICATED OFF-SCREEN EXPORT DOCUMENT (Rendered on-demand during export to keep DOM clean) */}
      {isExportingImage && (
        <div
          ref={exportDocRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '1080px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          zIndex: -100,
          pointerEvents: 'none',
        }}
        className="font-sans"
      >
        {/* Document Header */}
        <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/40 to-white border-b border-blue-100 p-8 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {activeStudent && (
              <UserAvatar
                user={activeStudent}
                size={64}
                ring
                ringColor="ring-blue-200"
                className="shadow-sm shrink-0"
              />
            )}
            <div>
              <h2 className="text-2xl font-black text-blue-600 uppercase tracking-tight">
                {activeStudent ? activeStudent.name : 'NHẬT KÝ HỌC TẬP'}
              </h2>
              <p className="text-sm font-semibold text-slate-600 mt-1">
                {studentSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              {studentSessions.length} Buổi học
            </span>
            {columns.fee && totalFeeInMonth > 0 && (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                {formatCurrency(totalFeeInMonth)}
              </span>
            )}
            <span className="px-3.5 py-1.5 rounded-full bg-white text-slate-700 text-xs font-bold border border-slate-200 shadow-xs">
              {formattedMonthLabel.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Document Table */}
        <div className="p-8">
          <table className="w-full table-fixed text-left border-collapse text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-3 text-center w-[60px]">
                  <span>STT</span>
                </th>
                <th className="py-3.5 px-3 w-[130px]">
                  <span>NGÀY</span>
                </th>
                {columns.content && (
                  <th className="py-3.5 px-4 w-[280px]">
                    <span>NỘI DUNG</span>
                  </th>
                )}
                {columns.homework && (
                  <th className="py-3.5 px-3 w-[110px]">
                    <span>BTVN</span>
                  </th>
                )}
                {columns.attitude && (
                  <th className="py-3.5 px-3 text-center w-[100px]">
                    <span>Ý THỨC</span>
                  </th>
                )}
                {columns.comment && (
                  <th className="py-3.5 px-4 w-[260px]">
                    <span>NHẬN XÉT</span>
                  </th>
                )}
                {columns.note && (
                  <th className="py-3.5 px-3 w-[140px]">
                    <span>GHI CHÚ</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedSessions.map((session) => {
                const dayName = getDayOfWeekName(session.date);
                const dayMonth = formatDayMonth(session.date);
                const hwText = (session.homework || '').trim();
                const isPercentage = /^\d+%$/.test(hwText);
                const percentVal = isPercentage ? parseInt(hwText, 10) : null;

                return (
                  <tr key={session.lessonId || session.index} className="align-top">
                    {/* STT */}
                    <td className="py-4 px-3 text-center align-top">
                      <div className="session-number font-bold text-slate-900 text-xs">
                        Buổi {session.index}
                      </div>
                    </td>

                    {/* NGÀY (Vertical block layout) */}
                    <td className="py-4 px-3 align-top">
                      <div className="session-meta flex flex-col space-y-1">
                        <div className="session-date font-bold text-slate-900 text-xs">
                          {dayMonth}
                        </div>
                        <div className="session-time text-[11px] text-slate-500 font-medium leading-tight">
                          {session.startTime} – {session.endTime}
                        </div>
                        <div className="session-weekday text-[11px] font-semibold text-slate-600">
                          {dayName}
                        </div>
                        {columns.fee && session.fee ? (
                          <div className="session-fee text-[11px] font-bold text-blue-600">
                            {formatCurrency(session.fee)}
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* NỘI DUNG */}
                    {columns.content && (
                      <td className="py-4 px-4 align-top leading-relaxed text-xs break-words">
                        <div className="whitespace-pre-line text-slate-800">
                          {session.content || <span className="text-slate-400 italic">Chưa ghi nội dung</span>}
                        </div>
                      </td>
                    )}

                    {/* BTVN */}
                    {columns.homework && (
                      <td className="py-4 px-3 align-top leading-relaxed text-xs break-words">
                        {session.homework ? (
                          isPercentage ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                (percentVal ?? 0) >= 80
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : (percentVal ?? 0) >= 50
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {session.homework}
                            </span>
                          ) : (
                            <div className="text-slate-700 whitespace-pre-line">
                              {session.homework}
                            </div>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    )}

                    {/* Ý THỨC */}
                    {columns.attitude && (
                      <td className="py-4 px-3 align-top text-center">
                        {session.attitude && session.attitude !== '-' ? (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              session.attitude === 'Tốt'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : session.attitude === 'Khá'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : session.attitude === 'Trung bình'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {session.attitude}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    )}

                    {/* NHẬN XÉT */}
                    {columns.comment && (
                      <td className="py-4 px-4 align-top leading-relaxed text-xs break-words">
                        <div className="whitespace-pre-line text-slate-700">
                          {session.comment || <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                    )}

                    {/* GHI CHÚ */}
                    {columns.note && (
                      <td className="py-4 px-3 align-top leading-relaxed text-xs break-words">
                        <div className="whitespace-pre-line text-slate-500">
                          {session.note || <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Document Footer */}
        <div className="border-t border-slate-200 px-8 py-4 flex items-center justify-between text-xs text-slate-400">
          <span>QuizMaster • Hệ thống quản lý học tập & gia sư chuyên nghiệp</span>
          <span>Xuất ngày {new Date().toLocaleDateString('vi-VN')}</span>
        </div>
      </div>
    )}

      {/* 3. MODAL: IMAGE PREVIEW MODAL */}
      <Modal
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        title="Xem Trước Ảnh Nhật Ký Học Tập"
        icon={
          <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">
            <ImageIcon className="w-5 h-5" />
          </div>
        }
        maxWidth="4xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsImagePreviewOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleDownloadImage}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Tải ảnh PNG</span>
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ảnh chụp nhật ký học tập chất lượng cao (2x) phản ánh chính xác bản in/tải về để gửi phụ huynh qua Zalo / Facebook:
          </p>
          <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-100/80 dark:bg-slate-950 flex justify-center items-start">
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt={`Nhật ký học tập - ${activeStudent?.name || ''}`}
                className="w-full max-w-[1080px] h-auto rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-800 object-contain"
              />
            ) : (
              <div className="py-16 text-slate-400 text-xs">Đang tải ảnh...</div>
            )}
          </div>
        </div>
      </Modal>

      {/* 4. MODAL: EDIT / CREATE LOG MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={selectedLog ? 'Cập Nhật Nhật Ký Học Tập' : 'Ghi Nhật Ký Học Tập'}
        icon={
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        }
        maxWidth="lg"
        onSubmit={handleSaveLog}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Đang lưu...' : 'Lưu Nhật Ký'}
            </button>
          </>
        }
      >
        {formError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 rounded-xl text-red-600 text-xs flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {!selectedLog && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Buổi Học <span className="text-red-500">*</span>
                </label>
                <select
                  value={editFormData.lessonId}
                  onChange={(e) => setEditFormData({ ...editFormData, lessonId: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Chọn buổi học --</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.date} - {l.title} ({l.class?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Học Sinh <span className="text-red-500">*</span>
                </label>
                <select
                  value={editFormData.studentId}
                  onChange={(e) => setEditFormData({ ...editFormData, studentId: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Chọn học sinh --</option>
                  {rosterStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.className})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nội dung bài học
            </label>
            <textarea
              rows={3}
              value={editFormData.content}
              onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
              placeholder="VD: Ôn tập Toán: giải hệ phương trình bậc nhất hai ẩn..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bài tập về nhà (BTVN)
            </label>
            <textarea
              rows={2}
              value={editFormData.homework}
              onChange={(e) => setEditFormData({ ...editFormData, homework: e.target.value })}
              placeholder="VD: 80% (hoặc ghi chi tiết: Bài 1 đến 5 trang 20)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
            />
            {/* Quick completion tags */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium">Gợi ý tỷ lệ:</span>
              {['100%', '90%', '80%', '70%', '50%'].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, homework: rate })}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  {rate}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ý thức học tập
            </label>
            <select
              value={editFormData.attitude}
              onChange={(e) => setEditFormData({ ...editFormData, attitude: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Tốt">Tốt</option>
              <option value="Khá">Khá</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Chưa tốt">Chưa tốt</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nhận xét của giáo viên
            </label>
            <textarea
              rows={3}
              value={editFormData.comment}
              onChange={(e) => setEditFormData({ ...editFormData, comment: e.target.value })}
              placeholder="VD: Em nắm vững phương pháp, cần xem lại các lỗi tính toán căn bản."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú riêng
            </label>
            <input
              type="text"
              value={editFormData.note}
              onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
              placeholder="VD: Đã nhắc phụ huynh ôn từ vựng"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* 5. MODAL: IMPORT EXCEL MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Nhập Nhật Ký Từ Excel"
        icon={
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        }
        maxWidth="md"
        onSubmit={handleImportExcel}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={!importFile || importing}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              {importing ? 'Đang xử lý...' : 'Tải lên & Nhập'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="hidden"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer block">
              <FileSpreadsheet className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {importFile ? importFile.name : 'Chọn file Excel (.xlsx)'}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Cột: Email, Ngày học, Nội dung, BTVN, Ý thức, Nhận xét
              </p>
            </label>
          </div>

          {importResult && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
              <div className="text-emerald-600 font-bold">
                ✓ Đã nhập thành công: {importResult.successCount} bản ghi
              </div>
              {importResult.errors.length > 0 && (
                <div className="text-red-500 text-[11px]">
                  {importResult.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
