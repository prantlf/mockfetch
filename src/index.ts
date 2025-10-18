import type { URLPattern, URLPatternResult } from './types/url-pattern'

const originalFetch = globalThis.fetch

/**
 * `fetch` configuration
 */
export interface FetchConfiguration {
  /**
   * change to `'pass-through'` to call the original `fetch` function, or to `'return-404'` to respond with the status 404, instead of throwing an error, if there's no matching `fetch` handler registered
   * @default 'throw-error'
   */
  handleUnmockedRequests: 'pass-through' | 'return-404' | 'throw-error'

  /**
   * a time duration to delay the mocked requests by default (in milliseconds)
   * @default 0
   */
  responseDelay: number

  /**
   * set to `false` to disable logging of succeeded and failed requests on the console
   * @default true
   */
  logging: boolean
}

const configuration: FetchConfiguration = {
  handleUnmockedRequests: 'throw-error',
  responseDelay: 0,
  logging: true
}

/**
 * get a copy of the current `fetch` configuration
 */
export function getFetchConfiguration(): FetchConfiguration {
  return { ...configuration }
}

/**
 * set one or more `fetch` configuration parameters
 */
export function setFetchConfiguration(options: FetchConfiguration) {
  const { handleUnmockedRequests, responseDelay, logging } = options
  if (handleUnmockedRequests) {
    const unmockedRequestHandling = ['pass-through', 'return-404', 'throw-error']
    if (!unmockedRequestHandling.includes(handleUnmockedRequests)) {
      throw Error(`Invalid handleUnmockedRequests: ${handleUnmockedRequests}`)
    }
    configuration.handleUnmockedRequests = handleUnmockedRequests
  }
  if (responseDelay >= 0) {
    configuration.responseDelay = responseDelay
  }
  if (typeof logging === 'boolean') {
    configuration.logging = logging
  }
}

/**
 * object literal to specify the response content in a simplified way
 */
export interface SimpleResponse {
  /**
   * a HTTP status code for the response
   * @default 200
   */
  status?: number

  /**
   * a Headers object, an object literal, or an array of two-item arrays to set request headers
   */
  headers?: Headers | Record<string, string> | [string, string][]

  /**
   * a response body, either an object or a value accepted hy the [`Response`] constructor
   */
  body?: BodyInit | object
}

/**
 * specifies how to match a mocked `fetch` call
 */
export interface FetchSpecification {
  /**
   * a string convertible to `URLPattern` or a `URL` or `URLPattern` instance to match the input URL
   */
  url: string | URL | URLPattern

  /**
   * a HTTP method to match the input method (case-insensitively)
   * @default 'GET'
   */
  method?: string
}

const patternSymbol = Symbol('pattern')

/**
 * additional parameters for the response callback of a mocked `fetch` handler
 */
export interface ResponseCallbackOptions {
  /**
   * a result of the `URLPattern` execution on the input URL
   */
  match: URLPatternResult

  /**
   * a `URL` instance created from the input URL
   */
  url: URL

  /**
   * an object describing the response, or an instance of `Response`
   */
  query: URLSearchParams
}

export type ResponseCallback = (request: Request, options: ResponseCallbackOptions) => Promise<SimpleResponse | Response>

/**
 * provides specification for matching a mocked `fetch` call and the way how to handle its response
 */
export interface FetchHandler extends FetchSpecification {
  /**
   * override the default time duration to delay the mocked request (in milliseconds)
   */
  responseDelay?: number

  /**
   * an object describing the response, or an instance of [`Response`], or a method (synchronous or asynchronous) returning a [`Response`]
   */
  response: SimpleResponse | Response | ResponseCallback

  /**
   * @private
   */
  [patternSymbol]?: URLPattern
}

const fetchHandlers: FetchHandler[] = []

function normalizeMethod(method?: string): string {
  return method ? method.toUpperCase() : 'GET'
}

function normalizeSpecification(specification: FetchSpecification): FetchSpecification {
  const { url, method } = specification
  if (!url) throw Error('Mocked fetch is missing "url"')
  if (url instanceof URL) {
    specification.url = url.href
  }
  specification.method = normalizeMethod(method)
  return specification
}

function normalizeHandler(handler: FetchHandler): void {
  const { url, response } = normalizeSpecification(handler) as FetchHandler
  if (!response) throw Error('Mocked fetch is missing "response"')
  // @ts-expect-error
  handler[patternSymbol] = url instanceof URLPattern
    ? url
    // @ts-expect-error
    : new URLPattern(url)
}

function findFetchHandler(url: string | URLPattern, method: string): number {
  for (let i = 0, l = fetchHandlers.length; i < l; ++i) {
    const handler = fetchHandlers[i]
    if (handler.url === url && handler.method === method) return i
  }
  return -1
}

/**
 * checks if a mocked `fetch` call matching the given specification has been already registered
 */
export function includesMockedFetch(specification: FetchSpecification): boolean {
  const { url, method } = normalizeSpecification(specification)
  const index = findFetchHandler(url as string | URLPattern, method as string)
  return index >= 0
}

/**
 * registers a mock for a `fetch` call
 */
export function mockFetch(handler: FetchHandler): FetchHandler {
  normalizeHandler(handler)
  fetchHandlers.push(handler)
  replaceFetch()
  return handler
}

/**
 * unregisters a mock for a `fetch` call
 */
export function unmockFetch(specification: FetchSpecification): void {
  const { url, method } = normalizeSpecification(specification)
  const index = findFetchHandler(url as string | URLPattern, method as string)
  if (index >= 0) {
    fetchHandlers.splice(index, 1)
    if (fetchHandlers.length === 0) {
      restoreFetch()
    }
  }
}

/**
 * unregisters all `fetch` call mocks
 */
export function unmockAllFetches(): void {
  const { length } = fetchHandlers
  fetchHandlers.splice(0, length)
  restoreFetch()
}

function matchFetchHandler(url: string, method: string): { handler?: FetchHandler, match?: URLPatternResult } {
  for (const handler of fetchHandlers) {
    if (handler.method !== method) continue
    const match = (handler[patternSymbol] as URLPattern).exec(url)
    if (match) {
      return { handler, match }
    }
  }
  return {}
}

function normalizeRequestURL(url: RequestInfo | URL): { request: Request | undefined, url: string } {
  let request: Request | undefined
  if (url instanceof Request) {
    request = url
    url = request.url
  } else if (url instanceof URL) {
    url = url.href
  }
  return { request, url }
}

function normalizeRequestOptions(requestOptions?: RequestInit): RequestInit {
  let method = requestOptions?.method
  method = normalizeMethod(method)
  return { ...requestOptions, method }
}

/**
 * checks if a `fetch` call with the provided parameters will be mocked
 */
export function willMockFetch(urlOrRequest: RequestInfo | URL, requestOptions?: RequestInit): boolean {
  const { url } = normalizeRequestURL(urlOrRequest)
  requestOptions = normalizeRequestOptions(requestOptions)
  const { method } = requestOptions

  const { handler } = matchFetchHandler(url, method as string)
  return !!handler
}

function canConstructResponseWith(body?: BodyInit | object): boolean {
  if (body == null || typeof body === 'string') return true
  const supportedBodyTypes = [
    ArrayBuffer, Blob, DataView, File, FormData, URLSearchParams,
    Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
    Int32Array, Uint32Array, /* Float16Array, */ Float32Array, Float64Array,
    BigInt64Array, BigUint64Array, ReadableStream
  ]
  for (const type of supportedBodyTypes) {
    if (body instanceof type) return true
  }
  return false
}

function waitForDelay(timeDuration: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeDuration))
}

function optionallyAddJSONContentType(responseOptions: ResponseInit) {
  const { headers } = responseOptions
  if (!headers) {
    responseOptions.headers = { 'Content-Type': 'application/json' }
  } else if (headers instanceof Headers) {
    if (headers.get('Content-Type') == null) {
      headers.set('Content-Type', 'application/json')
    }
  } else if (Array.isArray(headers)) {
    let hasContentType = false
    for (const [name] of headers) {
      if (name.toLowerCase() === 'content-type') {
        hasContentType = true
        break
      }
    }
    if (!hasContentType) {
      headers.push(['Content-Type', 'application/json'])
    }
  } else {
    let hasContentType = false
    for (const name in headers) {
      if (name.toLowerCase() === 'content-type') {
        hasContentType = true
        break
      }
    }
    if (!hasContentType) {
      headers['Content-Type'] = 'application/json'
    }
  }
}

async function mockedFetch(urlOrRequest: RequestInfo | URL, requestOptions?: RequestInit): Promise<Response> {
  const start = performance.now()
  let { request, url } = normalizeRequestURL(urlOrRequest)
  requestOptions = normalizeRequestOptions(requestOptions)
  const { method } = requestOptions

  const { handler, match } = matchFetchHandler(url, method as string)
  let response: Response | SimpleResponse | ResponseCallback
  if (!handler) {
    switch (configuration.handleUnmockedRequests) {
      case 'pass-through':
        return originalFetch(urlOrRequest, requestOptions)
      case 'throw-error':
        ensureRequest()
        logError(new Error('Fetch not mocked'))
        throw new Error(`Fetch not mocked: ${method} ${url}`)
      case 'return-404':
        response = new Response(null, { status: 404 })
        ensureRequest()
        logResponse()
        return response
    }
  }

  await waitForDelay(handler.responseDelay ?? configuration.responseDelay)

  ensureRequest()
  let logInput: string | object | undefined
  if (configuration.logging) {
    const contentType = (request as Request).headers.get('Content-Type')
    if (contentType) {
      if (contentType.startsWith('text/')) {
        logInput = await (request as Request).text()
        request = new Request(request as Request, { body: logInput })
      } else if (contentType.startsWith('application/json')) {
        const text = await (request as Request).text()
        logInput = JSON.parse(text)
        request = new Request(request as Request, { body: text })
      }
    }
  }

  ({ response } = handler)
  let logOutput: string | object | undefined
  try {
    if (typeof response === 'function') {
      const urlObject = urlOrRequest instanceof URL
        ? urlOrRequest
        : new URL(url)
      const matchOptions = {
        match: match as URLPatternResult,
        url: urlObject,
        query: new URLSearchParams(urlObject.search)
      }
      response = await response(request as Request, matchOptions)
    }
    if (response instanceof Response) {
      logResponse()
      return response
    }
    let { body, ...responseOptions } = response
    if (!canConstructResponseWith(body)) {
      logOutput = body
      body = JSON.stringify(body)
      optionallyAddJSONContentType(responseOptions)
    } else if (typeof body === 'string') {
      logOutput = body
    }
    response = new Response(body as BodyInit, responseOptions)
    logResponse()
    return response
  } catch (error: unknown) {
    logError(error as Error)
    throw error
  }

  function ensureRequest(): void {
    if (!request) {
      request = new Request(url, requestOptions)
    }
  }

  function getDuration(): string {
    const duration = performance.now() - start
    return roundDuration(duration / 1000, '') ??
      roundDuration(duration, 'm') ??
      roundDuration(duration * 1000, 'µ') as string

    function roundDuration(value: number, prefix: string): string | undefined {
      value = Math.round(value)
      if (value >= 1) {
        return `${value}${prefix}s`
      }
    }
  }

  function objectifyHeaders(source: { headers: Headers }): Record<string, string> {
    // @ts-expect-error
    return Object.fromEntries(source.headers.entries())
  }

  function startRequestLog(): { logFormat: string, logArgs: any[] } {
    let logFormat = 'MOCK %s %s\n  Request: %o'
    const logArgs: any[] = [method, url, objectifyHeaders(request as Request)]
    if (logInput !== undefined) {
      logFormat += '\n  %o'
      logArgs.push(logInput)
    }
    return { logFormat, logArgs }
  }

  function finishLog(level: 'info' | 'error', logFormat: string, ...logArgs: any[]): void {
    console[level](`${logFormat}\n  Duration: %s`, ...logArgs, getDuration())
  }

  function logError(error: Error): void {
    if (configuration.logging) {
      const { logFormat, logArgs } = startRequestLog()
      finishLog('error', `${logFormat}\n  %o`, logArgs, error)
    }
  }

  function logResponse(): void {
    if (configuration.logging) {
      let { logFormat, logArgs } = startRequestLog()
      logFormat += '\n  Response: %d %o'
      logArgs.push((response as Response).status, objectifyHeaders(response as Response))
      if (logOutput !== undefined) {
        logFormat += '\n  %o'
        logArgs.push(logOutput)
      }
      finishLog('info', logFormat, ...logArgs)
    }
  }
}

/**
 * checks if the global `fetch` function was replaced by the mock-able one
 */
export function isFetchReplaced(): boolean {
  return globalThis.fetch === mockedFetch
}

/**
 * replaces the global `fetch` function by the mock-able one
 */
export function replaceFetch(): void {
  globalThis.fetch = mockedFetch
}

/**
 * restores the original global `fetch` function
 */
export function restoreFetch(): void {
  globalThis.fetch = originalFetch
}
