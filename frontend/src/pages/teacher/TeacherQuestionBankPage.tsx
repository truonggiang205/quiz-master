import React, { useEffect, useState, useRef } from 'react';
import { quizService } from '../../services/quiz.service';
import { uploadService } from '../../services/upload.service';
import { Question } from '../../types/question';
import { useUiStore } from '../../stores/ui.store';
import { Upload, Database, Folder, Trash2, Edit, CheckCircle2, Circle } from 'lucide-react';
import Latex from 'react-latex-next';

export const TeacherQuestionBankPage: React.FC = () => {
  const { addToast, confirm } = useUiStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedSubject, setSelectedSubject] = useState<string>('Tất cả');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [importSubject, setImportSubject] = useState<string>('Toán Học');

  useEffect(() => {
    fetchBank();
  }, []);

  const fetchBank = async () => {
    setIsLoading(true);
    try {
      const qs = await quizService.getQuestionBank();
      setQuestions(qs);
      
      const uniqueSubjects = Array.from(new Set(qs.map(q => q.subject || 'Chưa phân loại')));
      setSubjects(uniqueSubjects);
      setSelectedQIds([]);
    } catch (e) {
      addToast({ type: 'error', title: 'Lỗi tải ngân hàng đề' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQIds.length === 0) return;
    const confirmed = await confirm({
      title: 'Xoá câu hỏi',
      description: `Bạn có chắc chắn muốn xoá ${selectedQIds.length} câu hỏi đã chọn?`,
      variant: 'danger',
      confirmText: 'Xoá'
    });
    if (!confirmed) return;

    try {
      setIsLoading(true);
      await Promise.all(selectedQIds.map(id => quizService.deleteQuestion(id)));
      setQuestions(prev => prev.filter(q => !selectedQIds.includes(q.id)));
      setSelectedQIds([]);
      addToast({ type: 'success', title: `Đã xoá ${selectedQIds.length} câu hỏi` });
    } catch {
      addToast({ type: 'error', title: 'Có lỗi xảy ra khi xoá câu hỏi' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Xoá câu hỏi',
      description: 'Bạn có chắc chắn muốn xoá câu hỏi này?',
      variant: 'danger',
      confirmText: 'Xoá'
    });
    if (!confirmed) return;
    try {
      await quizService.deleteQuestion(id);
      setQuestions(questions.filter(q => q.id !== id));
      addToast({ type: 'success', title: 'Đã xoá câu hỏi' });
    } catch {
      addToast({ type: 'error', title: 'Không thể xoá câu hỏi' });
    }
  };

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      addToast({ type: 'success', title: 'Đang xử lý file, vui lòng đợi...' });

      const parsedData = await uploadService.parseDocument(file);
      
      const parsedQs = (parsedData || []).filter(
        (q: any) => q.content?.trim() && Array.isArray(q.options) && q.options.length > 0
      );

      if (!parsedQs.length) {
        addToast({ type: 'error', title: 'Không tìm thấy câu hỏi hợp lệ trong file' });
        return;
      }

      let importedCount = 0;
      for (const q of parsedQs) {
        const opts = (q.options || []).map((o: any, oIdx: number) => ({
          id: `opt-import-${Date.now()}-${oIdx}`,
          text: o.text || o.label || '',
          isCorrect: o.isCorrect ?? false,
        }));
        
        const correctCount = opts.filter((o: any) => o.isCorrect).length;
        
        const newQ = {
          content: q.content,
          type: correctCount > 1 ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE',
          score: 2,
          explanation: '',
          options: opts,
          subject: importSubject,
        };
        
        await quizService.saveToBank(newQ as any);
        importedCount++;
      }

      addToast({ type: 'success', title: `Đã nhập và lưu ${importedCount} câu hỏi vào ngân hàng` });
      fetchBank();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi nhập file',
        message: err?.response?.data?.message || 'Vui lòng kiểm tra lại định dạng file.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredQuestions = selectedSubject === 'Tất cả' 
    ? questions 
    : questions.filter(q => (q.subject || 'Chưa phân loại') === selectedSubject);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedQIds(filteredQuestions.map(q => q.id));
    } else {
      setSelectedQIds([]);
    }
  };

  const handleSelectQuestion = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedQIds(prev => [...prev, id]);
    } else {
      setSelectedQIds(prev => prev.filter(qId => qId !== id));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Ngân hàng đề</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Quản lý và lưu trữ câu hỏi theo môn học</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <select
              value={importSubject}
              onChange={(e) => setImportSubject(e.target.value)}
              className="text-sm bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="Toán Học">Toán Học</option>
              <option value="Vật Lý">Vật Lý</option>
              <option value="Hóa Học">Hóa Học</option>
              <option value="Sinh Học">Sinh Học</option>
              <option value="Ngữ Văn">Ngữ Văn</option>
              <option value="Tiếng Anh">Tiếng Anh</option>
              <option value="Lịch Sử">Lịch Sử</option>
              <option value="Địa Lí">Địa Lí</option>
              <option value="GDCD">GDCD</option>
              <option value="Tin Học">Tin Học</option>
            </select>
          </div>
          
          <input
            type="file"
            accept=".docx,.pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImportDocx}
          />
          
          {selectedQIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-sm font-bold rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Xoá {selectedQIds.length} mục
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Đang tải...' : 'Nhập từ thiết bị'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">Danh mục môn học</h3>
            <div className="space-y-1">
              <button
                onClick={() => { setSelectedSubject('Tất cả'); setSelectedQIds([]); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedSubject === 'Tất cả' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Tất cả</span>
                </div>
                <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">{questions.length}</span>
              </button>
              
              {subjects.map(subject => (
                <button
                  key={subject}
                  onClick={() => { setSelectedSubject(subject); setSelectedQIds([]); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectedSubject === subject 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    <span>{subject}</span>
                  </div>
                  <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    {questions.filter(q => (q.subject || 'Chưa phân loại') === subject).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-500 font-medium">Đang tải ngân hàng đề...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/50 dark:bg-slate-800/50 border border-slate-200 border-dashed dark:border-slate-700 rounded-3xl text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                <Database className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Trống</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2">
                Chưa có câu hỏi nào trong môn học này. Hãy nhập từ thiết bị để thêm câu hỏi vào ngân hàng.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2 py-1">
                <input
                  type="checkbox"
                  checked={selectedQIds.length === filteredQuestions.length && filteredQuestions.length > 0}
                  onChange={handleSelectAll}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                  title="Chọn tất cả"
                />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Chọn tất cả ({filteredQuestions.length} câu)</span>
              </div>
              {filteredQuestions.map((q, idx) => (
                <div key={q.id} className="relative group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-lg transition-colors"
                      title="Xoá câu hỏi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 flex flex-col items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedQIds.includes(q.id)}
                        onChange={(e) => handleSelectQuestion(q.id, e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 mt-1 cursor-pointer"
                      />
                      <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="text-slate-700 dark:text-slate-200 font-medium">
                        <Latex>{q.content}</Latex>
                      </div>
                      
                      {q.imageUrl && (
                        <img src={q.imageUrl} alt="minh hoạ" className="max-w-md rounded-xl" />
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={opt.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border ${
                              opt.isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {opt.isCorrect ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className={`text-sm ${opt.isCorrect ? 'text-emerald-800 dark:text-emerald-200 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                              <Latex>{opt.text}</Latex>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {q.explanation && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wider">Giải thích chi tiết</p>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <Latex>{q.explanation}</Latex>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
