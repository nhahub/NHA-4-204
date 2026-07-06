export type NodeStatus = "completed" | "in-progress" | "locked";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface RoadmapNode {
  id: string;
  title: string;
  status: NodeStatus;
  difficulty: Difficulty;
  timeEstimate: string;
  xp: number;
  description: string;
  whatYoullLearn: string[];
  playlist: {
    title: string;
    lessons: number;
    duration: string;
    url: string;
    thumbnail: string;
  };
}

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 52;