#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 读取原始plugin.json
const pluginJsonPath = path.join(__dirname, '../plugin.json');
const distPluginJsonPath = path.join(__dirname, '../dist/plugin.json');

console.log('读取原始plugin.json...');
const originalConfig = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));

// 创建dist版本的配置
const distConfig = JSON.parse(JSON.stringify(originalConfig));

// 修正路径配置
console.log('修正路径配置...');

// 主入口文件路径修正
if (distConfig.main) {
  distConfig.main = distConfig.main.replace(/^dist\//, '');
}

// 开发环境入口文件路径修正
if (distConfig.development && distConfig.development.main) {
  distConfig.development.main = distConfig.development.main.replace(/^dist\//, '');
}

// 功能入口文件路径修正
if (distConfig.features && Array.isArray(distConfig.features)) {
  distConfig.features.forEach(feature => {
    if (feature.main) {
      feature.main = feature.main.replace(/^dist\//, '');
    }
  });
}

// 写入dist目录的plugin.json
console.log('写入dist/plugin.json...');
fs.writeFileSync(distPluginJsonPath, JSON.stringify(distConfig, null, 2), 'utf8');

console.log('✅ plugin.json路径修正完成！');
console.log('原始main:', originalConfig.main);
console.log('修正后main:', distConfig.main);

if (distConfig.features) {
  console.log('功能路径修正：');
  distConfig.features.forEach((feature, index) => {
    console.log(`  ${feature.code}: ${originalConfig.features[index].main} -> ${feature.main}`);
  });
}