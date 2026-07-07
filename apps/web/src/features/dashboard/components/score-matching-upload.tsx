import { useCallback, useRef, useState } from "react";
import {
  UploadIcon,
  FileTextIcon,
  XIcon,
  ImageIcon,
  TypeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScoreMatchInput } from "../dashboard.service";

type JobDescMode = "text" | "image";

interface ScoreMatchingUploadProps {
  onSubmit: (input: ScoreMatchInput) => void;
  disabled: boolean;
}

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function ScoreMatchingUpload({
  onSubmit,
  disabled,
}: ScoreMatchingUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<JobDescMode>("text");
  const [jobDescription, setJobDescription] = useState("");
  const [jobImage, setJobImage] = useState<File | null>(null);
  const [imageDragging, setImageDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((selected: File | null) => {
    if (!selected) return;
    if (
      selected.type !== "application/pdf" &&
      !selected.name.toLowerCase().endsWith(".pdf")
    ) {
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      return;
    }
    setFile(selected);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const handleImage = useCallback((selected: File | null) => {
    if (!selected) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(selected.type)) return;
    if (selected.size > 10 * 1024 * 1024) return;
    setJobImage(selected);
  }, []);

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setImageDragging(false);
    handleImage(e.dataTransfer.files[0]);
  }, [handleImage]);

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
    !!file && !disabled && (mode === "text"
      ? jobDescription.trim().length > 0
      : !!jobImage);

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
        {!file ? (
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
              <UploadIcon className="size-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Drag & drop your CV here</p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse — PDF only, up to 10MB
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileTextIcon className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFile(null)}
              disabled={disabled}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Job description */}
      <div>
        <p className="text-sm font-medium mb-2">Job Description</p>
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as JobDescMode)}
        >
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
            {!jobImage ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setImageDragging(true);
                }}
                onDragLeave={() => setImageDragging(false)}
                onDrop={handleImageDrop}
                onClick={() => imageInputRef.current?.click()}
                data-dragging={imageDragging}
                className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-10 transition-colors hover:border-primary/50 data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/5"
              >
                <div className="rounded-full bg-muted p-3">
                  <ImageIcon className="size-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">Drop job description screenshot</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPEG, or WEBP — up to 10MB
                  </p>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ImageIcon className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{jobImage.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(jobImage.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setJobImage(null)}
                  disabled={disabled}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            )}
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
