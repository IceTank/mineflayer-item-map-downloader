let colors = null
fetch('/colors').then(async data => {
  colors = await data.json()
}, (err) => console.error('Error fetching /colors', err))

function loadAllMaps() {
  fetch('/maps').then(async data => {
    debugger
    data = await data.json()
    console.info(data[0])
    const anchor = document.getElementById('maps-main')
    for (const map of data) {
      const mapData = map.data
      const mapId = map.id
      const ele = document.createElement('canvas')
      ele.width = 128
      ele.height = 128
      const canvasId = 'canvas' + mapId
      ele.id = canvasId
      anchor.appendChild(ele)
      console.info('Drawing', canvasId, mapData)
      drawMap(canvasId, mapData)
    }
    // drawMap('canvas1', data[0].data)
  }, (err) => console.error('Error fetching /maps', err))
}

function drawMap(canvasId, data) {
  const c = document.getElementById(canvasId)
  const canvasWidth = c.width;
  const canvasHeight = c.height;
  const ctx = c.getContext("2d");
  const canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
  console.info(ctx, data)

  function drawPixel (x, y) {
    const dataIndex = x + y * canvasWidth
    const index = dataIndex * 4
    const colorId = data[dataIndex]
    const v = colors[colorId].replace('#', '')
    canvasData.data[index + 0] = parseInt(v.slice(2, 4), 16)
    canvasData.data[index + 1] = parseInt(v.slice(4, 6), 16)
    canvasData.data[index + 2] = parseInt(v.slice(6, 8), 16)
    canvasData.data[index + 3] = parseInt(v.slice(0, 2), 16)
  }

  function updateCanvas() {
    ctx.putImageData(canvasData, 0, 0);
  }

  for (let x = 0; x < 128; x++) {
    for (let y = 0; y < 128; y++) {
      drawPixel(x, y)
    }
  }
  updateCanvas()
}