import { useDropzone } from "react-dropzone";
import { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import Stepper from "../components/Stepper";
import { trpc } from "../utils/trpc"; 
import type { FileRejection } from "react-dropzone";

interface Skill {
  name: string;
  strength: number | string; }
interface ParsedSkill {
  skillName: string;
  strength: number | string;
}


interface CVUploadProps {
  onParsed?: (skills: Skill[]) => void;
}

export default function CVUpload({ onParsed }: CVUploadProps) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "parsing" | "done">("idle");
  const [error, setError] = useState<string>("");
  const syncGithub = trpc.github.syncProjects.useMutation();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 5 * 1024 * 1024, 
    onDrop: (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setError("");
      if (fileRejections.length > 0) {
        setError("Only PDF files under 5MB are allowed");
        return;
      }
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      handleUpload(selectedFile);
    },
  });

  const handleUpload = async (selectedFile?: File) => {
    const fileToUpload = selectedFile || file;
    if (!fileToUpload) return;

    setError("");

    try {
      setStatus("uploading");

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const response = await fetch("/cv/parse", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      setStatus("parsing");

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            data.errorMessage ||
            "Failed to upload CV"
        );
      }

      if (data.status === "failed") {
        setStatus("idle");
        setError(data.errorMessage || "Failed to parse CV");
        return;
      }

      setStatus("done");

const cvSkills: Skill[] = ((data.skills ?? []) as ParsedSkill[]).map((skill) => ({
      name: skill.skillName,
        strength: skill.strength
      }));

      localStorage.setItem("cvId", data.cvId);
      localStorage.setItem("cv_skills", JSON.stringify(cvSkills));

      if (onParsed) {
        onParsed(cvSkills);
      }

      const githubUserRaw = localStorage.getItem("github_user");
      const githubUser = githubUserRaw ? JSON.parse(githubUserRaw) : null;

      let githubSkills: Skill[] = [];

      if (!githubUser?.skipped && githubUser?.username) {
        try {
          const githubData = await syncGithub.mutateAsync({
            username: githubUser.username,
          });

githubSkills = ((githubData.skills ?? []) as ParsedSkill[]).map((skill) => ({
          name: skill.skillName,
            strength: skill.strength,
          }));
        } catch (err) {
          console.error(err);
        }
      }

      const allSkills = [
        ...cvSkills,
        ...githubSkills,
      ].reduce<Skill[]>((acc, skill) => {
        const existing = acc.find(
          (item) => item.name.toLowerCase() === skill.name.toLowerCase()
        );

        if (!existing) {
          acc.push(skill);
        }

        return acc;
      }, []);

localStorage.setItem("all_skills", JSON.stringify(allSkills));

navigate("/loading");
} catch (err: unknown) {
      console.error(err);
      setStatus("idle");
        if (err instanceof Error) {
    setError(err.message);
  } else {
    setError("Something went wrong");

      } }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/50 flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 selection:bg-indigo-100">

      {/* Main  */}
      <main className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center gap-4 md:gap-10">

        {/* Progress  */}
        <Stepper currentStep={2} />
        {/* Container */}
        <div className="w-full flex flex-col items-center justify-center">
          
          <div className="mb-8 md:mb-10 text-center px-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-normal mb-3 md:mb-4 antialiased">
              <span className="bg-linear-to-r from-zinc-800 to-zinc-800 bg-clip-text text-transparent">
                Upload your CV
              </span>
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm md:text-base font-medium leading-relaxed transition-all duration-300 hover:text-slate-800">
              Our AI will parse and extract your skills automatically
            </p>
          </div>

          {/* Dropzone */}
          <div className={`w-full bg-white/90 border rounded-3xl p-4 sm:p-6 transition-all duration-700 relative overflow-visible -mb-4
            ${isDragActive 
              ? "border-[#046c38] shadow-[0_30px_70px_-10px_rgba(4,108,56,0.18)] scale-[1.02]" 
              : "border-slate-200/90 shadow-[0_15px_40px_-5px_rgba(0,0,0,0.03)] hover:border-slate-500 hover:shadow-[0_30px_60px_-7px_rgba(0,0,0,0.06)] hover:scale-[1.005]"
            }`}
          >
            <div className={`absolute -inset-1 rounded-3xl transition-opacity duration-500 blur-2xl -z-20 bg-[#046c38]/10
              ${isDragActive ? "opacity-100 animate-pulse-gentle" : "opacity-0"}`} 
            />
            
            <div
              {...getRootProps()}
              className={`border-[1.8px] border-dashed rounded-2xl p-6 sm:p-10 md:p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 group relative overflow-hidden
                ${isDragActive 
                  ? "border-[#046c38] bg-slate-50/50 shadow-inner" 
                  : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/20"
                }
              `}
            >
              <input {...getInputProps()} />
              
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 transition-all duration-500 relative transform
                ${isDragActive
                  ? "bg-emerald-600 text-white scale-110 shadow-xl shadow-emerald-600/40 rotate-3"
                  : "bg-slate-50 border border-slate-300 text-slate-600 group-hover:-translate-y-2 group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-xl group-hover:shadow-slate-950/30"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" 
                  className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-500 ${isDragActive ? "animate-bounce" : "group-hover:scale-110"}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>

              <p className={`font-bold text-sm sm:text-base mb-1 tracking-wide text-center transition-colors duration-300
                ${isDragActive ? "text-emerald-700" : "text-slate-800 group-hover:text-slate-950"}`}
              >
                {isDragActive ? "Drop your CV here to upload" : "Drag & drop your CV here"}
              </p>
              <p className="text-slate-400 text-xs font-semibold my-1">or</p>
              
              <span className="mt-2 px-5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-white bg-black shadow-sm group-hover: transition-all">
                Browse Files
              </span>
              
              <p className="text-[9px] sm:text-[10px] tracking-[0.15em] font-extrabold text-slate-400 uppercase mt-5 sm:mt-6 bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100/80">
                ONLY PDF — MAX 5MB
              </p>
            </div>
          </div>

          <div className="h-10 mt-4 w-full flex items-center justify-center transition-all duration-300 px-4">
            {file && status === "idle" && (
              <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-full text-xs font-medium shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="max-w-45 truncate">{file.name}</span>
              </div>
            )}

            {status === "uploading" && (
              <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5 text-slate-900" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading CV...
              </p>
            )}

            {status === "parsing" && (
              <p className="text-xs font-bold text-indigo-600 flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                AI is parsing your skills...
              </p>
            )}

            {status === "done" && (
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Processed successfully!
              </div>
            )}

            {error && (
              <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-100 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 text-center">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                {error}
              </div>
            )}
          </div>

        </div>

        <div className="w-full -mt-8 text-center sm:-mt-3">
          <button
            onClick={() => navigate("/add-skills")}
            className="w-full sm:w-auto px-8 py-3 border border-slate-200 bg-white/60 hover:bg-white text-xs font-bold tracking-wide text-slate-500 hover:text-slate-950 hover:border-slate-300 rounded-xl transition-all duration-300 -mt-12"
          >
            Skip — I'll enter my skills manually
          </button>
        </div>
      </main>

    </div>
  );
}