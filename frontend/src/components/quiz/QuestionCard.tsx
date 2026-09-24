import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Question } from '../../types/question';
import { AnswerOptionCard } from './AnswerOptionCard';
import { Badge } from '../common/Badge';
import { Flag, Upload, Image as ImageIcon } from 'lucide-react';
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
  essayImageUrl?: string;
  onUploadEssayImage?: (url: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionIds,
  isFlagged,
  onSelectOption,
  onToggleFlag,
  essayImageUrl,
  onUploadEssayImage,
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
      const data = await uploadService.uploadFile(file);
      onUploadEssayImage(data.url);
    } catch (err) {
      console.error('Upload failed', err);
      alert('Tải ảnh lên thất bại!');
    } finally {
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
              {question.score} điểm
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
            <img src={question.imageUrl.startsWith('http') ? question.imageUrl : `http://localhost:3000${question.imageUrl}`} alt="Đề bài" className="max-h-64 rounded-xl object-contain border border-slate-200 dark:border-slate-700" />
          )}
        </div>

        {/* Answer Options or Essay Upload */}
        {question.type === 'ESSAY' ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
              {essayImageUrl ? (
                <div className="relative group">
                  <img src={essayImageUrl.startsWith('http') ? essayImageUrl : `http://localhost:3000${essayImageUrl}`} alt="Bài làm" className="max-h-64 rounded-xl object-contain border border-slate-200 dark:border-slate-700" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                    <label className="cursor-pointer bg-white text-slate-800 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-100 flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Đổi ảnh
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">
                    Tải ảnh chụp bài làm tự luận của bạn lên đây (Định dạng: JPG, PNG)
                  </p>
                  <label className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${isUploading ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                    <Upload className="w-4 h-4" /> {isUploading ? 'Đang tải...' : 'Chọn ảnh tải lên'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                  </label>
                </>
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
