const { mapToImage, supportedVersions, stitch } = require('./lib/util.js')
const { promises: fs } = require('fs')
const path = require('path')
const EventEmitter = require('events')
const { default: Vec3Parser, Vec3 } = require('vec3')
const { iterators: { ManhattanIterator } } = require('prismarine-world')

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
 * @typedef DataMeta_entity_metadata
 * @property {number} key
 * @property {number} type
 * @property {any} value
 */

/**
 * @typedef Data_entity_metadata
 * @property {number} entityId
 * @property {Array<DataMeta_entity_metadata>} metadata
 */

/**
 * @typedef Data_spawn_entity
 * @property {number} entityId
 * @property {string} objectUUID
 * @property {number} type
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {number} pitch
 * @property {number} yaw
 * @property {number} objectData
 * @property {number} velocityX
 * @property {number} velocityY
 * @property {number} velocityZ
 */

/**
 * @param {import('mineflayer').Bot} bot
 */
function mineflayerPlugin (bot, options = {}) {
  if (!supportedVersions.includes(bot.majorVersion)) {
    console.error('Map downloader: Version not supported')
    return
  }

  const itemFrameId = require('minecraft-data')(bot.version).itemsByName.item_frame.id

  const outputDir = options['mapDownloader-outputDir'] ?? path.join('.')
  const saveToFile = options['mapDownloader-saveToFile'] ?? true
  const saveInternal = options['mapDownloader-saveInternal'] ?? true
  const filePrefix = options["mapDownloader-filePrefix"] ?? ''
  const fileSuffix = options["mapDownloader-fileSuffix"] ?? ''

  bot.mapDownloader = new MapSaver(bot.version, { outputDir, saveToFile, saveInternal, filePrefix, fileSuffix })

  bot._client.on('map', (data) => {
    bot.mapDownloader.onMapPacket(data)
  })

  bot._client.on('spawn_entity', (/** @type {Data_spawn_entity} */data) => {
    if (data.entityId !== itemFrameId) return
    bot.mapDownloader.onItemFrameSpawn(data)
  })

  bot._client.on('entity_metadata', (/** @type {Data_entity_metadata} */data) => {
    const entityId = data.entityId
    const itemFramePosAndDir = bot.mapDownloader.itemFrames.get(entityId)
    if (!itemFramePosAndDir) return
    const metadata = data.metadata
    /** @type { {blockId: number, itemCount: number, itemDamage: number} } */
    const item = metadata.find(({ key }) => key === 6) // May be version dependent
    if (!item) throw new Error('Could not parse item frame metadata', metadata)
    if (item.blockId !== itemFrameId) return
    bot.mapDownloader.mapsPosition.set(itemFramePosAndDir, item.itemDamage)
  })

  bot.mapDownloader.on('new_map', data => {
    bot.emit('new_map', data)
  })
}

class MapSaver extends EventEmitter {
  constructor (version, options = {}) {
    super()
    this.outputDir = options.outputDir ?? path.join('.')
    this.saveToFile = options.saveToFile ?? true
    this.saveInternal = options.saveInternal ?? true
    this.filePrefix = options.filePrefix ?? ''
    this.fileSuffix = options.fileSuffix ?? ''
    this.version = version
    this.maps = {}
    this.itemFrames = new Map()
    /** Map pos and dir to id map */
    this.mapsPosition = new Map()
    this._mapUpdateTimeout = null
    // Mojang fixed columns and rows having negative numbers for 1.17
    this.fullColumnRow = require('minecraft-data')(this.version).version['>']('1.16.5') ? 128 : -128
    this.majorVersion = require('minecraft-data')(this.version).version.majorVersion
  }

  /** @param {MapPacket} data */
  onMapPacket (data) {
    const mapId = data.itemDamage
    if (!(mapId in this.maps) && data.data && data.columns === this.fullColumnRow && data.rows === this.fullColumnRow) {
      mapToImage(data.data, data.itemDamage, this.majorVersion)
        .then((pngBuf) => {
          const mapName = `${this.filePrefix}map_${mapId.toString().padStart(6, '0')}${this.fileSuffix}.png`
          this.emit('new_map', {
            name: mapName,
            png: pngBuf,
            id: mapId,
          })
          if (this.saveInternal) this.maps[mapId] = pngBuf
          if (!this.saveToFile) return
          fs.mkdir(this.outputDir, { recursive: true }).then(() => {
            fs.writeFile(path.join(this.outputDir, mapName), pngBuf)
          })
        })
        .catch(console.error)
      return true
    }
    return false
  }

  /**
   * @param {Data_spawn_entity} data 
   */
  onItemFrameSpawn (data) {
    const pos = new Vec3(data.x, data.y, data.z)
    const direction = itemFramePacketYawToVector(data.yaw)
    this.itemFrames.set(data.entityId, `${pos.toString()};${direction.toString()}`)
    this._onMapsUpdate()
  }

  _onMapsUpdate() {
    clearTimeout(this._mapUpdateTimeout)
    this._mapUpdateTimeout = setTimeout(() => {
      this._stichMaps()
    }, 500)
  }

  _stichMaps () {
    const visited = new Set()
    const mapsIterator = this.mapsPosition.entries()
    let currentMap = mapsIterator.next()

    /**
     * @param {Vec3} pos
     * @param {Vec3} plane
     * @return { Array<{ pos: Vec3, dir: Vec3, id: number }> }
     */
    const expand = (pos, plane) => {
      const found = []
      let it
      switch (plane.toString()) {
        case '(1, 0, 0)':
        case '(-1, 0, 0)':
          it = new ManhattanIterator(pos.x, pos.y)
          break
        case '(0, 0, 1)':
        case '(0, 0, -1)':
          it = new ManhattanIterator(pos.z, pos.y)
      }
      while (true) {
        const next = it.next()
        if (!next) break
        const key = `${next.toString()};${plane.toString()}`
        const map = this.mapsPosition.get(key)
        if (!map) continue
        visited.add(key)
        found.push({
          pos: next,
          dir: plane,
          id: map,
        })
      }

      return found.sort((a, b) => a.pos.y - b.pos.y)
    }

    while (currentMap) {
      const [posAndDir, mapId] = currentMap
      if (visited.has(posAndDir)) continue
      const [pos, dir] = posAndDir.split(';').map(v => Vec3.fromString(v))
      const found = expand(pos, dir)
      if (found.length === 1) continue
      const mapsToStich = []
      for (const f of found) {
        const mapBuf = this.maps[f.id]
        if (!mapBuf) continue
        mapsToStich.push({
          pos: f.pos,
          buf: mapBuf,
        })
        stitch(mapsToStich, this.majorVersion)
      }
    }
  }
}

function itemFramePacketYawToVector(yaw) {
  if (yaw === -64) return new Vec3(1, 0, 0)
  else if (yaw === -128) return new Vec3(0, 0, -1)
  else if (yaw === 64) return new Vec3(-1, 0, 0)
  else if (yaw === 0) return new Vec3(0, 0, 1)
  throw new Error('Invalid yaw')
}

module.exports = {
  mapDownloader: mineflayerPlugin,
  MapSaver,
  supportedVersions
}
