// services/readiness.js

import { supabase } from '../config/supabase.js'

async function rollbackReadinessWrite(reportId, roadmapId) {
    if (roadmapId) {
        await supabase
            .from('roadmap_steps')
            .delete()
            .eq('roadmap_id', roadmapId)

        await supabase
            .from('roadmaps')
            .delete()
            .eq('id', roadmapId)
    }

    if (reportId) {
        await supabase
            .from('skill_gap_results')
            .delete()
            .eq('report_id', reportId)

        await supabase
            .from('readiness_reports')
            .delete()
            .eq('id', reportId)
    }
}

export async function generateReadiness(userId, roleName) {

    // Get role
    const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('name', roleName)
        .single()

    if (roleError || !role) throw new Error('Role not found')


    // Get role skills
    const { data: roleSkills, error: roleSkillsError } = await supabase
        .from('role_skills')
        .select('skill_id, weight')
        .eq('role_id', role.id)

    if (roleSkillsError) throw roleSkillsError

    const safeRoleSkills = roleSkills || []


    // Get user skills
    const { data: userSkills, error: userSkillsError } = await supabase
        .from('user_skills')
        .select('skill_id, strength_score')
        .eq('user_id', userId)

    if (userSkillsError) throw userSkillsError

    const userSkillMap = {}

    if (userSkills) {
        userSkills.forEach(us => {
            const strength = Number(us.strength_score)
            userSkillMap[us.skill_id] = Number.isFinite(strength)
                ? strength
                : 0
        })
    }


    // Skill Match Calculation (Weighted + Penalty)
    let weightedSum = 0
    let totalWeight = 0

    safeRoleSkills.forEach(rs => {
        const strength = userSkillMap[rs.skill_id] || 0
        const weight = Number(rs.weight) || 0
        weightedSum += strength * weight
        totalWeight += weight
    })

    let skillMatchScore = totalWeight > 0
        ? weightedSum / totalWeight
        : 0

    // Missing skill penalty
    const totalRequiredSkills = safeRoleSkills.length

    const presentSkills = safeRoleSkills.filter(
        rs => userSkillMap[rs.skill_id]
    ).length

    const coverageRatio =
        totalRequiredSkills > 0
            ? presentSkills / totalRequiredSkills
            : 0

    skillMatchScore = skillMatchScore * coverageRatio


    // Project Strength (No N+1 + Normalization)
    const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
            id,
            complexity_score,
            project_skills (
                skill_id
            )
        `)
        .eq('user_id', userId)

    if (projectsError) throw projectsError

    let projectStrength = 0

    if (projects && projects.length > 0) {

        const roleSkillIds = safeRoleSkills.map(rs => rs.skill_id)
        let totalProjectScore = 0

        projects.forEach(project => {
            const projectSkills = project.project_skills || []

            const matchedSkills = projectSkills
                .filter(ps => roleSkillIds.includes(ps.skill_id))
                .length

            const coverage = roleSkillIds.length > 0
                ? matchedSkills / roleSkillIds.length
                : 0

            totalProjectScore +=
                Number(project.complexity_score) * coverage
        })

        projectStrength =
            totalProjectScore / projects.length
    }

    // Normalize to 0–100 scale
    const projectStrengthNormalized =
        Math.min(100, projectStrength)


    // GitHub Score
    const { data: githubStats } = await supabase
        .from('github_stats')
        .select('activity_score')
        .eq('user_id', userId)
        .single()

    const githubScore =
        githubStats?.activity_score
            ? Number(githubStats.activity_score)
            : 0


    // Rebalanced Final Score
    const totalScore =
        (skillMatchScore * 0.5) +
        (projectStrengthNormalized * 0.3) +
        (githubScore * 0.2)


    // Generate Skill Gaps
    const gapResults = safeRoleSkills.map(rs => {

        const strength = userSkillMap[rs.skill_id] || 0
        const weight = Number(rs.weight) || 0

        let gapType = 'strong'
        if (strength === 0) gapType = 'missing'
        else if (strength < 60) gapType = 'weak'

        return {
            skill_id: rs.skill_id,
            gap_type: gapType,
            strength_score: strength,
            weight
        }
    })


    let reportId = null
    let roadmapId = null

    try {
        // Save readiness report
        const { data: reportData, error: reportError } = await supabase
            .from('readiness_reports')
            .insert({
                user_id: userId,
                role_id: role.id,
                skill_match_score: skillMatchScore,
                project_score: projectStrengthNormalized,
                github_score: githubScore,
                total_score: totalScore
            })
            .select()
            .single()

        if (reportError) throw reportError
        reportId = reportData.id

        // Save skill gaps
        if (gapResults.length > 0) {
            const { error: gapError } = await supabase
                .from('skill_gap_results')
                .insert(
                    gapResults.map(g => ({
                        report_id: reportData.id,
                        skill_id: g.skill_id,
                        gap_type: g.gap_type,
                        strength_score: g.strength_score
                    }))
                )

            if (gapError) throw gapError
        }

        // Build prioritized roadmap
        const prioritizedSkills = gapResults
            .filter(g => g.gap_type !== 'strong')
            .map(g => ({
                skill_id: g.skill_id,
                priorityScore:
                    (g.weight * 0.7) +
                    ((100 - g.strength_score) * 0.3 / 100)
            }))
            .sort((a, b) => b.priorityScore - a.priorityScore)

        // Insert new roadmap first
        const { data: roadmapData, error: roadmapError } = await supabase
            .from('roadmaps')
            .insert({
                user_id: userId,
                role_id: role.id,
                readiness_report_id: reportData.id,
                total_steps: prioritizedSkills.length
            })
            .select()
            .single()

        if (roadmapError) throw roadmapError
        roadmapId = roadmapData.id

        // Insert roadmap steps
        if (prioritizedSkills.length > 0) {
            const { error: stepsError } = await supabase
                .from('roadmap_steps')
                .insert(
                    prioritizedSkills.map((skill, index) => ({
                        roadmap_id: roadmapData.id,
                        skill_id: skill.skill_id,
                        order_index: index + 1,
                        status: 'pending'
                    }))
                )

            if (stepsError) throw stepsError
        }

        // Delete previous roadmaps only after new roadmap is fully written
        const { data: existingRoadmaps, error: oldRoadmapsError } = await supabase
            .from('roadmaps')
            .select('id')
            .eq('user_id', userId)
            .eq('role_id', role.id)
            .neq('id', roadmapData.id)

        if (oldRoadmapsError) throw oldRoadmapsError

        if (existingRoadmaps?.length > 0) {
            const oldRoadmapIds = existingRoadmaps.map(r => r.id)

            const { error: oldStepsDeleteError } = await supabase
                .from('roadmap_steps')
                .delete()
                .in('roadmap_id', oldRoadmapIds)

            if (oldStepsDeleteError) throw oldStepsDeleteError

            const { error: oldRoadmapsDeleteError } = await supabase
                .from('roadmaps')
                .delete()
                .in('id', oldRoadmapIds)

            if (oldRoadmapsDeleteError) throw oldRoadmapsDeleteError
        }
    } catch (writeError) {
        await rollbackReadinessWrite(reportId, roadmapId)
        throw writeError
    }

    return {
        skillMatchScore,
        projectStrength: projectStrengthNormalized,
        githubScore,
        totalScore
    }
}