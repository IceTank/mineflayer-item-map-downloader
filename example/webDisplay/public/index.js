function loadAllMaps () {
  fetch('/maps').then(async data => {
    data = await data.json()
    console.info(data[0])
    const anchor = document.getElementById('maps-main')
    for (const map of data) {
      const mapData = map.data
      const mapId = map.id
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const canvasId = 'canvas' + mapId
      canvas.id = canvasId
      anchor.appendChild(canvas)
      const image = new Image(128, 128)
      image.src = 'data:image/png;base64,' + mapData
      image.onload = () => {
        console.info('Drawing', canvasId, mapData)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0)
      }
    }
  }, (err) => console.error('Error fetching /maps', err))
}
