import { useState } from "react";
import { useAtsEvaluate } from "@/features/dashboard/dashboard.service";
import { AtsUpload } from "@/features/dashboard/components/ats-upload";
import { AtsLoading } from "@/features/dashboard/components/ats-loading";
import { AtsResults } from "@/features/dashboard/components/ats-results";

export default function DashboardATS() {
  const [file, setFile] = useState<File | null>(null);
  const { atsScore, data, isPending, isSuccess, reset } = useAtsEvaluate();

  const handleReset = () => {
    setFile(null);
    reset();
  };

  if (isSuccess && data) {
    return <AtsResults data={data} onReset={handleReset} />;
  }

  if (isPending && file) {
    return <AtsLoading fileName={file.name} />;
  }

  return (
    <AtsUpload
      onSubmit={(f) => {
        setFile(f);
        atsScore(f);
      }}
      disabled={isPending}
    />
  );
}
