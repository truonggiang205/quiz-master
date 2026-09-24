import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { useUiStore } from '../../../stores/ui.store';
import { documentImportService } from '../../../services/document-import.service';

export const TeacherQuestionImportUploadPage: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.pdf')) {
      addToast({ type: 'error', title: 'Chỉ hỗ trợ file DOCX và PDF.' });
      return;
    }

    setIsUploading(true);
    try {
      const res = await documentImportService.uploadFile(file);
      addToast({ type: 'success', title: 'Tải lên thành công, đang phân tích...' });
      navigate(`/teacher/import/${res.data.id}/preview`);
    } catch (error: any) {
      console.error(error);
      addToast({ 
        type: 'error', 
        title: 'Lỗi', 
        message: error.response?.data?.message || 'Không thể xử lý file. Vui lòng thử lại.'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Import Câu Hỏi (Rule-based)</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
             <FileText className="w-10 h-10 text-indigo-500" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Tải lên file câu hỏi</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Hỗ trợ định dạng DOCX và PDF. Hệ thống sẽ phân tích cấu trúc, bóc tách câu hỏi, đáp án và cả công thức toán học một cách tự động.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".docx,.pdf"
            className="hidden"
          />

          <button 
            onClick={handleUploadClick} 
            disabled={isUploading}
            className="w-full max-w-sm gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center font-bold disabled:opacity-50 transition-colors"
          >
            {isUploading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý...</>
            ) : (
              <><Upload className="w-5 h-5" /> Chọn File DOCX/PDF</>
            )}
          </button>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 w-full text-left bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-3">
             <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
             <div className="text-sm text-blue-800 dark:text-blue-300">
               <p className="font-semibold mb-1">Lưu ý định dạng:</p>
               <ul className="list-disc pl-4 space-y-1">
                 <li>Câu hỏi nên bắt đầu bằng "Câu X:", "Bài X.", hoặc "X."</li>
                 <li>Đáp án nên bắt đầu bằng "A.", "B.", "C.", "D."</li>
                 <li>Đáp án đúng có thể in đậm (trong DOCX) hoặc ghi chú "Đáp án: A" ở cuối.</li>
                 <li>Công thức toán (Office Math) sẽ tự động được đọc.</li>
               </ul>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
