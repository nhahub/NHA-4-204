import { normalizeDependencyName, waitMilliseconds } from "./utils";
import type { GitHubEvent, GitHubRepo, RepoLanguages } from "./utils";
import type { RepoDependencies } from "./utils";

const GITHUB_EVENTS_MAX_PAGES = 20;
const GITHUB_REPOS_MAX_PAGES = 10;
const GITHUB_LANGUAGES_BATCH_SIZE = 12;
const GITHUB_LANGUAGES_MAX_RETRIES = 3;
const GITHUB_DEPENDENCIES_MAX_REPOS = 30;
const GITHUB_DEPENDENCIES_BATCH_SIZE = 5;
const GITHUB_REQUEST_TIMEOUT_MS = 10000;

type RepoPackageJson = {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
};

type GitHubContentResponse = {
    content?: string;
    encoding?: string;
};

async function fetchRepoContentFile({
    repoName,
    path,
    headers,
}: {
    repoName: string;
    path: string;
    headers: Record<string, string>;
}) {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${repoName}/contents/${path}`,
            {
                headers,
                signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
            }
        );

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            return null;
        }

        const payload = (await response.json()) as GitHubContentResponse;

        if (payload.encoding !== "base64" || typeof payload.content !== "string") {
            return null;
        }

        return Buffer.from(payload.content, "base64").toString("utf8");
    } catch {
        return null;
    }
}

export async function fetchGithubEvents({
    username,
    headers,
}: {
    username: string;
    headers: Record<string, string>;
}) {
    const events: GitHubEvent[] = [];

    for (let page = 1; page <= GITHUB_EVENTS_MAX_PAGES; page++) {
        try {
            const response = await fetch(
                `https://api.github.com/users/${username}/events/public?per_page=100&page=${page}`,
                {
                    headers,
                    signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
                }
            );

            if (!response.ok) break;

            const pageEvents = (await response.json()) as GitHubEvent[];

            if (!pageEvents.length) break;

            events.push(...pageEvents);

            if (pageEvents.length < 100) break;
        } catch {
            break;
        }
    }

    return events;
}

export async function fetchGithubRepos({
    username,
    headers,
}: {
    username: string;
    headers: Record<string, string>;
}) {
    const repos: GitHubRepo[] = [];

    for (let page = 1; page <= GITHUB_REPOS_MAX_PAGES; page++) {
        try {
            const response = await fetch(
                `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=updated`,
                {
                    headers,
                    signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
                }
            );

            if (!response.ok) break;

            const pageRepos = (await response.json()) as GitHubRepo[];

            repos.push(
                ...pageRepos.filter(
                    (repo) => !repo.archived && !repo.disabled
                )
            );

            if (pageRepos.length < 100) break;
        } catch {
            break;
        }
    }

    return repos;
}

export async function fetchRepoLanguageBreakdowns({
    repoNames,
    headers,
}: {
    repoNames: string[];
    headers: Record<string, string>;
}) {
    const result = new Map<string, RepoLanguages>();

    const uniqueRepoNames = [...new Set(repoNames)];

    for (
        let i = 0;
        i < uniqueRepoNames.length;
        i += GITHUB_LANGUAGES_BATCH_SIZE
    ) {
        const batch = uniqueRepoNames.slice(i, i + GITHUB_LANGUAGES_BATCH_SIZE);

        const rows = await Promise.allSettled(
            batch.map(async (repoName) => {
                const languages = await fetchRepoLanguagesWithRetry({
                    repoName,
                    headers,
                });

                if (!languages) return null;

                return { repoName, languages };
            })
        );

        for (const row of rows) {
            if (row.status !== "fulfilled" || !row.value) continue;
            result.set(row.value.repoName, row.value.languages);
        }
    }

    return result;
}

export async function fetchRepoLanguagesWithRetry({
    repoName,
    headers,
}: {
    repoName: string;
    headers: Record<string, string>;
}) {
    for (let attempt = 1; attempt <= GITHUB_LANGUAGES_MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${repoName}/languages`,
                {
                    headers,
                    signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
                }
            );

            if (response.ok) {
                return (await response.json()) as RepoLanguages;
            }

            if (response.status === 404) {
                return null;
            }

            if (response.status === 403 || response.status === 429) {
                const remaining = response.headers.get("x-ratelimit-remaining");

                if (remaining === "0") {
                    await waitMilliseconds(5000);
                }

                await waitMilliseconds(attempt * 700);
                continue;
            }
        } catch {
            if (attempt === GITHUB_LANGUAGES_MAX_RETRIES) return null;
            await waitMilliseconds(attempt * 500);
        }
    }

    return null;
}

export async function fetchRepoPackageJson({
    repoName,
    headers,
}: {
    repoName: string;
    headers: Record<string, string>;
}) {
    const SUBDIRECTORIES = ["", "client/", "server/", "frontend/", "backend/", "web/", "api/", "app/"];
    
    try {
        const results = await Promise.all(
            SUBDIRECTORIES.map(dir => fetchRepoContentFile({
                repoName,
                path: `${dir}package.json`,
                headers,
            }))
        );

        let mergedDependencies: Record<string, string> = {};
        let mergedDevDependencies: Record<string, string> = {};

        for (const content of results) {
            if (!content) continue;
            try {
                const parsed = JSON.parse(content) as RepoPackageJson;
                if (parsed.dependencies) {
                    mergedDependencies = { ...mergedDependencies, ...parsed.dependencies };
                }
                if (parsed.devDependencies) {
                    mergedDevDependencies = { ...mergedDevDependencies, ...parsed.devDependencies };
                }
            } catch {
                // Ignore parse errors for individual files
            }
        }

        if (Object.keys(mergedDependencies).length === 0 && Object.keys(mergedDevDependencies).length === 0) {
            return null;
        }

        return {
            dependencies: mergedDependencies,
            devDependencies: mergedDevDependencies,
        };
    } catch {
        return null;
    }
}

async function fetchRepoRequirementsDependencies({
    repoName,
    headers,
}: {
    repoName: string;
    headers: Record<string, string>;
}) {
    const SUBDIRECTORIES = ["", "client/", "server/", "frontend/", "backend/", "web/", "api/", "app/"];
    
    const results = await Promise.all(
        SUBDIRECTORIES.map(dir => fetchRepoContentFile({
            repoName,
            path: `${dir}requirements.txt`,
            headers,
        }))
    );

    const dependencies: string[] = [];

    for (const content of results) {
        if (!content) continue;

        for (const rawLine of content.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (!line || line.startsWith("#")) continue;

            const dependencyName = line.split(/[<>=!~\[\s]/)[0]?.trim().toLowerCase();
            if (!dependencyName) continue;

            dependencies.push(normalizeDependencyName(dependencyName));
        }
    }

    return [...new Set(dependencies)];
}

async function fetchRepoPomDependencies({
    repoName,
    headers,
}: {
    repoName: string;
    headers: Record<string, string>;
}) {
    const SUBDIRECTORIES = ["", "client/", "server/", "frontend/", "backend/", "web/", "api/", "app/"];
    
    const results = await Promise.all(
        SUBDIRECTORIES.map(dir => fetchRepoContentFile({
            repoName,
            path: `${dir}pom.xml`,
            headers,
        }))
    );

    const artifactIdRegex = /<artifactId>\s*([^<]+?)\s*<\/artifactId>/g;
    const dependencies: string[] = [];

    for (const content of results) {
        if (!content) continue;

        for (const match of content.matchAll(artifactIdRegex)) {
            const artifactId = match[1]?.trim().toLowerCase();
            if (!artifactId) continue;

            dependencies.push(normalizeDependencyName(artifactId));
        }
    }

    return [...new Set(dependencies)];
}

export async function fetchRepoDependencies({
    repoNames,
    headers,
}: {
    repoNames: string[];
    headers: Record<string, string>;
}) {
    const dependenciesByRepo: RepoDependencies = new Map();

    const topRepoNames = [...new Set(repoNames)].slice(0, GITHUB_DEPENDENCIES_MAX_REPOS);

    for (
        let i = 0;
        i < topRepoNames.length;
        i += GITHUB_DEPENDENCIES_BATCH_SIZE
    ) {
        const batch = topRepoNames.slice(i, i + GITHUB_DEPENDENCIES_BATCH_SIZE);

        const rows = await Promise.allSettled(
            batch.map(async (repoName) => {
                const packageJson = await fetchRepoPackageJson({
                    repoName,
                    headers,
                });

                const [requirementsDependencies, pomDependencies] = await Promise.all([
                    fetchRepoRequirementsDependencies({ repoName, headers }),
                    fetchRepoPomDependencies({ repoName, headers }),
                ]);

                const packageDependencies = packageJson
                    ? [
                        ...Object.keys(packageJson.dependencies ?? {}),
                        ...Object.keys(packageJson.devDependencies ?? {}),
                    ]
                    : [];

                const dependencyNames = [
                    ...packageDependencies,
                    ...requirementsDependencies,
                    ...pomDependencies,
                ].map((name) => normalizeDependencyName(name));

                const uniqueDependencies = [...new Set(dependencyNames)];

                if (!uniqueDependencies.length) return null;

                return {
                    repoName,
                    dependencies: uniqueDependencies,
                };
            })
        );

        for (const row of rows) {
            if (row.status !== "fulfilled" || !row.value) continue;
            dependenciesByRepo.set(row.value.repoName, row.value.dependencies);
        }
    }

    return dependenciesByRepo;
}
