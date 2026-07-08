import { useCallback, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircleIcon, FileTextIcon, UploadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface FileUploadProps {
	accept: string;
	maxSize?: number;
	value: File | null;
	onChange: (file: File | null) => void;
	disabled?: boolean;
	icon?: LucideIcon;
	fileIcon?: LucideIcon;
	title?: string;
	subtitle?: string;
	className?: string;
}

function formatSize(bytes: number): string {
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function matchesAccept(file: File, accept: string): boolean {
	if (accept.includes(".")) {
		const extensions = accept.split(",").map((ext) => ext.trim().toLowerCase());
		const fileName = file.name.toLowerCase();
		if (extensions.some((ext) => fileName.endsWith(ext))) return true;
	}
	if (accept.includes("/")) {
		const types = accept.split(",").map((type) => type.trim());
		if (types.includes(file.type)) return true;
		if (types.some((type) => type.endsWith("/*") && file.type.startsWith(type.replace("/*", "/")))) return true;
	}
	return false;
}

function describeAccept(accept: string): string {
	const parts = accept.split(",").map((p) => p.trim());
	return parts
		.map((part) => {
			if (part.startsWith(".")) return part.toUpperCase().replace(".", "");
			if (part === "image/png") return "PNG";
			if (part === "image/jpeg") return "JPEG";
			if (part === "image/webp") return "WEBP";
			if (part === "application/pdf") return "PDF";
			return part;
		})
		.join(", ");
}

export function FileUpload({
	accept,
	maxSize = 10 * 1024 * 1024,
	value,
	onChange,
	disabled = false,
	icon: Icon = UploadIcon,
	fileIcon: FileIcon = FileTextIcon,
	title = "Drag & drop your file here",
	subtitle,
	className,
}: FileUploadProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const validate = useCallback(
		(file: File): string | null => {
			if (!matchesAccept(file, accept)) {
				return `Only ${describeAccept(accept)} files are accepted.`;
			}
			if (file.size > maxSize) {
				return `File must be smaller than ${formatSize(maxSize)}.`;
			}
			return null;
		},
		[accept, maxSize],
	);

	const handleFile = useCallback(
		(selected: File | null) => {
			setError(null);
			if (!selected) {
				onChange(null);
				return;
			}
			const validationError = validate(selected);
			if (validationError) {
				setError(validationError);
				return;
			}
			onChange(selected);
		},
		[onChange, validate],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			handleFile(e.dataTransfer.files[0] ?? null);
		},
		[handleFile],
	);

	const clearFile = () => {
		setError(null);
		onChange(null);
		if (inputRef.current) inputRef.current.value = "";
	};

	return (
		<div className={cn("space-y-2", className)}>
			{!value ? (
				<div
					onDragOver={(e) => {
						e.preventDefault();
						setIsDragging(true);
					}}
					onDragLeave={() => setIsDragging(false)}
					onDrop={handleDrop}
					onClick={() => inputRef.current?.click()}
					data-dragging={isDragging}
					className="relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border p-12 transition-colors hover:border-primary/50 data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/5"
				>
					<div className="rounded-full bg-muted p-4">
						<Icon className="size-8 text-muted-foreground" />
					</div>
					<div className="text-center">
						<p className="font-medium">{title}</p>
						<p className="text-sm text-muted-foreground mt-1">
							{subtitle ?? `or click to browse — ${describeAccept(accept)}, up to ${formatSize(maxSize)}`}
						</p>
					</div>
					<input
						ref={inputRef}
						type="file"
						accept={accept}
						className="hidden"
						onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
						disabled={disabled}
					/>
				</div>
			) : (
				<div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
						<FileIcon className="size-5 text-primary" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="truncate font-medium">{value.name}</p>
						<p className="text-sm text-muted-foreground">{formatSize(value.size)}</p>
					</div>
					<Button variant="ghost" size="icon" onClick={clearFile} disabled={disabled}>
						<XIcon className="size-4" />
					</Button>
				</div>
			)}

			{error && (
				<Alert variant="destructive" className="border border-destructive/20 bg-destructive/5 rounded-lg px-3 py-2.5">
					<AlertCircleIcon />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
