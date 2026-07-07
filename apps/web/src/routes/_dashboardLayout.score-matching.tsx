import { useState } from "react";
import { useScoreMatch, type ScoreMatchInput } from "@/features/dashboard/dashboard.service";
import { ScoreMatchingUpload } from "@/features/dashboard/components/score-matching-upload";
import { ScoreMatchingLoading } from "@/features/dashboard/components/score-matching-loading";
import { ScoreMatchingResults } from "@/features/dashboard/components/score-matching-results";

export default function DashboardScoreMatching() {
  const [file, setFile] = useState<File | null>(null);
  const { scoreMatch, data, isPending, isSuccess, reset } = useScoreMatch();

  const handleReset = () => {
    setFile(null);
    reset();
  };

  if (isSuccess && data) {
    return <ScoreMatchingResults data={data.match_result} onReset={handleReset} />;
  }

  if (isPending && file) {
    return <ScoreMatchingLoading fileName={file.name} />;
  }

  return (
    <ScoreMatchingUpload
      onSubmit={(input: ScoreMatchInput) => {
        setFile(input.file);
        scoreMatch(input);
      }}
      disabled={isPending}
    />
  );
}
