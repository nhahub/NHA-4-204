export type GamificationTier = "Bronze" | "Silver" | "Gold" | "Diamond" | "Master";

export function calculateTier(finalScore: number, activityScore: number): GamificationTier {
    // Activity score and final score combine to give a total rank score
    // finalScore is already 0-100.
    // activityScore is 0-100.
    
    // Weighted combination: readiness score is more important than pure activity.
    const combinedRankScore = (finalScore * 0.7) + (activityScore * 0.3);
    
    if (combinedRankScore >= 90) return "Master";
    if (combinedRankScore >= 75) return "Diamond";
    if (combinedRankScore >= 55) return "Gold";
    if (combinedRankScore >= 35) return "Silver";
    return "Bronze";
}
