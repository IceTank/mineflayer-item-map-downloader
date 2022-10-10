import { EventEmitter } from "events";

export type MapData = Record<number, Buffer>

interface MapSaverOptions {
  outputDir?: string
  saveToFile?: boolean
  saveInternal?: boolean
  filePrefix?: string
  fileSuffix?: string
}

type newMapEventListener = (name: string, png: Buffer, id: number ) => void

declare module 'mineflayer-item-map-downloader' {
  export function mapDownloader(bot: Bot): void;

  export interface MapDownloader extends EventEmitter {
    on(event: 'new_map', listener: newMapEventListener): this

    activate(): void
    deactivate(): void

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
    filePrefix: string
    fileSuffix: string

    onMapPacket: (data: any) => boolean
  }
}

declare module 'mineflayer' {
  interface Bot {
    on(event: 'new_map', listener: newMapEventListener): this
    mapDownloader: MapDownloader
  }

  interface BotOptions {
    "mapDownloader-outputDir"?: string
    "mapDownloader-saveToFile"?: boolean
    "mapDownloader-saveInternal"?: boolean
    "mapDownloader-filePrefix"?: string
    "mapDownloader-fileSuffix"?: string
  }
}