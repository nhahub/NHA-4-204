import { useState, useEffect, useMemo } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { RoadmapCanvas } from "./RoadmapCanvas";
import { RoadmapDetails } from "./RoadmapDetails";
import { trpc } from "../../utils/trpc";
import type { ActiveRoadmapNode, ApiRoadmapNode } from "./roadmap.data";
import { authClient } from "../../lib/auth-client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function RoadmapPage() {
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const roleId = (session?.user as { roleId?: string } | undefined)?.roleId ;
  
  const [selectedId, setSelectedId] = useState<string>("");
  const [showCongrats, setShowCongrats] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const queryClient = useQueryClient();

  // 1. Fetch Active Roadmap (Extract mapError to check for 404s)
  const { data: roadmapData, isLoading: isMapLoading, error: mapError } = useQuery<{ nodes: ApiRoadmapNode[] }, Error>(
    trpc.roadmap.getActiveRoadmap.queryOptions(
      { roleId: roleId! },
      { enabled: !!roleId, retry: false } // Prevent retrying on 404s
    ) as any
  );

  // 2. Generation Mutation (Handles missing roadmaps + curriculum warnings)
  const generateMutation = useMutation<any, Error, { roleId: string }>(
    trpc.roadmap.generate.mutationOptions({
      onSuccess: async (data: { skillsMissingCurriculum?: string[] }) => {
        if (data?.skillsMissingCurriculum && data.skillsMissingCurriculum.length > 0) {
          toast.warning(`The following skills don't have learning content yet: ${data.skillsMissingCurriculum.join(', ')}`, { position: "top-center" });
        }
        if (roleId) {
          await queryClient.invalidateQueries(
            trpc.roadmap.getActiveRoadmap.queryFilter({ roleId })
          );
        }
      },
      onError: (error: Error) => {
        toast.error(error?.message || "Failed to generate roadmap.", { position: "top-center" });
      },
    }) as any
  );

  // 3. Complete Node Mutation (Handles skill progression feedback)
  const completeNodeMutation = useMutation<any, Error, { nodeId: string }>(
    trpc.roadmap.completeNode.mutationOptions({
      onSuccess: async () => {
        if (roleId) {
          await queryClient.invalidateQueries(
            trpc.roadmap.getActiveRoadmap.queryFilter({ roleId })
          );
        }
      },
      onError: (error: Error) => {
        toast.error(error?.message || "Failed to save progress. Please try again.", { position: "top-center" });
      },
    }) as any
  );

  const mappedNodes = useMemo<ActiveRoadmapNode[]>(() => {
    if (!roadmapData?.nodes) return [];

    const sorted = [...roadmapData.nodes].sort((a, b) => a.orderIndex - b.orderIndex);
    const unlockedForSkill = new Set<string>();

    return sorted.map((node) => {
      let computedStatus: ActiveRoadmapNode["status"] = node.status;

      if (node.status === "pending" && !unlockedForSkill.has(node.skillName)) {
        computedStatus = "inProgress";
        unlockedForSkill.add(node.skillName);
      }

      return {
        ...node,
        status: computedStatus,
        priority: "medium", 
      };
    });
  }, [roadmapData?.nodes]);

  useEffect(() => {
    if (mappedNodes.length > 0 && !selectedId) {
      const current = mappedNodes.find((n) => n.status === "inProgress") || mappedNodes[0];
      if (current) setSelectedId(current.nodeId);
    }
  }, [mappedNodes, selectedId]);

  async function handleMarkComplete(nodeId: string) {
    if (!mappedNodes.length) return;

    const remainingIncomplete = mappedNodes.filter(
      (n) => n.nodeId !== nodeId && n.status !== "completed"
    );
    const isLastNode = remainingIncomplete.length === 0;
    const completedNode = mappedNodes.find((n) => n.nodeId === nodeId);

    try {
      const result = await completeNodeMutation.mutateAsync({ nodeId });
      
      if (result?.alreadyCompleted) {
         return; 
      }

      // Check for skill progression data from the backend contract
      if (result?.newStrength) {
        toast.success(`Awesome! Your strength in ${completedNode?.skillName} increased to ${result.newStrength}.${result.skillFullyCompleted ? ' You have fully mastered this skill!' : ''}`, { position: "top-center" });
      }

      if (isLastNode) {
        setShowCongrats(true);
      } else {
        const nextInSameSkill = mappedNodes.find(
          (n) => n.skillName === completedNode?.skillName && n.status === "pending"
        );
        const nextNode = nextInSameSkill ?? remainingIncomplete[0];
        if (nextNode) {
          setSelectedId(nextNode.nodeId);
        }
      }
    } catch (error) {
      console.error("Mutation failed", error);
    }
  }

  // Handle Loading & Initialization states
  if (isSessionLoading || (isMapLoading && !mapError)) return <div className="p-8 flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Roadmap...</div>;
  if (!roleId) return <div className="p-8 text-center min-h-screen flex items-center justify-center text-zinc-500">Please select a career role to view your roadmap.</div>;

  // Handle NOT_FOUND error by offering the generation flow
  const isNotFound = mapError?.message?.includes("NOT_FOUND") || mapError?.message?.includes("Roadmap not found");
  if (isNotFound || (!mappedNodes.length && !isMapLoading)) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen text-center">
        <h2 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">Ready to start?</h2>
        <p className="text-zinc-500 mb-6 max-w-md">We couldn't find an active learning path for your role. Generate a personalized roadmap based on your current skill gaps.</p>
        <button 
          onClick={() => generateMutation.mutate({ roleId })}
          disabled={generateMutation.isPending}
          className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold rounded-md flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {generateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {generateMutation.isPending ? "Generating..." : "Generate My Learning Path"}
        </button>
      </div>
    );
  }

  const selectedStep = mappedNodes.find((n) => n.nodeId === selectedId) || mappedNodes[0];

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white font-sans">
      <header className="flex items-center justify-between px-7 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div>
          <h1 className="text-[22px] font-bold m-0">Career Path</h1>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Your Learning Journey</p>
        </div>
      </header>

      <div className="flex flex-row flex-1 relative">
        <section className="flex-1 w-full md:border-r border-zinc-200 dark:border-zinc-800 min-w-0">
          <RoadmapCanvas
            nodes={mappedNodes}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setIsMobileDrawerOpen(true);
            }}
          />
        </section>

        {isMobileDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] animate-in fade-in duration-300 md:hidden"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
        )}

        <aside
          className={`
            fixed top-0 h-full z-[100] bg-zinc-50 dark:bg-[#0a0a0a] shadow-[-4px_0_24px_rgba(0,0,0,0.15)] transition-all duration-300 ease-in-out w-[85%] max-w-[380px] overflow-y-auto
            md:sticky md:top-0 md:max-h-screen md:w-[300px] md:shrink-0 md:shadow-none md:transition-none
            ${isMobileDrawerOpen ? "right-0" : "right-[-100%] md:right-0"}
          `}
        >
          <RoadmapDetails
            mapNode={selectedStep}
            isMutating={completeNodeMutation.isPending}
            onMarkComplete={handleMarkComplete}
            onOpenNext={() => {
              const currentIndex = mappedNodes.findIndex((n) => n.nodeId === selectedId);
              const nextNode = mappedNodes[currentIndex + 1];
              if (nextNode) {
                setSelectedId(nextNode.nodeId);
              }
            }}
            onCloseMobile={() => setIsMobileDrawerOpen(false)}
          />
        </aside>
      </div>

      {showCongrats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-lg shadow-xl text-center max-w-md">
             <h2 className="text-2xl font-bold mb-2">Congratulations! 🎉</h2>
             <p className="text-zinc-500 mb-6">You've successfully completed all nodes in your roadmap. You are fully prepared for this role!</p>
             <button onClick={() => setShowCongrats(false)} className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold rounded-md">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}