export type MapData = Record<number, Buffer>

interface MapSaverOptions {
  outputDir?: string
  saveToFile?: boolean
  saveInternal?: boolean
}

declare module 'mineflayer-item-map-downloader' {
  export function mapDownloader(bot: Bot): void;

  export interface MapDownloader {
    maps: MapData
    saveToFile: boolean
    outputDir: string
  }

  export class MapSaver {
    constructor(version: string, options?: MapSaverOptions)

    version: version
    outputDir: string
    saveToFile: boolean
    saveInternal: boolean

    onMapPacket: (data: any) => boolean
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