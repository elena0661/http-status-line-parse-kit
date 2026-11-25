import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseStatusLine, parseStatusCode, ParseError } from '../src/index.js';

test('parses a canonical HTTP/1.1 status line', () => {
  const result = parseStatusLine('HTTP/1.1 200 OK');
  assert.deepEqual(result, {
    protocol: 'HTTP',
    version: { major: 1, minor: 1 },
    statusCode: 200,
    reasonPhrase: 'OK',
  });
});

test('parses a multi-word reason phrase', () => {
  const result = parseStatusLine('HTTP/1.0 404 Not Found');
  assert.equal(result.reasonPhrase, 'Not Found');
  assert.equal(result.statusCode, 404);
});

test('accepts a missing reason phrase and yields an empty string', () => {
  const result = parseStatusLine('HTTP/2.0 204');
  assert.deepEqual(result, {
    protocol: 'HTTP',
    version: { major: 2, minor: 0 },
    statusCode: 204,
    reasonPhrase: '',
  });
});

test('normalises the protocol token to uppercase', () => {
  assert.equal(parseStatusLine('http/1.1 200 OK').protocol, 'HTTP');
});

test('strips a trailing CRLF from a socket read', () => {
  const result = parseStatusLine('HTTP/1.1 200 OK\r\n');
  assert.equal(result.reasonPhrase, 'OK');
});

test('parses a non-1.x version', () => {
  const result = parseStatusLine('HTTP/3.0 103 Early Hints');
  assert.deepEqual(result.version, { major: 3, minor: 0 });
});

test('rejects an empty string', () => {
  assert.throws(() => parseStatusLine(''), ParseError);
});

test('rejects a line with no status code', () => {
  assert.throws(() => parseStatusLine('HTTP/1.1'), ParseError);
});

test('rejects a two-digit status code', () => {
  assert.throws(() => parseStatusLine('HTTP/1.1 20 OK'), ParseError);
});

test('rejects a four-digit status code', () => {
  assert.throws(() => parseStatusLine('HTTP/1.1 2000 OK'), ParseError);
});

test('rejects a missing version', () => {
  assert.throws(() => parseStatusLine('HTTP 200 OK'), ParseError);
});

test('rejects leading whitespace', () => {
  assert.throws(() => parseStatusLine(' HTTP/1.1 200 OK'), ParseError);
});

test('rejects a non-string input', () => {
  assert.throws(() => parseStatusLine(null), ParseError);
});

test('parseStatusCode returns just the number', () => {
  assert.equal(parseStatusCode('HTTP/1.1 503 Service Unavailable'), 503);
});

test('ParseError carries the offending input', () => {
  try {
    parseStatusLine('nonsense');
    assert.fail('expected ParseError');
  } catch (err) {
    assert.ok(err instanceof ParseError);
    assert.equal(err.input, 'nonsense');
  }
});
