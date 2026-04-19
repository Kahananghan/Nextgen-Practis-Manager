import React from "react";
import Logo from "./Logo";

const LoginVisual: React.FC = () => {
  return (
    <div className="hidden lg:flex bg-[#0f1f3d] relative overflow-hidden flex-col justify-between p-10">
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`
      }}></div>

      {/* Glowing orb */}
      <div className="absolute w-[340px] h-[340px] bg-[radial-gradient(circle_at_40%_40%,_#6366f1_0%,_transparent_70%)] opacity-[0.22] bottom-[-80px] right-[-80px] rounded-full pointer-events-none"></div>

      {/* Thin diagonal lines pattern */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `repeating-linear-gradient(-55deg, transparent 0px, transparent 24px, rgba(99,102,241,0.04) 24px, rgba(99,102,241,0.04) 25px)`
      }}></div>

      {/* Logo */}
      <div className="relative z-2">
        <div className="flex items-center gap-2.5">
          <Logo size="md" />
          <div>
            <div className="font-['DM_Serif_Display'] text-[22px] text-white leading-none tracking-[-0.3px]">Practis</div>
            <div className="text-[10px] text-[#9ca3af] font-normal mt-[2px] tracking-[0.8px]">MANAGER</div>
          </div>
        </div>
      </div>

      {/* Centre: geometric visual + tagline */}
      <div className="relative z-2 flex-1 flex flex-col justify-center">
        {/* Abstract SVG visual */}
        <div className="flex items-center justify-start mb-6">
          <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer ring */}
            <circle cx="90" cy="90" r="78" stroke="#1e3560" strokeWidth="1"/>
            {/* Mid ring */}
            <circle cx="90" cy="90" r="56" stroke="#253f6a" strokeWidth="0.8"/>
            {/* Inner ring */}
            <circle cx="90" cy="90" r="34" stroke="#2e4f80" strokeWidth="0.8"/>

            {/* Glowing center disc */}
            <circle cx="90" cy="90" r="22" fill="#6366f1" opacity="0.18"/>
            <circle cx="90" cy="90" r="14" fill="#6366f1" opacity="0.32"/>
            <circle cx="90" cy="90" r="6"  fill="#a5b4fc" opacity="0.9"/>

            {/* Orbit dot 1 — top */}
            <circle cx="90" cy="12" r="5" fill="#6366f1" opacity="0.9"/>
            <line x1="90" y1="12" x2="90" y2="56" stroke="#6366f1" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.4"/>

            {/* Orbit dot 2 — right */}
            <circle cx="168" cy="90" r="4" fill="#818cf8" opacity="0.75"/>
            <line x1="168" y1="90" x2="124" y2="90" stroke="#818cf8" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.3"/>

            {/* Orbit dot 3 — bottom-left */}
            <circle cx="35" cy="145" r="4" fill="#a5b4fc" opacity="0.6"/>
            <line x1="35" y1="145" x2="63" y2="116" stroke="#a5b4fc" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.3"/>

            {/* Orbit dot 4 — bottom-right */}
            <circle cx="155" cy="148" r="3" fill="#6366f1" opacity="0.5"/>

            {/* Cross tick marks on outer ring */}
            <line x1="90" y1="2"   x2="90" y2="10"  stroke="#2a4570" strokeWidth="1"/>
            <line x1="90" y1="170" x2="90" y2="178" stroke="#2a4570" strokeWidth="1"/>
            <line x1="2"  y1="90"  x2="10" y2="90"  stroke="#2a4570" strokeWidth="1"/>
            <line x1="170" y1="90" x2="178" y2="90"  stroke="#2a4570" strokeWidth="1"/>

            {/* Arc highlight */}
            <path d="M 90 12 A 78 78 0 0 1 168 90" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>

            {/* Floating label chips */}
            <rect x="148" y="32" width="66" height="20" rx="5" fill="#1a2d4e" stroke="#2a4070" strokeWidth="0.7"/>
            <circle cx="158" cy="42" r="3.5" fill="#4ade80"/>
            <text x="165" y="46" fontFamily="DM Sans, sans-serif" fontSize="8" fill="#7a94bb">WIP Tracked</text>

            <rect x="148" y="126" width="66" height="20" rx="5" fill="#1a2d4e" stroke="#2a4070" strokeWidth="0.7"/>
            <circle cx="158" cy="136" r="3.5" fill="#6366f1"/>
            <text x="165" y="140" fontFamily="DM Sans, sans-serif" fontSize="8" fill="#7a94bb">Jobs Active</text>

            <rect x="-4" y="58" width="58" height="20" rx="5" fill="#1a2d4e" stroke="#2a4070" strokeWidth="0.7"/>
            <circle cx="6" cy="68" r="3.5" fill="#fbbf24"/>
            <text x="13" y="72" fontFamily="DM Sans, sans-serif" fontSize="8" fill="#7a94bb">Invoiced</text>
          </svg>
        </div>

        {/* Tagline */}
        <h1 className="font-['DM_Serif_Display'] font-bold text-[34px] leading-[1.18] text-white tracking-[-0.5px] mb-[0.9rem]">
          Run a smarter<br/><em className="font-italic text-[#a5b4fc]">accounting practice.</em>
        </h1>
        <p className="text-[13px] text-[#4a6888] font-light leading-[1.6] max-w-[240px]">
          The enhancement layer your Xero Practice Manager has been missing.
        </p>
      </div>

      {/* Bottom */}
      <div className="relative z-2">
        <div className="inline-flex items-center gap-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-[20px] py-1 px-2.5 text-[11px] text-[#5a7a9a] font-normal">
          <div className="w-4 h-4 bg-[#00b5d8] rounded-full flex items-center justify-center text-[9px] font-bold text-white">X</div>
          Powered by Xero Practice Manager
        </div>
        <div className="text-[11px] text-[#233450] mt-[0.8rem]"> 2026 Practis Manager · Built by Product Array</div>
      </div>
    </div>
  );
};

export default LoginVisual;