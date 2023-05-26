import sharp from 'sharp';
// import fs from 'fs';
import path from 'path';

const dimensions = [
  { width: 300, height: 300, ratio: 1 },
  { width: 375, height: 812, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 896, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
];

// Path to your source image file on disk
const sourceImagePath = path.resolve('./splash/favicon.png');

const backgroundColor = { r: 27, g: 28, b: 35 };

// Specify the ratio of the image's width to the canvas's width
const imageWidthRatio = 0.65;

// Loop over the dimensions array and create an image for each dimension
dimensions.forEach(async ({ width, height, ratio }, index) => {
  try {
    // Calculate the width of the image based on the width of the canvas and the desired ratio
    const imageWidth = Math.floor(width * imageWidthRatio);

    // Read the image, resize it to the calculated width while maintaining aspect ratio, and convert it to PNG
    const image = sharp(sourceImagePath).resize(imageWidth).png();

    // Create a new sharp instance for the background, resize it to the desired dimensions, set the background color, and convert it to PNG
    const finalImage = sharp({
      create: {
        width: width * ratio,
        height: height * ratio,
        channels: 3,
        background: backgroundColor,
      },
    })
      .composite([
        {
          input: await image.toBuffer(),
          gravity: 'center',
        },
      ])
      .png();

    const filename = `${width}x${height}@${ratio}x.png`;
    const outputImagePath = path.resolve(`./splash/${filename}`);
    await finalImage.toFile(outputImagePath);
    console.log(
      `<link href="./splash/${filename}" media="(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio})" rel="apple-touch-startup-image" />`
    );
  } catch (err) {
    console.error(err);
  }
});
