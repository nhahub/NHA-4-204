import { useEffect, useRef } from "react";
import {
  Target,
  FileText,
  SlidersHorizontal,
  Globe,
  Clock3,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
interface Step {
  title: string;
  icon: LucideIcon;
}

const steps: Step[] = [
  { title: "GitHub", icon: Globe },
  { title: "CV", icon: FileText },
  { title: "Skills", icon: SlidersHorizontal },
  { title: "Time", icon: Clock3 },
  { title: "Career", icon: Target },
];

interface StepperProps {
  currentStep: number;
}

export default function Stepper({ currentStep }: StepperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const activeElement = containerRef.current.children[currentStep] as HTMLElement | undefined;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [currentStep]);

  return (
    <div className=" w-full bg-white py-4 px-6 sm:py-5 sm:px-6 rounded-2xl border border-zinc-100 shadow-sm overflow-visible -mt-6">
      <div
        ref={containerRef}
        className="flex flex-row items-center justify-between select-none gap-2 md:gap-0 overflow-x-auto scroll-smooth no-scrollbar"
        style={{
          msOverflowStyle: "none", 
          scrollbarWidth: "none", 
        }}
      >
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {steps.map((step, index) => {
          const Icon = step.icon;
          const completed = index < currentStep;
          const active = index === currentStep;

          return (
            <div
              key={index}
              className="flex flex-row items-center flex-1 last:flex-none shrink-0"
            >
              <div className=" flex flex-col items-center relative group min-w-25 md:min-w-0 shrink-0">
                
                {active && (
                  <div className="absolute -inset-2 bg-black/5 rounded-xl blur-md opacity-75 animate-pulse transition-all duration-500 w-16 h-16 md:w-auto md:h-auto" />
                )}

                <div
                  className={`
                    relative w-14 h-14 mt-1 ml-1 rounded-xl flex items-center justify-center transition-all duration-500 ease-in-out shrink-0
                    ${
                      completed
                        ? "bg-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] scale-100"
                        : active
                        ? "bg-white text-black border-2 border-black shadow-[0_4px_20px_rgba(0,0,0,0.12)] scale-110 z-10"
                        : "bg-zinc-50 text-zinc-400 border border-zinc-200"
                    }
                  `}
                >
                  {completed ? (
                    <Check size={24} strokeWidth={3} className="animate-fade-in" />
                  ) : (
                    <Icon
                      size={22}
                      strokeWidth={active ? 2.5 : 1.8}
                      className={`transition-transform duration-300 ${
                        active ? "scale-110" : ""
                      }`}
                    />
                  )}
                </div>

                <span
                  className={`mt-3 text-xs md:text-xs font-medium tracking-wide transition-colors duration-300
                    ${
                      active
                        ? "text-black font-bold"
                        : completed
                        ? "text-zinc-600"
                        : "text-zinc-400"
                    }
                  `}
                >
                  {step.title}
                </span>
              </div>

              {index !== steps.length - 1 && (
                <div className="flex-1 min-w-10 md:min-w-0 w-full h-0.5 mx-2 md:mx-4 bg-zinc-200 relative overflow-visible self-center">
                  <div
                    className={`absolute top-0 left-0 h-full bg-black transition-all duration-700 ease-in-out shadow-[0_0_8px_rgba(0,0,0,0.2)]
                      ${completed ? "w-full" : "w-0"}
                    `}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}