
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';
import LoginVisual from '@/components/LoginVisual';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      navigate('/verify-email', { state: { email } });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send reset code');
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
            <h2 className="font-['DM_Serif_Display'] text-[26px] text-[#0f1f3d] font-semibold mb-1">Forgot Password?</h2>
            <p className="text-[14px] text-[#475569] font-light">A code will be sent to your email to help reset password</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-[1.1rem]">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="mb-[1.1rem]">
              <label htmlFor="email" className="block text-[13px] font-medium text-[#0f1f3d] mb-1.5">Email address</label>
              <input
                type="email"
                id="email"
                placeholder="you@yourfirm.com.au"
                autoComplete="email"
                className="w-full h-[44px] px-[14px] font-['DM_Sans'] text-[14px] text-[#1e293b] bg-[#f5f5ff] border-[1.5px] border-[#c7d2fe] rounded-[10px] outline-none transition-all duration-[0.18s] focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] focus:bg-white placeholder-[#b0bcd4]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[46px] bg-[#6366f1] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer transition-all duration-[0.18s] hover:bg-[#4f52d4] active:scale-[0.99] disabled:bg-indigo-300"
            >
              {loading ? 'Sending...' : 'Reset Password'}
            </button>
          </form>

          {/* Footer link */}
          <div className="mt-[1.5rem] text-center">
            <Link to="/login" className="text-[13px] text-[#6366f1] font-medium no-underline hover:underline flex items-center justify-center gap-2">
              <ArrowLeft size={16} />
              Back to Sign in
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
