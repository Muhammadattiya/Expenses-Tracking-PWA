const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputImagePath = path.join(__dirname, 'public', 'images', 'finova-logo-dark.png');
const outputDir = path.join(__dirname, 'public');

// Background color matching the app theme (#141115)
const THEME_BG = { r: 20, g: 17, b: 21, alpha: 1 };

async function generateIcons() {
  console.log('Generating PWA and Mobile icons from:', inputImagePath);
  if (!fs.existsSync(inputImagePath)) {
    throw new Error(`Input image not found: ${inputImagePath}`);
  }

  // 1. Standard PWA Icons (purpose: any)
  // 192x192
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: THEME_BG
    }
  })
  .composite([
    {
      input: await sharp(inputImagePath).resize(192, 192, { fit: 'contain' }).toBuffer(),
      gravity: 'center'
    }
  ])
  .png({ quality: 100, compressionLevel: 9 })
  .toFile(path.join(outputDir, 'pwa-192x192.png'));
  console.log('✓ Generated pwa-192x192.png');

  // 512x512
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: THEME_BG
    }
  })
  .composite([
    {
      input: await sharp(inputImagePath).resize(512, 512, { fit: 'contain', kernel: 'lanczos3' }).toBuffer(),
      gravity: 'center'
    }
  ])
  .png({ quality: 100, compressionLevel: 9 })
  .toFile(path.join(outputDir, 'pwa-512x512.png'));
  console.log('✓ Generated pwa-512x512.png');

  // 2. Android Maskable Icon (purpose: maskable)
  // Android Adaptive Icons require safe zone: inner 80% circle (diameter = 410px on 512x512)
  // Background must be solid (no transparency).
  const maskableLogoSize = Math.round(512 * 0.80); // 410px
  const maskableLogoBuffer = await sharp(inputImagePath)
    .resize(maskableLogoSize, maskableLogoSize, { fit: 'contain', kernel: 'lanczos3' })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: THEME_BG
    }
  })
  .composite([
    {
      input: maskableLogoBuffer,
      gravity: 'center'
    }
  ])
  .png({ quality: 100, compressionLevel: 9 })
  .toFile(path.join(outputDir, 'maskable-icon-512x512.png'));
  console.log('✓ Generated maskable-icon-512x512.png (with Android 80% safe zone)');

  // 3. Apple Touch Icons for iOS Safari
  // iOS does not support transparency - transparent pixels become pitch black.
  // Solid background with the circular logo centered creates a flawless squircle icon on iOS.
  const appleTouchBuffer = await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: THEME_BG
    }
  })
  .composite([
    {
      input: await sharp(inputImagePath).resize(180, 180, { fit: 'contain', kernel: 'lanczos3' }).toBuffer(),
      gravity: 'center'
    }
  ])
  .removeAlpha() // Ensure no alpha channel so iOS renders perfectly without black box
  .png({ quality: 100, compressionLevel: 9 })
  .toBuffer();

  await fs.promises.writeFile(path.join(outputDir, 'apple-touch-icon-180x180.png'), appleTouchBuffer);
  console.log('✓ Generated apple-touch-icon-180x180.png (opaque for iOS)');

  await fs.promises.writeFile(path.join(outputDir, 'apple-touch-icon.png'), appleTouchBuffer);
  console.log('✓ Generated apple-touch-icon.png (root fallback for iOS)');

  await fs.promises.writeFile(path.join(outputDir, 'apple-touch-icon-precomposed.png'), appleTouchBuffer);
  console.log('✓ Generated apple-touch-icon-precomposed.png');

  // 4. Favicon PNGs
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: THEME_BG
    }
  })
  .composite([
    {
      input: await sharp(inputImagePath).resize(512, 512, { fit: 'contain', kernel: 'lanczos3' }).toBuffer(),
      gravity: 'center'
    }
  ])
  .png({ quality: 100, compressionLevel: 9 })
  .toFile(path.join(outputDir, 'favicon.png'));
  console.log('✓ Generated favicon.png (512x512)');

  // Favicon 32x32 and 16x16
  await sharp(inputImagePath)
    .resize(32, 32, { fit: 'contain', background: THEME_BG })
    .png()
    .toFile(path.join(outputDir, 'favicon-32x32.png'));
  console.log('✓ Generated favicon-32x32.png');

  await sharp(inputImagePath)
    .resize(16, 16, { fit: 'contain', background: THEME_BG })
    .png()
    .toFile(path.join(outputDir, 'favicon-16x16.png'));
  console.log('✓ Generated favicon-16x16.png');

  // 5. Multi-size favicon.ico (16, 32, 48)
  const icoSizes = [16, 32, 48];
  const pngBuffers = [];
  for (const s of icoSizes) {
    const buf = await sharp(inputImagePath)
      .resize(s, s, { fit: 'contain', background: THEME_BG })
      .png()
      .toBuffer();
    pngBuffers.push({ size: s, buffer: buf });
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(icoSizes.length, 4); // count

  let offset = 6 + icoSizes.length * 16;
  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size, 0); // width
    entry.writeUInt8(item.size, 1); // height
    entry.writeUInt8(0, 2); // colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(item.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += item.buffer.length;
  }

  const icoBuf = Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
  await fs.promises.writeFile(path.join(outputDir, 'favicon.ico'), icoBuf);
  console.log('✓ Generated favicon.ico (multi-layer 16, 32, 48)');

  // 6. Overwrite logo.jpg with a 1024x1024 high-res version of the new logo
  // so nothing ever references the old white 'f' logo!
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: { r: 20, g: 17, b: 21 }
    }
  })
  .composite([
    {
      input: await sharp(inputImagePath).resize(1024, 1024, { fit: 'contain', kernel: 'lanczos3' }).toBuffer(),
      gravity: 'center'
    }
  ])
  .jpeg({ quality: 95 })
  .toFile(path.join(outputDir, 'logo.jpg'));
  console.log('✓ Overwrote logo.jpg with new Finova emblem');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
