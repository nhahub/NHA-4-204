import { FileTextIcon } from "lucide-react";
import { AnalysisLoading, useAnalysisLoading } from "@/features/dashboard/components/ui/analysis-loading";

const STAGES = [
	"Uploading resume...",
	"Parsing resume content...",
	"Analyzing section structure...",
	"Evaluating content quality...",
	"Checking formatting and parseability...",
	"Reviewing keyword optimization...",
	"Generating ATS compatibility report...",
];

interface AtsLoadingProps {
	fileName: string;
}

export function AtsLoading({ fileName }: AtsLoadingProps) {
	const { progress, stageIndex } = useAnalysisLoading(STAGES.length);

	return (
		<AnalysisLoading
			icon={FileTextIcon}
			title="Analyzing Your Resume"
			fileName={fileName}
			stages={STAGES}
			progress={progress}
			stageIndex={stageIndex}
		/>
	);
}
