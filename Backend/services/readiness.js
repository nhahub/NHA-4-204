// services/readiness.service.js

import { supabase } from '../config/supabase.js'

export async function generateReadiness(userId, roleName) {
    console.log("ROADMAP LOGIC EXECUTING")
    // 1️⃣ Get role
    const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('name', roleName)
        .single()

    if (roleError || !role) throw new Error('Role not found')


    // 2️⃣ Get role skills
    const { data: roleSkills, error: roleSkillsError } = await supabase
        .from('role_skills')
        .select('skill_id, weight')
        .eq('role_id', role.id)

    if (roleSkillsError) throw roleSkillsError


    // 3️⃣ Get user skills
    const { data: userSkills, error: userSkillsError } = await supabase
        .from('user_skills')
        .select('skill_id, strength_score')
        .eq('user_id', userId)

    if (userSkillsError) throw userSkillsError

    const userSkillMap = {}

    if (userSkills) {
        userSkills.forEach(us => {
            userSkillMap[us.skill_id] = us.strength_score
        })
    }


    // 4️⃣ Skill Match Calculation
    let weightedSum = 0
    let totalWeight = 0

    roleSkills.forEach(rs => {
        const strength = userSkillMap[rs.skill_id] || 0
        weightedSum += strength * rs.weight
        totalWeight += rs.weight
    })

    const skillMatchScore = totalWeight > 0
        ? weightedSum / totalWeight
        : 0


    // 5️⃣ Project Strength (No N+1)
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

        const roleSkillIds = roleSkills.map(rs => rs.skill_id)
        let totalProjectScore = 0

        projects.forEach(project => {

            const matchedSkills = project.project_skills
                .filter(ps => roleSkillIds.includes(ps.skill_id))
                .length

            const coverage = roleSkillIds.length > 0
                ? matchedSkills / roleSkillIds.length
                : 0

            totalProjectScore += project.complexity_score * coverage
        })

        projectStrength = totalProjectScore / projects.length
    }


    // 6️⃣ GitHub Score
    const { data: githubStats } = await supabase
        .from('github_stats')
        .select('activity_score')
        .eq('user_id', userId)
        .single()

    const githubScore = githubStats?.activity_score || 0


    // 7️⃣ Total Score
    const totalScore =
        (skillMatchScore * 0.6) +
        (projectStrength * 0.25) +
        (githubScore * 0.15)


    // 8️⃣ Generate Skill Gaps
    const gapResults = roleSkills.map(rs => {

        const strength = userSkillMap[rs.skill_id] || 0

        let gapType = 'strong'
        if (strength === 0) gapType = 'missing'
        else if (strength < 60) gapType = 'weak'

        return {
            skill_id: rs.skill_id,
            gap_type: gapType,
            strength_score: strength,
            weight: rs.weight
        }
    })


    // 9️⃣ Save readiness report
    const { data: reportData, error: reportError } = await supabase
        .from('readiness_reports')
        .insert({
            user_id: userId,
            role_id: role.id,
            skill_match_score: skillMatchScore,
            project_score: projectStrength,
            github_score: githubScore,
            total_score: totalScore
        })
        .select()
        .single()

    if (reportError) throw reportError


    // 🔟 Save skill gaps
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


    // 11️⃣ Delete previous roadmap
    const { data: existingRoadmaps } = await supabase
        .from('roadmaps')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', role.id)

    if (existingRoadmaps && existingRoadmaps.length > 0) {

        const roadmapIds = existingRoadmaps.map(r => r.id)

        await supabase
            .from('roadmap_steps')
            .delete()
            .in('roadmap_id', roadmapIds)

        await supabase
            .from('roadmaps')
            .delete()
            .in('id', roadmapIds)
    }


    // 12️⃣ Build prioritized roadmap
    const prioritizedSkills = gapResults
        .filter(g => g.gap_type !== 'strong')
        .map(g => ({
            skill_id: g.skill_id,
            priorityScore:
                (g.weight * 0.7) +
                ((100 - g.strength_score) * 0.3 / 100)
        }))
        .sort((a, b) => b.priorityScore - a.priorityScore)


        console.log("About to insert roadmap")
        console.log("Prioritized skills count:", prioritizedSkills.length)

    // 13️⃣ Insert new roadmap
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


    // 14️⃣ Insert roadmap steps
    if (prioritizedSkills.length > 0) {
        await supabase.from('roadmap_steps').insert(
            prioritizedSkills.map((skill, index) => ({
                roadmap_id: roadmapData.id,
                skill_id: skill.skill_id,
                order_index: index + 1,
                status: 'pending'
            }))
        )
    }


    return {
        skillMatchScore,
        projectStrength,
        githubScore,
        totalScore
    }
}