import { generateReadiness } from '../services/readiness.js'

export async function generate(req, res) {
    try {
        const { userId, roleName } = req.body

        // Input validation
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
            return res.status(400).json({ error: 'userId is required and must be a non-empty string' })
        }

        if (!roleName || typeof roleName !== 'string' || roleName.trim() === '') {
            return res.status(400).json({ error: 'roleName is required and must be a non-empty string' })
        }

        const result = await generateReadiness(userId, roleName)

        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}