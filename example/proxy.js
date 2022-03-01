const mc = require('minecraft-protocol')
const { MapSaver } = require('mineflayer-item-map-downloader')
const path = require('path')

const states = mc.states

if (process.argv.length < 5) {
  console.log('Too few arguments!')
  console.info('Usage: node proxy.js host port username/email [isCracked: true]')
  process.exit(1)
}

const version = '1.18.1'
const chatWhenSaving = true

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

  const saver = new MapSaver(version, {
    outputDir: path.join(__dirname, './maps/.')
  })

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
  targetClient.on('map', (data) => {
    const newMap = saver.onMapPacket(data)
    if (!newMap || !chatWhenSaving) return
    client.write('chat', { message: JSON.stringify({text: `[MapSaver] Saving id ${data.itemDamage}`}) })
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
  // const bufferEqual = require('buffer-equal')
  // targetClient.on('raw', function (buffer, meta) {
  //   if (client.state !== states.PLAY || meta.state !== states.PLAY) { return }
  //   const packetData = targetClient.deserializer.parsePacketBuffer(buffer).data.params
  //   const packetBuff = client.serializer.createPacketBuffer({ name: meta.name, params: packetData })
  //   if (!bufferEqual(buffer, packetBuff)) {
  //     console.log('client<-server: Error in packet ' + meta.state + '.' + meta.name)
  //     console.log('received buffer', buffer.toString('hex'))
  //     console.log('produced buffer', packetBuff.toString('hex'))
  //     console.log('received length', buffer.length)
  //     console.log('produced length', packetBuff.length)
  //   }
  // })
  // client.on('raw', function (buffer, meta) {
  //   if (meta.state !== states.PLAY || targetClient.state !== states.PLAY) { return }
  //   const packetData = client.deserializer.parsePacketBuffer(buffer).data.params
  //   const packetBuff = targetClient.serializer.createPacketBuffer({ name: meta.name, params: packetData })
  //   if (!bufferEqual(buffer, packetBuff)) {
  //     console.log('client->server: Error in packet ' + meta.state + '.' + meta.name)
  //     console.log('received buffer', buffer.toString('hex'))
  //     console.log('produced buffer', packetBuff.toString('hex'))
  //     console.log('received length', buffer.length)
  //     console.log('produced length', packetBuff.length)
  //   }
  // })
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
