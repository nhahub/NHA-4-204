import { useState } from "react";
import {
	UploadIcon,
	ImageIcon,
	TypeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/ui/file-upload";
import type { ScoreMatchInput } from "../dashboard.service";

type JobDescMode = "text" | "image";

interface ScoreMatchingUploadProps {
	onSubmit: (input: ScoreMatchInput) => void;
	disabled: boolean;
}

export function ScoreMatchingUpload({
	onSubmit,
	disabled,
}: ScoreMatchingUploadProps) {
	const [file, setFile] = useState<File | null>(null);

	const [mode, setMode] = useState<JobDescMode>("text");
	const [jobDescription, setJobDescription] = useState("");
	const [jobImage, setJobImage] = useState<File | null>(null);

	const handleSubmit = () => {
		if (!file || disabled) return;
		const hasText = mode === "text" && jobDescription.trim().length > 0;
		const hasImage = mode === "image" && !!jobImage;
		if (!hasText && !hasImage) return;

		onSubmit({
			file,
			jobDescription: mode === "text" ? jobDescription : undefined,
			jobDescriptionImage: mode === "image" ? jobImage ?? undefined : undefined,
		});
	};

	const canSubmit =
		!!file &&
		!disabled &&
		(mode === "text" ? jobDescription.trim().length > 0 : !!jobImage);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h2 className="text-2xl font-bold">Skill Matching</h2>
				<p className="text-muted-foreground mt-1">
					Upload your CV and a job description to see how well your skills
					match the role.
				</p>
			</div>

			{/* CV upload */}
			<div>
				<p className="text-sm font-medium mb-2">Candidate CV</p>
				<FileUpload
					accept=".pdf"
					maxSize={10 * 1024 * 1024}
					value={file}
					onChange={setFile}
					disabled={disabled}
					icon={UploadIcon}
					title="Drag & drop your CV here"
					subtitle="or click to browse — PDF only, up to 10MB"
				/>
			</div>

			{/* Job description */}
			<div>
				<p className="text-sm font-medium mb-2">Job Description</p>
				<Tabs value={mode} onValueChange={(v) => setMode(v as JobDescMode)}>
					<TabsList className="w-96">
						<TabsTrigger value="text">
							<TypeIcon className="size-3.5" />
							Text
						</TabsTrigger>
						<TabsTrigger value="image">
							<ImageIcon className="size-3.5" />
							Image
						</TabsTrigger>
					</TabsList>

					<TabsContent value="text" className="px-0">
						<Textarea
							value={jobDescription}
							onChange={(e) => setJobDescription(e.target.value)}
							placeholder="Paste the full job description here..."
							className="min-h-48"
							disabled={disabled}
						/>
					</TabsContent>

					<TabsContent value="image" className="px-0">
					<FileUpload
						accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
						maxSize={10 * 1024 * 1024}
						value={jobImage}
						onChange={setJobImage}
						disabled={disabled}
						icon={ImageIcon}
						fileIcon={ImageIcon}
						title="Drop job description screenshot"
						subtitle="PNG, JPEG, or WEBP — up to 10MB"
					/>
					</TabsContent>
				</Tabs>
			</div>

			<Button
				size="lg"
				className="w-full"
				disabled={!canSubmit}
				onClick={handleSubmit}
			>
				Score Match
			</Button>
		</div>
	);
}
