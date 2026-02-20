import { generateReadiness } from '../services/readiness.js'

export async function generate(req, res) {
    try {
        const { userId, roleName } = req.body

        const result = await generateReadiness(userId, roleName)

        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}