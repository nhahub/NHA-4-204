import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Surface } from "@/components/ui/surface";
import {
  CheckCircleIcon,
  RotateCcwIcon,
  XCircleIcon,
  TargetIcon,
  LightbulbIcon,
  FileTextIcon,
} from "lucide-react";
import type { ScoreMatch } from "../types";

const SCORE_LABELS: { key: keyof ScoreMatch["score_details"]; label: string; max: number }[] = [
  { key: "hard_skills_score", label: "Hard Skills", max: 40 },
  { key: "experience_score", label: "Experience", max: 30 },
  { key: "soft_skills_score", label: "Soft Skills", max: 20 },
  { key: "logistics_score", label: "Logistics", max: 10 },
];

interface ScoreMatchingResultsProps {
  data: ScoreMatch;
  onReset: () => void;
}

type ScoreTier = "success" | "warning" | "destructive";

const GRADE_BADGE_VARIANT: Record<ScoreTier, "success" | "warning" | "destructive"> = {
  success: "success",
  warning: "warning",
  destructive: "destructive",
};

const SCORE_TEXT_CLASS: Record<ScoreTier, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

const SCORE_BG_CLASS: Record<ScoreTier, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

const SCORE_STROKE_CLASS: Record<ScoreTier, string> = {
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
};

const SCORE_BORDER_L_CLASS: Record<ScoreTier, string> = {
  success: "border-l-success",
  warning: "border-l-warning",
  destructive: "border-l-destructive",
};

function scoreTier(percentage: number): ScoreTier {
  if (percentage >= 80) return "success";
  if (percentage >= 60) return "warning";
  return "destructive";
}

function gradeLabel(percentage: number) {
  if (percentage >= 85) return "Excellent";
  if (percentage >= 70) return "Strong Match";
  if (percentage >= 55) return "Good";
  if (percentage >= 40) return "Needs Work";
  return "Poor";
}

function ScoreRing({ score, max, size = 170 }: { score: number; max: number; size?: number }) {
  const percentage = (score / max) * 100;
  const radius = (size - 14) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const tier = scoreTier(percentage);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="10"
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${SCORE_STROKE_CLASS[tier]} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-bold tracking-tight ${SCORE_TEXT_CLASS[tier]}`}>
          {score}
        </span>
        <span className="text-sm text-muted-foreground">/ {max}</span>
      </div>
    </div>
  );
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const tier = scoreTier(pct);

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${SCORE_BG_CLASS[tier]} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums min-w-[4ch] text-right">
        {score}/{max}
      </span>
    </div>
  );
}

export function ScoreMatchingResults({ data, onReset }: ScoreMatchingResultsProps) {
  const { score_details, total_score, match_analysis, explanation, recommendation, key_matched_skills, missing_skills } = data;
  const percentage = Math.round((total_score / 100) * 100);
  const grade = gradeLabel(percentage);
  const tier = scoreTier(percentage);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Match Results</h2>
            <Badge variant={GRADE_BADGE_VARIANT[tier]} size="lg">
              {grade}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Your skills match this role at {percentage}%
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcwIcon className="size-4 mr-2" />
          Try Another
        </Button>
      </div>

      <Separator />

      <Surface variant="secondary" className="flex flex-col items-center gap-4 py-10 rounded-xl">
        <ScoreRing score={total_score} max={100} />
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {percentage >= 80
            ? "Strong alignment between your profile and the job requirements."
            : percentage >= 55
              ? "Decent match, but there are gaps worth addressing."
              : "Significant gaps between your profile and the job requirements."}
        </p>
      </Surface>

      <div>
        <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {SCORE_LABELS.map(({ key, label, max }) => {
            const score = score_details[key];
            const pct = Math.round((score / max) * 100);
            const t = scoreTier(pct);
            return (
              <Card key={key} className={SCORE_BORDER_L_CLASS[t]}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-3xl font-bold ${SCORE_TEXT_CLASS[t]}`}>
                      {score}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {max} pts
                    </span>
                  </div>
                  <ScoreBar score={score} max={max} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircleIcon className="size-4 text-success" />
              Matched Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {key_matched_skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {key_matched_skills.map((skill) => (
                  <Badge key={skill} variant="success" size="sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No matched skills identified.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-warning/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircleIcon className="size-4 text-destructive" />
              Missing Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missing_skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {missing_skills.map((skill) => (
                  <Badge key={skill} variant="destructive" size="sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No critical missing skills — great fit!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TargetIcon className="size-4 text-primary" />
            Explanation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{explanation}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LightbulbIcon className="size-4 text-warning" />
            Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{recommendation}</p>
        </CardContent>
      </Card>

      <Card className="bg-surface-secondary">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileTextIcon className="size-4 text-muted-foreground" />
            Match Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {match_analysis}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-center pb-4">
        <Button variant="outline" onClick={onReset}>
          <RotateCcwIcon className="size-4 mr-2" />
          Match Another Job
        </Button>
      </div>
    </div>
  );
}
