import { useEffect, useRef } from "react";
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

// A friendly, high-contrast palette (works on light + dark surfaces).
// Colors are assigned to skills in order of first appearance so the same
// skill always gets the same color across renders.
export const SKILL_PALETTE = [
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#22d3ee", // cyan
  "#f472b6", // pink
  "#34d399", // emerald
  "#60a5fa", // blue
  "#fb7185", // rose
  "#a3e635", // lime
  "#fb923c", // orange
  "#2dd4bf", // teal
];

export function buildSkillColorMap(nodes: ActiveRoadmapNode[]): Map<string, string> {
  const map = new Map<string, string>();
  let i = 0;
  for (const node of nodes) {
    if (!map.has(node.skillName)) {
      map.set(node.skillName, SKILL_PALETTE[i % SKILL_PALETTE.length]);
      i++;
    }
  }
  return map;
}

function NodeCard({ node, isSelected, skillColor, onClick }: { node: ActiveRoadmapNode; isSelected: boolean; skillColor: string; onClick: () => void; }) {
  const W = NODE_WIDTH;
  const H = NODE_HEIGHT;

  const cfg = {
    completed: { bg: "var(--card)", accentBar: "var(--success)", title: "var(--foreground)", label: "var(--success)", icon: "✓", statusText: "COMPLETED", cursor: "pointer" },
    inProgress: { bg: "var(--card)", accentBar: "var(--info)", title: "var(--foreground)", label: "var(--info)", icon: "▶", statusText: "YOU ARE HERE", cursor: "pointer" },
    pending: { bg: "var(--surface)", accentBar: "var(--border)", title: "var(--muted-foreground)", label: "var(--muted-foreground)", icon: "🔒", statusText: "LOCKED", cursor: "not-allowed" },
  } as const;

  const c = cfg[node.status];
  const isActive = node.status === "inProgress";
  const isPending = node.status === "pending";
  // Locked nodes still show their skill color (so the group is visible ahead
  // of time) but muted; unlocked/completed nodes get the full color + glow.
  const borderColor = skillColor;
  const borderOpacity = isPending ? 0.35 : 1;
  const glow =  `drop-shadow(0 0 ${isActive ? 10 : 7}px ${skillColor}99)`;

  return (
    <g style={{ cursor: c.cursor, filter: glow }} onClick={!isPending ? onClick : undefined}>
      {/* Pulsing halo draws the eye to the single unlocked node: a dot
          travels the rounded outline while the dashed border marches along. */}
      {isActive && (
      <>
        <defs>
          <path
            id="activePath"
            d={`
              M ${-7 + 13} ${-7}
              H ${W - 6}
              A 13 13 0 0 1 ${W + 7} 6
              V ${H - 6}
              A 13 13 0 0 1 ${W - 6} ${H + 7}
              H 6
              A 13 13 0 0 1 -7 ${H - 6}
              V 6
              A 13 13 0 0 1 6 -7
            `}
            fill="none"
          />
        </defs>

        <circle r={4} fill={borderColor}>
          <animateMotion dur="10s" repeatCount="indefinite" rotate="auto">
            <mpath href="#activePath" />
          </animateMotion>
        </circle>
        <rect
              x={-5}
              y={-5}
              width={W + 10}
              height={H + 10}
              rx={12}
              fill="none"
              stroke={borderColor}
              strokeWidth={2}
              strokeDasharray="10 8"
          >
              <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-36"
                  dur="1.5s"
                  repeatCount="indefinite"
              />
          </rect>
      </>
      )}
      <rect x={0} y={0} width={W} height={H} rx={8} fill={c.bg} stroke={borderColor} strokeOpacity={borderOpacity} strokeWidth={isActive ? 2 : 1.25} opacity={isPending ? 0.7 : 1} />

      {/* foreignObject truncates long titles with an ellipsis instead of
          letting SVG <text> spill outside the card boundary */}
      <foreignObject x={16} y={0} width={W - 28} height={H}>
        <div
          // @ts-ignore -- xmlns required for foreignObject content to render correctly
          xmlns="http://www.w3.org/1999/xhtml"
          title={node.curriculumTitle}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 3,
            height: "100%",
            fontFamily: "'Inter', sans-serif",
            opacity: isPending ? 0.7 : 1,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <span style={{ fontSize: 13, color: borderColor, flexShrink: 0, lineHeight: 1 }}>{c.icon}</span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: c.title,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {node.curriculumTitle}
            </span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: borderColor, letterSpacing: 1, marginLeft: 20 }}>
            {c.statusText}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

function getDynamicPosition(index: number, isMobile: boolean) {
  const VERTICAL_SPACING = 150;
  return { x: index % 2 === 0 ? (isMobile ? 20 : 90) : (isMobile ? 140 : 380), y: index * VERTICAL_SPACING + 50 };
}

export function RoadmapCanvas({ nodes, selectedId, onSelect }: Props) {
  const isMobile = useIsMobile();
  const nodeRefs = useRef<Map<string, SVGGElement>>(new Map());
  const hasAutoScrolled = useRef(false);

  function scrollToNode(nodeId: string) {
    nodeRefs.current.get(nodeId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // On first load, jump straight to the node the learner is actually on
  // instead of dropping them at node 1 and making them scroll down.
  useEffect(() => {
    if (hasAutoScrolled.current || nodes.length === 0) return;
    const activeNode = nodes.find((n) => n.status === "inProgress");
    if (activeNode) {
      scrollToNode(activeNode.nodeId);
      hasAutoScrolled.current = true;
    }
  }, [nodes]);

  if (nodes.length === 0) return null;

  const lastNodePos = getDynamicPosition(nodes.length - 1, isMobile);
  const canvasH = lastNodePos.y + 150;
  const viewBoxWidth = isMobile ? 360 : 700;
  const skillColorMap = buildSkillColorMap(nodes);

  function handleSkillClick(skillName: string) {
    const firstNode = nodes.find((n) => n.skillName === skillName);
    if (!firstNode) return;
    onSelect(firstNode.nodeId);
    scrollToNode(firstNode.nodeId);
  }

  return (
    <div className="roadmap-canvas-scroll">
      {/* Legend: same color = same skill. Click a skill to jump straight to
          its first module. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", padding: "14px 20px 4px" }}>
        {Array.from(skillColorMap.entries()).map(([skillName, color]) => (
          <div
            key={skillName}
            role="button"
            tabIndex={0}
            title={`Jump to ${skillName}`}
            onClick={() => handleSkillClick(skillName)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleSkillClick(skillName);
            }}
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted-foreground)",
                fontFamily: "'Inter', sans-serif",
                textDecoration: "underline",
                textDecorationColor: "transparent",
                textUnderlineOffset: 3,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecorationColor = color)}
              onMouseLeave={(e) => (e.currentTarget.style.textDecorationColor = "transparent")}
            >
              {skillName}
            </span>
          </div>
        ))}
      </div>

      <svg width="100%" viewBox={`0 0 ${viewBoxWidth} ${canvasH}`} style={{ display: "block", minHeight: canvasH }}>
        <defs>
          <pattern id="cgps-grid" width={24} height={24} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.8} fill="var(--border)" />
          </pattern>
        </defs>
        <rect width={viewBoxWidth} height={canvasH} fill="url(#cgps-grid)" />

        {nodes.map((node, i) => {
          if (i === nodes.length - 1) return null;
          const posA = getDynamicPosition(i, isMobile);
          const posB = getDynamicPosition(i + 1, isMobile);
          const isDone = node.status === "completed";
          // The segment leading INTO the currently unlocked node gets an
          // animated "flowing" dash so it visually reads as "walk this way".
          const leadsToActive = nodes[i + 1]?.status === "inProgress";
          // Completed lines pick up the color of the skill they're leaving,
          // instead of a generic green, so the whole branch reads as one color.
          const sourceColor = skillColorMap.get(node.skillName) ?? "var(--success)";
          return (
            <path
              key={`path-${i}`}
              pathLength={1}
              d={generatePath(posA.x + NODE_WIDTH / 2, posA.y + NODE_HEIGHT, posB.x + NODE_WIDTH / 2, posB.y)}
              fill="none"
              stroke={isDone || leadsToActive ? sourceColor : "var(--foreground)"}
              strokeWidth={isDone ? 2.5 : leadsToActive ? 2 : 1.5}
              strokeDasharray={isDone ? 1 : "0.08 0.05"}
              opacity={isDone ? 1 : leadsToActive ? 0.8 : 0.4}
              style={{ transition: "stroke 0.5s ease, opacity 0.5s ease" }}
            >
              {isDone ? (
                // One-shot "draw" reveal: plays the moment this segment
                // flips to completed (and again, harmlessly, on page load).
                <animate attributeName="stroke-dashoffset" from={1} to={0} dur="0.9s" fill="freeze" />
              ) : (
                <animate attributeName="stroke-dashoffset" from={0.13} to={0} dur="1.6s" repeatCount="indefinite" />
              )}
            </path>
          );
        })}

        {nodes.map((node, i) => (
          <g
            key={node.nodeId}
            ref={(el) => {
              if (el) nodeRefs.current.set(node.nodeId, el);
              else nodeRefs.current.delete(node.nodeId);
            }}
            transform={`translate(${getDynamicPosition(i, isMobile).x}, ${getDynamicPosition(i, isMobile).y})`}
          >
            <NodeCard
              node={node}
              isSelected={node.nodeId === selectedId}
              skillColor={skillColorMap.get(node.skillName) ?? "var(--border)"}
              onClick={() => onSelect(node.nodeId)}
            />
          </g>
        ))}

        <text x={lastNodePos.x + NODE_WIDTH / 2} y={lastNodePos.y + NODE_HEIGHT + 60} textAnchor="middle" fontSize={26}>
          🏁
        </text>
      </svg>
    </div>
  );
}
