import React from 'react';
import { Question, QuestionType, AnswerOption } from '../../types/question';
import { Plus, Trash2, Copy, CheckCircle, Circle, Square, CheckSquare, Upload, Image as ImageIcon, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadService } from '../../services/upload.service';

interface QuestionBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
  onImportFromBank?: () => void;
  onSaveToBank?: (qIndex: number) => void;
  onImportFromDocx?: (file: File) => void;
}

export const QuestionBuilder: React.FC<QuestionBuilderProps> = ({
  questions,
  onChange,
  onImportFromBank,
  onSaveToBank,
  onImportFromDocx,
}) => {
  const [uploadingImageFor, setUploadingImageFor] = React.useState<number | null>(null);

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      quizId: '',
      content: '',
      type: 'SINGLE_CHOICE',
      score: 2,
      explanation: '',
      order: questions.length + 1,
      options: [
        { id: `opt-${Date.now()}-1`, text: '', isCorrect: true },
        { id: `opt-${Date.now()}-2`, text: '', isCorrect: false },
        { id: `opt-${Date.now()}-3`, text: '', isCorrect: false },
        { id: `opt-${Date.now()}-4`, text: '', isCorrect: false },
      ],
    };
    onChange([...questions, newQ]);
  };

  const handleUpdateQuestion = (index: number, updated: Partial<Question>) => {
    const next = [...questions];
    next[index] = { ...next[index], ...updated };
    onChange(next);
  };

  const handleUploadQuestionImage = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImageFor(index);
      const data = await uploadService.uploadFile(file);
      handleUpdateQuestion(index, { imageUrl: data.url });
    } catch (err) {
      console.error('Upload failed', err);
      alert('Tải ảnh thất bại!');
    } finally {
      setUploadingImageFor(null);
    }
  };

  const handleDeleteQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const handleDuplicateQuestion = (index: number) => {
    const source = questions[index];
    const duplicated: Question = {
      ...source,
      id: `q-${Date.now()}`,
      content: `${source.content} (Bản sao)`,
      options: source.options.map((opt, i) => ({
        ...opt,
        id: `opt-${Date.now()}-${i}`,
      })),
      order: questions.length + 1,
    };
    const next = [...questions];
    next.splice(index + 1, 0, duplicated);
    onChange(next);
  };

  const handleTypeChange = (index: number, newType: QuestionType) => {
    const q = questions[index];
    let newOptions: AnswerOption[] = [...q.options];

    if (newType === 'TRUE_FALSE') {
      newOptions = [
        { id: `opt-${Date.now()}-1`, text: 'Đúng (True)', isCorrect: true },
        { id: `opt-${Date.now()}-2`, text: 'Sai (False)', isCorrect: false },
      ];
    } else if (newType === 'ESSAY') {
      newOptions = [];
    } else if (q.type === 'TRUE_FALSE' || q.type === 'ESSAY') {
      newOptions = [
        { id: `opt-${Date.now()}-1`, text: 'Đáp án A', isCorrect: true },
        { id: `opt-${Date.now()}-2`, text: 'Đáp án B', isCorrect: false },
        { id: `opt-${Date.now()}-3`, text: 'Đáp án C', isCorrect: false },
        { id: `opt-${Date.now()}-4`, text: 'Đáp án D', isCorrect: false },
      ];
    }

    handleUpdateQuestion(index, { type: newType, options: newOptions });
  };

  const handleOptionTextChange = (qIndex: number, optIndex: number, text: string) => {
    const q = questions[qIndex];
    const newOptions = [...q.options];
    newOptions[optIndex] = { ...newOptions[optIndex], text };
    handleUpdateQuestion(qIndex, { options: newOptions });
  };

  const handleToggleCorrect = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    const newOptions = q.options.map((opt, idx) => {
      if (q.type === 'SINGLE_CHOICE' || q.type === 'TRUE_FALSE') {
        return { ...opt, isCorrect: idx === optIndex };
      }
      // MULTIPLE_CHOICE toggle
      if (idx === optIndex) {
        return { ...opt, isCorrect: !opt.isCorrect };
      }
      return opt;
    });

    handleUpdateQuestion(qIndex, { options: newOptions });
  };

  const handleAddOption = (qIndex: number) => {
    const q = questions[qIndex];
    const newOption: AnswerOption = {
      id: `opt-${Date.now()}-${q.options.length + 1}`,
      text: '',
      isCorrect: false,
    };
    handleUpdateQuestion(qIndex, { options: [...q.options, newOption] });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length <= 2) return;
    const newOptions = q.options.filter((_, i) => i !== optIndex);
    handleUpdateQuestion(qIndex, { options: newOptions });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Bộ câu hỏi bài kiểm tra ({questions.length} câu)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Soạn nội dung, thiết lập các lựa chọn đáp án và ghi chú lời giải
          </p>
        </div>
        <div className="flex gap-2">
          {onImportFromBank && (
            <button
              type="button"
              onClick={onImportFromBank}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" />
              Nhập từ Ngân hàng
            </button>
          )}
          {onImportFromDocx && (
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 shadow-sm transition-all">
              <Upload className="w-4 h-4" />
              Nhập từ thiết bị
              <input 
                type="file" 
                accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onImportFromDocx(file);
                  }
                  e.target.value = '';
                }} 
              />
            </label>
          )}
          <button
            type="button"
            onClick={handleAddQuestion}
            id="add-question-btn"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 dark:shadow-none transition-all"
          >
            <Plus className="w-4 h-4" />
            Thêm câu hỏi
          </button>
        </div>
      </div>

      <AnimatePresence>
        {questions.map((q, qIndex) => {
          const isMultiple = q.type === 'MULTIPLE_CHOICE';

          return (
            <motion.div
              key={q.id || qIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4"
            >
              {/* Question Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
                    {qIndex + 1}
                  </span>

                  {/* Question Type Select */}
                  <select
                    value={q.type}
                    onChange={(e) => handleTypeChange(qIndex, e.target.value as QuestionType)}
                    className="text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="SINGLE_CHOICE">Một đáp án đúng</option>
                    <option value="MULTIPLE_CHOICE">Nhiều đáp án đúng</option>
                    <option value="TRUE_FALSE">Đúng / Sai</option>
                    <option value="ESSAY">Tự luận (Tải ảnh)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {/* Score input */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>Điểm:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={q.score}
                      onChange={(e) =>
                        handleUpdateQuestion(qIndex, { score: parseFloat(e.target.value) || 0 })
                      }
                      className="w-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 px-2 py-1 text-center font-bold text-slate-800 dark:text-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDuplicateQuestion(qIndex)}
                    title="Nhân bản câu hỏi"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(qIndex)}
                    title="Xóa câu hỏi"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {onSaveToBank && (
                    <button
                      type="button"
                      onClick={() => onSaveToBank(qIndex)}
                      title="Lưu vào ngân hàng câu hỏi"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 ml-2 border-l border-slate-200 dark:border-slate-700 pl-3"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Question Content TextArea */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Nội dung câu hỏi *
                </label>
                <textarea
                  rows={2}
                  placeholder="Nhập nội dung câu hỏi..."
                  value={q.content}
                  onChange={(e) => handleUpdateQuestion(qIndex, { content: e.target.value })}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none overflow-hidden"
                />

                {/* Question Image Attachment */}
                <div className="mt-3">
                  {q.imageUrl ? (
                    <div className="relative inline-block group">
                      <img src={q.imageUrl} alt="Đề bài" className="max-h-40 rounded-xl border border-slate-200 dark:border-slate-700" />
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion(qIndex, { imageUrl: undefined })}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${uploadingImageFor === qIndex ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}>
                      {uploadingImageFor === qIndex ? <span className="animate-spin w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-600" /> : <ImageIcon className="w-4 h-4" />}
                      <span>{uploadingImageFor === qIndex ? 'Đang tải...' : 'Đính kèm ảnh đề bài'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadQuestionImage(qIndex, e)} disabled={uploadingImageFor === qIndex} />
                    </label>
                  )}
                </div>
              </div>

              {/* Options List */}
              {q.type !== 'ESSAY' && (
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Các lựa chọn đáp án (tích vào biểu tượng để chọn đáp án đúng):
                </label>

                {q.options.map((opt, optIndex) => {
                  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                  const letter = letters[optIndex] || String(optIndex + 1);

                  return (
                    <div key={opt.id || optIndex} className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleCorrect(qIndex, optIndex)}
                        title={opt.isCorrect ? 'Đáp án đúng' : 'Đánh dấu là đáp án đúng'}
                        className={`p-1.5 rounded-xl transition-colors ${
                          opt.isCorrect
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                      >
                        {isMultiple ? (
                          opt.isCorrect ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )
                        ) : opt.isCorrect ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <span className="w-6 text-xs font-bold text-slate-400 text-center">
                        {letter}
                      </span>

                      <input
                        type="text"
                        placeholder={`Nội dung lựa chọn ${letter}...`}
                        value={opt.text}
                        onChange={(e) =>
                          handleOptionTextChange(qIndex, optIndex, e.target.value)
                        }
                        className={`flex-1 rounded-xl border p-2.5 text-xs md:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                          opt.isCorrect
                            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      />

                      {q.type !== 'TRUE_FALSE' && q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(qIndex, optIndex)}
                          className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {q.type !== 'TRUE_FALSE' && (
                  <button
                    type="button"
                    onClick={() => handleAddOption(qIndex)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm lựa chọn
                  </button>
                )}
              </div>
              )}

              {/* Explanation Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Lời giải thích chi tiết (hiển thị khi công bố đáp án)
                </label>
                <input
                  type="text"
                  placeholder="Giải thích vì sao đáp án này đúng..."
                  value={q.explanation || ''}
                  onChange={(e) => handleUpdateQuestion(qIndex, { explanation: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {questions.length === 0 && (
        <div className="p-8 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Chưa có câu hỏi nào. Nhấn "Thêm câu hỏi" để bắt đầu soạn đề thi.
          </p>
        </div>
      )}
    </div>
  );
};
