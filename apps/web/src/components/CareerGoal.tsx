import { useState } from 'react';
import { 
  CheckCircle2,
  Info,
  X,
  Layout, 
  Layers,
  type LucideIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Stepper from '../components/Stepper';
import { trpc } from "../utils/trpc";

interface Goal {
  id: string | number;
  title: string;
  description?: string;
  score?: number;
}

const CareerGoal = () => {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [activeDescriptionId, setActiveDescriptionId] = useState<string | number | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!selectedGoal) return;

    setUserRole.mutate(
      {
        roleId: selectedGoal.id as string, 
      },
      {
        onSuccess: () => {
          localStorage.setItem(
            "career_goal",
            JSON.stringify(selectedGoal)
          );

          navigate("/career-goal");
        },
      }
    );
  };

  const roleIcons: Record<string, LucideIcon> = {
    "Frontend Developer": Layout,
    "Full Stack Developer": Layers,
  }; 

const setUserRole = trpc.roles.setUserRole.useMutation();

const { data, isLoading, error } =
  trpc.roles.getAllRoles.useQuery({
    includeScore: true,
  });

const goals: Goal[] = data ?? [];
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading roles</div>;
  }

  return (
    <div className="min-h-screen w-full bg-slate-50/50 flex flex-col font-sans antialiased text-[#1e293b] justify-between p-4 sm:p-6 md:p-12 selection:bg-indigo-100">

      {/*  Header */}
      <header className="w-full max-w-5xl mx-auto mb-6">
         <Stepper currentStep={4} />
      </header>

      {/*  Main Content */}
      <main className="grow w-full max-w-5xl mx-auto flex flex-col items-center justify-center py-6">
        <div className="w-full text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            What's your career goal?
          </h1>
          <p className="text-base text-slate-500 max-w-md mx-auto font-medium">
            We'll build your roadmap around this personalized choice.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full items-start">
          {goals.map((goal) => {
            const IconComponent = roleIcons[goal.title] || Layout;
            const isSelected = selectedGoal?.id === goal.id;
            const isDescriptionOpen = activeDescriptionId === goal.id;

            return (
              <div
                key={goal.id}
                onClick={() => setSelectedGoal(goal)}
                className={`relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer select-none border transition-all duration-300 ease-out min-h-45 h-auto justify-center group
                  ${isSelected 
                    ? 'border-black ring-4 ring-indigo-50 shadow-lg shadow-indigo-100/50 scale-[1.02]' 
                    : 'border-slate-200/80 hover:border-slate-300 hover:bg-white hover:shadow-md hover:shadow-slate-100/80 hover:scale-[1.01]'
                  }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDescriptionId(isDescriptionOpen ? null : goal.id);
                  }}
                  className={`absolute top-4 left-4 p-1.5 rounded-lg transition-all duration-200 z-10 bg-slate-100/80 shadow-sm border border-slate-200/40
                    ${isDescriptionOpen 
                      ? 'bg-slate-900 text-white hover:bg-slate-800' 
                      : 'text-slate-700 hover:text-black hover:bg-slate-200'
                    }`}
                  title="Role Description"
                >
                  {isDescriptionOpen ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </button>

                {isSelected && (
                  <div className="absolute top-4 right-4 text-black animate-in fade-in zoom-in-50 duration-300">
                    <CheckCircle2 className="w-6 h-6 fill-black text-white" strokeWidth={1.5} />
                  </div>
                )}

                <div className={`mb-4 transition-all duration-300 p-3.5 rounded-xl mt-2
                  ${isSelected 
                    ? 'text-black bg-indigo-50' 
                    : 'text-slate-400 bg-slate-50 group-hover:text-slate-600 group-hover:bg-slate-100/80'
                  }`}
                >
                  <IconComponent className="w-7 h-7 transition-transform duration-300 group-hover:scale-105" strokeWidth={2} />
                </div>

                <h3 className={`text-lg font-bold transition-colors duration-200 mb-1 ${isSelected ? 'text-black' : 'text-slate-800'}`}>
                  {goal.title}
                </h3>
                
                <p className="text-sm font-medium text-slate-400 group-hover:text-slate-500 transition-colors">
                  {goal.score ? `${goal.score}% Match` : "No score yet"}
                </p>

                {isDescriptionOpen && (
                  <div className="mt-4 w-full text-left text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-150 animate-in fade-in slide-in-from-top-3 duration-300 ease-out leading-relaxed">
                    {goal.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/*  Footer */}
      <footer className="w-full max-w-5xl mx-auto pt-6 border-t border-slate-200/60 flex items-center justify-between mt-6 gap-4">
        <button
          onClick={() => navigate('/availability')}
          className="group text-slate-500 hover:text-slate-900 font-bold text-xs tracking-wider flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-slate-100 transition-all duration-200 whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          BACK
        </button>

        <button
          disabled={!selectedGoal}
          onClick={handleContinue}
          className={`
            px-8 py-3.5 rounded-xl font-bold text-xs tracking-wider
            flex items-center gap-2
            transition-all duration-200
            shadow-lg whitespace-nowrap
            ${!selectedGoal
              ? "bg-slate-300 cursor-not-allowed text-white shadow-none"
              : "bg-black hover:bg-[#11192E] text-white hover:shadow-xl"
            }
          `}
        >
          CONTINUE
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </footer>

    </div>
  );
};

export default CareerGoal;