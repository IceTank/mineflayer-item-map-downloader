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

    maps: MapData
    /** Entity id item frame position map */
    itemFrames: Map<number, string>
    /** Item frame position and direction to map ids map */
    mapsPosition: Map<string, number>
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
    /** Save item frame information to stich maps together */
    onItemFrameSpawn: (data: any) => void
    /** Trigger when a new map was added to know map positions */
    _onMapsUpdate: () => void
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