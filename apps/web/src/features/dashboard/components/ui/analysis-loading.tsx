import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalysisLoadingProps {
	icon: LucideIcon;
	title: string;
	fileName: string;
	stages: string[];
	progress: number;
	stageIndex: number;
}

export function AnalysisLoading({
	icon: Icon,
	title,
	fileName,
	stages,
	progress,
	stageIndex,
}: AnalysisLoadingProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-8 py-12">
			<div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10">
				<Icon className="size-10 text-primary animate-pulse" />
			</div>

			<div className="text-center space-y-2">
				<h2 className="text-xl font-bold">{title}</h2>
				<p className="text-sm text-muted-foreground truncate max-w-xs">
					{fileName}
				</p>
			</div>

			<div className="w-full max-w-md space-y-3">
				<Progress value={Math.min(progress, 100)} className="w-full" />

				<div className="relative h-6 overflow-hidden">
					{stages.map((stage, i) => (
						<p
							key={i}
							className={`absolute inset-0 text-center text-sm text-muted-foreground transition-all duration-500 ${
								i === stageIndex
									? "translate-y-0 opacity-100"
									: i < stageIndex
										? "-translate-y-full opacity-0"
										: "translate-y-full opacity-0"
							}`}
						>
							{stage}
						</p>
					))}
				</div>
			</div>
		</div>
	);
}

export function useAnalysisLoading(stageCount: number) {
	const [stageIndex, setStageIndex] = useState(0);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const stageTimer = setInterval(() => {
			setStageIndex((prev) => {
				if (prev < stageCount - 1) return prev + 1;
				return prev;
			});
		}, 2200);

		const progressTimer = setInterval(() => {
			setProgress((prev) => {
				if (prev >= 90) return prev;
				const increment = prev < 40 ? 3 : prev < 70 ? 1.5 : 0.5;
				return Math.min(prev + increment, 90);
			});
		}, 300);

		return () => {
			clearInterval(stageTimer);
			clearInterval(progressTimer);
		};
	}, [stageCount]);

	return { progress, stageIndex };
}
