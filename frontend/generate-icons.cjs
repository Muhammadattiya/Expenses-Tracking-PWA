const sharp = require('sharp');
const path = require('path');

const inputImagePath = path.join(__dirname, 'public', 'logo.jpg');
const outputDir = path.join(__dirname, 'public');

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'maskable-icon-512x512.png', size: 512 }
];

async function generateIcons() {
  for (const { name, size } of sizes) {
    await sharp(inputImagePath)
      .resize(size, size, { fit: 'cover' })
      .toFile(path.join(outputDir, name));
    console.log(`Generated ${name}`);
  }
}

generateIcons().catch(console.error);
