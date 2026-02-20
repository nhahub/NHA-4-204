import express from 'express'
import { sync } from '../controllers/github.js'

const router = express.Router()

router.post('/sync', sync)

export default router