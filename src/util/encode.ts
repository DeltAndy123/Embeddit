const encodingChars = "1234567890abcdefghijklmnopqrstuvwxyz";

// Encode data into an ID for the Mastodon spoof API (only supports alphanumeric, no underscores/hyphen)
export function idEncode(str: string) {
  let encoded = "";
  for (let char of str) {
    const charCode = char.charCodeAt(0);
    const firstCode = Math.floor(charCode / encodingChars.length);
    const secondCode = charCode % encodingChars.length;
    encoded += encodingChars[firstCode] + encodingChars[secondCode];
  }
  return encoded;
}

// Decode strings encoded using above method back to original text
export function idDecode(encoded: string) {
  let decoded = "";
  for (let i = 0; i < encoded.length; i += 2) {
    const firstChar = encoded.charAt(i);
    const secondChar = encoded.charAt(i + 1);
    const firstCode = encodingChars.indexOf(firstChar);
    const secondCode = encodingChars.indexOf(secondChar);
    const code = (firstCode * encodingChars.length) + secondCode;
    decoded += String.fromCharCode(code);
  }
  return decoded;
}

export function encodeObj(obj: Record<string, any>) {
  return idEncode(JSON.stringify(obj));
}

export function decodeObj(encoded: string): Record<string, any> {
  return JSON.parse(idDecode(encoded))
}