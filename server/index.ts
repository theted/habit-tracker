import path from 'node:path'
import { createApp } from './app.js'

// 3100 rather than 3000, which other projects' dev servers tend to hold
const port = Number(process.env.PORT ?? 3100)

createApp({ distDir: path.resolve('dist') }).listen(port, () => {
  console.log(`Server running on port ${port}`)
})
