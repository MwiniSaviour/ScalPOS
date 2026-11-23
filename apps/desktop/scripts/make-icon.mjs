import sharp from "sharp"
import { readFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const src = path.resolve("../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png")
const out = path.resolve("electron-build/icon.ico")
const sizes = [16, 32, 48, 64, 128, 256]

const images = await Promise.all(
  sizes.map(async (size) => ({
    size,
    data: await sharp(await readFile(src)).resize(size, size, { fit: "cover" }).png().toBuffer(),
  })),
)

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(images.length, 4)

let offset = 6 + images.length * 16
const entries = []
for (const img of images) {
  const entry = Buffer.alloc(16)
  entry.writeUInt8(img.size === 256 ? 0 : img.size, 0)
  entry.writeUInt8(img.size === 256 ? 0 : img.size, 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(img.data.length, 8)
  entry.writeUInt32LE(offset, 12)
  entries.push(entry)
  offset += img.data.length
}

await mkdir(path.dirname(out), { recursive: true })
await writeFile(out, Buffer.concat([header, ...entries, ...images.map((i) => i.data)]))
console.log(`wrote ${out}`)
