import { QuickPresetItem, ReceiptDraft } from './types';

export const DEFAULT_GENERAL_PRESETS: QuickPresetItem[] = [
  {
    id: 'preset-gen-1',
    category: 'general',
    text: 'Con có thái độ học tập nghiêm túc, chủ động trao đổi khi chưa hiểu bài.',
  },
  {
    id: 'preset-gen-2',
    category: 'general',
    text: 'Con có tiến bộ rõ rệt, tốc độ làm bài và độ chính xác được cải thiện.',
  },
  {
    id: 'preset-gen-3',
    category: 'general',
    text: 'Con nắm được kiến thức cơ bản nhưng cần duy trì luyện tập đều đặn hơn.',
  },
  {
    id: 'preset-gen-4',
    category: 'general',
    text: 'Con cần tập trung hơn trong giờ và chủ động hoàn thành đầy đủ bài tập.',
  },
];

export const DEFAULT_ROADMAP_PRESETS: QuickPresetItem[] = [
  {
    id: 'preset-road-1',
    category: 'roadmap',
    text: 'Chuẩn bị ôn luyện để chuẩn bị cho các bài kiểm tra sắp tới',
  },
  {
    id: 'preset-road-2',
    category: 'roadmap',
    text: 'Tập trung củng cố các dạng bài tập nâng cao và rèn luyện kỹ năng phản xạ',
  },
  {
    id: 'preset-road-3',
    category: 'roadmap',
    text: 'Hoàn thiện các chuyên đề trọng tâm học kỳ và tổ chức luyện đề tổng hợp',
  },
  {
    id: 'preset-road-4',
    category: 'roadmap',
    text: 'Khắc phục các phần kiến thức còn hổng và rèn luyện kỹ năng giải nhanh',
  },
];

const PRESETS_STORAGE_KEY = 'quizmaster_tuition_quick_presets_v1';

export function getStoredQuickPresets(): {
  general: QuickPresetItem[];
  roadmap: QuickPresetItem[];
} {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.general) && Array.isArray(parsed.roadmap)) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return {
    general: [...DEFAULT_GENERAL_PRESETS],
    roadmap: [...DEFAULT_ROADMAP_PRESETS],
  };
}

export function saveStoredQuickPresets(presets: {
  general: QuickPresetItem[];
  roadmap: QuickPresetItem[];
}): void {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (err) {
    console.error('Failed to save quick presets to localStorage', err);
  }
}

export function resetStoredQuickPresets(): {
  general: QuickPresetItem[];
  roadmap: QuickPresetItem[];
} {
  const initial = {
    general: [...DEFAULT_GENERAL_PRESETS],
    roadmap: [...DEFAULT_ROADMAP_PRESETS],
  };
  saveStoredQuickPresets(initial);
  return initial;
}

export function getDraftStorageKey(
  teacherId: string,
  studentId: string,
  month: string
): string {
  return `quizmaster_tuition_draft_${teacherId}_${studentId}_${month}`;
}

export function loadReceiptDraft(
  teacherId: string,
  studentId: string,
  month: string
): ReceiptDraft | null {
  try {
    const key = getDraftStorageKey(teacherId, studentId, month);
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as ReceiptDraft;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveReceiptDraft(
  teacherId: string,
  studentId: string,
  month: string,
  draft: ReceiptDraft
): void {
  try {
    const key = getDraftStorageKey(teacherId, studentId, month);
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (err) {
    console.error('Failed to save receipt draft to localStorage', err);
  }
}
