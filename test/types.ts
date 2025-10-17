import type {
  FetchConfiguration, FetchHandler
} from '../dist/index'
import {
  getFetchConfiguration, setFetchConfiguration,
  willMockFetch, includesMockedFetch, mockFetch, unmockFetch, unmockAllFetches,
  isFetchReplaced, replaceFetch, restoreFetch
} from '../dist/index'

declare type testCallback = () => void
declare function test(label: string, callback: testCallback): void

test('Type declarations for TypeScript', () => {
  const fetchConfiguration: FetchConfiguration = getFetchConfiguration()
  setFetchConfiguration(fetchConfiguration)

  let fetchHandler: FetchHandler = mockFetch({
    url: 'http://server/api/chat',
    response: { body: { answer: '42' } }
  })
  fetchHandler = mockFetch({
    // @ts-expect-error
    url: new URLPattern('http{s}?://server/api/chat'),
    async response(_request, _options) {
      return { body: { answer: '42' } }
    }
  })
  const _mocks: boolean = willMockFetch('http://server/api/chat')
  const _mocked: boolean = includesMockedFetch(fetchHandler)
  unmockFetch({
    url: 'http://server/api/chat',
    method: 'GET'
  })
  unmockAllFetches()

  const _replaced: boolean = isFetchReplaced()
  replaceFetch()
  restoreFetch()
})
