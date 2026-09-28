import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Question } from '../../types/question';
import { AnswerOptionCard } from './AnswerOptionCard';
import { Badge } from '../common/Badge';
import { Flag, Upload, Image as ImageIcon, X } from 'lucide-react';
import { uploadService } from '../../services/upload.service';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedOptionIds: string[];
  isFlagged: boolean;
  onSelectOption: (optionId: string) => void;
  onToggleFlag: () => void;
  essayImageUrls?: string[];
  essayText?: string;
  onUploadEssayImage?: (url: string) => void;
  onRemoveEssayImage?: (index: number) => void;
  onEssayTextChange?: (text: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionIds,
  isFlagged,
  onSelectOption,
  onToggleFlag,
  essayImageUrls = [],
  essayText = '',
  onUploadEssayImage,
  onRemoveEssayImage,
  onEssayTextChange,
}) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const isMultiple = question.type === 'MULTIPLE_CHOICE';

  const typeLabels = {
    SINGLE_CHOICE: 'Một đáp án đúng',
    MULTIPLE_CHOICE: 'Nhiều đáp án đúng',
    TRUE_FALSE: 'Đúng / Sai',
    ESSAY: 'Tự luận (Tải ảnh)',
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadEssayImage) return;

    try {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        onUploadEssayImage(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to read file', err);
      alert('Tải ảnh thất bại!');
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2 }}
        className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm"
      >
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <span className="text-base md:text-lg font-black text-indigo-600 dark:text-indigo-400">
              Câu {questionNumber}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              trên {totalQuestions}
            </span>
            <Badge variant="lavender" size="sm">
              {typeLabels[question.type]}
            </Badge>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/70 px-2.5 py-1 rounded-full">
              {((question.points || 0) / 100).toFixed(2)} điểm
            </span>
            <button
              type="button"
              onClick={onToggleFlag}
              id="flag-question-btn"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                isFlagged
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-amber-300'
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{isFlagged ? 'Đã đánh dấu' : 'Đánh dấu xem lại'}</span>
            </button>
          </div>
        </div>

        {/* Question content */}
        <div className="mb-6 space-y-4">
          <h2 className="text-base md:text-lg font-semibold text-slate-800 dark:text-white leading-relaxed whitespace-pre-line">
            <Latex>{question.content}</Latex>
          </h2>
          {question.imageUrl && (
            <img src={question.imageUrl.startsWith('http') ? question.imageUrl : `http://localhost:3000${question.imageUrl}`} alt="Đề bài" className="w-full max-h-[800px] rounded-xl object-contain border border-slate-200 dark:border-slate-700" />
          )}
        </div>

        {/* Answer Options or Essay Upload */}
        {question.type === 'ESSAY' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Trả lời bằng văn bản (Tùy chọn):</label>
              <textarea
                value={essayText}
                onChange={(e) => onEssayTextChange?.(e.target.value)}
                placeholder="Nhập câu trả lời của bạn vào đây..."
                className="w-full min-h-[120px] p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-y"
              />
            </div>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 bg-slate-50 dark:bg-slate-900/50 mt-4">
              <div className="mb-4">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hoặc tải lên hình ảnh bài làm (Tùy chọn):</span>
              </div>
              {essayImageUrls.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {essayImageUrls.map((url, idx) => (
                      <div key={idx} className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2">
                        <img src={url.startsWith('http') || url.startsWith('data:') ? url : `http://localhost:3000${url}`} alt={`Bài làm ${idx + 1}`} className="w-full h-40 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => onRemoveEssayImage && onRemoveEssayImage(idx)}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-rose-600"
                          title="Xóa ảnh này"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-center mt-4">
                    <label className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${isUploading ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-700'}`}>
                      <Upload className="w-4 h-4" /> {isUploading ? 'Đang tải...' : 'Thêm ảnh khác'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <ImageIcon className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">
                    (Định dạng: JPG, PNG)
                  </p>
                  <label className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${isUploading ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                    <Upload className="w-4 h-4" /> {isUploading ? 'Đang tải...' : 'Chọn ảnh tải lên'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                  </label>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <AnswerOptionCard
                key={option.id}
                id={option.id}
                text={option.text}
                index={index}
                isSelected={selectedOptionIds.includes(option.id)}
                isMultiple={isMultiple}
                onSelect={() => onSelectOption(option.id)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
