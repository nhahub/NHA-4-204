import type {
    GitHubGraphqlContributionStats,
    GitHubGraphqlRepoContribution,
} from "./utils";

const GITHUB_GRAPHQL_TIMEOUT_MS = 10000;

type GraphqlResponse = {
    data?: {
        user?: {
            contributionsCollection?: {
                totalCommitContributions?: number;
                totalPullRequestContributions?: number;
                totalPullRequestReviewContributions?: number;
                totalIssueContributions?: number;
                totalRepositoryContributions?: number;
                commitContributionsByRepository?: Array<{
                    contributions?: { totalCount?: number };
                    repository?: { nameWithOwner?: string; isFork?: boolean };
                }>;
            };
        };
    };
    errors?: Array<{ message?: string }>;
};

const contributionQuery = `
query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      totalRepositoryContributions
      commitContributionsByRepository(maxRepositories: 20) {
        contributions {
          totalCount
        }
        repository {
          nameWithOwner
          isFork
        }
      }
    }
  }
}
`;

export async function fetchGithubContributionStats({
    username,
    headers,
}: {
    username: string;
    headers: Record<string, string>;
}) {
    const graphqlHeaders: Record<string, string> = {
        "Content-Type": "application/json",
    };

    const rawToken = process.env.GITHUB_TOKEN;
    if (rawToken) {
        graphqlHeaders.Authorization = `Bearer ${rawToken}`;
    } else if (typeof headers.Authorization === "string") {
        if (headers.Authorization.startsWith("token ")) {
            graphqlHeaders.Authorization = `Bearer ${headers.Authorization.slice(6)}`;
        } else {
            graphqlHeaders.Authorization = headers.Authorization;
        }
    }

    if (!graphqlHeaders.Authorization) {
        return null;
    }

    try {
        const response = await fetch("https://api.github.com/graphql", {
            method: "POST",
            headers: graphqlHeaders,
            body: JSON.stringify({
                query: contributionQuery,
                variables: { login: username },
            }),
            signal: AbortSignal.timeout(GITHUB_GRAPHQL_TIMEOUT_MS),
        });

        if (!response.ok) {
            return null;
        }

        const payload = (await response.json()) as GraphqlResponse;
        if (payload.errors?.length) {
            return null;
        }

        const collection = payload.data?.user?.contributionsCollection;
        if (!collection) {
            return null;
        }

        const repoCommitBreakdown: GitHubGraphqlRepoContribution[] = (
            collection.commitContributionsByRepository ?? []
        )
            .filter((entry) => !entry.repository?.isFork)
            .map((entry) => ({
                repoName: entry.repository?.nameWithOwner ?? "",
                commitCount: Math.max(entry.contributions?.totalCount ?? 0, 0),
            }))
            .filter((entry) => entry.repoName.length > 0);

        const stats: GitHubGraphqlContributionStats = {
            commits: Math.max(collection.totalCommitContributions ?? 0, 0),
            pullRequests: Math.max(collection.totalPullRequestContributions ?? 0, 0),
            reviews: Math.max(collection.totalPullRequestReviewContributions ?? 0, 0),
            issues: Math.max(collection.totalIssueContributions ?? 0, 0),
            repositoriesContributed: Math.max(
                collection.totalRepositoryContributions ?? 0,
                0
            ),
            repoCommitBreakdown,
        };

        return stats;
    } catch {
        return null;
    }
}
