import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import readinessRoutes from './routes/readiness.js'
import githubRoutes from './routes/github.js'

dotenv.config()

const app = express()

// Enable CORS for all origins (restrict in production)
app.use(cors())

// REQUIRED to parse JSON body
app.use(express.json())

// Register routes
app.use('/readiness', readinessRoutes)
app.use('/github', githubRoutes)

// Health check
app.get('/', (req, res) => {
    res.send('API is running successfully!')
})

// Start server
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})