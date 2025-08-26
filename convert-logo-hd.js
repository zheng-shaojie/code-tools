const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function convertSvgToPng() {
  try {
    // 使用sharp直接转换SVG到PNG，使用更高分辨率
    const svgFilePath = path.join(__dirname, 'final_logo.svg');
    const pngFilePath = path.join(__dirname, 'logo.png');
    
    await sharp(svgFilePath)
      .resize(1024, 1024) // 使用更高分辨率
      .png({ quality: 100, compressionLevel: 0 }) // 最高质量
      .toFile(pngFilePath);
    
    console.log('SVG已成功转换为高分辨率PNG格式:', pngFilePath);
  } catch (error) {
    console.error('转换过程中出现错误:', error);
  }
}

convertSvgToPng();