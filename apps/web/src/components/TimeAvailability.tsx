import { useState } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Stepper from './Stepper';
import { trpc } from '../utils/trpc';
import type { ChangeEvent } from "react";

export default function TimeAvailability() {
  const [hours, setHours] = useState<number>(() => {
    const savedHours = localStorage.getItem("study_hours");
    return savedHours ? JSON.parse(savedHours) : 2;
  });

  const [days, setDays] = useState<number>(() => {
    const savedDays = localStorage.getItem("study_days");
    return savedDays ? JSON.parse(savedDays) : 5;
  });

  const navigate = useNavigate();
  const setAvailability = trpc.user.setAvailability.useMutation({
    onSuccess: () => {
      localStorage.setItem("study_hours", JSON.stringify(hours));
      localStorage.setItem("study_days", JSON.stringify(days));

      navigate("/career-goal");
    },
  });

  const quickOptions: number[] = [1, 2, 4, 8];

  const calculateMonths = (dailyHrs: number, weeklyDays: number): number => {
    if (dailyHrs === 0 || weeklyDays === 0) return 0;
    const totalTargetHours = 320; 
    
    const weeklyHours = dailyHrs * weeklyDays; 
    const weeksNeeded = totalTargetHours / weeklyHours;
    const months = Math.ceil(weeksNeeded / 4);
    return months > 0 ? months : 1;
  };

  const estimatedMonths = calculateMonths(hours, days);
  
  const hoursPercentage = (hours / 8) * 100;
  const daysPercentage = ((days - 1) / 6) * 100; 

  const handleContinue = () => {
    setAvailability.mutate({
      availableDaysPerWeek: days,
      availableHoursPerDay: hours,
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/50 flex flex-col font-sans antialiased text-[#1e293b] justify-between p-4 sm:p-6 md:p-12 selection:bg-indigo-100">

      {/* Main */}
      <main className="w-full max-w-5xl mx-auto mb-6 flex flex-col gap-8 md:gap-10">

        {/* Progress Bar */}
        <Stepper currentStep={3} />

        {/* Headline */}
        <div className="flex flex-col border-b border-slate-100 pb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight mb-1">
            How much time can you commit?
          </h1>
          <p className="text-slate-400 text-xs sm:text-[13px]">
            Select your daily hours and weekly days to automatically calculate your graduation and job-ready timeline.
          </p>
        </div>

        {/* Options Buttons */}
        <div className="flex gap-2 sm:gap-3 w-full justify-center flex-wrap">
          {quickOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setHours(opt)}
              className={`
                px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold min-w-17.5 sm:min-w-25 border tracking-wide
                flex items-center justify-center transition-all duration-300 ease-out
                focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2
                active:scale-95 transform
                ${
                  hours === opt
                    ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-950 hover:bg-slate-50'
                }`}
            >
              <span className="tabular-nums">{opt}</span>
              <span className="text-[10px] sm:text-[11px] font-medium opacity-80 ml-1 uppercase">hrs</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          
          {/* Card 1: Daily Hours */}
          <div className="w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col items-center shadow-xs">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl tracking-tight text-slate-950">{hours}</span>
              <span className="text-xs sm:text-sm font-medium text-slate-400">hours / day</span>
            </span>
            
            <div className="w-full px-2">
              <input
                type="range"
                min="0"
                max="8"
                value={hours}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setHours(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                style={{
                  background: `linear-gradient(to right, #020617 0%, #020617 ${hoursPercentage}%, #e2e8f0 ${hoursPercentage}%, #e2e8f0 100%)`
                }}
              />
              <div className="flex justify-between mt-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase select-none">
                <span className="hover:text-slate-600 transition-colors duration-200">0 HRS</span>
                <span className="hover:text-slate-600 transition-colors duration-200">8+ HRS</span>
              </div>
            </div>
          </div>

          {/* Card 2: Weekly Days */}
          <div className="w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col items-center shadow-xs">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl tracking-tight text-slate-950">{days}</span>
              <span className="text-xs sm:text-sm font-medium text-slate-400">days / week</span>
            </span>
            
            <div className="w-full px-2">
              <input
                type="range"
                min="1"
                max="7"
                value={days}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDays(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                style={{
                  background: `linear-gradient(to right, #020617 0%, #020617 ${daysPercentage}%, #e2e8f0 ${daysPercentage}%, #e2e8f0 100%)`
                }}
              />
              <div className="flex justify-between mt-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase select-none">
                <span className="hover:text-slate-600 transition-colors duration-200">1 DAY</span>
                <span className="hover:text-slate-600 transition-colors duration-200">7 DAYS</span>
              </div>
            </div>
          </div>

        </div>

        {/* Estimated Notice */}
        <div className={`w-full border rounded-xl p-4 sm:p-5 flex items-start gap-4 transition-all duration-500 ease-out transform hover:-translate-y-1 hover:shadow-lg group ${
          hours === 0 
            ? 'bg-linear-to-br from-amber-50 to-orange-50/50 border-amber-200 shadow-amber-100/40 text-amber-950' 
            : 'bg-linear-to-br from-slate-50 to-white border-slate-200 shadow-slate-100/40 text-slate-900'
        }`}>
          <div className={`p-2 rounded-lg mt-0.5 shrink-0 transition-all duration-300 group-hover:scale-110 ${
            hours === 0 
              ? 'bg-amber-100 text-amber-700 shadow-sm shadow-amber-200' 
              : 'bg-white border border-slate-200 text-slate-700 shadow-sm group-hover:border-slate-300 group-hover:text-black'
          }`}>
            {hours === 0 ? (
              <Calendar className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <Clock className="w-4 h-4 stroke-[2.5] group-hover:rotate-12 transition-transform duration-300" />
            )}
          </div>
          <div>
            <div className="text-xs sm:text-[13px] leading-relaxed transition-all duration-300">
              {hours === 0 ? (
                <span className="text-amber-800/90 italic">
                  Please select hours to see your estimated timeline.
                </span>
              ) : (
                <span className="text-slate-600 group-hover:text-slate-700 block">
                  At this pace ({hours} hrs × {days} days = {hours * days} hrs/week), you'll be job-ready in approximately{' '}
                  <span className="inline-block font-bold text-gray-600 bg-white border border-blue-100 px-2 py-0.5 rounded-md mx-0.5 shadow-sm transform hover:transition-all duration-200 hover:bg-gray-100 hover:text-gray-700">
                    {estimatedMonths} months
                  </span>.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="w-full flex items-center justify-between border-t border-slate-100 pt-6 -mt-2">
          <button
            onClick={() => navigate('/skills-review')}
            className="group text-gray-600 hover:text-black font-semibold text-xs sm:text-sm flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            BACK
          </button>

          <button
            onClick={handleContinue}
            className="bg-black hover:bg-[#11192E] text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#192440]/10 hover:shadow-xl hover:shadow-[#11192E]/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            {setAvailability.isPending ? "Saving..." : "CONTINUE"}
          </button>
        </div>

      </main>

      <style>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #020617;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.15s ease, background-color 0.15s ease;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          background: #0f172a;
        }
        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          background: #020617;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.15s ease, background-color 0.15s ease;
        }
        input[type='range']::-moz-range-thumb:hover {
          transform: scale(1.2);
          background: #0f172a;
        }
      `}</style>
    </div>
  );
}