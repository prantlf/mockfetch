# mockfetch

Mock the [`fetch` function] in the simplest way, including streaming. The interface is similar to the venerable [`mockjax`], just using modern features like [`URL`], [`URLSearchParams`] and [`URLPattern`].

* Distributes ESM, CJS and UBM bundles.
* Written in TypeScript, exports types.
* Small size, 4 KB minified.
* No dependencies.

## Table of contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Mocking and Unmocking](#mocking-and-unmocking)
- [Global Fetch](#global-fetch)
- [Examples](#examples)

## Synopsis

```js
import { mockFetch } from '@mockfetch/mockfetch'

mockFetch({
  url: 'http://server/api/answer',
  response: {
    body: { result: 42 }
  }
})

const response = await fetch('http://server/api/answer')
const { result } = await response.json() // 42
```

## Installation

This package is usually installed as a local development dependency:

```sh
npm i -D @mockfetch/mockfetch
```

Or loaded on a HTML page from the CDN, declaring a global object `mockfetch` with all named exports:

```html
<script src="https://unpkg.com/mockfetch@0.3.0/dist/index.umd.min.js"></script>
```

Or imported locally on a HTML page from the CDN, just the needed named exports:

```html
<script type="module">
  import { mockFetch } from 'https://unpkg.com/mockfetch@0.3.0/dist/index.min.js'
</script>
```

Make sure, that you use it with a JavaScript VM which supports the [Fetch API], [URL Pattern API], [`URL`] and [`URLSearchParams`]. Otherwise you can apply polyfills, for example:

```js
if (!globalThis.fetch) await import('whatwg-fetch')
if (!globalThis.URL) await import('url-polyfill')
if (!globalThis.URLPattern) await import('urlpattern-polyfill')
if (!globalThis.URLSearchParams) await import('url-search-params-polyfill')
```

## Configuration

The default settings are optimised for fully mocked unit tests:

* Unmocked `fetch` calls are disallowed.
* Mocked responses are not delayed.
* Console logging is enabled.

```ts
interface FetchConfiguration {
  handleUnmockedRequests: 'pass-through' | 'return-404' | 'throw-error'
  responseDelay: number
  logging: boolean
}

// get a copy of the current `fetch` configuration
getFetchConfiguration(): FetchConfiguration

// set one or more `fetch` configuration parameters
setFetchConfiguration(options: FetchConfiguration): void
```

| Name                     | Default         | Description |
|:-------------------------|-----------------|:------------|
| `handleUnmockedRequests` | `'throw-error'` | change to `'pass-through'` to call the original `fetch` function, or to `'return-404'` to respond with the status 404, instead of throwing an error, if there's no matching `fetch` handler registered |
| `responseDelay`          |      `0`        | a time duration to delay the mocked requests by default (in milliseconds) |
| `logging`                |    `true`       | set to `false` to disable logging of succeeded and failed requests on the console |

## Mocking and Unmocking

When looking for a `fetch` mock, the `fetch` handlers are evaluated in the order in which they were registered. The first one which matches the URL and method will be executed.

```ts
// checks if a `fetch` call with the provided parameters will be mocked
willMockFetch(urlOrRequest: RequestInfo | URL, requestOptions?: RequestInit): boolean

// registers a mock for a `fetch` call
mockFetch({
  url: string | URL | URLPattern,
  method?: string,
  responseDelay?: number,
  response: Response | SimpleResponse | ResponseCallback
})

// checks if a mocked `fetch` call matching the given specification has been already registered
includesMockedFetch({ url: string | URL | URLPattern, method?: string }): boolean

// unregisters a mock for a `fetch` call
unmockFetch({ url: string | URL | URLPattern, method?: string }): void

// unregisters all `fetch` call mocks
unmockAllFetches(): void
```

Mock handler parameters, those without a default are mandatory:

| Name            |   Default   | Description |
|:----------------|-------------|:------------|
| `url`           |    none     | a string convertible to [`URLPattern`] or a [`URL`] or [`URLPattern`] instance to match the input URL |
| `method`        |    `GET`    | a HTTP method to match the input method (case-insensitively) |
| `responseDelay` | `undefined` | override the default time duration to delay the mocked request (in milliseconds) |
| `response`      |    none     | an object describing the response, or a [`Response`] instance, or a method (synchronous or asynchronous) returning an object or a [`Response`] |

Simplified object representing the response which can be used instead of a [`Response`] instance:

```ts
interface SimpleResponse {
  status?: number
  headers?: Headers | Record<string, string> | [string, string][]
  body?: BodyInit | object
}
```

| Name      |   Default   | Description |
|:----------|-------------|:------------|
| `status`  |   `200`     | a HTTP status code for the response |
| `headers` | `undefined` | a Headers object, an object literal, or an array of two-item arrays to set request headers |
| `body`    | `undefined` | a response body, either an object or a value accepted hy the [`Response`] constructor |

If the `body` property contains a plain object, it'll be stringified and the content type `application/json` will be added to the response headers automatically.

Response callback arguments and result:

```ts
interface ResponseCallbackOptions {
  match: URLPatternResult
  url: URL
  query: URLSearchParams
}

type ResponseCallback = (request: Request, options: ResponseCallbackOptions)
  => Promise<SimpleResponse | Response>
```

| Name            | Description                                                       |
|:----------------|:------------------------------------------------------------------|
| `request`       | a [`Request`] instance created from the `fetch` handler arguments |
| `options`       | an object with the properties below                               |
| `options.match` | a result of the [`URLPattern`] execution on the input URL         |
| `options.query` | a [`URLSearchParams`] instance created from the input URL query   |
| `options.url`   | a [`URL`] instance created from the input URL                     |
| result          | an object describing the response, or an instance of [`Response`] |

## Global Fetch

When the first `fetch` handler mock is registered, the global `fetch` function will be replaced by the mocked one automatically. When the last `fetch` handler mock is unregistered, the global `fetch` function will be restored automatically. But it is possible to replace or restore the global `fetch` manually too.

```ts
// checks if the global `fetch` function was replaced by the mock-able one
isFetchReplaced(): boolean

// replaces the global `fetch` function by the mock-able one
replaceFetch(): void

// restores the original global `fetch` function
restoreFetch(): void
```

## Examples

A mock with URL path and query parameters:

```js
import { mockFetch } from '@prantlf/mockfetch'

mockFetch({
  url: 'http{s}?://server/api/users/:id',
  async response(request, { match, query }) {
    try {
      const { id } = match.pathname.groups
      const fullInfo = query.get('full') != null
      const user = await users.get(id, fullInfo)
      return { body: user }
    } catch (error) {
      return {
        status: 404,
        body: { error: error.message }
      }
    }
  }
})
```

For comparison, the same mock registered with [`mockjax`]:

```js
const jquery = require('jquery')
const mockjax = require('jquery-mockjax')(jquery, window)

mockjax({
  url: new RegExp('https?://server/api/users/([^/]+)(\\?.*)?'),
  urlParams: ['id', 'query'],
  response({ urlParams }) {
    try {
      const query = new URLSearchParams(urlParams.query)
      const { id } = urlParams
      const fullInfo = query.get('full') != null
      const user = users.getSync(id, fullInfo)
      this.responseText = user
    } catch (error) {
      this.status = 404
      this.responseText = { error: error.message }
    }
  }
})
```

And the log:

    MOCK GET http://server/api/users/1
      Request: {}
      Response: 200 { 'content-type': 'application/json' }
      { id: 1, name: 'joe' }
      Duration: 28ms

    MOCK GET http://server/api/users/2
      Request: {}
      Response: 404 { 'content-type': 'application/json' }
      { error: 'user not found' }
      Duration: 12ms

A mock of a `POST` request:

```js
import { mockFetch } from '@prantlf/mockfetch'

mockFetch({
  url: 'http://server/api/echo',
  method: 'POST',
  async response(request) {
    const payload = await request.json()
    return {
      status: 200,
      body: { requested: payload },
      headers: { 'Content-Type': 'application/json' }
    }
  }
})
```

For comparison, the same mock registered with [`mockjax`]:

```js
const jquery = require('jquery')
const mockjax = require('jquery-mockjax')(jquery, window)

mockjax({
  url: 'http://server/api/echo',
  type: 'POST',
  response({ data }) {
    const payload = JSON.parse(data)
    this.status = 200
    this.responseText = { requested: payload }
    this.contentType = 'application/json'
  }
})
```

And the log:

    MOCK POST http://server/api/echo
      Request: { 'content-type': 'application/json' }
      { question: 'Hello!' }
      Response: 200 { 'content-type': 'application/json' }
      { requested: { question: 'Hello!' } }
      Duration: 3ms

A failing mock using an explicit [`URLPattern`] for the case-insensitive URL matching:

```js
import { mockFetch } from '@prantlf/mockfetch'

mockFetch({
  url: new URLPattern('http://server/api/ping', { ignoreCase: true }),
  response: { status: 504 }
})
```

For comparison, the same mock registered with [`mockjax`]:

```js
const jquery = require('jquery')
const mockjax = require('jquery-mockjax')(jquery, window)

mockjax({
  url: new RegExp('http://server/api/ping', 'i'),
  status: 504
})
```

And the log:

    MOCK GET http://server/api/ping
      Request: {}
      Response: 504 {}
      Duration: 1ms

A streaming mock:

```js
import { mockFetch } from '@prantlf/mockfetch'

mockFetch({
  url: 'https://server/api/chat',
  method: 'POST',
  response(request) {
    const messages = [
      { delta: { ... } },
      { delta: { ... } },
      { delta: { ... } }
    ]
    let messageIndex = 0
    let messageInterval
    const body = new ReadableStream({
      start(controller) {
        const enqueueData = data => {
          const chunk = new TextEncoder().encode(`data: ${data}\n\n`)
          controller.enqueue(chunk)
        }
        messageInterval = setInterval(() => {
          enqueueData(JSON.stringify(messages[messageIndex]))
          if (++messageIndex === messages.length) {
            enqueueData('[DONE]')
            this.cancel()
            controller.close()
          }
        }, 1000)
      },
      cancel() {
        if (messageInterval) {
          clearInterval(messageInterval)
        }
      }
    })
    return {
      body,
      headers: { 'Content-Type': 'text/event-stream' }
    }
  }
})
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.  Add unit tests for any new or changed functionality. Lint and test your code using Grunt.

## License

Copyright (c) 2025 Ferdinand Prantl

Licensed under the MIT license.

[`mockjax`]: https://github.com/jakerella/jquery-mockjax
[`RegExp`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
[Fetch API]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
[`fetch` function]: https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
[`Request`]: https://developer.mozilla.org/en-US/docs/Web/API/Request
[`Response`]: https://developer.mozilla.org/en-US/docs/Web/API/Response
[URL Pattern API]: https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
[`URLPattern`]: https://developer.mozilla.org/en-US/docs/Web/API/URLPattern
[`URLSearchParams`]: https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
[`URL`]: https://developer.mozilla.org/en-US/docs/Web/API/URL
