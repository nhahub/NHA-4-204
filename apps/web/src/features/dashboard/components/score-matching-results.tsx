import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { ScoreRing } from "@/features/dashboard/components/ui/score-ring";
import { ScoreBreakdownCard } from "@/features/dashboard/components/ui/score-breakdown-card";
import { ResultsHeader } from "@/features/dashboard/components/ui/results-header";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
	CheckCircleIcon,
	RotateCcwIcon,
	XCircleIcon,
	TargetIcon,
	LightbulbIcon,
	FileTextIcon,
	InboxIcon,
} from "lucide-react";
import type { ScoreMatch } from "../types";

const SCORE_LABELS: { key: keyof ScoreMatch["score_details"]; label: string; max: number }[] = [
	{ key: "hard_skills_score", label: "Hard Skills", max: 40 },
	{ key: "experience_score", label: "Experience", max: 30 },
	{ key: "soft_skills_score", label: "Soft Skills", max: 20 },
	{ key: "logistics_score", label: "Logistics", max: 10 },
];

interface ScoreMatchingResultsProps {
	data: ScoreMatch;
	onReset: () => void;
}

export function ScoreMatchingResults({ data, onReset }: ScoreMatchingResultsProps) {
	const {
		score_details,
		total_score,
		match_analysis,
		explanation,
		recommendation,
		key_matched_skills,
		missing_skills,
	} = data;
	const percentage = Math.round((total_score / 100) * 100);

	return (
		<div className="flex flex-col gap-8">
			<ResultsHeader
				title="Match Results"
				description={`Your skills match this role at ${percentage}%`}
				percentage={percentage}
				resetLabel="Try Another"
				onReset={onReset}
			/>

			<Surface variant="secondary" className="flex flex-col items-center gap-4 py-10 rounded-xl">
				<ScoreRing score={total_score} max={100} />
				<p className="text-sm text-muted-foreground text-center max-w-sm">
					{percentage >= 80
						? "Strong alignment between your profile and the job requirements."
						: percentage >= 55
							? "Decent match, but there are gaps worth addressing."
							: "Significant gaps between your profile and the job requirements."}
				</p>
			</Surface>

			<div>
				<h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
				<div className="grid gap-4 sm:grid-cols-2">
					{SCORE_LABELS.map(({ key, label, max }) => (
						<ScoreBreakdownCard
							key={key}
							label={label}
							score={score_details[key]}
							max={max}
							format="fraction"
						/>
					))}
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<CheckCircleIcon className="size-4 text-success" />
							Matched Skills
						</CardTitle>
					</CardHeader>
					<CardContent>
						{key_matched_skills.length > 0 ? (
							<div className="flex flex-wrap gap-1.5">
								{key_matched_skills.map((skill) => (
									<Badge key={skill} variant="success" size="sm">
										{skill}
									</Badge>
								))}
							</div>
						) : (
							<Empty className="border-0 p-0 py-6">
								<EmptyHeader className="gap-1">
									<EmptyMedia variant="icon">
										<InboxIcon />
									</EmptyMedia>
									<EmptyTitle className="text-sm font-normal">No matched skills identified.</EmptyTitle>
								</EmptyHeader>
							</Empty>
						)}
					</CardContent>
				</Card>

				<Card className="border-warning/30">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<XCircleIcon className="size-4 text-destructive" />
							Missing Skills
						</CardTitle>
					</CardHeader>
					<CardContent>
						{missing_skills.length > 0 ? (
							<div className="flex flex-wrap gap-1.5">
								{missing_skills.map((skill) => (
									<Badge key={skill} variant="destructive" size="sm">
										{skill}
									</Badge>
								))}
							</div>
						) : (
							<Empty className="border-0 p-0 py-6">
								<EmptyHeader className="gap-1">
									<EmptyMedia variant="icon">
										<CheckCircleIcon className="text-success" />
									</EmptyMedia>
									<EmptyTitle className="text-sm font-normal">No critical missing skills — great fit!</EmptyTitle>
								</EmptyHeader>
							</Empty>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<TargetIcon className="size-4 text-primary" />
						Explanation
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm leading-relaxed">{explanation}</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<LightbulbIcon className="size-4 text-warning" />
						Recommendation
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm leading-relaxed">{recommendation}</p>
				</CardContent>
			</Card>

			<Card className="bg-surface-secondary">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<FileTextIcon className="size-4 text-muted-foreground" />
						Match Analysis
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
						{match_analysis}
					</p>
				</CardContent>
			</Card>

			<div className="flex justify-center pb-4">
				<Button variant="outline" onClick={onReset}>
					<RotateCcwIcon className="size-4 mr-2" />
					Match Another Job
				</Button>
			</div>
		</div>
	);
}
