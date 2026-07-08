import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gradeBadgeVariant, gradeLabel, scoreTier } from "@/features/dashboard/utils";

interface ResultsHeaderProps {
	title: string;
	description: string;
	percentage: number;
	resetLabel: string;
	onReset: () => void;
}

export function ResultsHeader({
	title,
	description,
	percentage,
	resetLabel,
	onReset,
}: ResultsHeaderProps) {
	const tier = scoreTier(percentage);
	const grade = gradeLabel(percentage);

	return (
		<div className="flex items-start justify-between gap-4">
			<div>
				<div className="flex items-center gap-3">
					<h2 className="text-2xl font-bold">{title}</h2>
					<Badge variant={gradeBadgeVariant[tier]} size="lg">
						{grade}
					</Badge>
				</div>
				<p className="text-muted-foreground mt-1">{description}</p>
			</div>
			<Button variant="outline" size="sm" onClick={onReset}>
				<RotateCcwIcon className="size-4 mr-2" />
				{resetLabel}
			</Button>
		</div>
	);
}
