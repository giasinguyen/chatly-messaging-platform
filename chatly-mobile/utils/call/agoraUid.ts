const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const MAX_AGORA_UID = 2147483647;

export function buildAgoraUidKey(userId: string): string {
  let crc = 0xffffffff;
  for (let index = 0; index < userId.length; index += 1) {
    const code = userId.charCodeAt(index);
    crc = CRC32_TABLE[(crc ^ code) & 0xff] ^ (crc >>> 8);
  }

  const unsignedCrc = (crc ^ 0xffffffff) >>> 0;
  return String((unsignedCrc % MAX_AGORA_UID) + 1);
}
