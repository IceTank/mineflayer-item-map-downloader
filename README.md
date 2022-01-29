# Mineflayer map downloaded
Automatically downloads item maps when in render distance of an item frame with a map in it or if a map is in the bots inventory.


<img src="https://user-images.githubusercontent.com/61137113/151663467-1d665cac-2a45-4948-b218-3e146a7cbf95.png" height="300px" alt="In game image of the map">
<img src="https://user-images.githubusercontent.com/61137113/151663482-8ecb28c7-52f4-4e4b-87fd-717da4624b1e.png" height="300px" alt="Downloaded image of the map" style="image-rendering: pixelated;">

## Notice: some colors for pre 1.12 are wrong

## Installing
1. Make sure you have git installed

2. Install the plugin with npm
```bash
npm i --save git+https://github.com/IceTank/mineflayer-item-map-downloader.git
```
3. Load the plugin with the mineflayer plugin API
```javascript
const { mapDownloader } = require('mineflayer-item-map-downloader')

bot.loadPlugin(mapDownloader) // load it before spawning to get all maps
```

## Examples
Look at the `examples` folder for out of the box examples.

## Options
This plugin extends the `BotOptions` type from mineflayer. Add them to the createBot options when creating the bot. You can also change them later by changing the `bot.mapDownloader` properties.

#### Example for an option
```javascript
const bot = mineflayer.createBot({
  "mapDownloader-outputDir": "some/output/dir"
})
```

### "mapDownloader-outputDir"
  - Sets an output directory where maps should be saved. Maps are saved in the format `map_<map id>.png` where the map id has leading zeros.

### "mapDownloader-saveToFile"
  - If maps should be saved to file. If false maps are ownly stored internally. Usefull if you only want to look at maps with the web viewer. Default is `true`
