import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputSvg = join(__dirname, '../public/favicon.svg');
const svgBuffer = readFileSync(inputSvg);

const sizes = [192, 512];

async function generateIcons() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(__dirname, `../public/pwa-${size}x${size}.png`));
    console.log(`Generated pwa-${size}x${size}.png`);
  }

  // Maskable icon (with padding/background if needed, but for now just the resized icon is fine or with a background)
  await sharp(svgBuffer)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 9, g: 9, b: 11, alpha: 1 } // #09090b
    })
    .png()
    .toFile(join(__dirname, `../public/maskable-icon-512x512.png`));
  console.log(`Generated maskable-icon-512x512.png`);
}

generateIcons().catch(console.error);
