import * as sharp from 'sharp';

const sizes = [16, 19, 24, 32, 48, 64, 128];
const sourceIcon = 'resources/IconSourceFile_Transparent.png';
const outputDir = 'resources/icons/';

sizes.forEach(size => {
  sharp(sourceIcon)
    .resize(size, size)
    .toFile(`${outputDir}${size}x${size}.png`, (err: Error) => {
      if (err) throw err;
      console.log(`Icon ${size}x${size} created`);
    });
});
