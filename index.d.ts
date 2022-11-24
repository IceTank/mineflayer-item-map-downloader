import { EventEmitter } from "events";
import { Bot } from "mineflayer";

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
    version: string
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
    mapDownloader: MapDownloader
  }

  interface BotEvents {
    'new_map': (listener: newMapEventListener) => Promise<void> | void
  }

  interface BotOptions {
    "mapDownloader-outputDir"?: string
    "mapDownloader-saveToFile"?: boolean
    "mapDownloader-saveInternal"?: boolean
    "mapDownloader-filePrefix"?: string
    "mapDownloader-fileSuffix"?: string
  }
}