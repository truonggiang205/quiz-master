import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bug, MonitorSmartphone, UploadCloud, Tag, MessageSquare, LayoutTemplate, Zap, FileQuestion } from 'lucide-react';
import { uploadService } from '../services/upload.service';

export const ReportBugPage: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'UI',
    priority: 'Medium',
    browser: '',
    screenshot: null as File | null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const bugTypes = [
    { id: 'UI', label: 'Giao diện (UI)', icon: LayoutTemplate },
    { id: 'Function', label: 'Chức năng', icon: Zap },
    { id: 'Performance', label: 'Hiệu suất', icon: MonitorSmartphone },
    { id: 'Other', label: 'Khác', icon: FileQuestion },
  ];

  const priorities = [
    { id: 'Low', label: 'Thấp', color: 'emerald' },
    { id: 'Medium', label: 'Trung bình', color: 'amber' },
    { id: 'High', label: 'Cao', color: 'rose' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({ ...formData, screenshot: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let uploadedUrl = null;
      if (formData.screenshot) {
        // Upload ảnh lên Cloudinary với folder là 'quiz-master/bug'
        const res = await uploadService.uploadFile(formData.screenshot, 'quiz-master/bug');
        uploadedUrl = res.url;
      }

      console.log('Dữ liệu Report Bug gửi đi:', {
        ...formData,
        screenshotUrl: uploadedUrl
      });

      alert('Đã gửi báo cáo thành công! Cảm ơn sự đóng góp của bạn.');
      setFormData({
        title: '',
        description: '',
        type: 'UI',
        priority: 'Medium',
        browser: '',
        screenshot: null,
      });
      setPreviewUrl(null);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi upload ảnh lên Cloudinary. Vui lòng kiểm tra lại kết nối hoặc key Cloudinary.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 sm:p-10 shadow-[0_12px_35px_rgba(15,23,42,0.08),0_3px_8px_rgba(15,23,42,0.04)] border border-slate-100"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
            <Bug className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Báo Cáo Sự Cố</h1>
            <p className="text-slate-500 text-sm">Giúp chúng tôi cải thiện trải nghiệm của bạn.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bug Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Tiêu đề sự cố</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="VD: Không thể nộp bài khi hết giờ"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Mô tả chi tiết</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <textarea
                rows={4}
                placeholder="Hãy mô tả thao tác bạn đã làm và lỗi gì đã xảy ra..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                required
              />
              <div className="absolute right-3 bottom-3 text-xs text-slate-400">
                {formData.description.length}/200
              </div>
            </div>
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">Phân loại lỗi</label>
              <div className="flex flex-wrap gap-2">
                {bugTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.id })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      formData.type === type.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <type.icon className="w-3.5 h-3.5" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">Mức độ ưu tiên</label>
              <div className="flex flex-wrap gap-2">
                {priorities.map((p) => {
                  const isActive = formData.priority === p.id;
                  const colorMap: Record<string, string> = {
                    emerald: isActive ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'border-slate-200 text-slate-600',
                    amber: isActive ? 'bg-amber-50 border-amber-400 text-amber-700' : 'border-slate-200 text-slate-600',
                    rose: isActive ? 'bg-rose-50 border-rose-400 text-rose-700' : 'border-slate-200 text-slate-600',
                  };
                  const dotMap: Record<string, string> = {
                    emerald: 'bg-emerald-500',
                    amber: 'bg-amber-500',
                    rose: 'bg-rose-500',
                  };

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.id })}
                      className={`flex items-center gap-2 flex-1 justify-center px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                        colorMap[p.color]
                      } ${!isActive && 'hover:bg-slate-50 hover:border-slate-300'}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${dotMap[p.color]}`} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Browser / Device */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Trình duyệt / Thiết bị</label>
            <div className="relative">
              <MonitorSmartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="VD: Chrome, Windows 11 hoặc Safari, iPhone 14"
                value={formData.browser}
                onChange={(e) => setFormData({ ...formData, browser: e.target.value })}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Attach Screenshot */}
          <div>
            <div className="relative border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 transition-colors cursor-pointer group overflow-hidden">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="p-4 flex flex-col items-center justify-center text-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-32 object-contain rounded-lg shadow-sm" />
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors mb-2" />
                    <p className="text-sm font-medium text-slate-700">Đính kèm ảnh minh họa</p>
                    <p className="text-xs text-slate-500">Nhấn hoặc kéo thả ảnh vào đây</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Bug className="w-4 h-4" />
                Gửi Báo Cáo
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
