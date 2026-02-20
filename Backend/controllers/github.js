import { syncGitHub } from '../services/github.js'

export async function sync(req, res) {
    try {
        const { userId, username } = req.body

        // Input validation
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
            return res.status(400).json({ error: 'userId is required and must be a non-empty string' })
        }

        if (!username || typeof username !== 'string' || username.trim() === '') {
            return res.status(400).json({ error: 'username is required and must be a non-empty string' })
        }

        const result = await syncGitHub(userId, username)

        res.json(result)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err.message })
    }
}