# http-status-line-parse-kit

Parses an HTTP status line into its protocol token, version numbers, status
code, and reason phrase.

```js
import { parseStatusLine, parseStatusCode } from './src/index.js';

parseStatusLine('HTTP/1.1 200 OK');
// {
//   protocol: 'HTTP',
//   version: { major: 1, minor: 1 },
//   statusCode: 200,
//   reasonPhrase: 'OK'
// }

parseStatusLine('HTTP/2.0 204');
// { protocol: 'HTTP', version: { major: 2, minor: 0 }, statusCode: 204, reasonPhrase: '' }

parseStatusCode('HTTP/1.1 503 Service Unavailable');
// 503
```

## Why this exists

Most HTTP libraries expose the status line only after a full response parser
has run, and the parsers that do hand it out tend to fold the reason phrase
into a fixed lookup table keyed by status code. That loses whatever the
server actually sent. This library does the opposite: it returns the bytes
as given, and leaves any mapping from code to canonical reason to the caller.

The trade-off is that it does no validation of the status code beyond its
shape. `HTTP/1.1 999 Whatever` parses fine even though 999 is not a
registered code. That is deliberate; the caller decides which codes matter.

## The awkward edge

A missing reason phrase is not an error. `HTTP/2.0 204` has no phrase at all,
and `parseStatusLine` reports `reasonPhrase: ''` rather than throwing or
returning `undefined`. Code that checks `if (result.reasonPhrase)` will
therefore treat an empty phrase and a phrase like `"OK"` differently, which
is usually what you want, but code that assumes a phrase is always present
will need to handle the empty string.

The parser requires the status line to start at the first character. Leading
whitespace is rejected rather than trimmed, because a status line is defined
to begin at the start of the line and silently accepting indentation hides
framing bugs in the caller.

Note that the version is written as `<major>.<minor>`; `HTTP/2` alone is not
accepted, so use `HTTP/2.0` when the minor version is zero.
