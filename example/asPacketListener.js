const mp = require('minecraft-protocol')
const { MapSaver } = require('mineflayer-item-map-downloader')
const path = require('path')

const client = mp.createClient({
  host: 'localhost',
  username: 'archivebot'
})

client.once('login', () => {
  console.info('Client login')

  const mapSaver = new MapSaver(client.version, {
    outputDir: path.join(__dirname, './maps'), // Default is the root directory
    saveInternal: true, // Default
    saveToFile: true // Default
  })

  client.on('map', (data) => {
    mapSaver.onMapPacket(data)
  })
})

client.on('kicked', reason => console.info('Kicked for', reason))
client.on('error', console.error)
client.on('end', () => console.info('Disconnected'))
