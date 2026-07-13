import 'dotenv/config'
import { createServer } from 'http'
import { Server as IOServer } from 'socket.io'
import app from './app.js'

const PORT = process.env.PORT || 3000

const httpServer = createServer(app)
const io = new IOServer(httpServer, { cors: { origin: '*' } })

// expose io instance via express app so controllers can emit events
app.set('io', io)

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id)
  socket.on('disconnect', () => console.log('Socket disconnected', socket.id))
})

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`API + Socket.IO running on port ${PORT}`)
})
