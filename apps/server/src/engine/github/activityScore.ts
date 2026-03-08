import { contributionPoints, type ContributionRepo } from "./contributionAggregator";
import {
    clamp,
    NINETY_DAYS_MS,
    THIRTY_DAYS_MS,
    type GitHubEvent,
    type GitHubRepo,
} from "./utils";

const ACTIVITY_EVENT_TYPES = new Set([
    "PushEvent",
    "PullRequestEvent",
    "PullRequestReviewEvent",
    "IssuesEvent",
    "IssueCommentEvent",
]);

export function calculateActivityScore({
    contributions,
    events,
    repos,
}: {
    contributions: Map<string, ContributionRepo>;
    events: GitHubEvent[];
    repos: GitHubRepo[];
}) {
    if (!contributions.size && !repos.length) return 0;

    const now = Date.now();
    const allowedRepoNames = new Set(repos.map((repo) => repo.full_name));
    const hasRepoFilter = allowedRepoNames.size > 0;

    const contributionsForScoring = hasRepoFilter
        ? [...contributions.entries()]
            .filter(([repoName]) => allowedRepoNames.has(repoName))
            .map(([, contribution]) => contribution)
        : [...contributions.values()];

    const reposForActivity =
        repos.length > 0
            ? repos
            : [...contributions.values()].map((contribution) => ({
                full_name: contribution.repoName,
                pushed_at: contribution.lastActivityAt,
            }));

    const activeRepos = reposForActivity.filter((repo) => {
        const last = Date.parse(repo.pushed_at ?? "");
        return Number.isFinite(last) && now - last <= THIRTY_DAYS_MS;
    }).length;

    const activeRepoScore =
        (reposForActivity.length ? activeRepos / reposForActivity.length : 0) * 30;

    const repoBreadthScore = clamp(Math.log1p(reposForActivity.length) * 8, 0, 20);

    const totalContributionPoints = contributionsForScoring.reduce(
        (sum, contribution) => sum + contributionPoints(contribution),
        0
    );

    const contributionImpactScore = clamp(
        Math.log1p(totalContributionPoints) * 7,
        0,
        30
    );

    const recentActivityScore = clamp(
        events.filter((event) => {
            if (!ACTIVITY_EVENT_TYPES.has(event.type)) return false;

            if (hasRepoFilter) {
                const repoName = event.repo?.name;
                if (typeof repoName !== "string" || !allowedRepoNames.has(repoName)) {
                    return false;
                }
            }

            const eventTimestamp = Date.parse(event.created_at);
            return (
                Number.isFinite(eventTimestamp) &&
                now - eventTimestamp <= THIRTY_DAYS_MS
            );
        }).length * 1.4,
        0,
        20
    );

    const recencyMomentumScore = clamp(
        reposForActivity.filter((repo) => {
            const timestamp = Date.parse(repo.pushed_at ?? "");
            return Number.isFinite(timestamp) && now - timestamp <= NINETY_DAYS_MS;
        }).length * 1.2,
        0,
        10
    );

    return clamp(
        activeRepoScore +
            repoBreadthScore +
            contributionImpactScore +
            recentActivityScore +
            recencyMomentumScore,
        0,
        100
    );
}
