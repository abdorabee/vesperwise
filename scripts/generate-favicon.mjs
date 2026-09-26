import sharp from "sharp";
import toIco from "to-ico";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "scripts/assets/vesperwise-favicon-source.png"));

const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

let minX = info.width;
let minY = info.height;
let maxX = 0;
let maxY = 0;

for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const index = (y * info.width + x) * info.channels;
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];

    if (alpha > 16 && red > 160 && green > 200 && blue < 80) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
}

if (maxX < minX || maxY < minY) {
  throw new Error("Unable to find the VesperWise lime mark in scripts/assets/vesperwise-favicon-source.png");
}

const mark = await sharp(source)
  .extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  })
  .resize(860, 860, {
    fit: "inside",
  })
  .png()
  .toBuffer();

const favicon = await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: "#000000",
  },
})
  .composite([{ input: mark, gravity: "center" }])
  .png()
  .toBuffer();

const pngs = await Promise.all(
  [16, 32, 48].map((size) => sharp(favicon).resize(size, size).png().toBuffer()),
);

const ico = await toIco(pngs);
writeFileSync(join(root, "app/favicon.ico"), ico);
writeFileSync(join(root, "public/favicon.ico"), ico);
await sharp(favicon).resize(96, 96).png().toFile(join(root, "public/favicon-96x96.png"));
await sharp(favicon).resize(180, 180).png().toFile(join(root, "public/apple-touch-icon.png"));

console.log("Generated app/favicon.ico, public/favicon.ico, public/favicon-96x96.png, public/apple-touch-icon.png");
