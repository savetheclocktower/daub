// Find the next "balanced" occurrence of the token. Searches through the
// string unit by unit. Whenever the `paired` token is encountered, the
// stack size increases by 1. When `token` is encountered, the stack size
// decreases by 1, and if the stack size is already 0, that's our desired
// token.
function balance(source, token, paired, options = {}) {
  options = Object.assign(
    { startIndex: 0, stackDepth: 0, considerEscapes: true },
    options
  );

  let lastChar;
  let { startIndex, stackDepth, considerEscapes } = options;
  let tl = token.length;
  let pl = paired.length;
  let length = source.length;

  for (let i = startIndex; i < length; i++) {
    if (i > 0) { lastChar = source.slice(i - 1, i); }
    let escaped = considerEscapes ? (lastChar === '\\') : false;
    let candidate = source.slice(i, i + tl);
    let pairCandidate = source.slice(i, i + pl);

    if (pairCandidate === paired && !escaped) {
      stackDepth++;
    }

    if (candidate === token && !escaped) {
      stackDepth--;
      if (stackDepth === 0) { return i; }
    }
  }

  return -1;
}

// Given a multiline string, removes all space at the beginnings of lines.
// Lets us define replacement strings with indentation, yet have all that
// extraneous space stripped out before it gets into the replacement.
function compact (str) {
  str = str.replace(/^[\s\t]*/mg, '');
  str = str.replace(/\n/g, '');
  return str;
}

// Wrap a string in a `span` with the given class name.
function wrap (str, className) {
  if (!str) { return ''; }
  return `<span class="${className}">${str}</span>`;
}


function _isEscapedHash (line, index) {
  return (index === 0) ? false : line.charAt(index - 1) === '\\';
}

function _trimCommentsFromLine (line) {
  let hashIndex = -1;
  do { hashIndex = line.indexOf('#', hashIndex + 1); }
  while ( hashIndex > -1 && _isEscapedHash(line, hashIndex) );

  if (hashIndex > -1) { line = line.substring(0, hashIndex); }
  line = line.trim();
  return line;
}

// A tagged template literal that allows you to define a verbose regular
// expression using backticks. Literal whitespace is ignored, and you can use
// `#` to mark comments. This makes long regular expressions way easier for
// humans to read and write.
//
// Escape sequences _do not_ need to be double-escaped, with one exception:
// capture group backreferences like \5 need to be written as \\5, because JS
// doesn't understand that syntax outside of a literal RegExp.
function VerboseRegExp (str, flags = '') {
  let raw = str.raw[0];

  let pattern = raw.split(/\n/)
    .map(_trimCommentsFromLine)
    .join('')
    .replace(/\s/g, '');

  // Take (e.g.) `\\5` and turn it into `\5`. For some reason we can't do
  // this with raw strings.
  pattern = pattern.replace(/(\\)(\\)(\d+)/g, (m, _, bs, d) => {
    return `${bs}${d}`;
  });

  let result = new RegExp(pattern, flags);
  return result;
}

function regexpEscape (str) {
  return str.replace(
    /[-\/\\^$*+?.()|[\]{}]/g,
    '\\$&'
  );
}

function balanceQuotes (text, iterator, options = {}) {
  options = {
    character: '"',
    startIndex: 0,
    breakWhenStackBalances: false,
    ...options
  };

  let { startIndex, character } = options;

  let pattern = new RegExp(character, 'g');
  // pattern.lastIndex = startIndex;
  let count = 0;

  let isOpen = false;
  let initialized = false;
  let lastIndex;
  let currentIndex = startIndex;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    lastIndex = currentIndex;
    let found = pattern.exec(text);
    if (!found || found.index === -1) {
      break;
    }
    count++;
    isOpen = (count % 2 === 1);
    initialized = true;
    currentIndex = found.index + found[0].length;

    let iteratorResult = iterator(
      isOpen,
      { currentIndex, lastIndex },
      {
        currentSlice: text.slice(currentIndex, text.length),
        lastSlice: text.slice(lastIndex, currentIndex)
      },
      false
    );

    if (iteratorResult === false) { break; }
    if ((!isOpen && initialized) && options.breakWhenStackBalances) { break; }
    if (currentIndex < lastIndex) {
      throw new Error(`Infinite loop detected!`);
    }
  }

  iterator(
    isOpen,
    { currentIndex: text.length, lastIndex: currentIndex },
    {
      currentSlice: text.slice(currentIndex, text.length),
      lastSlice: text.slice(currentIndex, text.length)
    },
    true
  );

  return currentIndex;
}


function balancePattern (text, patternOpen, patternClose, options = {}) {
  options = {
    startIndex: 0,
    stackDepth: 0,
    iterator: () => {},
    breakWhenStackIsZero: true,
    ...options
  };

  let { stackDepth: depth, startIndex } = options;

  patternOpen.lastIndex = startIndex;
  patternClose.lastIndex = startIndex;

  let initialized = depth > 0;

  let lastIndex;
  let currentIndex = startIndex;
  while ((depth > 0 || !initialized) && options.breakWhenStackIsZero) {
    lastIndex = currentIndex;
    let foundOpen = patternOpen.exec(text);
    let foundClose = patternClose.exec(text);

    if (!foundOpen && !foundClose) {
      return -1;
    } else if (!foundClose) {
      // Only the close pattern matched; use its index.
      currentIndex = foundOpen.index + foundOpen[0].length;
      depth++;
      initialized = true;
    } else if (!foundOpen) {
      currentIndex = foundClose.index + foundClose[0].length;
      depth--;
      initialized = true;
    } else {
      // Both patterns matched.
      if (foundOpen.index === foundClose.index) {
        throw new Error(`Poorly written balancers! Matched on same index.`);
      }
      if (foundOpen.index < foundClose.index) {
        currentIndex = foundOpen.index + foundOpen[0].length;
        depth++;
        initialized = true;
      } else {
        currentIndex = foundClose.index + foundClose[0].length;
        depth--;
        initialized = true;
      }
    }

    patternOpen.lastIndex = currentIndex;
    patternClose.lastIndex = currentIndex;
    let iteratorResult = options.iterator(
      depth,
      currentIndex,
      text.slice(currentIndex, text.length)
    );
    if (iteratorResult === false) { break; }
    if (currentIndex < lastIndex) {
      throw new Error(`Infinite loop detected!`);
    }
  }

  // If we get this far, the stack depth is back at 0.
  // console.log(`Balanced at index: ${currentIndex} ${text.slice(startIndex, currentIndex)}`);
  return currentIndex;
}

function flatten (array) {
  var result = [];
  (function flat(array) {
    array.forEach(el => {
      if (Array.isArray(el)) { flat(el); }
      else { result.push(el); }
    });
  })(array);
  return result;
}

function _getLastToken (results) {
  for (let i = results.length - 1; i >= 0; i--) {
    let token = results[i];
    if (typeof token === 'string') { continue; }
    if ( Array.isArray(token.content) ) {
      return _getLastToken(token.content);
    } else {
      return token;
    }
  }
  return null;
}

function balanceByLexer (text, lexer) {
  console.debug(`balanceByLexer`, text, lexer);
  let results = lexer.run(text);
  let lastToken = _getLastToken(results.tokens);
  return lastToken.index + lastToken.content.length - 1;
}

function flattenTokens (tokens) {
  let result = [];
  function f (tokens) {
    tokens.forEach(token => {
      result.push(token);
      if (Array.isArray(token.content)) {
        f(token.content);
      }
    });
  }
  f(tokens);
  return result;
}

export {
  balance,
  balanceByLexer,
  balancePattern,
  balanceQuotes,
  compact,
  flattenTokens,
  wrap,
  VerboseRegExp,
  regexpEscape
};
