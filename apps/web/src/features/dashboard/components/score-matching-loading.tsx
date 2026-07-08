import { TargetIcon } from "lucide-react";
import { AnalysisLoading, useAnalysisLoading } from "@/features/dashboard/components/ui/analysis-loading";

const STAGES = [
	"Uploading CV and job description...",
	"Parsing candidate profile...",
	"Parsing job requirements...",
	"Matching hard skills...",
	"Evaluating experience fit...",
	"Assessing soft skills...",
	"Reviewing logistics & preferences...",
	"Computing match score...",
];

interface ScoreMatchingLoadingProps {
	fileName: string;
}

export function ScoreMatchingLoading({ fileName }: ScoreMatchingLoadingProps) {
	const { progress, stageIndex } = useAnalysisLoading(STAGES.length);

	return (
		<AnalysisLoading
			icon={TargetIcon}
			title="Matching Your Skills"
			fileName={fileName}
			stages={STAGES}
			progress={progress}
			stageIndex={stageIndex}
		/>
	);
}
