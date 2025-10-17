import { fail, ok, strictEqual, notStrictEqual } from 'node:assert'
import { afterEach, test } from 'node:test'
import {
  getFetchConfiguration, setFetchConfiguration,
  includesMockedFetch, mockFetch, unmockFetch, unmockAllFetches,
  isFetchReplaced, replaceFetch, restoreFetch
} from '../dist/index.js'

if (!globalThis.URLPattern) {
  await import('urlpattern-polyfill')
}

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  unmockAllFetches()
  setFetchConfiguration({
    handleUnmockedRequests: 'throw-error',
    responseDelay: 0,
    autoReplaceFetch: true,
    logging: true
  })
})

test('optimises default configuration for fully mocked unit tests', () => {
  const configuration = getFetchConfiguration()
  ok(typeof configuration === 'object' && configuration, 'configuration is not an object')
  strictEqual(configuration.handleUnmockedRequests, 'throw-error')
  strictEqual(configuration.responseDelay, 0)
  strictEqual(configuration.autoReplaceFetch, true)
  strictEqual(configuration.logging, true)
  for (const key in configuration) {
    if (!['handleUnmockedRequests', 'responseDelay', 'autoReplaceFetch', 'logging'].includes(key)) {
      fail(`Unknown configuration key: "${key}"`)
    }
  }
})

test('allows changing configuration', () => {
  setFetchConfiguration({ handleUnmockedRequests: 'pass-through' })
  strictEqual(getFetchConfiguration().handleUnmockedRequests, 'pass-through')
  setFetchConfiguration({ responseDelay: 1 })
  strictEqual(getFetchConfiguration().responseDelay, 1)
  setFetchConfiguration({ logging: false })
  strictEqual(getFetchConfiguration().logging, false)
})

test('can register and unregister fetch handlers', () => {
  let mockedFetch = {
    url: 'http://server/api/chat',
    response: {}
  }
  ok(!includesMockedFetch(mockedFetch), 'fetch found already mocked')
  mockedFetch = mockFetch(mockedFetch)
  ok(includesMockedFetch(mockedFetch), 'fetch found not mocked')
  ok(includesMockedFetch({ url: 'http://server/api/chat', method: 'GET' }),
    'fetch found not mocked with an explicit method')
  ok(includesMockedFetch({ url: 'http://server/api/chat', method: 'get' }),
    'fetch found not mocked with an lowercase method')
  ok(unmockFetch(mockedFetch), 'fetch not unmocked')
  ok(!unmockFetch(mockedFetch), 'fetch unexpectedly unmocked')
  ok(!includesMockedFetch(mockedFetch), 'fetch found still mocked')
  mockFetch(mockedFetch)
  ok(unmockAllFetches(), 'no fetches unmocked')
  ok(!unmockAllFetches(), 'some fetches still unmocked')
})

test('replaces and restores global fetch automatically by default', () => {
  const mockedFetch = {
    url: 'http://server/api/chat',
    response: {}
  }
  mockFetch(mockedFetch)
  ok(isFetchReplaced(), 'fetch found not replaced')
  unmockFetch(mockedFetch)
  ok(!isFetchReplaced(), 'fetch found not restored')
  mockFetch(mockedFetch)
  unmockAllFetches()
  ok(!isFetchReplaced(), 'fetch found not restored')
})

test('does not replace and restore global fetch automatically if configured', () => {
  setFetchConfiguration({ autoReplaceFetch: false })
  const mockedFetch = {
    url: 'http://server/api/chat',
    response: {}
  }
  mockFetch(mockedFetch)
  ok(!isFetchReplaced(), 'fetch found unexpectedly replaced')
  replaceFetch()
  unmockFetch(mockedFetch)
  ok(isFetchReplaced(), 'fetch found unexpectedly restored')
  mockFetch(mockedFetch)
  unmockAllFetches()
  ok(isFetchReplaced(), 'fetch found unexpectedly restored')
})

test('can replace global fetch explicitly', () => {
  ok(!isFetchReplaced(), 'fetch found already replaced')
  ok(replaceFetch(), 'fetch not replaced')
  notStrictEqual(originalFetch, globalThis.fetch)
  ok(!replaceFetch(), 'fetch unexpectedly replaced')
  ok(isFetchReplaced(), 'fetch found not replaced')
  ok(restoreFetch(), 'fetch not restored')
  strictEqual(originalFetch, globalThis.fetch)
  ok(!restoreFetch(), 'fetch unexpectedly restored')
  ok(!isFetchReplaced(), 'fetch found not restored')
})

test('can mock fetch call with empty response by string URL', async () => {
  setFetchConfiguration({ logging: false })
  const mockedFetch = {
    url: 'http://server/api/ping',
    response: {}
  }
  mockFetch(mockedFetch)
  const response = await fetch('http://server/api/ping')
  strictEqual(response.status, 200)
  const data = await response.bytes()
  strictEqual(data.length, 0)
})

test('can mock failure', async () => {
  setFetchConfiguration({ logging: false })
  const mockedFetch = {
    url: 'http://server/api/test',
    method: 'GET',
    response: {
      status: 504
    }
  }
  mockFetch(mockedFetch)
  const response = await fetch('http://server/api/test')
  strictEqual(response.status, 504)
})

test('can mock fetch call with JSON response by URL with URLPattern parameters', async () => {
  setFetchConfiguration({ logging: false })
  const mockedFetch = {
    url: new URLPattern('http{s}?://server/api/users/:id'),
    response(request, { match }) {
      const query = new URLSearchParams(new URL(request.url).search)
      return {
        body: { id: match.pathname.groups.id, full: query.get('full') != null }
      }
    }
  }
  mockFetch(mockedFetch)
  const response = await fetch('http://server/api/users/1?full')
  strictEqual(response.status, 200)
  const data = await response.json()
  ok(typeof data === 'object' && data, 'data is not an object')
  strictEqual(data.id, '1')
  strictEqual(data.full, true)
})

test('can mock post fetch call with payload', async () => {
  setFetchConfiguration({ logging: false })
  const mockedFetch = {
    url: 'http://server/api/chat',
    method: 'post',
    async response(request) {
      const { question } = await request.json()
      return {
        body: { question, answer: 42 }
      }
    }
  }
  mockFetch(mockedFetch)
  const response = await fetch('http://server/api/chat', {
    method: 'POST',
    body: JSON.stringify({ question: 'What is the answer?' })
  })
  strictEqual(response.status, 200)
  const data = await response.json()
  ok(typeof data === 'object' && data, 'data is not an object')
  strictEqual(data.question, 'What is the answer?')
  strictEqual(data.answer, 42)
})

test('can mock fetch call with streaming response', async () => {
  setFetchConfiguration({ logging: false })
  const mockedFetch = {
    url: 'http://server/api/stream',
    response() {
      const body = new ReadableStream({
        start(controller) {
          const data = new TextEncoder().encode('text')
          controller.enqueue(data)
          controller.close()
        }
      })
      return new Response(body)
    }
  }
  mockFetch(mockedFetch)
  const response = await fetch('http://server/api/stream')
  strictEqual(response.status, 200)
  const data = await response.text()
  strictEqual(data, 'text')
})
