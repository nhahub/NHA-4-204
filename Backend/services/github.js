// services/github.js

import { supabase } from "../config/supabase.js";

const PER_PAGE = 100;

async function fetchAllRepos(username, headers) {
    const repos = [];
    let page = 1;
    const maxPages = 10;

    while (page <= maxPages) {
        const response = await fetch(
            `https://api.github.com/users/${username}/repos?per_page=${PER_PAGE}&page=${page}`,
            { headers }
        );

        if (!response.ok) {
            throw new Error("GitHub user not found or API error");
        }

        const batch = await response.json();
        repos.push(...batch);

        if (batch.length < PER_PAGE) break;
        page += 1;
    }

    return repos;
}

export async function syncGitHub(userId, username) {

    const headers = {};
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    // 1️⃣ Fetch repositories (with pagination)
    const repos = await fetchAllRepos(username, headers);

    for (const repo of repos) {

        // 2️⃣ Upsert repo (idempotent)
        const { data: projectData, error: projectError } = await supabase
            .from("projects")
            .upsert(
                {
                    user_id: userId,
                    title: repo.name,
                    description: repo.description,
                    source: "github",
                    complexity_score: calculateComplexity(repo),
                },
                { onConflict: "user_id,title" }
            )
            .select()
            .single();

        if (projectError) {
            console.error("PROJECT UPSERT ERROR:", projectError);
            continue;
        }

        if (!projectData) continue;

        // 3️⃣ Fetch ALL languages for this repo
        const langResponse = await fetch(repo.languages_url, { headers });

        let languages = [];

        if (langResponse.ok) {
            const langData = await langResponse.json();
            languages = Object.keys(langData);
        } else if (repo.language) {
            languages = [repo.language];
        }

        for (let lang of languages) {

            lang = normalizeLanguage(lang);

            if (!lang) continue;

            const { data: skill } = await supabase
                .from("skills")
                .select("id")
                .eq("name", lang)
                .single();

            if (skill) {
                await supabase
                    .from("project_skills")
                    .upsert(
                        {
                            project_id: projectData.id,
                            skill_id: skill.id,
                        },
                        { onConflict: "project_id,skill_id" }
                    );
            }
        }
    }

    // 4️⃣ Compute GitHub metrics
    const activityScore = calculateActivityScore(repos);

    const totalStars = repos.reduce(
        (sum, repo) => sum + repo.stargazers_count,
        0
    );

    const reposCount = repos.length;

    const { error: githubError } = await supabase
        .from("github_stats")
        .upsert(
            {
                user_id: userId,
                username,
                repos_count: reposCount,
                total_stars: totalStars,
                activity_score: activityScore,
                last_synced: new Date().toISOString(),
            },
            { onConflict: "user_id" }
        );

    if (githubError) {
        console.error("GITHUB STATS INSERT ERROR:", githubError);
        throw githubError;
    }

    // 5️⃣ Aggregate project skills → user_skills
    const { data: userProjects } = await supabase
        .from("projects")
        .select(`
      id,
      project_skills (
        skill_id
      )
    `)
        .eq("user_id", userId);

    if (userProjects) {

        const skillFrequency = {};

        userProjects.forEach((project) => {
            (project.project_skills || []).forEach((ps) => {
                skillFrequency[ps.skill_id] =
                    (skillFrequency[ps.skill_id] || 0) + 1;
            });
        });

        for (const skillId in skillFrequency) {

            const count = skillFrequency[skillId];

            // Log-based scaling (prevents artificial inflation)
            const strengthScore = Math.min(
                100,
                50 + Math.log(count + 1) * 20
            );

            await supabase
                .from("user_skills")
                .upsert(
                    {
                        user_id: userId,
                        skill_id: skillId,
                        strength_score: strengthScore,
                    },
                    { onConflict: "user_id,skill_id" }
                );
        }
    }

    return {
        repoCount: reposCount,
        activityScore,
    };
}


// 🔹 Complexity heuristic
function calculateComplexity(repo) {
    return Math.min(
        100,
        repo.stargazers_count * 5 +
        repo.forks_count * 3 +
        repo.size / 10
    );
}


// 🔹 Improved activity scoring
function calculateActivityScore(repos) {

    if (repos.length === 0) return 0;

    let score = 0;

    // Repo volume weight
    score += repos.length * 4;

    // Recency bonus
    const now = new Date();

    repos.forEach((repo) => {

        const updated = new Date(repo.updated_at);
        const diffDays = (now - updated) / (1000 * 60 * 60 * 24);

        if (diffDays < 30) score += 10;
        else if (diffDays < 90) score += 5;

        score += repo.stargazers_count * 2;
        score += repo.forks_count * 2;
    });

    // Language diversity bonus
    const uniqueLanguages = new Set(
        repos.map((r) => r.language).filter(Boolean)
    );

    score += uniqueLanguages.size * 6;

    return Math.min(100, score);
}


// 🔹 Language normalization
function normalizeLanguage(lang) {

    if (!lang) return null;

    const map = {
        "JS": "JavaScript",
        "Javascript": "JavaScript",
        "TS": "TypeScript",
        "Py": "Python",
        "C++": "Cpp",
        "C#": "CSharp",
        "Shell": "Bash",
    };

    return map[lang] || lang;
}