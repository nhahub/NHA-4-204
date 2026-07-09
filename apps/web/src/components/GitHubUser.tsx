import { useState } from 'react';
import type { FormEvent, ChangeEvent } from "react";
import { useNavigate } from 'react-router-dom';
import Stepper from "../components/Stepper";
import { trpc } from "../utils/trpc";

interface MessageState {
  type: 'success' | 'error' | '';
  text: string;
}

const GitHubUser = () => {
  const [username, setUsername] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<MessageState>({ type: '', text: '' });
  const navigate = useNavigate();
  const syncProjects = trpc.github.syncProjects.useMutation();

  const validateUsername = (input: string): string | null => {
    const trimmed = input.trim();
    
    const githubUsernameRegex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
    
    const invalidUsernames = ['features', 'marketplace', 'explore', 'trending', 'topics', 'collections', 'pricing', 'login', 'join'];
    
    if (githubUsernameRegex.test(trimmed) && !invalidUsernames.includes(trimmed.toLowerCase())) {
      return trimmed;
    }
    
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsLoading(true);
    setMessage({ type: "", text: "" });

    const cleanUsername = validateUsername(username);

    if (!cleanUsername) {
      setMessage({
        type: "error",
        text: "Invalid Username! Please provide a valid GitHub username.",
      });

      setIsLoading(false);
      return;
    }

    try {
      await syncProjects.mutateAsync({
        username: cleanUsername,
      });
      localStorage.setItem(
        "github_user",
        JSON.stringify({
          username: cleanUsername,
          skipped: false
        })
      );
      setMessage({
        type: "success",
        text: "GitHub account linked successfully!",
      });

      setTimeout(() => navigate("/upload"), 1500);
    } catch {
      setMessage({
        type: "error",
        text: "Failed to sync GitHub account.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(
      "github_user",
      JSON.stringify({
        username: null,
        avatar: null,
        name: null,
        bio: null,
        reposUrl: null,
        profileUrl: null,
        skipped: true
      })
    );
    navigate('/upload');
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/50 flex flex-col items-center justify-center p-6 md:p-12 selection:bg-indigo-100">
      <main className=" w-full max-w-3xl mx-auto flex flex-col items-center justify-center gap-2">
        {/* Progress Bar */}
        <Stepper currentStep={0} />

        <div className="-pt-4 w-full max-w-x2 bg-white/80 backdrop-blur-md border border-zinc-200/60 p-6 sm:p-10 rounded-3xl sm:rounded-4xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden transition-all duration-500 hover:shadow-[0_32px_72px_-12px_rgba(0,0,0,0.08)] hover:border-zinc-300/80 sm:mt-10 group/card">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-zinc-100 rounded-full blur-[100px] pointer-events-none group-hover/card:bg-zinc-200/70 transition-colors duration-500" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-zinc-50 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="text-center mb-8 sm:mb-10 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-linear-to-br from-zinc-800 to-zinc-900 text-white mb-6 shadow-xl shadow-zinc-950/10 transform hover:rotate-6 hover:scale-110 transition-all duration-300">
              <svg className="w-9 h-9 sm:w-11 sm:h-11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.65.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
              </svg>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 bg-linear-to-r from-zinc-900 to-zinc-700 bg-clip-text">
              Link Your GitHub Account
            </h2>
            <p className="text-zinc-500 text-sm sm:text-base mt-2 font-normal max-w-fit mx-auto leading-relaxed">
              Please enter your GitHub username. We will analyze your public repositories to build your professional footprint.
            </p>
          </div>

          {message.text && (
            <div className={`mb-4 p-4 rounded-2xl text-sm font-semibold border text-center shadow-sm backdrop-blur-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2 relative z-10 ${
              message.type === 'success' 
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 shadow-emerald-100/50' 
                : 'bg-rose-50/80 border-rose-200 text-rose-800 shadow-rose-100/50'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2.5">
              <label htmlFor="github-username" className="text-xs font-bold uppercase tracking-widest text-zinc-500 block text-left pl-1">
                GitHub Username Only
              </label>
              <div className="relative group/input">
                <input
                  id="github-username"
                  type="text"
                  required
                  disabled={isLoading}
                  placeholder="e.g., your-username"
                  value={username}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200/80 text-zinc-900 rounded-2xl px-5 py-4 text-left focus:outline-none focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-950/5 transition-all duration-300 placeholder:text-zinc-400 font-mono text-sm shadow-inner disabled:bg-zinc-100 disabled:cursor-not-allowed"
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-zinc-900 transition-all duration-300 group-focus-within/input:w-[calc(100%-24px)] rounded-full" />
              </div>
            </div>

            <div className="bg-zinc-50/60 border border-zinc-100 rounded-2xl p-4 flex items-start gap-3 text-left">
              <svg className="w-5 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-xs text-zinc-500 leading-relaxed font-normal ">
                By continuing, you agree that <span className="font-semibold text-zinc-800">Career GPS</span> may read your public GitHub data for skill extraction.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 ">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleSkip}
                className="flex-1 order-2 sm:order-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 border border-zinc-200/60 active:scale-[0.99] flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
              >
                Skip Step
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 order-1 sm:order-2 bg-zinc-900 text-white hover:bg-black disabled:bg-zinc-300 font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 group/btn shadow-[0_10px_20px_-10px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.3)] disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  <>
                    <span>Connect Account</span>
                    <svg 
                      className="w-4 h-4 transition-transform duration-300 transform group-hover/btn:translate-x-1" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default GitHubUser;