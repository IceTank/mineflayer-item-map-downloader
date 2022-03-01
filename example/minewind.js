const mc = require('minecraft-protocol')
const { MapSaver } = require('mineflayer-item-map-downloader')
const path = require('path')
const { EventEmitter } = require('events')
const { NIL: NilUUID } = require('uuid')

const states = mc.states

if (process.argv.length < 5) {
  console.log('Too few arguments!')
  console.info('Usage: node proxy.js host port username/email [isCracked: true]')
  process.exit(1)
}

const version = '1.18.1'
const chatWhenSaving = true
const outputDir = path.join(__dirname, './maps/.')

const server = mc.createServer({
  'online-mode': false,
  port: 25566,
  keepAlive: false,
  version: version
})
server.on('listening', () => {
  console.info('Proxy ready running on localhost:' + process.argv[3])
})
server.on('login', function (client) {
  const addr = client.socket.remoteAddress
  console.log('Incoming connection', '(' + addr + ')')
  let endedClient = false
  let endedTargetClient = false

  const ChatMessage = require('prismarine-chat')(version)

  const saver = new MapSaver(version)
  const serverListener = new DataEmitter()

  client.on('end', function () {
    endedClient = true
    console.log('Connection closed by client', '(' + addr + ')')
    if (!endedTargetClient) { targetClient.end('End') }
  })
  client.on('error', function (err) {
    endedClient = true
    console.log('Connection error by client', '(' + addr + ')')
    console.log(err.stack)
    if (!endedTargetClient) { targetClient.end('Error') }
  })
  const targetClient = mc.createClient({
    host: process.argv[2],
    port: process.argv[3],
    username: process.argv[4],
    password: undefined,
    skipValidation: process.argv[5] === 'true',
    auth: 'microsoft',
    keepAlive: false,
    profilesFolder: path.join(__dirname, 'auth-cache'),
    version: version
  })
  client.on('packet', function (data, meta) {
    if (targetClient.state === states.PLAY && meta.state === states.PLAY) {
      if (!endedTargetClient) { targetClient.write(meta.name, data) }
    }
  })
  targetClient.on('packet', function (data, meta) {
    if (meta.state === states.PLAY && client.state === states.PLAY) {
      if (!endedClient) {
        client.write(meta.name, data)
        if (meta.name === 'set_compression') {
          client.compressionThreshold = data.threshold
        } // Set compression
      }
    }
  })
  targetClient.on('map', async (data) => {
    await serverListener.getData()
    const newMap = saver.onMapPacket(data)
    if (!newMap || !chatWhenSaving) return
    const msg = new ChatMessage.MessageBuilder().setText(`[MapSaver] Saving id ${data.itemDamage}`).toString()
    client.write('chat', { 
      message: msg, 
      sender: NilUUID, position: 2
    })
  })
  targetClient.on('chat', (data) => {
    let msg
    try {
      msg = new ChatMessage(data.message)
    } catch (err) {
      console.info('Chat parsing failed') 
      return
    }
    const str = msg.toString()
    const match = str.match(/Sending to server (\w+)/)
    if (match && match[1]) {
      console.info('Detected server:', match[1])
      saver.outputDir = path.join(outputDir, match[1])
      serverListener.setData(match[1])
    }
  })
  targetClient.on('login', () => {
    serverListener.unsetData()
  })
  const bufferEqual = require('buffer-equal')
  targetClient.on('raw', function (buffer, meta) {
    if (client.state !== states.PLAY || meta.state !== states.PLAY) { return }
    const packetData = targetClient.deserializer.parsePacketBuffer(buffer).data.params
    const packetBuff = client.serializer.createPacketBuffer({ name: meta.name, params: packetData })
    if (!bufferEqual(buffer, packetBuff)) {
      // console.log('client<-server: Error in packet ' + meta.state + '.' + meta.name)
      // console.log('received buffer', buffer.toString('hex'))
      // console.log('produced buffer', packetBuff.toString('hex'))
      // console.log('received length', buffer.length)
      // console.log('produced length', packetBuff.length)
    }
  })
  client.on('raw', function (buffer, meta) {
    if (meta.state !== states.PLAY || targetClient.state !== states.PLAY) { return }
    const packetData = client.deserializer.parsePacketBuffer(buffer).data.params
    const packetBuff = targetClient.serializer.createPacketBuffer({ name: meta.name, params: packetData })
    if (!bufferEqual(buffer, packetBuff)) {
      // console.log('client->server: Error in packet ' + meta.state + '.' + meta.name)
      // console.log('received buffer', buffer.toString('hex'))
      // console.log('produced buffer', packetBuff.toString('hex'))
      // console.log('received length', buffer.length)
      // console.log('produced length', packetBuff.length)
    }
  })
  targetClient.on('end', function () {
    endedTargetClient = true
    console.log('Connection closed by server', '(' + addr + ')')
    if (!endedClient) { client.end('End') }
  })
  targetClient.on('error', function (err) {
    endedTargetClient = true
    console.log('Connection error by server', '(' + addr + ') ', err)
    console.log(err.stack)
    if (!endedClient) { client.end('Error') }
  })
})

/**
 * Util class to wait for a specific event to trigger. Can be used to await an event that has to be
 * awaited and is either in the future or has already happened in the past.
 * Supports n amount of functions awaiting and does not rely on build in event listeners.
 */
class EventTrigger extends EventEmitter {
  constructor() { 
    super()
    this._toTrigger = []
    this.didTrigger = false
    this.outstandingListeners = false
  }

  trigger(arg) {
    this.didTrigger = true
    this.emit('trigger', arg)
  }

  waitNextTrigger() {
    if (this._toTrigger.length === 0 && !this.outstandingListeners) {
      // If waitNextTrigger is called in the same event loop cycle then the _toTrigger
      // Array length will be the same for all as the promise execution part has not been
      // executed yet. So add a synchronized parameter to to make sure only on once is registered.
      this.outstandingListeners = true
      return new Promise(resolve => {
        this.once('trigger', () => {
          this.outstandingListeners = false
          resolve()
          const toTrigger = [...this._toTrigger]
          this._toTrigger = []
          toTrigger.forEach((p) => {
            p()
          })
        })
      })
    } else {
      return new Promise((resolve) => {
        this._toTrigger.push(resolve)
      })
    }
  }

  async waitTriggered() {
    if (this.didTrigger) return
    await this.waitNextTrigger()
  }
}

/** 
 * Stores data. Initiates with no data. Data can be set with setName. getName returns a
 * resolved promise with the stored data or if no data has been set yet a outstanding
 * promise that is resolved once setData is used to set data
 */
class DataEmitter extends EventEmitter {
  constructor() {
    super()
    this.hasData = false
    this.data = null
    this.trigger = new EventTrigger()
  }

  setData(data) {
    this.data = data
    if (!this.hasData) {
      this.trigger.trigger()
    }
  }

  unsetData() {
    if (!this.data) console.info('DataEmitter: Warning data unset before data was set')
    this.data = null
    this.hasData = false
    this.trigger = new EventTrigger()
  }

  async getData() {
    if (this.hasData) return this.data
      await this.trigger.waitTriggered()
    return this.data
  }
}