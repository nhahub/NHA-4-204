import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ActiveRoadmapNode } from "./roadmap.data";
import { FileText, Loader2, Lock, Video, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "../../utils/trpc";

interface Props {
  mapNode: ActiveRoadmapNode;
  isMutating: boolean;
  onMarkComplete: (id: string) => void;
  onOpenNext: () => void;
  onCloseMobile?: () => void;
}

const PRIORITY_VARIANT: Record<string, "default" | "success" | "destructive" | "foreground" | "primary" | "warning"> = {
  high: "destructive",
  medium: "warning",
};

export function RoadmapDetails({ mapNode, isMutating, onMarkComplete, onOpenNext, onCloseMobile }: Props) {
  if (!mapNode) return null;

  const isLocked = mapNode.status === "pending";
  const isCompleted = mapNode.status === "completed";

  // Fetch detailed info for the active node
  const { data: nodeDetails, isLoading } = useQuery(
    trpc.roadmap.getNodeInfo.queryOptions(
      { nodeId: mapNode.nodeId },
      { enabled: !!mapNode?.nodeId }
    )
  );

  const resources = nodeDetails?.resources || [];

  return (
    <div className="flex flex-col gap-4 p-5 pb-7 min-h-full">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <Badge variant="primary" className="mb-2.5 text-[10px] font-bold uppercase tracking-widest rounded-md border border-border">
            Skill: {mapNode.skillName}
          </Badge>

          <h2 className="text-xl font-bold text-foreground leading-tight mb-3">
            {mapNode.curriculumTitle}
          </h2>

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm italic mb-1">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading details...
            </div>
          ) : nodeDetails?.description && (
            <div className="bg-muted border border-border rounded-lg p-3.5 shadow-sm mb-1">
              <p className="text-[13px] text-muted-foreground leading-relaxed m-0 italic">
                "{nodeDetails.description}"
              </p>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onCloseMobile}>
          <X />
        </Button>
      </div>

      <Separator className="m-0" />

      <div className="grid grid-cols-2 gap-2">
        <Card className="rounded-md">
          <CardContent className="flex flex-col items-center gap-1.5 p-2.5">
            <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">PRIORITY</span>
            <Badge variant={PRIORITY_VARIANT[mapNode.priority] || "default"} className="text-[11px]">{mapNode.priority}</Badge>
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardContent className="flex flex-col items-center gap-1.5 p-2.5">
            <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">TIME</span>
            <span className="text-xs font-bold text-foreground">1 hr</span>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg shadow-sm flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Learning Resources</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : resources?.length > 0 ? (
            <div className="flex flex-col gap-3">
              {resources.map((resource: any) => (
                <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                  <span className="flex-shrink-0 text-muted-foreground">
                    {resource.type.toLowerCase().includes("youtube") ? <Video className="size-5" /> : <FileText className="size-5" />}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-snug">{resource.title}</p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-0.5">{resource.type}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No resources available for this module.</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-2 flex flex-col gap-2 shrink-0">
        {isLocked ? (
          <Button disabled variant="outline" className="w-full text-[13px] font-semibold h-[42px]">
            <Lock className="size-4" /> Complete previous steps first
          </Button>
        ) : isCompleted ? (
          <Button variant="outline" className="w-full text-[13px] font-semibold h-[42px]" onClick={onOpenNext}>Open next module</Button>
        ) : (
          <Button
            disabled={isMutating}
            variant="default"
            className="w-full text-[13px] font-semibold h-[42px]"
            onClick={() => onMarkComplete(mapNode.nodeId)}
          >
            {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark as complete and open next"}
          </Button>
        )}
      </div>
    </div>
  );
}
