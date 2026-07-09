import { useLocation, useNavigate } from "react-router-dom";
import Stepper from "../components/Stepper";
import { useState } from "react";
import { trpc } from "../utils/trpc";

// تعريف بنية بيانات المهارة
interface Skill {
  id: string | number;
  name: string;
  level: "Beginner" | "Mid" | "Expert";
  type: "design" | "js" | "code";
  isAiExtracted: boolean;
}

// تعريف بنية الـ State القادمة من الـ Location (React Router)
interface LocationState {
  inheritedSkills?: string[];
}

interface AddSkillsProps {
  onSubmit?: (skills: Skill[]) => void;
}

export default function AddSkills({ onSubmit }: AddSkillsProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // الحصول على المهارات الممررة عبر الـ State مع حمايتها بـ Type Casting
  const state = location.state as LocationState;
  const inheritedSkills = state?.inheritedSkills || [];

  // دالة لتحديد نوع الأيقونة بناءً على اسم المهارة
  const getSkillType = (name: string): "design" | "js" | "code" => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("design") || lowerName === "figma" || lowerName.includes("ui") || lowerName.includes("ux")) return "design";
    if (lowerName.includes("javascript") || lowerName === "typescript" || lowerName === "js" || lowerName === "ts") return "js";
    return "code";
  };

  const formatInheritedSkills = (skillsArray: string[]): Skill[] => {
    return skillsArray.map((skillName, index) => ({
      id: `ai-${Date.now()}-${index}`,
      name: skillName,
      level: "Mid", // مستوى افتراضي للمهارات المستخرجة
      type: getSkillType(skillName),
      isAiExtracted: true, // لتمييزها في شاشة المراجعة
    }));
  };

  // States الإدارة الأساسية للمهارات والبحث والتنبيهات
  const [skills, setSkills] = useState<Skill[]>(() => formatInheritedSkills(inheritedSkills));
  const [inputSkill, setInputSkill] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<"Beginner" | "Mid" | "Expert">("Beginner");
  const [search, setSearch] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>(""); 

  const searchSkill = trpc.skills.searchSkill.useQuery(
    {
      skillWords: inputSkill,
    },
    {
      enabled: inputSkill.trim().length >= 2,
    }
  );

  const addManualSkill = trpc.skills.addManualSkill.useMutation();
  const updateUserSkill = trpc.skills.updateUserSkill.useMutation();

  // تأكيد أن الـ suggestions مصفوفة تحتوي على معرف واسم
  const suggestions = (searchSkill.data as { id: string | number; name: string }[]) || [];

  const triggerAlert = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage("");
    }, 3000);
  };

  const handleAddSkill = async () => {
    if (!inputSkill.trim()) return;

    const exists = skills.some((s) => s.name.toLowerCase() === inputSkill.trim().toLowerCase());
    if (exists) {
      triggerAlert("This skill is already added!");
      return;
    }

    const levelMap: Record<"Beginner" | "Mid" | "Expert", "beginner" | "intermediate" | "expert"> = {
      Beginner: "beginner",
      Mid: "intermediate",
      Expert: "expert",
    };

    const result = await addManualSkill.mutateAsync([
      {
        skillName: inputSkill,
        level: levelMap[selectedLevel],
      },
    ]);

    const addedSkill = result.added[0];

    setSkills([
      ...skills,
      {
        id: addedSkill.skillId,
        name: addedSkill.skillName,
        level: selectedLevel,
        type: getSkillType(inputSkill),
        isAiExtracted: false,
      },
    ]);

    setInputSkill("");
    setSelectedLevel("Beginner");
  };

  const handleSelectSuggestion = (tech: string) => {
    setInputSkill(tech);
  };

  const removeSkill = (id: string | number) => {
    setSkills(skills.filter((s) => s.id !== id));
  };

  const updateLevel = async (id: string | number, level: "Beginner" | "Mid" | "Expert") => {
    const scoreMap: Record<"Beginner" | "Mid" | "Expert", number> = {
      Beginner: 30,
      Mid: 60,
      Expert: 90,
    };

    await updateUserSkill.mutateAsync({
      skillId: id as string, // تحويله حسب متطلبات الـ API الخاص بك (غالباً string)
      strengthScore: scoreMap[level],
    });

    setSkills(
      skills.map((s) =>
        s.id === id ? { ...s, level } : s
      )
    );
  };

  const handleConfirm = () => {
    if (skills.length === 0) {
      triggerAlert("Please add at least one skill!");
      return;
    }
    if (onSubmit) onSubmit(skills);
    // التوجيه إلى صفحة المواعيد مع تمرير المهارات في الـ state
    navigate("/availability", { state: { skills } });
  };

  // تصفية المهارات عند البحث
  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(search.toLowerCase())
  );

  // تقسيم المهارات لعرض شاشة مراجعة مهارات الـ AI بشكل منفصل عن المهارات اليدوية
  const aiSkills = filteredSkills.filter(s => s.isAiExtracted);
  const manualSkills = filteredSkills.filter(s => !s.isAiExtracted);

  return (
    <div className="min-h-screen w-full bg-neutral-50 flex flex-col items-center py-6 px-6 font-sans antialiased text-neutral-900 relative">
      
      {/* 🔔 التنبيه المخصص الجميل (Toast Notification) */}
      {errorMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 bg-black text-white text-xs font-semibold px-5 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-neutral-800 animate-toastIn">
          <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {errorMessage}
        </div>
      )}

      <div className="w-full max-w-4xl animate-fade-in">
        <div className="flex items-center justify-between mb-3 px-1 mt-2">
          <Stepper currentStep={2} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6 relative z-10 w-full">
        {/* العناوين في المنتصف */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-4xl font-bold tracking-normal mb-4 antialiased">
            <span className="text-neutral-900">
              Skill Management
            </span>
          </h1>
          <p className="text-neutral-500 text-sm md:text-base font-medium leading-relaxed transition-all duration-300 hover:text-neutral-800">
            Search or Select From The Suggestion Below To Build Your Profile
          </p>
        </div>

        {/* 🧠 شاشة مراجعة المهارات المستخرجة بواسطة الـ AI */}
        {aiSkills.length > 0 && (
          <div className="mb-10 bg-neutral-100/50 border border-neutral-200 rounded-3xl p-6 backdrop-blur-sm animate-fadeIn">
            <h2 className="text-xs font-bold tracking-wider text-neutral-700 uppercase mb-4 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 animate-ping"></span>
              AI-Detected Skills Review (Confirm or Adjust)
            </h2>
            <div className="space-y-3">
              {aiSkills.map((skill) => (
                <div key={skill.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] bg-neutral-900 text-white font-black px-1.5 py-0.5 rounded-md shadow-sm uppercase tracking-wide">AI</span>
                    <span className="font-bold text-neutral-800 text-base">{skill.name}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100">
                    <div className="flex bg-white p-1 rounded-xl text-xs font-medium border border-neutral-200 shadow-sm gap-0.5">
                      {(["Beginner", "Mid", "Expert"] as const).map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => updateLevel(skill.id, lvl)}
                          className={`px-3.5 py-1.5 rounded-lg transition-all duration-200 font-bold ${skill.level === lvl ? "bg-black text-white shadow-sm" : "bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"}`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => removeSkill(skill.id)}
                      className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-xl transition-all duration-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* نموذج إضافة وتعديل المهارات اليدوية */}
        <div className="bg-white p-12 rounded-3xl border border-neutral-200 shadow-[0_10px_40px_rgba(0,0,0,0.02)] mb-10 group">
          <label className="block text-center text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4 group-focus-within:text-black">
            Add Custom or Selected Skill
          </label>

          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full group/input">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Type any skill name here..."
                value={inputSkill}
                onChange={(e) => setInputSkill(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-neutral-900 font-medium placeholder:text-neutral-400 outline-none transition-all duration-300 hover:bg-white focus:bg-white focus:border-neutral-400 focus:shadow-[0_0_0_4px_rgba(0,0,0,0.02)]"
              />
            </div>

            <div className="flex bg-white p-1.5 rounded-2xl text-xs font-semibold w-full lg:w-auto justify-between border border-neutral-200 shadow-sm gap-1">
              {(["Beginner", "Mid", "Expert"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-5 py-2.5 rounded-xl transition-all duration-300 font-bold ${selectedLevel === lvl ? "bg-black text-white scale-[1.02] shadow-sm" : "bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"}`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <button
              onClick={handleAddSkill}
              disabled={!inputSkill.trim()}
              className="group relative w-full lg:w-auto px-8 py-3.5 rounded-2xl font-semibold text-white bg-black transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_18px_45px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 disabled:shadow-none disabled:translate-y-0 overflow-hidden"
            >
              <span className="relative flex items-center justify-center gap-2">
                Add
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* قسم الاقتراحات السريعة */}
        <div className="mb-10 text-center">
          <h2 className="text-xs font-bold tracking-wider text-neutral-400 uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900"></span>
            SUGGESTED FOR YOUR GOAL
          </h2>
          <div className="flex flex-wrap justify-center gap-2.5">
            {suggestions.map((skill) => (
              <button
                key={skill.id}
                onClick={() => handleSelectSuggestion(skill.name)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 border ${
                  inputSkill === skill.name
                    ? "bg-neutral-900 border-neutral-900 text-white shadow-sm scale-[1.03]"
                    : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {skill.name}
              </button>
            ))}
          </div>
        </div>

        {/* خانة تصفية البحث */}
        {skills.length > 0 && (
          <div className="relative mb-6 group animate-fadeIn">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400 group-focus-within:text-black transition-colors duration-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Filter your added skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 placeholder-neutral-400 outline-none transition-all duration-300 focus:border-neutral-400 focus:shadow-[0_0_0_4px_rgba(0,0,0,0.02)] shadow-sm"
            />
          </div>
        )}

        {/* قائمة المهارات المضافة يدوياً */}
        <div>
          <h2 className="text-xs font-bold tracking-wider text-neutral-500 uppercase mb-2 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900"></span>
            MANUAL SKILLS <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md text-[10px] ml-1">{manualSkills.length}</span>
          </h2>

          {manualSkills.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-3xl text-neutral-400 text-sm bg-white shadow-inner">
              <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center mx-auto mb-3 border border-neutral-100">
                <svg 
                  className="w-8 h-8 text-neutral-400 relative z-10" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              No manual skills added yet. Use the component above to include them.
            </div>
          ) : (
            <div className="space-y-3">
              {manualSkills.map((skill) => (
                <div key={skill.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 animate-fadeIn gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-neutral-50 rounded-xl text-neutral-600 border border-neutral-200 shadow-sm">
                      {skill.type === "code" && (
                        <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      )}
                      {skill.type === "js" && (
                        <span className="text-xs font-black text-neutral-900 px-0.5 tracking-tighter">JS</span>
                      )}
                      {skill.type === "design" && (
                        <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      )}
                    </div>
                    <span className="font-bold text-neutral-800 text-base tracking-tight">{skill.name}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100">
                    <div className="flex bg-white p-1 rounded-xl text-xs font-medium border border-neutral-200 shadow-sm gap-0.5">
                      {(["Beginner", "Mid", "Expert"] as const).map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => updateLevel(skill.id, lvl)}
                          className={`px-3.5 py-1.5 rounded-lg transition-all duration-200 font-bold active:scale-95 ${skill.level === lvl ? "bg-black text-white shadow-sm" : "bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"}`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => removeSkill(skill.id)}
                      className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-xl transition-all duration-300 border border-transparent hover:border-neutral-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* زر الخطوة التالية */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleConfirm}
            className="bg-black hover:bg-neutral-800 text-white px-6 sm:px-8 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group truncate"
          >
            CONTINUE
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* إضافة كلاس الأنيميشن الخاص بظهور الـ Toast */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, -20px) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-toastIn {
          animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}