/**
 * 
 * @param {string} hex hex
 * @returns {[string]}
 */
function hexToByte(hex) {
  debugger
  if (hex.charAt(0) == '#') {
    hex = hex.substr(1)
  }
  const a = parseInt(hex.slice(0, 2), 16)
  const r = parseInt(hex.slice(2, 4), 16)
  const g = parseInt(hex.slice(4, 6), 16)
  const b = parseInt(hex.slice(6, 8), 16)
  return [r, g, b, a]
}

module.exports = {
  hexToByte
}