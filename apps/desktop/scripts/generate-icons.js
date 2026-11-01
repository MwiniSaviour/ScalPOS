const fs = require("fs")
const path = require("path")

const sizes = [192, 512]

function generateSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#4f46e5"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#g)"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui, sans-serif" font-weight="bold"
        font-size="${size * 0.5}px" fill="white">S</text>
  <text x="50%" y="${size * 0.75}" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui, sans-serif" font-weight="500"
        font-size="${size * 0.1}px" fill="rgba(255,255,255,0.8)">SCAN</text>
</svg>`
}

const publicDir = path.join(__dirname, "..", "public")

for (const size of sizes) {
  const svg = generateSVG(size)
  fs.writeFileSync(path.join(publicDir, `icon-${size}x${size}.svg`), svg)
  console.log(`Created icon-${size}x${size}.svg`)
}

// Also create apple-touch-icon as SVG (iOS 13+ supports SVG)
fs.writeFileSync(
  path.join(publicDir, "apple-touch-icon.svg"),
  generateSVG(180)
)
console.log("Created apple-touch-icon.svg")

console.log("Done generating icons")
