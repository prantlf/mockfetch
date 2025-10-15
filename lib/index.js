const originalFetch = globalThis.fetch

const configuration = {
  handleUnmockedRequests: 'throw-error',
  replaceMockedFetches: false,
  responseDelay: 0,
  autoReplaceFetch: true,
  logging: true
}

export function getFetchConfiguration() {
  return { ...configuration }
}

export function setFetchConfiguration(options) {
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

const fetchHandlers = []

function normalizeIdentifier(identifier) {
  let { url, method } = identifier
  if (!url) throw Error('Mocked fetch is missing "url"')
  if (method) {
    method = method.toUpperCase()
  } else {
    method = 'GET'
  }
  identifier.method = method
  return identifier
}

function normalizeHandler(handler) {
  handler = normalizeIdentifier(handler)
  const { response } = handler
  if (!response) throw Error('Mocked fetch is missing "response"')
  return handler
}

function findFetchHandler(url, method) {
  for (let i = 0, l = fetchHandlers.length; i < l; ++i) {
    const handler = fetchHandlers[i]
    if (handler.method === method && handler.url === url) return i
  }
  return -1
}

export function includesMockedFetch(identifier) {
  const { url, method } = normalizeIdentifier(identifier)
  const index = findFetchHandler(url, method)
  return index >= 0
}

export function mockFetch(handler) {
  const { url, method } = normalizeHandler(handler)
  const index = findFetchHandler(url, method)
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

export function unmockFetch(identifier) {
  const { url, method } = normalizeIdentifier(identifier)
  const index = findFetchHandler(url, method)
  if (index >= 0) {
    fetchHandlers.splice(index, 1)
    if (configuration.autoReplaceFetch && fetchHandlers.length === 0) {
      restoreFetch()
    }
    return true
  }
  return false
}

export function unmockAllFetches() {
  const { length } = fetchHandlers
  fetchHandlers.splice(0, length)
  if (configuration.autoReplaceFetch) {
    restoreFetch();
  }
  return length > 0
}

function matchFetchHandler(url, method) {
  for (const handler of fetchHandlers) {
    if (handler.method !== method) continue
    if (typeof handler.url === 'string') {
      if(handler.url === url) return handler
      if (handler.url.startsWith('//') && !url.startsWith('//')) {
        const urlWithoutScheme = url.replace(/^https?:/, '')
        if (handler.url === urlWithoutScheme) return handler
      }
    }
    if (handler.url instanceof RegExp && handler.url.test(url)) return handler
  }
}

export function willMockFetch(identifier) {
  const { url, method } = normalizeIdentifier(identifier)
  const handler = matchFetchHandler(url, method)
  return !!handler
}

function isSupportedBodyType(instance) {
  const supportedBodyTypes = [
    ArrayBuffer, Blob, DataView, File, FormData, URLSearchParams, ReadableStream,
    Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
    Int32Array, Uint32Array, /* Float16Array, */ Float32Array, Float64Array,
    BigInt64Array, BigUint64Array
  ]
  for (const type of supportedBodyTypes) {
    if (instance instanceof type) return true
  }
}

function waitForDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function mockedFetch(url, requestOptions = {}) {
  let { method } = requestOptions
  if (method) {
    method = method.toUpperCase()
  } else {
    method = 'GET'
  }

  const handler = matchFetchHandler(url, method)
  if (!handler) {
    switch (configuration.handleUnmockedRequests) {
      case 'pass-through':
        return originalFetch(url, requestOptions)
      case 'throw-error':
        throw Error(`Fetch not mocked: ${method} ${url}`)
      case 'return-404':
        return Promise.resolve(new Response(null, { status: 404 }))
    }
  }

  const responseDelay = handler.responseDelay ?? configuration.responseDelay
  if (responseDelay) {
    await waitForDelay(configuration.responseDelay)
  }

  const request = new Request(url, requestOptions)
  try {
    const response = typeof handler.response === 'function'
      ? await handler.response(request)
      : handler.response
    if (configuration.logging) {
      console.info(`MOCK ${method} ${url}`, request, response)
    }
    if (response instanceof Response) {
      return response
    }
    let { body, ...responseOptions } = response
    if (!isSupportedBodyType(body)) {
      if (typeof body === 'object') {
        body = JSON.stringify(body)
        responseOptions.headers = {
          'Content-Type': 'application/json',
          ...responseOptions.headers
        }
      }
    }
    return new Response(body, responseOptions)
  } catch (error) {
    if (configuration.logging) {
      console.error(`MOCK ${method}: ${url}`, error)
    }
    throw error
  }
}

export function isFetchReplaced() {
  return globalThis.fetch === mockedFetch
}

export function replaceFetch() {
  const replaced = isFetchReplaced()
  globalThis.fetch = mockedFetch
  return !replaced
}

export function restoreFetch() {
  const replaced = isFetchReplaced()
  globalThis.fetch = originalFetch
  return replaced
}
