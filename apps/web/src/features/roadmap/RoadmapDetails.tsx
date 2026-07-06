import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { RoadmapNode } from "./roadmap.data";

interface Props {
  node: RoadmapNode;
  onMarkComplete: (id: string) => void;
  onOpenNext: () => void;
  onCloseMobile?: () => void; 
}
const DIFF_VARIANT: Record<string, "default" | "foreground" | "primary" | "success" | "warning" | "destructive"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "destructive",
};

export function RoadmapDetails({ node, onMarkComplete ,onOpenNext,onCloseMobile}: Props) {
  if (!node) return null;
  const isLocked = node.status === "locked";
  const isCompleted = node.status === "completed";

  return (
    <div className="roadmap-details">
     <div className="roadmap-details__header">
        <div>
          <h2 className="roadmap-details__title">{node.title}</h2>
          <p className="roadmap-details__desc">{node.description}</p>
        </div>
        <button className="roadmap-details__close-btn" onClick={onCloseMobile}>
          ✕
        </button>
      </div>
      <Separator className="roadmap-details__sep" />

      <div className="roadmap-details__stats">
        <Card className="roadmap-details__stat-card">
          <CardContent className="roadmap-details__stat-inner">
            <span className="roadmap-details__stat-label">DIFF</span>
            <Badge variant={DIFF_VARIANT[node.difficulty]} className="roadmap-details__stat-badge">
              {node.difficulty}
            </Badge>
          </CardContent>
        </Card>
        <Card className="roadmap-details__stat-card">
          <CardContent className="roadmap-details__stat-inner">
            <span className="roadmap-details__stat-label">TIME</span>
            <span className="roadmap-details__stat-value">{node.timeEstimate}</span>
          </CardContent>
        </Card>
      </div>

      <Card className="roadmap-details__learn-card">
        <CardHeader className="roadmap-details__learn-header">
          <CardTitle className="roadmap-details__section-label">What you'll learn</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="roadmap-details__learn-list">
            {node.whatYoullLearn.map((item) => (
              <li key={item} className="roadmap-details__learn-item">
                <span className="roadmap-details__check">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="roadmap-details__playlist-card">
        <CardHeader className="roadmap-details__learn-header">
          <CardTitle className="roadmap-details__section-label">Recommended playlist</CardTitle>
        </CardHeader>
        <CardContent>
          <a href={node.playlist.url} target="_blank" rel="noopener noreferrer" className="roadmap-details__playlist-thumb">
            <img src={node.playlist.thumbnail} alt={node.playlist.title} />
            <div className="roadmap-details__play-overlay">
              <span className="roadmap-details__play-icon">▶</span>
            </div>
          </a>
          <p className="roadmap-details__playlist-title">{node.playlist.title}</p>
          <p className="roadmap-details__playlist-meta">
            {node.playlist.lessons} lessons · {node.playlist.duration}
          </p>
        </CardContent>
      </Card>

      <div className="roadmap-details__cta">
        {isLocked ? (
          <Button disabled variant="outline" className="roadmap-details__btn">
            🔒 Complete previous steps first
          </Button>
        ) : isCompleted ? (
          <Button variant="outline" className="roadmap-details__btn" onClick={onOpenNext}>
            Open next module
          </Button>
        ) : (
          <Button className="roadmap-details__btn roadmap-details__btn--primary" onClick={() => onMarkComplete(node.id)}>
            Mark as complete and open next
          </Button>
        )}
      </div>
    </div>
  );
}