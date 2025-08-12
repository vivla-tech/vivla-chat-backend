// Invisible chars
const ZW0 = '\u200B'; // 0
const ZW1 = '\u200C'; // 1
const START = '\u2063\u2060';
const END = '\u2060\u2063';

// Convierte string → bytes
function stringToBytes(s) {
  return new TextEncoder().encode(s);
}

// Convierte bytes → string
function bytesToString(b) {
  return new TextDecoder().decode(b);
}

// bytes → bits "0101..."
function bytesToBits(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(2).padStart(8, '0'))
    .join('');
}

// bits → bytes
function bitsToBytes(bits) {
  const arr = [];
  for (let i = 0; i < bits.length; i += 8) {
    arr.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(arr);
}

// client_message_id → bloque invisible
export function encodeInvisible(clientMessageId) {
  const bits = bytesToBits(stringToBytes(clientMessageId));
  const payload = bits.replace(/0/g, ZW0).replace(/1/g, ZW1);
  return START + payload + END;
}

// Extrae y decodifica; devuelve { clientMessageId?, cleanContent }
export function decodeInvisible(content) {
  const startIdx = content.indexOf(START);
  const endIdx = content.indexOf(END, startIdx + START.length);
  if (startIdx === -1 || endIdx === -1) return { cleanContent: content };

  const encoded = content.slice(startIdx + START.length, endIdx);
  const bits = encoded
    .replace(new RegExp(ZW0, 'g'), '0')
    .replace(new RegExp(ZW1, 'g'), '1');

  // bits length debe ser múltiplo de 8
  if (bits.length % 8 !== 0) return { cleanContent: content };

  const id = bytesToString(bitsToBytes(bits));

  // quita el bloque invisible del content
  const cleanContent = content.slice(0, startIdx) + content.slice(endIdx + END.length);
  console.log('🔍 Client message ID:', id);
  console.log('🔍 Clean content:', cleanContent);
  return { clientMessageId: id, cleanContent };
}
