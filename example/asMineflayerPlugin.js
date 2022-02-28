const mc = require('mineflayer')
const { mapDownloader } = require('../')
const path = require('path')

const bot = mc.createBot({
  host: 'localhost',
  username: 'archivebot',
  "mapDownloader-saveToFile": true, // default
  "mapDownloader-outputDir": path.join(__dirname, './maps')
})

bot.loadPlugin(mapDownloader) // important to load it before spawning to get all maps

bot.once('spawn', () => {
  console.info('Bot spawned!')
})

bot.on('kicked', reason => console.info('Kicked for', reason))
bot.on('error', console.error)
bot.on('end', () => console.info('Disconnected'))