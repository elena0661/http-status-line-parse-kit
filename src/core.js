// Core parsing logic for the HTTP status line.
//
// A status line looks like:
//
//   HTTP/1.1 200 OK
//   HTTP/1.0 404 Not Found
//   HTTP/2 204
//
// The reason phrase is optional (HTTP/1.0 and HTTP/1.1 allow it to be
// empty, and HTTP/2 and later define no reason phrase at all). The protocol
// token is case-sensitive per RFC 7230 (it is literally "HTTP"), but we
// accept any case because some broken clients send "http/1.1" and rejecting
// them buys nothing.

/**
 * Error thrown for malformed status lines. Carries the raw input so callers
 * can log or re-throw with context without re-parsing.
 */
export class ParseError extends Error {
  constructor(message, input) {
    super(message);
    this.name = 'ParseError';
    this.input = input;
  }
}

// Matches: <name>/<major>.<minor> <code> [<reason>]
// The reason phrase is captured greedily but may be absent, in which case
// the third group is undefined. We do not allow leading whitespace before
// the protocol token: a status line starts at the beginning of the line.
const STATUS_LINE_RE = /^([A-Za-z]+)\/(\d+)\.(\d+)[ \t]+(\d{3})(?:[ \t]+(.*))?$/;

/**
 * Parse a single HTTP status line.
 *
 * @param {string} line The raw status line, without a trailing CR/LF.
 * @returns {{protocol: string, version: {major: number, minor: number}, statusCode: number, reasonPhrase: string}}
 * @throws {ParseError} If the line does not match the status-line grammar.
 */
export function parseStatusLine(line) {
  if (typeof line !== 'string') {
    throw new ParseError('status line must be a string', line);
  }

  // A trailing CR or LF is a transport artifact, not part of the line.
  // Stripping it here keeps the regex honest for callers that hand us a
  // line straight from a socket read.
  const trimmed = line.replace(/[\r\n]+$/, '');

  const match = STATUS_LINE_RE.exec(trimmed);
  if (match === null) {
    throw new ParseError(`malformed status line: ${JSON.stringify(line)}`, line);
  }

  const [, protocol, majorText, minorText, codeText, reason] = match;

  const major = Number.parseInt(majorText, 10);
  const minor = Number.parseInt(minorText, 10);
  const statusCode = Number.parseInt(codeText, 10);

  // The reason phrase defaults to the empty string rather than undefined.
  // Callers overwhelmingly want a string they can print; making them
  // coalesce undefined every time is noise.
  return {
    protocol: protocol.toUpperCase(),
    version: { major, minor },
    statusCode,
    reasonPhrase: reason === undefined ? '' : reason,
  };
}

/**
 * Convenience helper: extract only the numeric status code.
 *
 * @param {string} line The raw status line.
 * @returns {number}
 * @throws {ParseError} If the line does not match the status-line grammar.
 */
export function parseStatusCode(line) {
  return parseStatusLine(line).statusCode;
}
