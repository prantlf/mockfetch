# Changes

## [0.4.1](https://github.com/prantlf/mockfetch/compare/v0.4.0...v0.4.1) (2025-10-22)

### Bug Fixes

* fix: Re-enable automatic publishing ([e958938](https://github.com/prantlf/mockfetch/commit/e9589384b16c29c8f8993a8fed4432d167399ba8))

## [0.4.0](https://github.com/prantlf/mockfetch/compare/v0.3.2...v0.4.0) (2025-10-22)

### Features

* Upgrade dependencies ([a5ea276](https://github.com/prantlf/mockfetch/commit/a5ea27659bc9c92d5639c16cc288a8abe7a708c1))

## [0.3.2](https://github.com/prantlf/mockfetch/compare/v0.3.1...v0.3.2) (2025-10-19)

### Bug Fixes

* Re-publish incomplete build ([14bca0c](https://github.com/prantlf/mockfetch/commit/14bca0c4f3bb3c76ceb56d653b4bb573dba098bd))

## [0.3.1](https://github.com/prantlf/mockfetch/compare/v0.3.0...v0.3.1) (2025-10-19)

### Bug Fixes

* Prevent lexicographical error of later declated variables ([061a331](https://github.com/prantlf/mockfetch/commit/061a3316bde3cde401e5bc65a7678764cc0e831b))

## [0.3.0](https://github.com/prantlf/mockfetch/compare/v0.2.0...v0.3.0) (2025-10-18)

### Features

* Log request and response bodies and mock duration ([ea6b382](https://github.com/prantlf/mockfetch/commit/ea6b3828ab42aa6c7ff71c5c63c1a679515badb0))
* Support URL instance in fetch mock registration ([8aed9ee](https://github.com/prantlf/mockfetch/commit/8aed9ee5551577713fa9a2a35cf75417f39866de))

## [0.2.0](https://github.com/prantlf/mockfetch/compare/v0.1.1...v0.2.0) (2025-10-17)

### Features

* Extract URL path and query parameters with RegExp groups ([1a369d3](https://github.com/prantlf/mockfetch/commit/1a369d388cddb90526a3db4e191f0f913f5a1480))
* Support URLPattern for matching mocked URL ([a9259d4](https://github.com/prantlf/mockfetch/commit/a9259d4c1c42571572d7a07ce180310ca53c45a3))
* Remove setting replaceMockedFetches ([cda5ad2](https://github.com/prantlf/mockfetch/commit/cda5ad26481bfdfcb4624a5540ebeb0999d401fd))
* Remove matching mocked URL by RegExp ([fa9b482](https://github.com/prantlf/mockfetch/commit/fa9b482a4a2688ca8aef86f3e73d84507ff72784))
* Provide URL and URLSearchParams objects in response callback options ([35838bf](https://github.com/prantlf/mockfetch/commit/35838bff4b0479c92b62151fa43694ed43b505b0))
* Remove boolean result from unmockFetch, unmockAllFetches, replaceFetch and restoreFetch ([f33e84f](https://github.com/prantlf/mockfetch/commit/f33e84f33d5fc3f51c9adeb6dedf80b8a9ef7884))
* Remove autoReplaceFetch from settings ([ec02e0a](https://github.com/prantlf/mockfetch/commit/ec02e0a77e4b1737168221315ba1694b3747546d))

### BREAKING CHANGES

Automatic replacing of the global `fetch` function and restoring its original value with the first registered mock and the last unregistered one cannot be disabled any more. But functions for handling it remain (`isFetchReplaced`, `replaceFetch` and `restoreFetch`).

Functions `unmockFetch`, `unmockAllFetches`, `replaceFetch` and `restoreFetch` do not return anything now. The `boolean` result wasn't useful anyway. Functions `includesMockedFetch` and `isFetchReplaced` can be used to check the state of a mock or the global `fetch`.

Use either a string acceptable for `URLPattern` or a `URLPattern` instance only. It's practically as powerful as `RegExp` and includes additional features suitable for parsing URLs as routes.

This shouldn't break anything, because this setting was used only to validate adding new mock `fetch` handlers, so that the same handler wouldn't be added twice. But the understanding of "the same" may vary. Does it mean the same URL pattern? Or a URL pattern matching the same URL? Better to remove it.

The URL passed to `mockFetch` can't start without a scheme (`'//...'`). It'd be an invalid URL. `fetch` doesn't accept it either. If you want to register a mocked `fetch` handler independent on the scheme, start the URL string with `'http{s}:'`, or use a `RegExp` starting with `/^https?:/`.

## 0.1.1 (2025-10-16)

Try publishing directly.

## 0.1.0 (2025-10-16)

Failed publishing.

## 0.0.2 (2025-10-15)

Prepare automatic releases.
