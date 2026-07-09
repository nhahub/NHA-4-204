import { useIsMobile } from "@/hooks/use-mobile";
import type { ActiveRoadmapNode } from "./roadmap.data";
import { NODE_HEIGHT, NODE_WIDTH } from "./roadmap.data";

interface Props {
  nodes: ActiveRoadmapNode[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function generatePath(startX: number, startY: number, endX: number, endY: number) {
  const midY = (startY + endY) / 2;
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

function NodeCard({ node, isSelected, onClick }: { node: ActiveRoadmapNode; isSelected: boolean; onClick: () => void; }) {
  const W = NODE_WIDTH;
  const H = NODE_HEIGHT;

  const cfg = {
    completed: { bg: "var(--card)", border: "var(--success)", accentBar: "var(--success)", title: "var(--foreground)", label: "var(--success)", icon: "✓", statusText: "COMPLETED", opacity: 1, cursor: "pointer" },
    inProgress: { bg: "var(--card)", border: "var(--info)", accentBar: "var(--info)", title: "var(--foreground)", label: "var(--info)", icon: "▶", statusText: "YOU ARE HERE", opacity: 1, cursor: "pointer" },
    pending: { bg: "var(--surface)", border: "var(--border)", accentBar: "var(--border)", title: "var(--muted-foreground)", label: "var(--muted-foreground)", icon: "🔒", statusText: "LOCKED", opacity: 1, cursor: "default" },
  } as const;

  const c = cfg[node.status];

  return (
    <g style={{ cursor: c.cursor }} onClick={node.status !== "pending" ? onClick : undefined}>
      {isSelected && node.status !== "pending" && <rect x={-5} y={-5} width={W + 10} height={H + 10} rx={10} fill="none" stroke={c.border} strokeWidth={1.5} opacity={0.35} />}
      <rect x={0} y={0} width={W} height={H} rx={6} fill={c.bg} stroke={c.border} strokeWidth={isSelected ? 1.5 : 0.75} opacity={c.opacity} />
      <rect x={0} y={0} width={3} height={H} rx={2} fill={c.accentBar} opacity={c.opacity} />
      <text x={20} y={H / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={14} fill={c.accentBar} opacity={c.opacity}>{c.icon}</text>
      <text x={36} y={H / 2 - 7} dominantBaseline="central" fontSize={12} fontWeight={600} fill={c.title} fontFamily="'Inter', sans-serif" opacity={c.opacity}>{node.curriculumTitle}</text>
      <text x={36} y={H / 2 + 10} dominantBaseline="central" fontSize={9} fontWeight={600} fill={c.label} letterSpacing={1} fontFamily="'Inter', sans-serif" opacity={c.opacity}>{c.statusText}</text>
    </g>
  );
}

function getDynamicPosition(index: number, isMobile: boolean) {
  const VERTICAL_SPACING = 140; 
  return { x: index % 2 === 0 ? (isMobile ? 30 : 100) : (isMobile ? 130 : 350), y: index * VERTICAL_SPACING + 50 };
}

export function RoadmapCanvas({ nodes, selectedId, onSelect }: Props) {
  const isMobile = useIsMobile();
  if (nodes.length === 0) return null;

  const lastNodePos = getDynamicPosition(nodes.length - 1, isMobile);
  const canvasH = lastNodePos.y + 150; 
  const viewBoxWidth = isMobile ? 360 : 700; 

  return (
    <div className="roadmap-canvas-scroll">
      <svg width="100%" viewBox={`0 0 ${viewBoxWidth} ${canvasH}`} style={{ display: "block", minHeight: canvasH }}>
        <defs><pattern id="cgps-grid" width={24} height={24} patternUnits="userSpaceOnUse"><circle cx={1} cy={1} r={0.8} fill="var(--border)" /></pattern></defs>
        <rect width={viewBoxWidth} height={canvasH} fill="url(#cgps-grid)" />
        {nodes.map((node, i) => {
          if (i === nodes.length - 1) return null; 
          const posA = getDynamicPosition(i, isMobile);
          const posB = getDynamicPosition(i + 1, isMobile);
          const isDone = node.status === "completed";
          return <path key={`path-${i}`} d={generatePath(posA.x + NODE_WIDTH / 2, posA.y + NODE_HEIGHT, posB.x + NODE_WIDTH / 2, posB.y)} fill="none" stroke={isDone ? "var(--success)" : "var(--foreground)"} strokeWidth={isDone ? 2 : 1.5} strokeDasharray={isDone ? "none" : "5 5"} opacity={isDone ? 1 : 0.6} />;
        })}
        {nodes.map((node, i) => (
          <g key={node.nodeId} transform={`translate(${getDynamicPosition(i, isMobile).x}, ${getDynamicPosition(i, isMobile).y})`}>
            <NodeCard node={node} isSelected={node.nodeId === selectedId} onClick={() => onSelect(node.nodeId)} />
          </g>
        ))}
        <text x={lastNodePos.x + NODE_WIDTH / 2} y={lastNodePos.y + NODE_HEIGHT + 60} textAnchor="middle" fontSize={24}>🏁</text>
      </svg>
    </div>
  );
}