
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/authService';
import LoginVisual from '@/components/LoginVisual';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get resetToken from location.state or sessionStorage
  const [resetToken, setResetToken] = useState(() => {
    const stateToken = location.state && location.state.resetToken;
    const storageToken = sessionStorage.getItem('resetToken');
    if (stateToken) {
      sessionStorage.setItem('resetToken', stateToken);
      return stateToken;
    }
    return storageToken || '';
  });

  // If user navigates with state after mount, update resetToken
  useEffect(() => {
    if (location.state && location.state.resetToken) {
      setResetToken(location.state.resetToken);
      sessionStorage.setItem('resetToken', location.state.resetToken);
    }
  }, [location.state]);
  
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(resetToken, password);
      sessionStorage.removeItem('resetToken');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex bg-[#f5f5ff] items-center justify-center p-8">
      {/* Background blobs */}
      <div className="fixed w-[500px] h-[500px] bg-[#6366f1] rounded-full blur-[90px] opacity-[0.15] top-[-140px] right-[-80px] pointer-events-none z-0"></div>
      <div className="fixed w-[360px] h-[360px] bg-[#0f1f3d] rounded-full blur-[90px] opacity-[0.15] bottom-[-60px] left-[-60px] pointer-events-none z-0"></div>

      {/* Main card */}
      <div className="relative z-1 w-full max-w-[960px] grid grid-cols-1 lg:grid-cols-2 min-h-[600px] rounded-[22px] overflow-hidden shadow-[0_12px_60px_rgba(99,102,241,0.16),_0_2px_10px_rgba(15,31,61,0.12)]">

        {/* LEFT SIDE */}
        <LoginVisual />

        {/* RIGHT SIDE */}
        <div className="bg-white p-[3rem_2.8rem] flex flex-col justify-center">

          {/* Form header */}
          <div className="mb-[1.8rem]">
            <h2 className="font-['DM_Serif_Display'] text-[26px] text-[#0f1f3d] font-semibold mb-1">Set New Password</h2>
            <p className="text-[14px] text-[#475569] font-light">Must be at least 8 characters</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-[1.1rem]">
                {error}
              </div>
            )}

            {/* Password */}
            <div className="mb-[1.1rem]">
              <label htmlFor="password" className="block text-[13px] font-medium text-[#0f1f3d] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  id="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full h-[44px] px-[14px] font-['DM_Sans'] text-[14px] text-[#1e293b] bg-[#f5f5ff] border-[1.5px] border-[#c7d2fe] rounded-[10px] outline-none transition-all duration-[0.18s] focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] focus:bg-white placeholder-[#b0bcd4]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b0bcd4] hover:text-[#6366f1] transition-colors"
                >
                  {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="mb-[1.4rem]">
              <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-[#0f1f3d] mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full h-[44px] px-[14px] font-['DM_Sans'] text-[14px] text-[#1e293b] bg-[#f5f5ff] border-[1.5px] border-[#c7d2fe] rounded-[10px] outline-none transition-all duration-[0.18s] focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] focus:bg-white placeholder-[#b0bcd4]"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b0bcd4] hover:text-[#6366f1] transition-colors"
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[46px] bg-[#6366f1] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer transition-all duration-[0.18s] hover:bg-[#4f52d4] active:scale-[0.99] disabled:bg-indigo-300"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          {/* Footer link */}
          <div className="mt-[1.5rem] text-center">
            <Link to="/login" className="text-[13px] text-[#6366f1] font-medium no-underline hover:underline">
              Back to Sign in
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
