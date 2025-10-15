interface FetchConfiguration {
  /**
   * @default 'throw-error'
   */
  handleUnmockedRequests: 'pass-through' | 'return-404' | 'throw-error'

  /**
   * @default false
   */
  replaceMockedFetches: boolean

  /**
   * @default 0
   */
  responseDelay: number

  /**
   * @default true
   */
  autoReplaceFetch: boolean

  /**
   * @default true
   */
  logging: boolean
}

export function getFetchConfiguration(): FetchConfiguration

export function setFetchConfiguration(options: FetchConfiguration): void

interface SimpleResponse {
  /**
   * @default 200
   */
  status?: number

  headers?: Record<string, string>

  body?: string | object | ArrayBuffer | Blob | DataView | File | FormData |
    URLSearchParams | ReadableStream | Int8Array | Uint8Array | Uint8ClampedArray |
    Int16Array | Uint16Array | Int32Array | Uint32Array | /* Float16Array | */
    Float32Array | Float64Array /* | BigInt64Array | BigUint64Array */
}

interface FetchIdentifier {
  url: string | RegExp

  /**
   * @default 'GET'
   */
  method?: string
}

interface FetchHandler extends FetchIdentifier {
  response: SimpleResponse | Response | ((request: Request) => Promise<SimpleResponse | Response>)
}

export function includesMockedFetch(identifier: FetchIdentifier): boolean

export function willMockFetch(identifier: FetchIdentifier): boolean

export function mockFetch(handler: FetchHandler): FetchHandler

export function unmockFetch(identifier: FetchIdentifier): boolean

export function unmockAllFetches(): boolean

export function isFetchReplaced(): boolean

export function replaceFetch(): boolean

export function restoreFetch(): boolean
