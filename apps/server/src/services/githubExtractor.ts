import { Octokit } from "octokit";
import { env } from "@careergps/env/server";

// MODULAR DESIGN: You can add or remove files here if you want to scan for different manifest files in the future.
const TARGET_FILES_TO_EXTRACT = ["package.json", "requirements.txt", "go.mod", "pom.xml"];

export async function extractGithubData(username: string) {
    if (!env.GITHUB_PAT) {
        throw new Error("GITHUB_PAT is not configured in .env");
    }

    const octokit = new Octokit({ auth: env.GITHUB_PAT });
    
    // 1. Fetch user repos
    const { data: repos } = await octokit.rest.repos.listForUser({
        username,
        sort: "updated",
        per_page: 5 // Get 5 most recently updated repos for analysis to avoid massive payloads
    });

    const repoAnalysis = [];

    // 2. Deep Dive into each repo
    for (const repo of repos) {
        let manifestsFound: any[] = [];
        let languages = {};
        
        try {
            const { data } = await octokit.rest.repos.listLanguages({
                owner: username,
                repo: repo.name
            });
            languages = data;
        } catch (e) {
            // Ignore if language fetch fails
        }

        // Dynamically search for modular target files anywhere in the repository
        try {
            const { data: repoDetail } = await octokit.rest.repos.get({
                owner: username,
                repo: repo.name
            });
            
            const { data: treeData } = await octokit.rest.git.getTree({
                owner: username,
                repo: repo.name,
                tree_sha: repoDetail.default_branch,
                recursive: "1"
            });

            const matchedPaths = treeData.tree
                .filter((t: any) => TARGET_FILES_TO_EXTRACT.some(target => t.path === target || t.path?.endsWith(`/${target}`)))
                .map((t: any) => t.path)
                .slice(0, 5); // Limit to max 5 manifests per repo to preserve rate limits

            for (const path of matchedPaths) {
                const { data: fileData } = await octokit.rest.repos.getContent({
                    owner: username,
                    repo: repo.name,
                    path: path
                });

                if (fileData && !Array.isArray(fileData) && fileData.type === "file" && fileData.content) {
                    const decodedContent = Buffer.from(fileData.content, "base64").toString("utf-8");
                    const fileType = TARGET_FILES_TO_EXTRACT.find(target => path === target || path.endsWith(`/${target}`)) || "unknown";

                    manifestsFound.push({
                        fileType,
                        path: path,
                        content: decodedContent
                    });
                }
            }
        } catch (e: any) {
            // Error connecting to tree
            console.error(`Error searching tree for ${repo.name}:`, e.message);
        }

        repoAnalysis.push({
            name: repo.name,
            description: repo.description,
            stargazers: repo.stargazers_count,
            languages,
            rawDependenciesFound: manifestsFound.length > 0 ? manifestsFound : null
        });
    }

    return {
        totalAnalyzed: repos.length,
        repositories: repoAnalysis
    };
}
