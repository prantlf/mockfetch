import type {
  FetchConfiguration, FetchHandler
} from '../lib/index'
import {
  getFetchConfiguration, setFetchConfiguration,
  includesMockedFetch, mockFetch, unmockFetch, unmockAllFetches,
  isFetchReplaced, replaceFetch, restoreFetch
} from '../lib/index'

declare type testCallback = () => void
declare function test(label: string, callback: testCallback): void

test('Type declarations for TypeScript', () => {
  const fetchConfiguration: FetchConfiguration = getFetchConfiguration()
  setFetchConfiguration(fetchConfiguration)

  const fetchHandler: FetchHandler = mockFetch({
    url: '//server/api/chat',
    response: { body: { answer: '42' } }
  })
  const _mocked:boolean = includesMockedFetch(fetchHandler)
  const _unmocked:boolean = unmockFetch({
    url: '//server/api/chat',
    method: 'GET'
  })
  const _unmockedAll:boolean = unmockAllFetches()

  let _replaced:boolean = isFetchReplaced()
  _replaced = replaceFetch()
  _replaced = restoreFetch()
})
