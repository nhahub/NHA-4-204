import { scoreTier, scoreStrokeClass, scoreTextClass } from "@/features/dashboard/utils";

interface ScoreRingProps {
	score: number;
	max: number;
	size?: number;
}

export function ScoreRing({ score, max, size = 170 }: ScoreRingProps) {
	const percentage = (score / max) * 100;
	const radius = (size - 14) / 2;
	const circumference = radius * 2 * Math.PI;
	const offset = circumference - (percentage / 100) * circumference;
	const tier = scoreTier(percentage);

	return (
		<div
			className="relative inline-flex items-center justify-center"
			style={{ width: size, height: size }}
		>
			<svg width={size} height={size} className="-rotate-90">
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth="10"
					className="stroke-muted"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth="10"
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					className={`${scoreStrokeClass[tier]} transition-all duration-1000 ease-out`}
				/>
			</svg>
			<div className="absolute flex flex-col items-center">
				<span className={`text-4xl font-bold tracking-tight ${scoreTextClass[tier]}`}>
					{score}
				</span>
				<span className="text-sm text-muted-foreground">/ {max}</span>
			</div>
		</div>
	);
}
