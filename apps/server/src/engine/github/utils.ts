export type GitHubEvent = {
    type: string;
    created_at: string;
    repo?: { name?: string };
    payload?: {
        commits?: Array<{ sha?: string }>;
        action?: string;
        pull_request?: { merged?: boolean };
    };
};

export type RepoLanguages = Record<string, number>;

export type RepoDependencies = Map<string, string[]>;

export type GitHubGraphqlRepoContribution = {
    repoName: string;
    commitCount: number;
};

export type GitHubGraphqlContributionStats = {
    commits: number;
    pullRequests: number;
    reviews: number;
    issues: number;
    repositoriesContributed: number;
    repoCommitBreakdown: GitHubGraphqlRepoContribution[];
};

export type GitHubRepo = {
    full_name: string;
    name?: string;
    description?: string | null;
    language?: string | null;
    topics?: string[];
    pushed_at: string | null;
    stargazers_count?: number;
    forks_count?: number;
    size?: number;
    archived?: boolean;
    disabled?: boolean;
    fork?: boolean;
};

export const DAY_MS = 86400000;
export const THIRTY_DAYS_MS = 30 * DAY_MS;
export const NINETY_DAYS_MS = 90 * DAY_MS;

export function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function normalizeSkillName(name: string) {
    const key = name.trim().toLowerCase();

    const aliasMap: Record<string, string> = {
        js: "javascript",
        "node.js": "javascript",
        nodejs: "javascript",
        typescript: "typescript",
        ts: "typescript",
        py: "python",
        postgres: "sql",
        postgresql: "sql",
        mysql: "sql",
        sqlite: "sql",
        mssql: "sql",
        "t-sql": "sql",
        tsql: "sql",
        plpgsql: "sql",
        golang: "go",
        shell: "bash",
    };

    return aliasMap[key] ?? key;
}

export function normalizeDependencyName(name: string) {
    const key = name.trim().toLowerCase();

    const aliasMap: Record<string, string> = {
        postgresql: "postgres",
        psycopg2: "postgres",
        "mysql-connector": "mysql",
        "mysql-connector-python": "mysql",
        "spring-boot-starter-web": "spring",
        "spring-boot-starter-data-jpa": "spring",
        flask: "flask",
        django: "django",
    };

    return aliasMap[key] ?? key;
}

export function waitMilliseconds(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getGithubHeaders() {
    const headers: Record<string, string> = {};
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
}
