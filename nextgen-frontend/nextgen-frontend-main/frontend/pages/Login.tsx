import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import LoginVisual from "../components/LoginVisual";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    navigate("/dashboard");
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

          {/* Xero badge */}
          <div className="inline-flex items-center gap-1.5 bg-[#eef2ff] border border-[#c7d2fe] rounded-[20px] py-1 px-2.5 text-[12px] text-[#6366f1] font-medium mb-[1.8rem]">
            <div className="w-[18px] h-[18px] bg-[#00b5d8] rounded-full flex items-center justify-center text-[10px] font-bold text-white">X</div>
            Connected to Xero Practice Manager
          </div>

          {/* Form header */}
          <div className="mb-[1.8rem]">
            <h2 className="font-['DM_Serif_Display'] text-[26px] text-[#0f1f3d] font-semibold mb-1">Welcome back</h2>
            <p className="text-[14px] text-[#475569] font-light">Sign in to your Practis Manager account</p>
          </div>

          <form onSubmit={handleSubmit}>

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
              />
            </div>

            {/* Password */}
            <div className="mb-[1.1rem]">
              <label htmlFor="password" className="block text-[13px] font-medium text-[#0f1f3d] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-[44px] px-[14px] font-['DM_Sans'] text-[14px] text-[#1e293b] bg-[#f5f5ff] border-[1.5px] border-[#c7d2fe] rounded-[10px] outline-none transition-all duration-[0.18s] focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] focus:bg-white placeholder-[#b0bcd4]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b0bcd4] hover:text-[#6366f1] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between mb-[1.4rem]">
              <label className="flex items-center gap-[7px] text-[13px] text-[#475569] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-[#6366f1] cursor-pointer"
                />
                Keep me signed in
              </label>
              <Link
                to="/forgot-password"
                className="text-[13px] text-[#6366f1] font-medium no-underline hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              className="w-full h-[46px] bg-[#6366f1] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer transition-all duration-[0.18s] hover:bg-[#4f52d4] active:scale-[0.99]"
            >
              Sign in
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-[1.3rem]">
              <div className="flex-1 h-px bg-[#c7d2fe]"></div>
              <span className="text-[12px] text-[#b0bcd4] whitespace-nowrap">or continue with</span>
              <div className="flex-1 h-px bg-[#c7d2fe]"></div>
            </div>

            {/* Sign in with Xero button */}
            <button
              type="button"
              className="w-full h-[46px] bg-white border-[1.5px] border-[#c7d2fe] rounded-[10px] text-[13px] font-medium text-[#0f1f3d] cursor-pointer flex items-center justify-center gap-2.5 transition-all duration-[0.15s] hover:bg-[#eef2ff] hover:border-[#6366f1]"
            >
              <div className="w-5 h-5 bg-[#00b5d8]  rounded-full flex items-center justify-center font-bold text-white">X</div>
              Sign in with Xero
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-[1.5rem] text-[12px] text-[#b0bcd4] text-center leading-[1.7]">
            Need access? <Link to="#" className="text-[#6366f1] no-underline hover:underline">Contact your firm administrator</Link><br/>
            <Link to="#" className="text-[#6366f1] no-underline hover:underline">Privacy Policy</Link> · <Link to="#" className="text-[#6366f1] no-underline hover:underline">Terms of Use</Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;