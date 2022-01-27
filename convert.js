const colorsRaw = require('./baseColorsraw.json')
const fs = require('fs')

const colors = {}

colorsRaw.forEach(c => {
  const id = Number(c.id.split(' ')[0])
  if (isNaN(id)) throw new Error('id NaN ' + JSON.stringify(c))
  let color
  if (c.color === 'Transparent') {
    color = '#00000000'
  } else {
    const arr = c.color.split(',')
    let newC = ''
    arr.forEach(a => {
      a = a.trim()
      a = Number(a)
      a = a.toString(16)
      a = a.length === 1 ? '0' + a : a
      newC = newC + a
    })
    color = '#ff' + newC
  }
  colors[id * 4] = color
})

fs.writeFileSync('./newBaseColors.json', JSON.stringify(colors, null, 2))