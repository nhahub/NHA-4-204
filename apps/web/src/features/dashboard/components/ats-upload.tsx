import { useState } from "react";
import { UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";

interface AtsUploadProps {
	onSubmit: (file: File) => void;
	disabled: boolean;
}

export function AtsUpload({ onSubmit, disabled }: AtsUploadProps) {
	const [file, setFile] = useState<File | null>(null);

	const handleSubmit = () => {
		if (!file || disabled) return;
		onSubmit(file);
	};

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h2 className="text-2xl font-bold">ATS Resume Scanner</h2>
				<p className="text-muted-foreground mt-1">
					Upload your resume to check how well it performs against Applicant Tracking Systems.
				</p>
			</div>

			<FileUpload
				accept=".pdf"
				maxSize={10 * 1024 * 1024}
				value={file}
				onChange={setFile}
				disabled={disabled}
				icon={UploadIcon}
				title="Drag & drop your resume here"
				subtitle="or click to browse — PDF only, up to 10MB"
			/>

			<Button
				size="lg"
				className="w-full"
				disabled={!file || disabled}
				onClick={handleSubmit}
			>
				Evaluate Resume
			</Button>
		</div>
	);
}
