export type MapData = Record<number, Buffer>

declare module 'mineflayer-item-map-downloader' {
  export function mapDownloader(bot: Bot): void;

  export interface MapDownloader {
    maps: MapData
    saveToFile: boolean
    outputDir: string
  }
}

declare module 'mineflayer' {
  interface Bot {
    mapDownloader: MapDownloader
  }

  interface BotOptions {
    "mapDownloader-outputDir"?: string
    "mapDownloader-saveToFile"?: boolean
  }
}