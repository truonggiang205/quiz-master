import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { UserPlus, Eye, EyeOff, Shield, GraduationCap } from 'lucide-react';
import { AuthService } from '../../services/auth.service';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'TEACHER' | 'STUDENT'>('STUDENT');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'REGISTER' | 'OTP'>('REGISTER');
  const [otp, setOtp] = useState('');

  const { login } = useAuthStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'REGISTER') {
      if (!name || !email) {
        addToast({ type: 'error', title: 'Vui lòng điền đủ thông tin' });
        return;
      }
      setIsLoading(true);
      try {
        const res = await AuthService.register(name, email, role, password, dob || undefined, gender || undefined);
        if (res.requireOtp) {
          setStep('OTP');
          if (res.devOtp) {
            addToast({ type: 'warning', title: 'Môi trường thử nghiệm Render (chặn SMTP)', message: `Mã OTP của bạn là: ${res.devOtp}` });
          } else {
            addToast({ type: 'success', title: 'Vui lòng kiểm tra email để nhận mã OTP' });
          }
        }
      } catch (err: any) {
        addToast({ type: 'error', title: err?.response?.data?.message || 'Đăng ký thất bại' });
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!otp) return;
      setIsLoading(true);
      try {
        const res = await AuthService.verifyOtp(email, otp);
        // Sync to store
        useAuthStore.getState().setAuthSession(res.user, res.token);
        
        addToast({ type: 'success', title: 'Tạo tài khoản thành công', message: `Chào mừng ${res.user.name} đến với QuizMaster!` });
        navigate(res.user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard');
      } catch (err: any) {
        addToast({ type: 'error', title: err?.response?.data?.message || 'Xác thực OTP thất bại' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-neumorph-bg flex items-center justify-center font-sans overflow-hidden z-50 selection:bg-blue-500 selection:text-white">
      {/* Background Animated Circles */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-neumorph-bg shadow-neumorph animate-floating -z-10" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[5%] right-[15%] w-[250px] h-[250px] rounded-full bg-neumorph-bg shadow-neumorph animate-floating -z-10" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
      <div className="absolute top-1/2 left-[70%] w-[150px] h-[150px] rounded-full bg-neumorph-bg shadow-neumorph animate-floating -z-10" style={{ animationDelay: '4s', animationDuration: '5s' }}></div>

      {/* Main Card */}
      <div className="w-[90%] max-w-[420px] bg-neumorph-bg rounded-[40px] shadow-neumorph p-8 flex flex-col items-center z-10 relative max-h-[95vh] overflow-y-auto">
        
        {/* Top Icon */}
        <div className="w-16 h-16 shrink-0 rounded-full bg-neumorph-bg shadow-neumorph flex items-center justify-center mb-4 text-blue-500 hover:scale-105 transition-transform duration-500 ease-out">
          <UserPlus className="w-7 h-7" />
        </div>

        {/* Titles */}
        <h2 className="text-[24px] font-bold text-slate-800 mb-1">Tạo Tài Khoản</h2>
        <p className="text-[12px] text-slate-500 mb-6">Tham gia QuizMaster ngay hôm nay</p>

        {/* Form */}
        <form onSubmit={handleRegister} className="w-full space-y-4" autoComplete="off">
          
          {step === 'REGISTER' ? (
            <>
              {/* Role Selector */}
          <div className="flex flex-col group/role">
            <label className="text-[11px] font-semibold text-slate-500 mb-2 px-1 transition-colors duration-300 group-hover/role:text-slate-700">Bạn là:</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('STUDENT')}
                className={`flex items-center justify-center gap-2 h-[46px] rounded-2xl text-[12px] font-bold transition-all duration-300 ease-out active:scale-95 ${
                  role === 'STUDENT'
                    ? 'bg-neumorph-bg shadow-neumorph-inset text-blue-500'
                    : 'bg-neumorph-bg shadow-neumorph hover:shadow-neumorph-sm text-slate-400 hover:text-slate-500'
                }`}
              >
                <GraduationCap className={`w-4 h-4 transition-transform duration-300 ${role === 'STUDENT' ? 'scale-110' : ''}`} />
                Học Sinh
              </button>
              <button
                type="button"
                onClick={() => setRole('TEACHER')}
                className={`flex items-center justify-center gap-2 h-[46px] rounded-2xl text-[12px] font-bold transition-all duration-300 ease-out active:scale-95 ${
                  role === 'TEACHER'
                    ? 'bg-neumorph-bg shadow-neumorph-inset text-blue-500'
                    : 'bg-neumorph-bg shadow-neumorph hover:shadow-neumorph-sm text-slate-400 hover:text-slate-500'
                }`}
              >
                <Shield className={`w-4 h-4 transition-transform duration-300 ${role === 'TEACHER' ? 'scale-110' : ''}`} />
                Giáo Viên
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div className="flex flex-col group">
            <label className="text-[11px] font-semibold text-slate-500 mb-2 px-1 group-focus-within:text-blue-500 transition-colors duration-300">Họ và Tên</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-[46px] rounded-2xl bg-neumorph-bg shadow-neumorph-inset px-4 text-[13px] text-slate-700 outline-none focus:ring-0 border-none transition-shadow duration-300 focus:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]"
              autoComplete="nope"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Gender Input */}
            <div className="flex flex-col group">
              <label className="text-[11px] font-semibold text-slate-500 mb-2 px-1 group-focus-within:text-blue-500 transition-colors duration-300">Giới tính</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full h-[46px] rounded-2xl bg-neumorph-bg shadow-neumorph-inset px-4 text-[13px] text-slate-700 outline-none focus:ring-0 border-none transition-shadow duration-300 focus:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.9)] appearance-none"
                required
              >
                <option value="" disabled>Chọn giới tính</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            {/* DOB Input */}
            <div className="flex flex-col group">
              <label className="text-[11px] font-semibold text-slate-500 mb-2 px-1 group-focus-within:text-blue-500 transition-colors duration-300">Ngày sinh</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full h-[46px] rounded-2xl bg-neumorph-bg shadow-neumorph-inset px-4 text-[13px] text-slate-700 outline-none focus:ring-0 placeholder:text-slate-400 border-none transition-shadow duration-300 focus:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.9)] uppercase"
                required
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="flex flex-col group">
            <label className="text-[11px] font-semibold text-slate-500 mb-2 px-1 group-focus-within:text-blue-500 transition-colors duration-300">Địa chỉ Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[46px] rounded-2xl bg-neumorph-bg shadow-neumorph-inset px-4 text-[13px] text-slate-700 outline-none focus:ring-0 border-none transition-shadow duration-300 focus:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]"
              autoComplete="nope"
              required
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col group">
            <label className="text-[11px] font-semibold text-slate-500 mb-2 px-1 group-focus-within:text-blue-500 transition-colors duration-300">Mật khẩu</label>
            <div className="relative w-full">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[46px] rounded-2xl bg-neumorph-bg shadow-neumorph-inset pl-4 pr-12 text-[13px] text-slate-700 outline-none focus:ring-0 border-none transition-shadow duration-300 focus:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]"
                autoComplete="new-password"
                required
              />
              <button 
                type="button" 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-all duration-300 active:scale-90"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold tracking-wider text-[13px] shadow-[0_10px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_25px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.97] active:shadow-inner transition-all duration-300 ease-out mt-6"
          >
            {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG KÝ'}
          </button>
            </>
          ) : (
            <>
              {/* OTP Input */}
              <div className="flex flex-col group">
                <label className="text-[11px] font-semibold text-slate-500 mb-2 px-1 group-focus-within:text-blue-500 transition-colors duration-300">Nhập mã OTP 6 số (gửi về email {email})</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full h-[52px] rounded-2xl bg-neumorph-bg shadow-neumorph-inset px-4 text-center text-2xl tracking-[0.5em] text-slate-700 outline-none focus:ring-0 placeholder:text-slate-300 border-none transition-shadow duration-300 focus:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]"
                  placeholder="------"
                  maxLength={6}
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold tracking-wider text-[13px] shadow-[0_10px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_25px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.97] active:shadow-inner transition-all duration-300 ease-out mt-6"
              >
                {isLoading ? 'ĐANG XÁC THỰC...' : 'XÁC NHẬN OTP'}
              </button>
              
              <div className="w-full mt-4 text-center">
                <button type="button" onClick={() => setStep('REGISTER')} className="text-[11px] text-slate-500 hover:text-slate-700 underline transition-colors">
                  Quay lại đăng ký
                </button>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="w-full mt-6 text-center">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Đã có tài khoản?</span>
          <Link to="/login" className="text-[11px] text-blue-500 font-bold hover:text-blue-600 hover:underline transition-colors duration-300">
             Đăng nhập
          </Link>
        </div>

      </div>
    </div>
  );
};
