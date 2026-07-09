import { useState, useEffect, type CSSProperties } from 'react';
import { useNavigate, useLocation } from "react-router-dom";

// تعريف نوع البيانات المتواجدة في الـ Route State
interface LocationState {
  skills?: string[];
}

const RoadmapLoader = () => {
  const [progress, setProgress] = useState<number>(0);
  const [optimized, setOptimized] = useState<number>(0);
  const [ops, setOps] = useState<string>("915.024");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          const stateData = location.state as LocationState;
          navigate("/skills-review", {
            state: { skills: stateData?.skills || [] },
          });
          return 100;
        }
        return prev + 1;
      });

      setOptimized((prev) => (prev >= 100 ? 100 : prev + 1));
      setOps((Math.random() * (930 - 910) + 910).toFixed(3));
    }, 40);

    return () => clearInterval(interval);
  }, [navigate, location.state]);

  // إضافة الأنواع (Types) لمعامل الدالة وقيمتها المرجعة
  const orbitAnimationStyle = (direction: 'normal' | 'reverse' = 'normal'): CSSProperties => ({
    animation: `spin 6s linear infinite`,
    animationDirection: direction,
  });

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-[#fcfcfc] font-sans text-black select-none px-4 py-8">
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="relative flex items-center justify-center mb-6 sm:mb-8 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
        
        <div className="absolute border border-dashed rounded-sm pointer-events-none w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 border-neutral-300 flex items-center justify-center">
          
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-px h-16 sm:h-20 md:h-24 bg-linear-to-t from-neutral-500 via-neutral-400 to-transparent origin-bottom animate-pulse">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neutral-400"></div>
          </div>

          <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-16 sm:h-20 md:h-24 bg-linear-to-b from-neutral-500 via-neutral-400 to-transparent origin-top animate-pulse">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neutral-400"></div>
          </div>

          <div className="absolute right-full top-1/2 -translate-y-1/2 h-px w-16 sm:w-20 md:w-24 bg-linear-to-l from-neutral-500 via-neutral-400 to-transparent origin-right animate-pulse">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-neutral-400"></div>
          </div>

          <div className="absolute left-full top-1/2 -translate-y-1/2 h-px w-16 sm:w-20 md:w-24 bg-linear-to-r from-neutral-500 via-neutral-400 to-transparent origin-left animate-pulse">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-neutral-400"></div>
          </div>

        </div>

        <div className="absolute border rounded-full pointer-events-none w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 border-neutral-100"></div>

        <div
          className="absolute w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 flex items-center justify-center"
          style={orbitAnimationStyle("normal")}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-neutral-800 rounded-full shadow-sm"></div>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-neutral-800 rounded-full shadow-sm"></div>
        </div>

        <div 
          className="absolute w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 flex items-center justify-center"
          style={orbitAnimationStyle('reverse')}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-neutral-800 rounded-full shadow-sm"></div>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-neutral-800 rounded-full shadow-sm"></div>
        </div>

        <h1 className="relative z-10 text-base sm:text-lg md:text-xl font-bold font-serif tracking-[0.3em] uppercase text-neutral-800 pl-[0.3em]">
          architecture
        </h1>
      </div>

      <div className="mb-6 sm:mb-8 text-center max-w-xs sm:max-w-md px-2">
        <h2 className="mb-2 text-base sm:text-lg font-normal tracking-wider text-neutral-800">
          Parsing your CV
        </h2>
        <p className="text-[9px] sm:text-[10px] tracking-[0.3em] text-emerald-600 font-mono uppercase animate-pulse">
          Extracting your skills
        </p>
      </div>

      <div className="relative h-0.5 sm:h-0.75 w-full max-w-70 sm:max-w-[288px] bg-neutral-100 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-100 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="flex justify-between items-center w-full max-w-70 sm:max-w-[288px] text-[9px] sm:text-[10px] font-mono tracking-widest text-neutral-400 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping"></span>
          <span>SYS.{ops}.OPS</span>
        </div>
        <div className="font-medium uppercase text-neutral-500">
          {optimized}% Optimized
        </div>
      </div>

    </div>
  );
};

export default RoadmapLoader;