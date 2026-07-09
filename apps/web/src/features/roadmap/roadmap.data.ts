export type NodeStatus = "pending" | "inProgress" | "completed";
export type NodePriority = "high" | "medium";

export interface CurriculumResource {
  id: string;
  title: string;
  type: "Documentation" | "Articles" | "YouTube" | "Online Course" | "Interactive Practice" | "Official Reference";
  url: string;
  displayOrder: number;
}

// Strictly matches the flattened TRPC getActiveRoadmap response
export interface ApiRoadmapNode {
  nodeId: string;
  status: NodeStatus; // The backend contract specifies it returns pending, inProgress, or completed
  orderIndex: number;
  completedAt: string | null;
  priority: NodePriority;
  curriculumTitle: string;
  skillName: string;
  skillId: string; // Add this to TRPC backend to group inProgress nodes correctly
}

// Frontend wrapper (kept simple since ApiRoadmapNode now handles the core structure)
export interface ActiveRoadmapNode extends ApiRoadmapNode {
   // Ready for any future frontend-only properties
}

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 52;