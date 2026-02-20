// routes/readiness.routes.js

import express from 'express'
import { generate } from '../controllers/readiness.js'

const router = express.Router()

router.post('/generate', generate)

export default router