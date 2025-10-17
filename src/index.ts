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
   * set to `true` to throw an error, if the same `fetch` handler is registered, instead of replacing the earlier one silently
   * @default false
   */
  replaceMockedFetches: boolean

  /**
   * a time duration to delay the mocked requests by default (in milliseconds)
   * @default 0
   */
  responseDelay: number

  /**
   * set to `false` not to automatically replace and restore the global `fetch` as soon as the first `fetch` handlers is registered or the last one unregistered
   * @default true
   */
  autoReplaceFetch: boolean

  /**
   * set to `false` to disable logging of succeeded and failed requests on the console
   * @default true
   */
  logging: boolean
}

const configuration: FetchConfiguration = {
  handleUnmockedRequests: 'throw-error',
  replaceMockedFetches: false,
  responseDelay: 0,
  autoReplaceFetch: true,
  logging: true
}

/**
 * get a copy of the current `fetch` configuration
 */
export function getFetchConfiguration(): FetchConfiguration {
  return { ...configuration }
}

/**
 * sets one or more `fetch` configuration parameters
 */
export function setFetchConfiguration(options: FetchConfiguration) {
  const { handleUnmockedRequests, replaceMockedFetches, responseDelay, autoReplaceFetch, logging } = options
  if (handleUnmockedRequests) {
    const unmockedRequestHandling = ['pass-through', 'return-404', 'throw-error']
    if (!unmockedRequestHandling.includes(handleUnmockedRequests)) {
      throw Error(`Invalid handleUnmockedRequests: ${handleUnmockedRequests}`)
    }
    configuration.handleUnmockedRequests = handleUnmockedRequests
  }
  if (typeof replaceMockedFetches === 'boolean') {
    configuration.replaceMockedFetches = replaceMockedFetches
  }
  if (responseDelay >= 0) {
    configuration.responseDelay = responseDelay
  }
  if (typeof autoReplaceFetch === 'boolean') {
    configuration.autoReplaceFetch = autoReplaceFetch
  }
  if (typeof logging === 'boolean') {
    configuration.logging = logging
  }
}

/**
 * value of the body to return in the response
 */
type Body = null | string | object | ArrayBuffer | Blob | DataView | File | FormData |
  URLSearchParams | ReadableStream | Int8Array | Uint8Array | Uint8ClampedArray |
  Int16Array | Uint16Array | Int32Array | Uint32Array | /* Float16Array | */
  Float32Array | Float64Array /* | BigInt64Array | BigUint64Array */

/**
 * object literal to specify the response content in a simplified way
 */
interface SimpleResponse {
  /**
   * @default 200
   */
  status?: number

  /**
   * a Headers object, an object literal, or an array of two-item arrays to set request's headers
   */
  headers?: Record<string, string>

  body?: Body
}

/**
 * specifies how to match a mocked `fetch` call
 */
export interface FetchSpecification {
  /**
   * a `'string'` convertible to [`URLPattern`] to match the input URL, or a `RegExp` for the ultimate flexibility
   */
  url: string | URLPattern | RegExp

  /**
   * a HTTP method to match the input method (case-insensitively)
   * @default 'GET'
   */
  method?: string
}

interface CallbackOptions {
  match?: URLPatternResult | RegExpExecArray
}

type ResponseCallback = (request: Request, options: CallbackOptions) => Promise<SimpleResponse | Response>

/**
 * provides specification for matching a mocked `fetch` call and the way how to handle its response
 */
export interface FetchHandler extends FetchSpecification {
  /**
   * override the default time duration to delay the mocked request (in milliseconds)
   */
  responseDelay?: number

  /**
   * an object describing the response, or an instance of [`Response`], or a method (synchronous or asynchronous) accepting a [`Request`] and returning a [`Response`]
   */
  response: SimpleResponse | Response | ResponseCallback
}

const fetchHandlers: FetchHandler[] = []

function normalizeSpecification(specification: FetchSpecification): FetchSpecification {
  let { url, method } = specification
  if (!url) throw Error('Mocked fetch is missing "url"')
  if (method) {
    method = method.toUpperCase()
  } else {
    method = 'GET'
  }
  specification.method = method
  return specification
}

function normalizeHandler(handler: FetchHandler): FetchHandler {
  handler = normalizeSpecification(handler) as FetchHandler
  const { response } = handler
  if (!response) throw Error('Mocked fetch is missing "response"')
  return handler
}

function findFetchHandler(url: string | URLPattern | RegExp, method: string): number {
  for (let i = 0, l = fetchHandlers.length; i < l; ++i) {
    const handler = fetchHandlers[i]
    if (handler.method === method && handler.url === url) return i
  }
  return -1
}

/**
 * checks if a mocked `fetch` call matching the given specification has been already registered
 */
export function includesMockedFetch(specification: FetchSpecification): boolean {
  const { url, method } = normalizeSpecification(specification)
  const index = findFetchHandler(url, method as string)
  return index >= 0
}

/**
 * registers a mock for a `fetch` call
 */
export function mockFetch(handler: FetchHandler): FetchHandler {
  const { url, method } = normalizeHandler(handler)
  const index = findFetchHandler(url, method as string)
  if (index >= 0 && !configuration.replaceMockedFetches) {
    const handler = fetchHandlers[index]
    throw Error(`Fetch already mocked: ${method} ${handler.url}`)
  }
  handler = { ...handler, method }
  fetchHandlers.push(handler)
  if (configuration.autoReplaceFetch) {
    replaceFetch()
  }
  return handler
}

/**
 * unregisters a mock for a `fetch` call
 */
export function unmockFetch(specification: FetchSpecification): boolean {
  const { url, method } = normalizeSpecification(specification)
  const index = findFetchHandler(url, method as string)
  if (index >= 0) {
    fetchHandlers.splice(index, 1)
    if (configuration.autoReplaceFetch && fetchHandlers.length === 0) {
      restoreFetch()
    }
    return true
  }
  return false
}

/**
 * unregisters all `fetch` call mocks
 */
export function unmockAllFetches(): boolean {
  const { length } = fetchHandlers
  fetchHandlers.splice(0, length)
  if (configuration.autoReplaceFetch) {
    restoreFetch();
  }
  return length > 0
}

function matchFetchHandler(url: string, method: string): { handler?: FetchHandler, match?: URLPatternResult | RegExpExecArray } {
  for (const handler of fetchHandlers) {
    if (handler.method !== method) continue
    if (handler.url instanceof RegExp) {
      const match = handler.url.exec(url)
      if (match) {
        return { handler, match }
      }
    } else {
      // @ts-expect-error
      const pattern = handler.url instanceof URLPattern
        ? handler.url
        // @ts-expect-error
        : new URLPattern(handler.url)
      const match = pattern.exec(url)
      if (match) {
        return { handler, match }
      }
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
  if (method) {
    method = method.toUpperCase()
  } else {
    method = 'GET'
  }
  return { ...requestOptions, method }
}

/**
 * checks if a `fetch` call with the provided parameter will be mocked
 */
export function willMockFetch(urlOrRequest: RequestInfo | URL, requestOptions?: RequestInit): boolean {
  const { url } = normalizeRequestURL(urlOrRequest);
  requestOptions = normalizeRequestOptions(requestOptions)
  const { method } = requestOptions

  const { handler } = matchFetchHandler(url, method as string)
  return !!handler
}

function isSupportedBodyType(body: Body | undefined): boolean {
  if (body == null) return true
  const supportedBodyTypes = [
    ArrayBuffer, Blob, DataView, File, FormData, URLSearchParams, ReadableStream,
    Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
    Int32Array, Uint32Array, /* Float16Array, */ Float32Array, Float64Array,
    BigInt64Array, BigUint64Array
  ]
  for (const type of supportedBodyTypes) {
    if (body instanceof type) return true
  }
  return false
}

function waitForDelay(timeDuration: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeDuration))
}

async function mockedFetch(urlOrRequest: RequestInfo | URL, requestOptions?: RequestInit): Promise<Response> {
  let { request, url } = normalizeRequestURL(urlOrRequest);
  requestOptions = normalizeRequestOptions(requestOptions)
  const { method } = requestOptions

  const { handler, match } = matchFetchHandler(url, method as string)
  if (!handler) {
    switch (configuration.handleUnmockedRequests) {
      case 'pass-through':
        return originalFetch(urlOrRequest, requestOptions)
      case 'throw-error':
        throw Error(`Fetch not mocked: ${method} ${url}`)
      case 'return-404':
        return Promise.resolve(new Response(null, { status: 404 }))
    }
  }

  const responseDelay = handler.responseDelay ?? configuration.responseDelay
  if (responseDelay > 0) {
    await waitForDelay(configuration.responseDelay)
  }

  if (!request) {
    request = new Request(url, requestOptions)
  }
  try {
    const response = typeof handler.response === 'function'
      ? await handler.response(request, { match })
      : handler.response
    if (configuration.logging) {
      console.info(`MOCK ${method} ${url}`, request, response)
    }
    if (response instanceof Response) {
      return response
    }
    let { body, ...responseOptions } = response
    if (!isSupportedBodyType(body)) {
      body = JSON.stringify(body)
      responseOptions.headers = {
        'Content-Type': 'application/json',
        ...responseOptions.headers
      }
    }
    return new Response(body as BodyInit, responseOptions)
  } catch (error) {
    if (configuration.logging) {
      console.error(`MOCK ${method}: ${url}`, error)
    }
    throw error
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
export function replaceFetch(): boolean {
  const replaced = isFetchReplaced()
  globalThis.fetch = mockedFetch
  return !replaced
}

/**
 * restores the original global `fetch` function
 */
export function restoreFetch(): boolean {
  const replaced = isFetchReplaced()
  globalThis.fetch = originalFetch
  return replaced
}
