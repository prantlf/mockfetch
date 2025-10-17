# mockfetch

Mock the [`fetch` function] in the simplest way, including streaming. The interface is similar to the venerable [`mockjax`].

## Synopsis

```js
import { mockFetch } from '@mockfetch/mockfetch'

mockFetch({
  url: '//server/api/answer',
  response: {
    body: { result: 42 }
  }
})

const response = await fetch('http://server/api/answer')
const { result } = await response.json() // 42
```

## Installation

This package is usually installed as a local dependency:

```sh
$ npm i @mockfetch/mockfetch
```

Or loaded on a HTML page from the CDN, declaring a global object `mockfetch` form all named exports:

```html
<script src="https://unpkg.com/mockfetch@0.2.0/dist/index.umd.min.js"></script>
```

Or loaded on a HTML page from the CDN, importing just the needed named exports locally:

```html
<script type="module">
  import { mockFetch } from 'https://unpkg.com/mockfetch@0.2.0/dist/index.min.js'
</script>
```

Make sure, that you use it with a JavaScript VM which supports the [Fetch API].

## API

The following functions are available as named exports:

```ts
// configuring the mocked behaviour
getFetchConfiguration()
setFetchConfiguration({
  handleUnmockedRequests?,
  replaceMockedFetches?,
  responseDelay?,
  autoReplaceFetch?,
  logging?
})

// registering mocked fetch handles by URL and method
includesMockedFetch({ url, method? })
willMockFetch(urlOrRequest, requestOptions?)
mockFetch({ url, method?, responseDelay?, response })
unmockFetch({ url, method? })
unmockAllFetches()

// replacing the global fetch function
isFetchReplaced()
replaceFetch()
restoreFetch()
```

Configuration settings:

| Name                     | Default         | Description |
|:-------------------------|-----------------|:------------|
| `handleUnmockedRequests` | `'throw-error'` | change to `'pass-through'` to call the original `fetch` function, or to `'return-404'` to respond with the status 404, instead of throwing an error, if there's no matching `fetch` handler registered |
| `replaceMockedFetches`   |    `false`      | set to `true` to throw an error, if the same `fetch` handler is registered, instead of replacing the earlier one silently |
| `responseDelay`          |      `0`        | a time duration to delay the mocked requests by default (in milliseconds) |
| `autoReplaceFetch`       |    `true`       | set to `false` not to automatically replace and restore the global `fetch` as soon as the first `fetch` handlers is registered or the last one unregistered |
| `logging`                |    `true`       | set to `false` to disable logging of succeeded and failed requests on the console |

The defaults are optimised for fully mocked unit tests:
* Unmocked `fetch` calls are disallowed.
* Replacing an already registered mocked with the same matching URL and method is not permitted.
* Mocked responses are not delayed.
* Console logging is enabled.

Mock parameters:

| Name            |    Default   | Description |
|:----------------|--------------|:------------|
| `url`           |     none     | a `'string'` to match exactly the input URL (the scheme may be omitted, for example: `'//server/api/ping'`), or a `RegExp` for the ultimate flexibility |
| `method`        |     `GET`    | a HTTP method to match the input method (case-insensitively) |
| `responseDelay` |  `undefined` | override the default time duration to delay the mocked request (in milliseconds) |
| `response`      |     none     | an object describing the response, or an instance of [`Response`], or a method (synchronous or asynchronous) accepting a [`Request`] and returning a [`Response`] |

When looking for a `fetch` mock, the `fetch` handlers are evaluated in the order in which they were registered. The first one which matches the URL and method will be executed.

Response callback arguments:

| Name            | Description                                                     |
|:----------------|:----------------------------------------------------------------|
| `request`       | a `Request` instance created from the `fetch` handler arguments |
| `options`       | an object with the properties below                             |
| `options.match` | a result of the `RegExp` execution on the input URL             |

## Examples

A mock with URL path and query parameters:

```js
import { mockFetch } from '@prantlf/mockfetch'

mockFetch({
  url: new RegExp('//server/api/users/(?<id>[^/?]+)(?<query>\\?.*)?'),
  async response(request, { match }) {
    try {
      const queryParams = new URLSearchParams(match.groups.query)
      const user = await users.get(match.groups.id, queryParams.get('full') != null)
      return {
        body: user
      }
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
  url: new RegExp('//server/api/users/([^/]+)(\\?.*)?'),
  urlParams: ['id', 'query'],
  response({ urlParams }) {
    try {
      const queryParams = new URLSearchParams(urlParams.query)
      const user = users.getSync(urlParams.id, queryParams.get('full') != null)
      this.responseText = user
    } catch (error) {
      this.status = 404
      this.responseText = { error: error.message }
    }
  }
})
```

A mock of a `POST` request:

```js
import { mockFetch } from '@prantlf/mockfetch'

mockFetch({
  url: '//server/api/echo',
  method: 'POST',
  async response(request) {
    const body = await request.json()
    return {
      status: 200,
      body: { requested: body },
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
  url: '//server/api/echo',
  type: 'POST',
  response({ data }) {
    const body = JSON.parse(data)
    this.status = 200
    this.responseText = { requested: body }
    this.contentType = 'application/json'
  }
})
```

A failing mock:

```js
import { mockFetch } from '@prantlf/mockfetch'

mockFetch({
  url: '//server/api/ping',
  response: {
    status: 504
  }
})
```

For comparison, the same mock registered with [`mockjax`]:

```js
const jquery = require('jquery')
const mockjax = require('jquery-mockjax')(jquery, window)

mockjax({
  url: '//server/api/ping',
  status: 504
})
```

A streaming mock:

```js
import { mockFetch } from '@prantlf/mockfetch'

mockFetch({
  url: '//server/api/chat',
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
[Fetch API]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
[`fetch` function]: https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
[`Request`]: https://developer.mozilla.org/en-US/docs/Web/API/Request
[`Response`]: https://developer.mozilla.org/en-US/docs/Web/API/Response
