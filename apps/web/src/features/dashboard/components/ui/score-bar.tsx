import { scoreBgClass, scoreTier } from "@/features/dashboard/utils";

interface ScoreBarProps {
	score: number;
	max: number;
	format?: "percentage" | "fraction";
}

export function ScoreBar({ score, max, format = "percentage" }: ScoreBarProps) {
	const pct = Math.round((score / max) * 100);
	const tier = scoreTier(pct);

	return (
		<div className="flex items-center gap-3">
			<div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
				<div
					className={`h-full rounded-full ${scoreBgClass[tier]} transition-all duration-700 ease-out`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="text-sm font-medium tabular-nums min-w-[4ch] text-right">
				{format === "percentage" ? `${pct}%` : `${score}/${max}`}
			</span>
		</div>
	);
}
