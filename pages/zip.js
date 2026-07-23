/**
 * @file Minimal ZIP writer (STORE method, no compression) so the config
 * builder can package a ready-to-run download entirely in the browser,
 * without a server or an external library. The generated files are already
 * minified, so skipping deflate keeps this small without meaningfully
 * increasing the download size.
 *
 * Loaded as a plain classic script (not a module) so this page keeps working
 * when opened directly via `file://` — ES modules are blocked by CORS under
 * that scheme. `createZip` below becomes a global, same as `EditorBundle`
 * from editor.standalone.js.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

/**
 * @param {Uint8Array} bytes
 * @returns {number}
 */
function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * DOS date/time encoding used by ZIP local/central headers. Fixed value
 * (no real timestamp needed for the files being packaged here).
 * @returns {{ time: number, date: number }}
 */
function dosDateTime() {
  const now = new Date()
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  return { time, date }
}

/**
 * @param {DataView} view
 * @param {number} offset
 * @param {number} value
 */
function writeUint32(view, offset, value) {
  view.setUint32(offset, value, true)
}

/**
 * @typedef {{ path: string, data: Uint8Array }} ZipEntry
 */

/**
 * Builds a `.zip` Blob from a list of { path, data } entries.
 * @param {ZipEntry[]} files
 * @returns {Blob}
 */
function createZip(files) {
  const encoder = new TextEncoder()
  const { time, date } = dosDateTime()

  /** @type {Uint8Array[]} */
  const localParts = []
  /** @type {Uint8Array[]} */
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.path)
    const crc = crc32(file.data)
    const size = file.data.length

    const localHeader = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(localHeader.buffer)
    writeUint32(localView, 0, 0x04034b50)
    localView.setUint16(4, 20, true) // version needed
    localView.setUint16(6, 0, true) // flags
    localView.setUint16(8, 0, true) // method: 0 = store
    localView.setUint16(10, time, true)
    localView.setUint16(12, date, true)
    writeUint32(localView, 14, crc)
    writeUint32(localView, 18, size) // compressed size
    writeUint32(localView, 22, size) // uncompressed size
    localView.setUint16(26, nameBytes.length, true)
    localView.setUint16(28, 0, true) // extra field length
    localHeader.set(nameBytes, 30)

    localParts.push(localHeader, file.data)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)
    writeUint32(centralView, 0, 0x02014b50)
    centralView.setUint16(4, 20, true) // version made by
    centralView.setUint16(6, 20, true) // version needed
    centralView.setUint16(8, 0, true) // flags
    centralView.setUint16(10, 0, true) // method: 0 = store
    centralView.setUint16(12, time, true)
    centralView.setUint16(14, date, true)
    writeUint32(centralView, 16, crc)
    writeUint32(centralView, 20, size)
    writeUint32(centralView, 24, size)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint16(30, 0, true) // extra field length
    centralView.setUint16(32, 0, true) // comment length
    centralView.setUint16(34, 0, true) // disk number start
    centralView.setUint16(36, 0, true) // internal attrs
    writeUint32(centralView, 38, 0) // external attrs
    writeUint32(centralView, 42, offset)
    centralHeader.set(nameBytes, 46)

    centralParts.push(centralHeader)

    offset += localHeader.length + file.data.length
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const centralOffset = offset

  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  writeUint32(endView, 0, 0x06054b50)
  endView.setUint16(4, 0, true) // disk number
  endView.setUint16(6, 0, true) // disk with central dir
  endView.setUint16(8, files.length, true) // entries on this disk
  endView.setUint16(10, files.length, true) // total entries
  writeUint32(endView, 12, centralSize)
  writeUint32(endView, 16, centralOffset)
  endView.setUint16(20, 0, true) // comment length

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' })
}
