import { clamp } from "./utils";
import type { GitHubEvent } from "./utils";
import type { GitHubGraphqlContributionStats } from "./utils";

export type ContributionRepo = {
    repoName: string;
    lastActivityAt: string;
    pushEvents: number;
    pushedCommits: number;
    pullRequestsOpened: number;
    pullRequestsMerged: number;
    pullRequestReviews: number;
    issuesOpened: number;
    issueComments: number;
};

export function aggregateContributions(events: GitHubEvent[]) {
    const repoMap = new Map<string, ContributionRepo>();

    for (const event of events) {
        const repoName = event.repo?.name;
        if (!repoName) continue;

        const existing =
            repoMap.get(repoName) ??
            ({
                repoName,
                lastActivityAt: event.created_at,
                pushEvents: 0,
                pushedCommits: 0,
                pullRequestsOpened: 0,
                pullRequestsMerged: 0,
                pullRequestReviews: 0,
                issuesOpened: 0,
                issueComments: 0,
            } as ContributionRepo);

        const eventTime = Date.parse(event.created_at);
        const lastTime = Date.parse(existing.lastActivityAt);

        if (
            Number.isFinite(eventTime) &&
            (!Number.isFinite(lastTime) || eventTime > lastTime)
        ) {
            existing.lastActivityAt = event.created_at;
        }

        if (event.type === "PushEvent") {
            existing.pushEvents++;
            existing.pushedCommits += event.payload?.commits?.length ?? 0;
        }

        if (event.type === "PullRequestEvent") {
            existing.pullRequestsOpened++;
            if (event.payload?.pull_request?.merged) existing.pullRequestsMerged++;
        }

        if (event.type === "PullRequestReviewEvent") {
            existing.pullRequestReviews++;
        }

        if (event.type === "IssuesEvent" && event.payload?.action === "opened") {
            existing.issuesOpened++;
        }

        if (event.type === "IssueCommentEvent") {
            existing.issueComments++;
        }

        repoMap.set(repoName, existing);
    }

    return repoMap;
}

export function contributionPoints(c: ContributionRepo) {
    return (
        c.pushedCommits * 0.6 +
        c.pushEvents * 0.8 +
        c.pullRequestsOpened * 4 +
        c.pullRequestsMerged * 10 +
        c.pullRequestReviews * 4 +
        c.issuesOpened * 2 +
        c.issueComments * 1
    );
}

export function calculateContributionComplexity(c: ContributionRepo) {
    return clamp(Math.log1p(contributionPoints(c)) * 22, 0, 100);
}

export function mergeGraphqlContributionStats({
    baseContributions,
    stats,
}: {
    baseContributions: Map<string, ContributionRepo>;
    stats: GitHubGraphqlContributionStats;
}) {
    const merged = new Map<string, ContributionRepo>(baseContributions);

    const nowIso = new Date().toISOString();

    for (const repoStats of stats.repoCommitBreakdown) {
        const existing = merged.get(repoStats.repoName) ?? {
            repoName: repoStats.repoName,
            lastActivityAt: nowIso,
            pushEvents: 0,
            pushedCommits: 0,
            pullRequestsOpened: 0,
            pullRequestsMerged: 0,
            pullRequestReviews: 0,
            issuesOpened: 0,
            issueComments: 0,
        };

        existing.pushedCommits = Math.max(existing.pushedCommits, repoStats.commitCount);
        merged.set(repoStats.repoName, existing);
    }

    const targetRepoNames =
        stats.repoCommitBreakdown.length > 0
            ? stats.repoCommitBreakdown.map((repo) => repo.repoName)
            : [...merged.keys()];

    if (!targetRepoNames.length) {
        return merged;
    }

    const commitsFromBreakdown = stats.repoCommitBreakdown.reduce(
        (sum, repo) => sum + repo.commitCount,
        0
    );

    const remainingCommits = Math.max(stats.commits - commitsFromBreakdown, 0);

    distributeMetric({
        merged,
        repoNames: targetRepoNames,
        totalCount: remainingCommits,
        field: "pushedCommits",
    });

    distributeMetric({
        merged,
        repoNames: targetRepoNames,
        totalCount: stats.pullRequests,
        field: "pullRequestsOpened",
    });

    distributeMetric({
        merged,
        repoNames: targetRepoNames,
        totalCount: stats.reviews,
        field: "pullRequestReviews",
    });

    distributeMetric({
        merged,
        repoNames: targetRepoNames,
        totalCount: stats.issues,
        field: "issuesOpened",
    });

    return merged;
}

function distributeMetric({
    merged,
    repoNames,
    totalCount,
    field,
}: {
    merged: Map<string, ContributionRepo>;
    repoNames: string[];
    totalCount: number;
    field: "pushedCommits" | "pullRequestsOpened" | "pullRequestReviews" | "issuesOpened";
}) {
    if (totalCount <= 0 || repoNames.length === 0) return;

    const nowIso = new Date().toISOString();

    const baseWeightByRepo = new Map<string, number>();
    let totalWeight = 0;

    for (const repoName of repoNames) {
        const contribution = merged.get(repoName) ?? {
            repoName,
            lastActivityAt: nowIso,
            pushEvents: 0,
            pushedCommits: 0,
            pullRequestsOpened: 0,
            pullRequestsMerged: 0,
            pullRequestReviews: 0,
            issuesOpened: 0,
            issueComments: 0,
        };

        merged.set(repoName, contribution);

        const weight = Math.max(contribution.pushedCommits, 1);
        baseWeightByRepo.set(repoName, weight);
        totalWeight += weight;
    }

    let remaining = totalCount;

    for (let index = 0; index < repoNames.length; index++) {
        const repoName = repoNames[index];
        if (!repoName) continue;

        const contribution = merged.get(repoName);
        if (!contribution) continue;

        const weight = baseWeightByRepo.get(repoName) ?? 1;
        const isLast = index === repoNames.length - 1;

        const assigned = isLast
            ? remaining
            : Math.floor((totalCount * weight) / Math.max(totalWeight, 1));

        contribution[field] += assigned;
        remaining -= assigned;
    }
}
