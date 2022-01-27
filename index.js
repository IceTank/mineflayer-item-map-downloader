const mc = require('mineflayer')
const colors = require('./colors.json')
const express = require('express')
const app = express()

const bot = mc.createBot({
  host: 'localhost',
  username: 'archivebot',
  port: 59898
})

const readline = require('readline')

/** @type {Record<number, Buffer>} */
const mapsData = {}

app.use(express.static('./public'))

app.get('/maps', (req, res) => {
  console.info('/maps')

  const bufToString = (buffer) => {
    return [...new Uint8Array(buffer)]
  }
  const entires = Object.entries(mapsData)
  const newData = []
  entires.forEach(e => {
    newData.push({
      id: e[0],
      data: bufToString(e[1])
    })
  })
  res.json(newData)
})

app.get('/colors', (req, res) => {
  console.info('/colors')
  res.json(colors)
})

const serverInstance = app.listen(8080, () => {
  console.info('Listening on port 8080 http://localhost:8080')
})

bot._client.on('packet', (data, meta) => {
  // if (ignore.includes(meta.name)) return
  if (meta.name === 'map') {
    if (!(data.itemDamage in mapsData)) {
      mapsData[data.itemDamage] = new Buffer.from(data.data)
    }
  }
})

bot.once('spawn', () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.on('SIGINT', () => {
    bot.end()
    rl.close()
    serverInstance.close()
  })
  console.info('Spawned')

  bot.on('end', () => {
    rl.close()
    serverInstance.close()
  })
})

bot.on('kicked', reason => console.info('Kicked for', reason))
bot.on('error', console.error)
bot.on('end', () => console.info('Disconnected'))