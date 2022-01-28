const mc = require('mineflayer')
const colors = require('./colors.json')
const express = require('express')
const app = express()
const sharp = require('sharp')
const { hexToByte } = require('./lib/util.js')
const { promises: fs } = require('fs')

const bot = mc.createBot({
  host: 'localhost',
  username: 'archivebot'
})

const readline = require('readline')

/** @type {Record<number, Buffer>} */
const mapsData = {}
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

const serverInstance = app.listen(8080, () => {
  console.info('Listening on port 8080 http://localhost:8080')
})

bot._client.on('packet', (data, meta) => {
  if (meta.name === 'map') {
    if (!(data.itemDamage in mapsData)) {
      mapsData[data.itemDamage] = new Buffer.from(data.data)
      writeMap(data.data, data.itemDamage)
    }
  }
})

async function writeMap(data, mapId) {
  const buf = new Buffer.from(data)
  if (isNaN(Number(mapId))) throw new Error('Invalid map id')

  const imgBuf = new Uint8ClampedArray(128 * 128 * 4)
  for (let index = 0; index < imgBuf.byteLength; index += 4) {
    const colorArr = hexToByte(colors[buf[index / 4]])
    for (let k = 0; k < 4; k++) {
      imgBuf[index + k] = colorArr[k]
    }
  }

  await fs.mkdir('./images', { recursive: true })
  const png = await sharp(imgBuf, {
    raw: {
      width: 128,
      height: 128,
      channels: 4
    }
  })
    .png()
    .toBuffer()
  
  maps[mapId] = png
  fs.writeFile(`./images/map_${mapId.toString().padStart(6, '0')}.png`, png)
}

bot.once('spawn', () => {
  console.info('Spawned')
})

bot.on('kicked', reason => console.info('Kicked for', reason))
bot.on('error', console.error)
bot.on('end', () => console.info('Disconnected'))