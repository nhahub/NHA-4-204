import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function useAtsEvaluate() {
  const mutation = useMutation(trpc.ai.atsScore.mutationOptions({
    onError: (error) => {
      toast.error(error.message || "Failed to evaluate resume");

    }
  }))

  const atsScore = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      throw new Error("Invalid file type");
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be under 10MB");
      throw new Error("File too large");
    }

    const fileBase64 = await fileToBase64(file);
    return mutation.mutateAsync({ fileBase64, fileName: file.name });
  };

  return {
    ...mutation,
    atsScore,
  };
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

function imageFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

export interface ScoreMatchInput {
  file: File;
  jobDescription?: string;
  jobDescriptionImage?: File;
}

export function useScoreMatch() {
  const mutation = useMutation(
    trpc.ai.scoreMatch.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to score match");
      },
    }),
  );

  const scoreMatch = async (input: ScoreMatchInput) => {
    const { file, jobDescription, jobDescriptionImage } = input;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      toast.error("Please upload a PDF file for your CV");
      throw new Error("Invalid file type");
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("CV file size must be under 10MB");
      throw new Error("File too large");
    }

    const hasText = jobDescription && jobDescription.trim().length > 0;
    const hasImage = !!jobDescriptionImage;

    if (!hasText && !hasImage) {
      toast.error("Please provide a job description (text or image)");
      throw new Error("Missing job description");
    }

    if (hasImage && jobDescriptionImage) {
      if (!IMAGE_TYPES.includes(jobDescriptionImage.type)) {
        toast.error("Job description image must be PNG, JPEG, or WEBP");
        throw new Error("Invalid image type");
      }
      if (jobDescriptionImage.size > MAX_FILE_SIZE) {
        toast.error("Image file size must be under 10MB");
        throw new Error("Image too large");
      }
    }

    const fileBase64 = await fileToBase64(file);

    if (hasImage && jobDescriptionImage) {
      const imageBase64 = await imageFileToBase64(jobDescriptionImage);
      return mutation.mutateAsync({
        fileBase64,
        fileName: file.name,
        jobDescriptionImage: {
          base64: imageBase64,
          name: jobDescriptionImage.name,
        },
      });
    }

    return mutation.mutateAsync({
      fileBase64,
      fileName: file.name,
      jobDescription: jobDescription ?? "",
    });
  };

  return {
    ...mutation,
    scoreMatch,
  };
}
