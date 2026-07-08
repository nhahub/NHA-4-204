import {
    calculateContributionComplexity,
    contributionPoints,
    type ContributionRepo,
} from "./contributionAggregator";
import { clamp, normalizeSkillName } from "./utils";
import { NINETY_DAYS_MS, type GitHubRepo, type RepoLanguages } from "./utils";

const GITHUB_LANGUAGE_REPOS_MAX = 40;

export type SkillCategory = "languages" | "databases" | "frameworks" | "devops";

export const SKILL_CATEGORIES: Record<string, SkillCategory> = {
    javascript: "languages",
    typescript: "languages",
    python: "languages",
    go: "languages",
    rust: "languages",
    java: "languages",
    sql: "databases",
    postgres: "databases",
    mysql: "databases",
    mongodb: "databases",
    redis: "databases",
    react: "frameworks",
    nextjs: "frameworks",
    express: "frameworks",
    nestjs: "frameworks",
    django: "frameworks",
    flask: "frameworks",
    docker: "devops",
    kubernetes: "devops",
    terraform: "devops",
    ci: "devops",
    cd: "devops",
};

export function getSkillCategory(skillName: string) {
    return SKILL_CATEGORIES[normalizeSkillName(skillName)];
}

export type CategorizedSkillStrengths = {
    languageStrengths: Map<string, number>;
    databaseStrengths: Map<string, number>;
    frameworkStrengths: Map<string, number>;
    devopsStrengths: Map<string, number>;
    combinedSkillStrengths: Map<string, number>;
};

export function calculateLanguageStrengths({
    contributions,
    repoLanguages,
    repos,
}: {
    contributions: Map<string, ContributionRepo>;
    repoLanguages: Map<string, RepoLanguages>;
    repos: GitHubRepo[];
}) {
    const categorized = calculateCategorizedLanguageStrengths({
        contributions,
        repoLanguages,
        repos,
    });

    return categorized.combinedSkillStrengths;
}

export function calculateCategorizedLanguageStrengths({
    contributions,
    repoLanguages,
    repos,
}: {
    contributions: Map<string, ContributionRepo>;
    repoLanguages: Map<string, RepoLanguages>;
    repos: GitHubRepo[];
}) {
    const languageTotals = new Map<string, number>();
    const databaseTotals = new Map<string, number>();
    const frameworkTotals = new Map<string, number>();
    const devopsTotals = new Map<string, number>();
    const uncategorizedTotals = new Map<string, number>();

    const repoByName = new Map(repos.map((repo) => [repo.full_name, repo]));

    for (const [repoName, languages] of repoLanguages) {
        const contribution = contributions.get(repoName);
        const repo = repoByName.get(repoName);

        const repositoryImportance = calculateRepoLanguageWeight({
            contribution,
            repo,
        });

        const totalBytes = Object.values(languages ?? {}).reduce((sum, bytes) => {
            return sum + Math.max(bytes, 0);
        }, 0);

        if (!totalBytes) continue;

        for (const [languageName, bytes] of Object.entries(languages)) {
            const normalized = normalizeSkillName(languageName);
            const weight = Math.max(bytes, 0) / totalBytes;
            const weightedContribution = repositoryImportance * weight;

            const category = SKILL_CATEGORIES[normalized];
            const targetMap =
                category === "languages"
                    ? languageTotals
                    : category === "databases"
                        ? databaseTotals
                        : category === "frameworks"
                            ? frameworkTotals
                            : category === "devops"
                                ? devopsTotals
                                : uncategorizedTotals;

            targetMap.set(
                normalized,
                (targetMap.get(normalized) ?? 0) + weightedContribution
            );
        }
    }

    const languageStrengths = normalizeCategoryTotals(languageTotals);
    const databaseStrengths = normalizeCategoryTotals(databaseTotals);
    const frameworkStrengths = normalizeCategoryTotals(frameworkTotals);
    const devopsStrengths = normalizeCategoryTotals(devopsTotals);
    const uncategorizedStrengths = normalizeCategoryTotals(uncategorizedTotals);

    const combinedSkillStrengths = new Map<string, number>([
        ...languageStrengths,
        ...databaseStrengths,
        ...frameworkStrengths,
        ...devopsStrengths,
        ...uncategorizedStrengths,
    ]);

    return {
        languageStrengths,
        databaseStrengths,
        frameworkStrengths,
        devopsStrengths,
        combinedSkillStrengths,
    } satisfies CategorizedSkillStrengths;
}

function normalizeCategoryTotals(totals: Map<string, number>) {
    if (!totals.size) return new Map<string, number>();

    const maxContribution = Math.max(...totals.values());
    const strengths = new Map<string, number>();

    for (const [lang, value] of [...totals.entries()].sort((a, b) => b[1] - a[1])) {
        strengths.set(lang, clamp((value / maxContribution) * 100, 5, 100));
    }

    return strengths;
}

export function calculateRepoLanguageWeight({
    contribution,
    repo,
}: {
    contribution?: ContributionRepo;
    repo?: GitHubRepo;
}) {
    const contributionWeight = contribution
        ? calculateContributionComplexity(contribution)
        : 0;

    const repositorySignal = calculateRepositorySignal(repo);

    if (!contributionWeight) return repositorySignal;

    return clamp(contributionWeight * 0.75 + repositorySignal * 0.25, 1, 100);
}

export function calculateRepositorySignal(repo?: GitHubRepo) {
    if (!repo) return 5;
    if (repo.fork) return 5;

    const pushedAt = Date.parse(repo.pushed_at ?? "");

    const recencyBoost =
        Number.isFinite(pushedAt) && Date.now() - pushedAt <= NINETY_DAYS_MS
            ? 1.2
            : 1;

    const stars = Math.max(repo.stargazers_count ?? 0, 0);
    const forks = Math.max(repo.forks_count ?? 0, 0);
    const size = Math.max(repo.size ?? 0, 0);

    const popularityScore = Math.log1p(stars * 5 + forks * 3) * 8;
    const sizeScore = Math.log1p(size) * 1.5;

    return clamp((popularityScore + sizeScore) * recencyBoost, 1, 45);
}

export function extractRepoSkillNames(languages?: RepoLanguages) {
    if (!languages) return [];

    const names = new Set<string>();

    for (const languageName of Object.keys(languages)) {
        names.add(normalizeSkillName(languageName));
    }

    return [...names];
}

export function selectRepoNamesForLanguageAnalysis({
    repos,
    contributions,
}: {
    repos: GitHubRepo[];
    contributions: Map<string, ContributionRepo>;
}) {
    const selected = new Set<string>();
    const contributionsByRepo = new Map<string, ContributionRepo>(contributions);
    const ownedRepoNames = new Set(
        repos
            .filter((repo) => !repo.archived && !repo.disabled && !repo.fork)
            .map((repo) => repo.full_name)
    );

    for (const [repoName, contribution] of contributionsByRepo) {
        const isOwned = ownedRepoNames.has(repoName);
        const score = contributionPoints(contribution);

        if (!isOwned && score < 5) continue;

        if (
            score > 0 ||
            (isOwned && selected.size < GITHUB_LANGUAGE_REPOS_MAX)
        ) {
            selected.add(repoName);
        }
    }

    const prioritizedRepos = repos
        .filter((repo) => !repo.archived && !repo.disabled && !repo.fork)
        .sort((left, right) => {
        const leftScore = calculateRepoPriority(
            left,
            contributionsByRepo.get(left.full_name)
        );

        const rightScore = calculateRepoPriority(
            right,
            contributionsByRepo.get(right.full_name)
        );

            return rightScore - leftScore;
        });

    for (const repo of prioritizedRepos) {
        if (selected.size >= GITHUB_LANGUAGE_REPOS_MAX) break;
        selected.add(repo.full_name);
    }

    return [...selected];
}

function calculateRepoPriority(repo: GitHubRepo, contribution?: ContributionRepo) {
    const contributionScore = contribution
        ? Math.log1p(contributionPoints(contribution)) * 18
        : 0;

    return contributionScore + calculateRepositorySignal(repo);
}
