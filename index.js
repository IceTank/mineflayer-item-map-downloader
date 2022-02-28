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
function mineflayerPlugin(bot, options = {}) {
  if (!supportedVersions.includes(bot.majorVersion)) {
    console.error('Map downloader: Version not supported')
    return
  }

  const outputDir = options["mapDownloader-outputDir"] ?? path.join('.')
  const saveToFile = options["mapDownloader-saveToFile"] ?? true
  const saveInternal = options["mapDownloader-saveInternal"] ?? true

  bot.mapDownloader = new MapSaver(bot.version, { outputDir, saveToFile, saveInternal })

  bot._client.on('map', (data) => {
    bot.mapDownloader.onMapPacket(data)
  })
}

class MapSaver {
  constructor(version, options = {}) {
    this.outputDir = options.outputDir ?? path.join('.')
    this.saveToFile = options.saveToFile ?? true
    this.saveInternal = options.saveInternal ?? true
    this.version = version
    this.maps = {}
    // Mojang fixed columns and rows having negative numbers for 1.17
    this.fullColumnRow = require('minecraft-data')(this.version).version['>']('1.16.5') ? 128 : -128
    this.majorVersion = require('minecraft-data')(this.version).version.majorVersion
  }

  /** @param {MapPacket} data */
  onMapPacket(data) {
    const mapId = data.itemDamage
    if (!(mapId in this.maps) && data.data && data.columns === this.fullColumnRow && data.rows === this.fullColumnRow) {
      mapToImage(data.data, data.itemDamage, this.majorVersion)
        .then((pngBuf) => {
          if (this.saveInternal) this.maps[mapId] = pngBuf
          if (!this.saveToFile) return
          fs.mkdir(this.outputDir, { recursive: true }).then(() => {
            fs.writeFile(path.join(this.outputDir, `map_${mapId.toString().padStart(6, '0')}.png`), pngBuf)
          })
        })
        .catch(console.error)
    }
  }
}

module.exports = {
  mapDownloader: mineflayerPlugin,
  MapSaver,
  supportedVersions
}
