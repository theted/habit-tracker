import express = require('express')
import { Request, Response } from 'express';
import { getHabits, getHabit, createHabit, deleteHabit, addTrack } from './api'

const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()

app.use(cors())

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

const logger = (req, _, next) => {
  const timestamp = new Date().toISOString()
  const { method, url, ip } = req

  console.info(`${timestamp} ${ip} ${method} ${url}`)
  next()
}
app.use(logger)

app.listen(3000, () => {
  console.log('Server running on port 3000')
})

app.get('/', (req: Request, res: Response) => {
  res.send('hello from API v/1!')
})

app.get('/habits', async (req, res) => {
  const habits = await getHabits()
  res.json(habits)
})

app.get('/habits/:id', async (req, res) => {
  const habit = await getHabit(Number(req.params.id))
  res.json(habit)
})

app.delete('/habits/:id', async (req, res) => {
  const id = Number(req.params.id)
  const deletedHabit = await deleteHabit(id)
  res.json(deletedHabit)
})

app.post('/habits', async (req, res) => {
  const { title, userId } = req.body
  const habit = await createHabit(title, userId)
  res.json(habit)
})

app.post('/track', async (req, res) => {
  const { habitId } = req.body
  const trackEntry = await addTrack(habitId)
  res.json(trackEntry)
})
