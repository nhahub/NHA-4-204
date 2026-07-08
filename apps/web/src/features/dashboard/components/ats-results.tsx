import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Surface } from "@/components/ui/surface";
import { ScoreRing } from "@/features/dashboard/components/ui/score-ring";
import { ScoreBreakdownCard } from "@/features/dashboard/components/ui/score-breakdown-card";
import { ResultsHeader } from "@/features/dashboard/components/ui/results-header";
import { FlagIndicator } from "@/features/dashboard/components/ui/flag-indicator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";

import {
	CheckCircleIcon,
	AlertTriangleIcon,
	RotateCcwIcon,
	FileTextIcon,
	TypeIcon,
	PaletteIcon,
	LayoutListIcon,
} from "lucide-react";
import type { AtsEvaluation } from "../types";

const SCORE_LABELS: Record<string, string> = {
	parseability_formatting: "Parseability & Formatting",
	section_structure: "Section Structure",
	content_quality: "Content Quality",
	keyword_optimization: "Keyword Optimization",
};

interface AtsResultsProps {
	data: AtsEvaluation;
	onReset: () => void;
}

export function AtsResults({ data, onReset }: AtsResultsProps) {
	const scoreEntries = Object.entries(data.scores);
	const percentage = Math.round((data.total_score / data.total_max) * 100);
	const statIcons = [
		{ icon: FileTextIcon, label: "Pages", value: data.ats_report.page_count },
		{
			icon: TypeIcon,
			label: "Words",
			value: data.ats_report.word_count.toLocaleString(),
		},
		{ icon: PaletteIcon, label: "Fonts Used", value: data.ats_report.font_count },
		{
			icon: LayoutListIcon,
			label: "Missing Sections",
			value: data.ats_report.missing_sections.length,
			tint:
				data.ats_report.missing_sections.length > 0
					? ("text-warning" as const)
					: ("text-success" as const),
		},
	];

	return (
		<div className="flex flex-col gap-8">
			<ResultsHeader
				title="ATS Evaluation Results"
				description={`Your resume scored ${percentage}% on ATS compatibility`}
				percentage={percentage}
				resetLabel="Evaluate Another"
				onReset={onReset}
			/>

			<Separator />

			<Surface variant="secondary" className="flex flex-col items-center gap-4 py-10 rounded-xl">
				<ScoreRing score={data.total_score} max={data.total_max} />
				<p className="text-sm text-muted-foreground text-center max-w-sm">
					{percentage >= 80
						? "Your resume is well-optimized for most ATS systems."
						: percentage >= 55
							? "Your resume passes most ATS checks but has room for improvement."
							: "Your resume may be rejected by many ATS systems. Significant improvements needed."}
				</p>
			</Surface>

			<div>
				<h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
				<div className="grid gap-4 sm:grid-cols-2">
					{scoreEntries.map(([key, cat]) => (
						<ScoreBreakdownCard
							key={key}
							label={SCORE_LABELS[key] ?? key}
							score={cat.score}
							max={cat.max}
							evidence={cat.evidence}
						/>
					))}
				</div>
			</div>

			{data.deductions.total > 0 && (
				<Alert variant="destructive" className="bg-destructive/5 border border-destructive/30">
					<AlertTriangleIcon />
					<AlertTitle>Deductions &mdash; {data.deductions.total} pts lost</AlertTitle>
					<AlertDescription>{data.deductions.reasons}</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<CheckCircleIcon className="size-4 text-success" />
							Key Strengths
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ItemGroup className="gap-2">
							{data.key_strengths.map((strength, i) => (
								<Item key={i} variant="secondary" size="sm" className="rounded-lg px-3 py-2.5 items-start">
									<ItemMedia>
										<CheckCircleIcon className="size-4 text-success" />
									</ItemMedia>
									<ItemContent className="gap-0">
										<ItemTitle className="text-sm font-normal leading-snug">{strength}</ItemTitle>
									</ItemContent>
								</Item>
							))}
						</ItemGroup>
					</CardContent>
				</Card>

				<Card className="border-warning/30">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<AlertTriangleIcon className="size-4 text-warning" />
							Areas for Improvement
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ItemGroup className="gap-2">
							{data.areas_for_improvement.map((area, i) => (
								<Item key={i} variant="secondary" size="sm" className="rounded-lg px-3 py-2.5 items-start">
									<ItemMedia>
										<AlertTriangleIcon className="size-4 text-warning" />
									</ItemMedia>
									<ItemContent className="gap-0">
										<ItemTitle className="text-sm font-normal leading-snug">{area}</ItemTitle>
									</ItemContent>
								</Item>
							))}
						</ItemGroup>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-4">
					<CardTitle className="text-sm font-medium">ATS Report Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						{statIcons.map(({ icon: Icon, label, value, tint }) => (
							<div
								key={label}
								className="flex flex-col items-center gap-2 rounded-lg bg-surface-secondary py-4"
							>
								<Icon className={`size-5 text-muted-foreground ${tint ?? ""}`} />
								<span className={`text-xl font-bold ${tint ?? ""}`}>{value}</span>
								<span className="text-xs text-muted-foreground">{label}</span>
							</div>
						))}
					</div>

					{data.ats_report.missing_sections.length > 0 && (
						<div className="space-y-2">
							<p className="text-xs font-medium text-muted-foreground">
								Missing Sections
							</p>
							<div className="flex flex-wrap gap-1.5">
								{data.ats_report.missing_sections.map((section) => (
									<Badge key={section} variant="warning" size="sm">
										{section}
									</Badge>
								))}
							</div>
						</div>
					)}

					<Separator />

					<div>
						<p className="text-xs font-medium text-muted-foreground mb-3">
							Layout Analysis
						</p>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<FlagIndicator
								label="Multi-Column"
								value={data.ats_report.has_multi_column_layout}
								warn
							/>
							<FlagIndicator
								label="Has Tables"
								value={data.ats_report.has_tables}
								warn
							/>
							<FlagIndicator
								label="Text in Images"
								value={data.ats_report.has_text_in_images}
								warn
							/>
							<FlagIndicator
								label="Scanned PDF"
								value={data.ats_report.is_scanned_pdf}
								warn
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="flex justify-center pb-4">
				<Button variant="outline" onClick={onReset}>
					<RotateCcwIcon className="size-4 mr-2" />
					Evaluate Another Resume
				</Button>
			</div>
		</div>
	);
}
