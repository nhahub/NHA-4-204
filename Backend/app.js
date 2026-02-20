import express from 'express'
import readinessRoutes from './routes/readiness.js'

const app = express()

// REQUIRED to parse JSON body
app.use(express.json())

// Register routes
app.use('/readiness', readinessRoutes)

// Health check
app.get('/', (req, res) => {
    res.send('API is running successfully!')
})

// Start server
const PORT = 3000

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})