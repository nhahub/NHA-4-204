import type { RoadmapNode } from "./roadmap.data";

// Replace with your actual backend URL or keep for json-server testing
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
export interface RoadmapResponse {
  trackName: string;
  nodes: RoadmapNode[];
}

export async function fetchRoadmapData(): Promise<RoadmapResponse> {
  const response = await fetch(`${API_BASE_URL}/roadmap`);
  if (!response.ok) throw new Error("Failed to fetch roadmap data");
  return response.json();
}

export async function completeRoadmapNode(nodeId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/roadmap/${nodeId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to mark node as complete");
}