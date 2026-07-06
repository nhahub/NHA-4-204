import { useState, useEffect } from "react";
import { RoadmapCanvas } from "./RoadmapCanvas";
import { RoadmapDetails } from "./RoadmapDetails";
import { fetchRoadmapData, completeRoadmapNode } from "./roadmap.service";
import type { RoadmapNode } from "./roadmap.data";
import "./roadmap.css";

export function RoadmapPage() {
  const [nodes, setNodes] = useState<RoadmapNode[]>([]);
  const [trackName, setTrackName] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchRoadmapData();
        setTrackName(data.trackName);
        setNodes(data.nodes);
        
        const current = data.nodes.find((n) => n.status === "in-progress") || data.nodes[0];
        if (current) setSelectedId(current.id);
      } catch (error) {
        console.error("Error loading roadmap:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleMarkComplete(id: string) {
    try {
      await completeRoadmapNode(id);
      
      const currentIndex = nodes.findIndex((n) => n.id === id);
      const isLastNode = currentIndex === nodes.length - 1;

      setNodes((prev) => {
        const updated = [...prev];
        if (currentIndex !== -1) {
          updated[currentIndex] = { ...updated[currentIndex], status: "completed" };
          
          const nextNode = updated[currentIndex + 1];
          if (nextNode) {
            updated[currentIndex + 1] = { ...nextNode, status: "in-progress" };
            setSelectedId(nextNode.id); 
          }
        }
        return updated;
      });

      if (isLastNode) setShowCongrats(true);
    } catch (error) {
      alert("Failed to save progress. Please try again.");
    }
  }

  if (isLoading) return <div className="p-8 flex items-center justify-center min-h-screen">Loading Roadmap...</div>;
  if (!nodes.length) return <div className="p-8 text-center min-h-screen">No roadmap data available.</div>;

  const selectedNode = nodes.find((n) => n.id === selectedId) || nodes[0];

  return (
    <div className="roadmap-page">
      <header className="roadmap-page__header">
        <div>
          <h1 className="roadmap-page__title">Career Path</h1>
          <p className="roadmap-page__subtitle">{trackName}</p>
        </div>
        <div className="roadmap-page__track-badge">
          {trackName.toUpperCase()}
        </div>
      </header>

<div className="roadmap-page__body">
        <section className="roadmap-page__canvas-col">
          <RoadmapCanvas 
            nodes={nodes} 
            selectedId={selectedId} 
            onSelect={(id) => {
              setSelectedId(id);
              setIsMobileDrawerOpen(true); // Open drawer when a node is tapped
            }} 
          />
        </section>

        {/* This backdrop only appears when the drawer is open on mobile */}
        {isMobileDrawerOpen && (
           <div className="roadmap-page__backdrop" onClick={() => setIsMobileDrawerOpen(false)} />
        )}

        {/* Add the dynamic 'is-open' class to the aside */}
        <aside className={`roadmap-page__details-col ${isMobileDrawerOpen ? "is-open" : ""}`}>
          <RoadmapDetails 
            node={selectedNode} 
            onMarkComplete={handleMarkComplete}
            onOpenNext={() => {
              const currentIndex = nodes.findIndex((n) => n.id === selectedId);
              const nextNode = nodes[currentIndex + 1];
              if (nextNode) {
                setSelectedId(nextNode.id);
              }
            }}
            onCloseMobile={() => setIsMobileDrawerOpen(false)} // Pass the close function
          />
        </aside>
      </div>

      {showCongrats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111111] p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-sm text-center border border-zinc-200 dark:border-zinc-800 animate-in zoom-in duration-200">
            <div className="text-6xl mb-4">🏁</div>
            <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">
              Congratulations!
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              You have successfully completed all the modules in this track. Amazing work!
            </p>
            <button onClick={() => setShowCongrats(false)} className="bg-zinc-900 dark:bg-white text-white dark:text-black px-6 py-2 rounded-md font-medium hover:opacity-90 transition-opacity">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}