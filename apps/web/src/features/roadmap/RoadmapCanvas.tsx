import { useState, useEffect } from "react";
import type { RoadmapNode } from "./roadmap.data";
import { NODE_HEIGHT, NODE_WIDTH } from "./roadmap.data";

interface Props {
  nodes: RoadmapNode[];
  selectedId: string;
  onSelect: (id: string) => void;
}


function generatePath(startX: number, startY: number, endX: number, endY: number) {
  const midY = (startY + endY) / 2;
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

function NodeCard({
  node,
  isSelected,
  onClick,
}: {
  node: RoadmapNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const W = NODE_WIDTH;
  const H = NODE_HEIGHT;

  const cfg = {
    completed: {
      bg: "var(--node-comp-bg, #ffffff)",
      border: "var(--node-comp-border, #10b981)",
      accentBar: "var(--node-comp-border, #10b981)",
      title: "var(--node-text, #000000)",
      label: "var(--node-comp-border, #10b981)",
      icon: "✓",
      statusText: "COMPLETED",
      opacity: 1,
      cursor: "pointer",
    },
    "in-progress": {
      bg: "var(--node-prog-bg, #ffffff)",
      border: "var(--node-prog-border, #3b82f6)",
      accentBar: "var(--node-prog-border, #3b82f6)",
      title: "var(--node-text, #000000)",
      label: "var(--node-prog-border, #3b82f6)",
      icon: "▶",
      statusText: "YOU ARE HERE",
      opacity: 1,
      cursor: "pointer",
    },
    locked: {
      bg: "var(--node-lock-bg, #f9fafb)",
      border: "var(--node-lock-border, #e5e7eb)",
      accentBar: "var(--node-lock-border, #e5e7eb)",
      title: "var(--node-lock-text, #9ca3af)",
      label: "var(--node-lock-text, #9ca3af)",
      icon: "🔒",
      statusText: "LOCKED",
      opacity: 0.7,
      cursor: "default",
    },
  } as const;

  const c = cfg[node.status];

  return (
    <g style={{ cursor: c.cursor }} onClick={node.status !== "locked" ? onClick : undefined}>
      {isSelected && node.status !== "locked" && (
        <rect x={-5} y={-5} width={W + 10} height={H + 10} rx={10} fill="none" stroke={c.border} strokeWidth={1.5} opacity={0.35} />
      )}
      <rect x={0} y={0} width={W} height={H} rx={6} fill={c.bg} stroke={c.border} strokeWidth={isSelected ? 1.5 : 0.75} opacity={c.opacity} />
      <rect x={0} y={0} width={3} height={H} rx={2} fill={c.accentBar} opacity={c.opacity} />
      <text x={20} y={H / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={14} fill={c.accentBar} opacity={c.opacity}>{c.icon}</text>
      <text x={36} y={H / 2 - 7} dominantBaseline="central" fontSize={12} fontWeight={600} fill={c.title} fontFamily="'Inter', sans-serif" opacity={c.opacity}>{node.title}</text>
      <text x={36} y={H / 2 + 10} dominantBaseline="central" fontSize={9} fontWeight={600} fill={c.label} letterSpacing={1} fontFamily="'Inter', sans-serif" opacity={c.opacity}>{c.statusText}</text>
    </g>
  );
}

// 1. Pass `isMobile` into the position calculator
function getDynamicPosition(index: number, isMobile: boolean) {
  const VERTICAL_SPACING = 140; 
  
  // On mobile, push the left and right sides much closer together
  const LEFT_X = isMobile ? 30 : 100;
  const RIGHT_X = isMobile ? 130 : 350; 
  
  return {
    x: index % 2 === 0 ? LEFT_X : RIGHT_X, 
    y: index * VERTICAL_SPACING + 50,      
  };
}


export function RoadmapCanvas({ nodes, selectedId, onSelect }: Props) {
  // 2. Add state to track if we are on a mobile screen
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile(); // Check immediately on mount
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (nodes.length === 0) return null;

  // 3. Pass isMobile to the position calculations
  const lastNodePos = getDynamicPosition(nodes.length - 1, isMobile);
  const canvasH = lastNodePos.y + 150; 
  
  // 4. Tighten the SVG "Camera Lens" on mobile from 700 to 360
  const viewBoxWidth = isMobile ? 360 : 700; 

  return (
    <div className="roadmap-canvas-scroll">
      {/* Update the viewBox to use the dynamic width */}
      <svg width="100%" viewBox={`0 0 ${viewBoxWidth} ${canvasH}`} style={{ display: "block", minHeight: canvasH }}>
        <defs>
          <pattern id="cgps-grid" width={24} height={24} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.8} fill="var(--node-grid, #e5e7eb)" />
          </pattern>
        </defs>
        <rect width={viewBoxWidth} height={canvasH} fill="url(#cgps-grid)" />

        {nodes.map((node, i) => {
          if (i === nodes.length - 1) return null; 
          
          // Pass isMobile here
          const posA = getDynamicPosition(i, isMobile);
          const posB = getDynamicPosition(i + 1, isMobile);
          const isDone = node.status === "completed";

          return (
            <path
              key={`path-${i}`}
              d={generatePath(posA.x + NODE_WIDTH / 2, posA.y + NODE_HEIGHT, posB.x + NODE_WIDTH / 2, posB.y)}
              fill="none"
              stroke={isDone ? "var(--node-path, #10b981)" : "var(--node-path-locked, #e5e7eb)"}
              strokeWidth={isDone ? 2 : 1.5}
              strokeDasharray={isDone ? "none" : "5 5"}
              opacity={isDone ? 1 : 0.6}
            />
          );
        })}

        {nodes.map((node, i) => {
          // Pass isMobile here
          const pos = getDynamicPosition(i, isMobile);
          return (
            <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
              <NodeCard node={node} isSelected={node.id === selectedId} onClick={() => onSelect(node.id)} />
            </g>
          );
        })}

        <text x={lastNodePos.x + NODE_WIDTH / 2} y={lastNodePos.y + NODE_HEIGHT + 60} textAnchor="middle" fontSize={24}>🏁</text>
      </svg>
    </div>
  );
}