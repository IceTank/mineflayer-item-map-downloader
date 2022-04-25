const sharp = require('sharp')
const { Vec3 } = require('vec3')
const versionMap = {
  1.8: '1.8',
  1.9: '1.8',
  '1.10': '1.8',
  1.11: '1.8',
  1.12: '1.12',
  1.13: '1.12',
  1.14: '1.12',
  1.15: '1.12',
  1.16: '1.16',
  1.17: '1.16',
  1.18: '1.16'
}
const supportedVersions = Object.keys(versionMap)

/**
 * @param {string} hex hex
 * @returns {[string]}
 */
function hexToByte (hex) {
  if (hex.charAt(0) === '#') {
    hex = hex.substr(1)
  }
  const a = parseInt(hex.slice(0, 2), 16)
  const r = parseInt(hex.slice(2, 4), 16)
  const g = parseInt(hex.slice(4, 6), 16)
  const b = parseInt(hex.slice(6, 8), 16)
  return [r, g, b, a]
}

/**
 * @param {Array<{ pos: Vec3, buf: Buffer }>} mapsArray 
 * @param {number} width 
 * @param {number} height 
 * @param {string} version 
 */
async function stitch(mapsArray, width, height, version) {
  if (!supportedVersions.includes(version)) throw new Error('Version not supported. Use one of these versions ' + supportedVersions.join(', '))
  const colorVersion = versionMap[version]
  const colorMap = require(`../data/${colorVersion}/colors.json`)

  const buf = new Buffer.from(width * 128 * 128 * height * 4)

}

class FloodFileIterator {
  /**
   * @param {Vec3} start 
   * @param { (pos: Vec3) => boolean } testFunction
   * @param {Vec3} maxDistance 
   */
  constructor(start, testFunction, maxDistance) {
    /** @type {Vec3} */
    this.start = start
    /** @type {number} */
    this.maxDistance = maxDistance
    /** @type {Vec3} */
    this.current = start.clone()
    this.visited = new Set()
    /** @type {Array<Vec3>} */
    this.queue = [this.current.clone()]
    /** @type { (pos: Vec3) => boolean } */
    this.testFunction = testFunction
  }

  /**
   * @returns {Vec3}
   */
  next() {
    if (this.queue.length === 0) return null
    const n = this.queue.shift()
    this._expand(this.current)
    return n
  }

  /**
   * @param {Vec3} pos 
   */
  _expand(pos) {
    for (const dp of [new Vec3(1, 0, 0), new Vec3(0, 0, 1), new Vec3(-1, 0, 0), new Vec3(0, 0, -1)]) {
      const p = pos.plus(dp)
      if (p.manhattanDistanceTo(this.start) > this.maxDistance) continue
      if (this.visited.has(p.toString())) continue
      if (!this.testFunction(p)) continue
      this.visited.add(p.toString())
      this.queue.push(p)
    }
  }
}

async function mapToImage (data, mapId, version) {
  if (!supportedVersions.includes(version)) throw new Error('Version not supported. Use one of these versions ' + supportedVersions.join(', '))
  const colorVersion = versionMap[version]
  const colorMap = require(`../data/${colorVersion}/colors.json`)

  const buf = new Buffer.from(data)
  if (isNaN(Number(mapId))) throw new Error('Invalid map id')

  const imgBuf = new Uint8ClampedArray(128 * 128 * 4)
  for (let index = 0; index < imgBuf.byteLength; index += 4) {
    const colorArr = hexToByte(colorMap[buf[index / 4]])
    for (let k = 0; k < 4; k++) {
      imgBuf[index + k] = colorArr[k]
    }
  }

  return await sharp(imgBuf, {
    raw: {
      width: 128,
      height: 128,
      channels: 4
    }
  })
    .png()
    .toBuffer()
}

module.exports = {
  hexToByte,
  mapToImage,
  supportedVersions,
  stitch,
  FloodFileIterator
}
