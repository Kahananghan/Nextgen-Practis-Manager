
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import LoginVisual from '@/components/LoginVisual';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  
  const [code, setCode] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleInput = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = code.join('');
    if (otp.length !== 4) {
      setError('Please enter complete code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await authService.verifyOTP(email, otp);
      // Pass resetToken to ResetPassword page
      navigate('/reset-password', { state: { resetToken: result.data.resetToken } });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authService.resendOTP(email);
      alert('Code resent to your email');
      setCode(['', '', '', '']);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to resend code');
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
          <div className="flex flex-col items-center mb-[1.8rem]">
            <h2 className="font-['DM_Serif_Display'] text-[26px] text-[#0f1f3d] font-semibold mb-1">Verify Email</h2>
            <p className="text-[14px] text-[#475569] font-light">We sent a code to <span className="text-[#0f1f3d] font-medium">{email || 'your email'}</span></p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* OTP inputs */}
          <div className="flex justify-center gap-4 mb-10">
            {code.map((val, i) => (
              <input
                key={i}
                ref={inputRefs[i]}
                type="text"
                maxLength={1}
                value={val}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-14 h-14 text-center text-xl font-bold border-[1.5px] border-[#c7d2fe] rounded-[10px] outline-none transition-all duration-[0.18s] focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] bg-[#f5f5ff] focus:bg-white"
              />
            ))}
          </div>

          {/* Continue button */}
          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full h-[46px] bg-[#6366f1] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer transition-all duration-[0.18s] hover:bg-[#4f52d4] active:scale-[0.99] disabled:bg-indigo-300 mb-6"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>

          {/* Resend link */}
          <p className="text-center text-[13px] text-[#475569]">
            Didn't receive code? <button onClick={handleResend} className="text-[#6366f1] font-medium hover:underline bg-transparent border-none cursor-pointer">Resend</button>
          </p>

        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
