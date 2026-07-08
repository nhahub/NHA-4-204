export type ScoreTier = "success" | "warning" | "destructive";

export function scoreTier(percentage: number): ScoreTier {
	if (percentage >= 80) return "success";
	if (percentage >= 60) return "warning";
	return "destructive";
}

export function gradeLabel(percentage: number): string {
	if (percentage >= 85) return "Excellent";
	if (percentage >= 70) return "Strong Match";
	if (percentage >= 55) return "Good";
	if (percentage >= 40) return "Needs Work";
	return "Poor";
}

export const scoreTextClass: Record<ScoreTier, string> = {
	success: "text-success",
	warning: "text-warning",
	destructive: "text-destructive",
};

export const scoreBgClass: Record<ScoreTier, string> = {
	success: "bg-success",
	warning: "bg-warning",
	destructive: "bg-destructive",
};

export const scoreStrokeClass: Record<ScoreTier, string> = {
	success: "stroke-success",
	warning: "stroke-warning",
	destructive: "stroke-destructive",
};

export const scoreBorderLClass: Record<ScoreTier, string> = {
	success: "border-l-success",
	warning: "border-l-warning",
	destructive: "border-l-destructive",
};

export const gradeBadgeVariant: Record<ScoreTier, "success" | "warning" | "destructive"> = {
	success: "success",
	warning: "warning",
	destructive: "destructive",
};
