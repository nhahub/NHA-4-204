import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScoreBar } from "@/features/dashboard/components/ui/score-bar";
import { scoreBorderLClass, scoreTextClass, scoreTier } from "@/features/dashboard/utils";

interface ScoreBreakdownCardProps {
	label: string;
	score: number;
	max: number;
	evidence?: string;
	format?: "percentage" | "fraction";
}

export function ScoreBreakdownCard({
	label,
	score,
	max,
	evidence,
	format = "percentage",
}: ScoreBreakdownCardProps) {
	const pct = Math.round((score / max) * 100);
	const tier = scoreTier(pct);

	return (
		<Card className={scoreBorderLClass[tier]}>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex items-baseline gap-1.5">
					<span className={`text-3xl font-bold ${scoreTextClass[tier]}`}>
						{score}
					</span>
					<span className="text-sm text-muted-foreground">/ {max} pts</span>
				</div>
				<ScoreBar score={score} max={max} format={format} />
				{evidence && (
					<>
						<Separator />
						<p className="text-sm text-muted-foreground leading-relaxed italic">
							{evidence}
						</p>
					</>
				)}
			</CardContent>
		</Card>
	);
}
