import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { Lock, Eye, EyeOff, Plus, Mail } from 'lucide-react';
import { AuthService } from '../../services/auth.service';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [step, setStep] = useState<'LOGIN' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD'>('LOGIN');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { login, quickLoginAs } = useAuthStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      addToast({ type: 'error', title: 'Vui lòng nhập email' });
      return;
    }

    setIsLoading(true);
    try {
      if (step === 'LOGIN') {
        const res = await AuthService.login(email, password);
        useAuthStore.getState().setAuthSession(res.user, res.token);
        
        addToast({ type: 'success', title: 'Đăng nhập thành công', message: `Chào mừng bạn quay trở lại!` });
        if (res.user.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (res.user.role === 'TEACHER') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      } else if (step === 'FORGOT_PASSWORD') {
        const res = await AuthService.forgotPassword(email);
        setStep('RESET_PASSWORD');
        if (res.devOtp) {
          addToast({ type: 'warning', title: 'Môi trường thử nghiệm Render', message: `Mã OTP của bạn là: ${res.devOtp}`, duration: 0 });
        } else {
          addToast({ type: 'success', title: 'Mã OTP đã được gửi đến email của bạn' });
        }
      } else if (step === 'RESET_PASSWORD') {
        await AuthService.resetPassword(email, otp, newPassword);
        setStep('LOGIN');
        setPassword('');
        setOtp('');
        setNewPassword('');
        addToast({ type: 'success', title: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: err?.response?.data?.message || 'Có lỗi xảy ra' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neumorph-bg flex items-center justify-center font-sans overflow-hidden z-50 selection:bg-blue-500 selection:text-white">
      {/* Background Animated Circles */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-neumorph-bg shadow-neumorph animate-floating -z-10" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[5%] right-[15%] w-[250px] h-[250px] rounded-full bg-neumorph-bg shadow-neumorph animate-floating -z-10" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
      <div className="absolute top-1/2 left-[70%] w-[150px] h-[150px] rounded-full bg-neumorph-bg shadow-neumorph animate-floating -z-10" style={{ animationDelay: '4s', animationDuration: '5s' }}></div>

      {/* Main Card */}
      <div className="w-[90%] max-w-[420px] bg-neumorph-bg rounded-[40px] shadow-neumorph p-10 flex flex-col items-center z-10 relative">
        
        {/* Lock Icon */}
        <div className="w-20 h-20 rounded-full bg-neumorph-bg shadow-neumorph flex items-center justify-center mb-6 text-yellow-500 hover:scale-105 transition-transform duration-500 ease-out">
          <Lock className="w-8 h-8 fill-current" />
        </div>

        {/* Titles */}
        <h2 className="text-[28px] font-bold text-slate-800 mb-1">Chào mừng</h2>
        <p className="text-[13px] text-slate-500 mb-8">Đăng nhập để tiếp tục</p>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="w-full space-y-5">
          {/* Email Input */}
          <div className="flex flex-col group">
            <label className="text-[11px] font-semibold text-slate-500 mb-2 px-1 group-focus-within:text-blue-500 transition-colors duration-300">Địa chỉ Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[52px] rounded-2xl bg-neumorph-bg shadow-neumorph-inset px-5 text-[13px] text-slate-700 outline-none focus:ring-0 border-none transition-shadow duration-300 focus:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]"
              autoComplete="username"
              required
            />
          </div>

          {step === 'LOGIN' && (
            <>
              {/* Password Input */}
              <div className="flex flex-col group">
                <label className="text-[11px] font-semibold text-slate-500 mb-2 px-1 group-focus-within:text-blue-500 transition-colors duration-300">Mật khẩu</label>
                <div className="relative w-full">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-[52px] rounded-2xl bg-neumorph-bg shadow-neumorph-inset pl-5 pr-12 text-[13px] text-slate-700 outline-none focus:ring-0 border-none transition-shadow duration-300 focus:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]"
                    autoComplete="current-password"
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

              {/* Options */}
              <div className="flex items-center justify-between px-1 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="w-5 h-5 rounded-[6px] bg-neumorph-bg shadow-neumorph flex items-center justify-center group-hover:shadow-neumorph-sm group-active:shadow-neumorph-inset group-active:scale-90 transition-all duration-300 ease-out">
                    <div className={`w-2.5 h-2.5 rounded-[3px] bg-blue-500 transition-transform duration-300 ${rememberMe ? 'scale-100' : 'scale-0'}`}></div>
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={rememberMe} 
                    onChange={() => setRememberMe(!rememberMe)} 
                  />
                  <span className="text-[11px] text-slate-500 font-medium select-none group-hover:text-slate-700 transition-colors duration-300">Ghi nhớ đăng nhập</span>
                </label>
                
                <button type="button" onClick={() => setStep('FORGOT_PASSWORD')} className="text-[11px] text-blue-500 font-semibold hover:text-blue-600 hover:underline transition-colors duration-300">
                  Quên mật khẩu?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold tracking-wider text-[13px] shadow-[0_10px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_25px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.97] active:shadow-inner transition-all duration-300 ease-out mt-4"
              >
                {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
              </button>
            </>
          )}

          {step === 'FORGOT_PASSWORD' && (
            <>
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold tracking-wider text-[13px] shadow-[0_10px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_25px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.97] active:shadow-inner transition-all duration-300 ease-out mt-4"
              >
                {isLoading ? 'ĐANG GỬI...' : 'GỬI MÃ KHÔI PHỤC'}
              </button>
              <div className="w-full text-center pt-2">
                <button type="button" onClick={() => setStep('LOGIN')} className="text-[11px] text-slate-500 hover:text-slate-700 underline transition-colors">
                  Quay lại đăng nhập
                </button>
              </div>
            </>
          )}

          {step === 'RESET_PASSWORD' && (
            <>
              {/* OTP Input */}
              <div className="flex flex-col group">
                <label className="text-[11px] font-semibold text-slate-500 mb-2 px-1 group-focus-within:text-blue-500 transition-colors duration-300">Mã OTP (gửi về email)</label>
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

              {/* New Password Input */}
              <div className="flex flex-col group">
                <label className="text-[11px] font-semibold text-slate-500 mb-2 px-1 group-focus-within:text-blue-500 transition-colors duration-300">Mật khẩu mới</label>
                <div className="relative w-full">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-[52px] rounded-2xl bg-neumorph-bg shadow-neumorph-inset pl-5 pr-12 text-[13px] text-slate-700 outline-none focus:ring-0 placeholder:text-slate-400 border-none transition-shadow duration-300 focus:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]"
                    placeholder="••••••"
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
                className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold tracking-wider text-[13px] shadow-[0_10px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_25px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.97] active:shadow-inner transition-all duration-300 ease-out mt-4"
              >
                {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐỔI MẬT KHẨU'}
              </button>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="w-full mt-10 flex items-center justify-between px-1">
          <span className="text-[11px] text-slate-400 font-medium">Chưa có tài khoản?</span>
          
          <div className="flex gap-3">
             <Link to="/register" className="w-8 h-8 rounded-full bg-neumorph-bg shadow-neumorph flex items-center justify-center cursor-pointer hover:shadow-neumorph-sm active:shadow-neumorph-inset active:scale-90 transition-all duration-300 ease-out text-blue-500">
                <Plus className="w-4 h-4" />
             </Link>
             <div className="w-8 h-8 rounded-full bg-neumorph-bg shadow-neumorph flex items-center justify-center cursor-pointer hover:shadow-neumorph-sm active:shadow-neumorph-inset active:scale-90 transition-all duration-300 ease-out text-slate-400 font-bold text-[11px] hover:text-blue-500">
                G
             </div>
             <div className="w-8 h-8 rounded-full bg-neumorph-bg shadow-neumorph flex items-center justify-center cursor-pointer hover:shadow-neumorph-sm active:shadow-neumorph-inset active:scale-90 transition-all duration-300 ease-out text-slate-400 font-bold text-[11px] hover:text-blue-500">
                f
             </div>
             <div className="w-8 h-8 rounded-full bg-neumorph-bg shadow-neumorph flex items-center justify-center cursor-pointer hover:shadow-neumorph-sm active:shadow-neumorph-inset active:scale-90 transition-all duration-300 ease-out text-slate-400 font-bold text-[11px] hover:text-blue-500">
                in
             </div>
          </div>
        </div>

        {/* Hidden Quick Login for dev */}
        <div className="absolute -bottom-12 opacity-30 hover:opacity-100 transition-opacity duration-300 flex gap-4">
           <button onClick={() => quickLoginAs('TEACHER')} className="text-[10px] text-slate-500 hover:text-slate-700 underline font-semibold transition-colors duration-300">Nhanh (Giáo viên)</button>
           <button onClick={() => quickLoginAs('STUDENT')} className="text-[10px] text-slate-500 hover:text-slate-700 underline font-semibold transition-colors duration-300">Nhanh (Học sinh)</button>
           <button onClick={() => quickLoginAs('ADMIN')} className="text-[10px] text-slate-500 hover:text-slate-700 underline font-semibold transition-colors duration-300">Nhanh (Admin)</button>
        </div>
      </div>
    </div>
  );
};
