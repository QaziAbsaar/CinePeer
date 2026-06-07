/**
 * Generate platform icons from icon.svg.
 * Produces: icon.png (256x256), icon.ico (Windows), icon.icns (macOS)
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const SVG_PATH = path.join(__dirname, '..', 'icon.svg')
const PNG_PATH = path.join(__dirname, '..', 'icon.png')

async function generate() {
  if (!fs.existsSync(SVG_PATH)) {
    console.error('icon.svg not found at', SVG_PATH)
    process.exit(1)
  }

  const svgBuffer = fs.readFileSync(SVG_PATH)

  // Generate 256x256 PNG (good for Electron window icon + all platforms)
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(PNG_PATH)

  console.log('✅ Generated icon.png (256x256)')
}

generate().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
