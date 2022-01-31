const { mapToImage, supportedVersions } = require('./lib/util.js')
const { promises: fs } = require('fs')
const path = require('path')

/**
 * @typedef MapPacket
 * @property {number} itemDamage
 * @property {number} scale
 * @property {boolean} trackingPosition
 * @property {Array<unknown>} icons
 * @property {number} columns
 * @property {number?} rows
 * @property {number?} x
 * @property {number?} y
 * @property {Buffer?} data
 */

/**
 * @param {import('mineflayer').Bot} bot 
 */
function inject(bot, options = {}) {
  if (!supportedVersions.includes(bot.majorVersion)) {
    console.error('Map downloader: Version not supported')
    return
  }

  // Mojang fixed columns and rows having negative numbers for 1.17
  const fullColumnRow = require('minecraft-data')(bot.version).version['>']('1.16.5') ? 128 : -128

  bot.mapDownloader = {}
  bot.mapDownloader.maps = {}

  bot.mapDownloader.outputDir = options["mapDownloader-outputDir"] ?? path.join('.')
  bot.mapDownloader.saveToFile = options["mapDownloader-saveToFile"] ?? true

  bot._client.on('map', /** @param {MapPacket} data */ (data) => {
    const mapId = data.itemDamage
    if (!(mapId in bot.mapDownloader.maps) && data.data && data.columns === fullColumnRow && data.rows === fullColumnRow) {
      mapToImage(data.data, data.itemDamage, bot.majorVersion)
        .then((pngBuf) => {
          bot.mapDownloader.maps[mapId] = pngBuf
          if (!bot.mapDownloader.saveToFile) return
          fs.mkdir(bot.mapDownloader.outputDir, { recursive: true }).then(() => {
            fs.writeFile(path.join(bot.mapDownloader.outputDir, `map_${mapId.toString().padStart(6, '0')}.png`), pngBuf)
          })
        })
        .catch(console.error)
    }
  })
}

module.exports = {
  mapDownloader: inject,
  supportedVersions
}
