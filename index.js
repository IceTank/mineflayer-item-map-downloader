const mc = require('mineflayer')
const express = require('express')
const app = express()
const { mapToImage, supportedVersions } = require('./lib/util.js')
const { promises: fs } = require('fs')

const bot = mc.createBot({
  host: 'localhost',
  username: 'archivebot'
})

/** @type {Record<number, Buffer>} */
const maps = {}

app.use(express.static('./public'))

app.get('/maps', (req, res) => {
  const entires = Object.entries(maps)
  res.json(entires.map(e => {
    return {
      id: e[0],
      data: e[1].toString('base64')
    }
  }))
})

app.listen(8080, () => {
  console.info('Listening on port 8080 http://localhost:8080')
})

bot._client.on('packet', (data, meta) => {
  if (meta.name === 'map') {
    const mapId = data.itemDamage
    if (!(mapId in maps)) {
      mapToImage(data.data, data.itemDamage, bot.majorVersion)
        .then((pngBuf) => {
          maps[mapId] = pngBuf
          fs.mkdir('./images', { recursive: true }).then(() => {
            fs.writeFile(`./images/map_${mapId.toString().padStart(6, '0')}.png`, pngBuf)
          })
        })
        .catch(console.error)
    }
  }
})

bot.once('spawn', () => {
  console.info('Spawned Version ' + bot.majorVersion)
  if (!supportedVersions.includes(bot.majorVersion)) {
    console.error('Version not supported use one of the following versions: ' + supportedVersions.join(','))
    bot.end()
  }
})

bot.on('kicked', reason => console.info('Kicked for', reason))
bot.on('error', console.error)
bot.on('end', () => console.info('Disconnected'))