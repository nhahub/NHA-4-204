import type { RouterOutput } from "@/utils/trpc";

export type AtsEvaluation = RouterOutput["ai"]["atsScore"];

export type AtsScores = AtsEvaluation["scores"];
export type AtsScoreCategory = AtsScores[keyof AtsScores];
export type AtsDeductions = AtsEvaluation["deductions"];
export type AtsReport = AtsEvaluation["ats_report"];

export type ScoreMatchResult = RouterOutput["ai"]["scoreMatch"];
export type ScoreMatch = ScoreMatchResult["match_result"];
export type ScoreMatchDetails = ScoreMatch["score_details"];
