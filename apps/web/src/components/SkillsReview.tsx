import { useNavigate } from "react-router-dom";
import Stepper from "../components/Stepper";
import { trpc } from "../utils/trpc";
import { useState, useMemo } from "react";
import type { ChangeEvent, FormEvent } from "react";

interface SkillData {
  skillId: string;
  skillName: string;
  strengthScore: number;
}

interface LocalModifiers {
  [key: string]: {
    level: "Beginner" | "Intermediate" | "Expert";
  };
}

interface SkillDisplay {
  id: string;
  name: string;
  level: "Beginner" | "Intermediate" | "Expert";
  type: "DETECTED" | "ADDED";
  icon?: React.ReactNode;
}

interface SearchResult {
  id: string;
  name: string;
}

export default function SkillsReview() {
  const navigate = useNavigate();

  const { data: skillsData = [] } = trpc.skills.getUserSkills.useQuery<SkillData[]>();
  const utils = trpc.useUtils();

  const [localSkillsModifiers, setLocalSkillsModifiers] = useState<LocalModifiers>({});
  const [deletedSkillIds, setDeletedSkillIds] = useState<Set<string>>(new Set());

  const skills = useMemo<SkillDisplay[]>(() => {
    return (skillsData as SkillData[])
      .filter((skill) => !deletedSkillIds.has(skill.skillId))
      .map((skill) => {
        const localMod = localSkillsModifiers[skill.skillId];
const calculatedLevel: "Beginner" | "Intermediate" | "Expert" =
  localMod?.level ??
  (skill.strengthScore >= 90
    ? "Expert"
    : skill.strengthScore >= 60
    ? "Intermediate"
    : "Beginner");

return {
  id: skill.skillId,
  name: skill.skillName,
  level: calculatedLevel,
  type: "DETECTED",
};
      });
  }, [skillsData, localSkillsModifiers, deletedSkillIds]);

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newSkillName, setNewSkillName] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  
  const { data: searchResults = [] } = trpc.skills.searchSkill.useQuery<SearchResult[]>(
    { skillWords: search },
    { enabled: search.length >= 2 }
  );

  const [, setNewSkillType] = useState<string>("DETECTED");
  const [newSkillLevel, setNewSkillLevel] = useState<"Beginner" | "Intermediate" | "Expert">("Intermediate");
  const [errorMessage, setErrorMessage] = useState<string>(""); // لتوضيح أخطاء التكرار للمستخدم

  const addManualSkill = trpc.skills.addManualSkill.useMutation();
  const deleteSkill = trpc.skills.deleteSkill.useMutation();
  const updateSkills = trpc.skills.updateSkills.useMutation();
  const updateUserSkill = trpc.skills.updateUserSkill.useMutation();

  const handleOpenModal = (): void => {
    setNewSkillName("");
    setSearch("");
    setNewSkillType("ADDED");
    setNewSkillLevel("Intermediate");
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const getSkillIcon = (skillName: string): React.ReactNode => {
    const name = skillName.toLowerCase();
    
    if (name.includes('react') || name.includes('js') || name.includes('javascript') || name.includes('code') || name.includes('developer')) {
      return (
        <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
        </svg>
      );
    }
    
    if (name.includes('design') || name.includes('figma') || name.includes('ui') || name.includes('ux')) {
      return (
        <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-3.388 1.62a14.26 14.26 0 0 1-.58-3.085c-.013-.231-.02-.464-.02-.7 0-3.163 2.564-5.714 5.74-5.714 3.177 0 5.74 2.55 5.74 5.714 0 3.163-2.563 5.715-5.74 5.715a5.878 5.878 0 0 1-3.388-1.076Zm0 0a15.998 15.998 0 0 1 3.388-1.62m0 0A16.037 16.037 0 0 1 18 12.75" />
        </svg>
      );
    }

    if (name.includes('data') || name.includes('sql') || name.includes('db') || name.includes('mongo')) {
      return (
        <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
      );
    }

    if (name.includes('git') || name.includes('docker') || name.includes('tech') || name.includes('config')) {
      return (
        <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.767c-.29.222-.434.59-.38.955.012.08.017.16.017.242 0 .083-.005.163-.017.243-.054.364.09.732.38.954l1.003.767a1.125 1.125 0 0 1 .26 1.43l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.216-.456a1.125 1.125 0 0 0-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281a1.125 1.125 0 0 0-.644-.87a6.52 6.52 0 0 1-.22-.127a1.125 1.125 0 0 0-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.767c.29-.222.434-.59.38-.955a3.46 3.46 0 0 1-.017-.242c0-.082.005-.162.017-.242.054-.364-.09-.732-.38-.954l-1.004-.767a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.49l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128c.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      );
    }

    return (
      <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    );
  };

  const handleLevelChange = (id: string, updatedLevel: "Beginner" | "Intermediate" | "Expert"): void => {
    setLocalSkillsModifiers((prev) => ({
      ...prev,
      [id]: { ...prev[id], level: updatedLevel },
    }));

    const score =
      updatedLevel === "Beginner"
        ? 30
        : updatedLevel === "Intermediate"
        ? 60
        : 90;

    updateUserSkill.mutate({
      skillId: id,
      strengthScore: score,
    });
  };

  const handleAddSkillSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    
    if (!newSkillName) {
      setErrorMessage("Please select a language from the list.");
      return;
    }

    const isDuplicate = skills.some(
      (skill) => skill.name.toLowerCase() === newSkillName.toLowerCase()
    );

    if (isDuplicate) {
      setErrorMessage("This skill is already in your list!");
      return;
    }

    if (newSkillName.trim()) {
      addManualSkill.mutate(
        [
          {
            skillName: newSkillName.trim(),
            level: newSkillLevel.toLowerCase() as "beginner" | "intermediate" | "expert",
          },
        ],
        {
          onSuccess: async () => {
            await utils.skills.getUserSkills.invalidate();
            setIsModalOpen(false);
            setSearch("");
            setNewSkillName("");
            setIsDropdownOpen(false);
          },
        }
      );
    }
  };

  const handleConfirm = (): void => {
    const confirmedSkills = skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      type: skill.type,
      level: skill.level,
    }));

    updateSkills.mutate(
      {
        skills: confirmedSkills,
      },
      {
        onSuccess: () => {
          navigate("/availability");
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/50 flex flex-col font-sans antialiased text-[#1e293b] justify-between p-4 sm:p-6 md:p-12 selection:bg-indigo-100 relative">

      {/* Main */}
      <main className="w-full max-w-5xl mx-auto mb-6 flex flex-col gap-10">
        <Stepper currentStep={2} />

        {/* Headline */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 tracking-tight mb-1">
              Here's what we found
            </h1>
            <p className="text-slate-400 text-[13px]">
              We detected these skills from your CV. Edit as needed.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg text-slate-700 font-medium text-xs self-start sm:self-auto">
            <svg className="w-3.5 h-3.5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138z" />
            </svg>
            <span>{skills.length} skills found</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="group bg-white border border-slate-200 rounded-xl p-5 min-h-40 flex flex-col justify-between transition-all duration-200 border-l-4 border-l-black hover:shadow-md hover:border-slate-300"
            >
              <div className="flex items-start justify-between w-full gap-3 mb-4">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="shrink-0 p-1.5 bg-slate-100 rounded-lg text-slate-950 flex items-center justify-center w-10 h-10 border border-slate-200">
                    {skill.icon || getSkillIcon(skill.name)}
                  </div>
                  <span className="font-semibold text-sm md:text-base text-slate-900 tracking-tight truncate">
                    {skill.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded uppercase ${
                    skill.type === "DETECTED"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-orange-50 text-orange-700"
                  }`}>
                    {skill.type}
                  </span>
                  
                  <button 
                    onClick={() => {
                      deleteSkill.mutate({
                        skillId: skill.id,
                      });

                      setDeletedSkillIds((prev) => {
                        const next = new Set(prev);
                        next.add(skill.id);
                        return next;
                      });
                    }}
                    className="p-1 rounded-md bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 sm:opacity-0 group-hover:opacity-100 transition-all duration-150"
                    title="Remove skill"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Skill Level Options  */}
              <div className="mt-auto flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Level</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                  {(["Beginner", "Intermediate", "Expert"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleLevelChange(skill.id, lvl)}
                      className={`py-1 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                        (skill.level || "Intermediate") === lvl
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ))}

          {/* Add Skill  */}
          <button
            onClick={handleOpenModal}
            className="group border border-dashed border-slate-300 hover:border-slate-950 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-5 min-h-40 flex flex-col items-center justify-center gap-1.5 transition-all duration-200"
          >
            <div className="text-slate-400 group-hover:text-slate-950 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-950 transition-colors">
              Add a skill
            </span>
          </button>
        </div>

        <div className="w-full flex items-center justify-between pt-8 border-t border-slate-100 mt-auto gap-4">
          <button
            onClick={() => navigate("/upload")}
            className="group text-gray-600 hover:text-black font-semibold text-sm flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/xl" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            BACK
          </button>

          <button
            onClick={handleConfirm}
            className="bg-black hover:bg-[#11192E] text-white px-6 sm:px-8 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#192440]/10 hover:shadow-xl hover:shadow-[#11192E]/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group truncate"
          >
            CONTINUE
            <svg xmlns="http://www.w3.org/2000/xl" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

      </main>

      {/* --- Popup  --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300">
          
          <div 
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden transform transition-all duration-200 p-6 flex flex-col gap-5 z-10 scale-100 opacity-100">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">
                  Add New Skill
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Define your custom skill parameters below.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSkillSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Select Programming Language
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    placeholder="Search skill..."
                    className="w-full mb-2 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-900"
                  />            
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-slate-900 transition-all"
                  >
                    <span className={newSkillName ? "text-slate-900 font-semibold text-sm" : "text-slate-400 text-sm"}>
                      {newSkillName || "Choose a language..."}
                    </span>

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`w-4 h-4 text-slate-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />
                    </svg>
                  </button>

                  {isDropdownOpen && (searchResults as SearchResult[]).length > 0 && (
                    <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                      {(searchResults as SearchResult[]).map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => {
                            setNewSkillName(skill.name);
                            setSearch(skill.name);
                            setErrorMessage("");
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            newSkillName === skill.name
                              ? "bg-slate-900 text-white"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          {skill.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {errorMessage && (
                  <p className="text-red-500 text-xs font-semibold mt-1">
                    {errorMessage}
                  </p>
                )}
              </div>

              {/* Skill Level  */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Skill Level
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
                  {(["Beginner", "Intermediate", "Expert"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewSkillLevel(lvl)}
                      className={`py-2 text-xs font-semibold rounded-lg transition-all duration-150 ${
                        newSkillLevel === lvl
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-black hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all duration-200 shadow-md shadow-black/5"
                >
                  Add to List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}