// 测试嵌套数组对象显示修复
import { JsonProcessor } from './src/utils/jsonProcessor.js';

console.log('🧪 测试嵌套数组对象显示修复\n');

// 测试数据：包含嵌套对象的数组
const testData = [
  {
    "id": 1,
    "name": "John",
    "details": { "age": 30, "city": "Beijing" },
    "skills": [
      { "name": "JavaScript", "level": "Expert" },
      { "name": "Vue.js", "level": "Advanced" }
    ]
  },
  {
    "id": 2,
    "name": "Jane", 
    "details": { "age": 25, "city": "Shanghai" },
    "skills": [
      { "name": "Python", "level": "Intermediate" }
    ]
  }
];

const jsonString = JSON.stringify(testData);

console.log('📥 测试数据:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n' + '─'.repeat(60));

// 测试1: 提取整个skills数组
console.log('\n🔧 测试1: 提取整个skills数组');
try {
  const skillsArrays = JsonProcessor.extractArrayItems(jsonString, 'skills');
  console.log('提取结果:', skillsArrays);
  console.log('转字符串:', JsonProcessor.arrayToString(skillsArrays));
} catch (error) {
  console.log('❌ 错误:', error.message);
}

// 测试2: 提取skills数组中的name字段
console.log('\n🔧 测试2: 提取skills数组中的name字段');
try {
  const skillNames = JsonProcessor.extractArrayItems(jsonString, 'skills');
  const allNames = [];
  skillNames.forEach(skillArray => {
    if (Array.isArray(skillArray)) {
      skillArray.forEach(skill => {
        if (skill && skill.name) {
          allNames.push(skill.name);
        }
      });
    }
  });
  console.log('技能名称:', allNames);
  console.log('转字符串:', JsonProcessor.arrayToString(allNames));
} catch (error) {
  console.log('❌ 错误:', error.message);
}

// 测试3: 提取details对象
console.log('\n🔧 测试3: 提取details对象');
try {
  const details = JsonProcessor.extractArrayItems(jsonString, 'details');
  console.log('详情对象:', details);
  console.log('转字符串:', JsonProcessor.arrayToString(details));
} catch (error) {
  console.log('❌ 错误:', error.message);
}

// 测试4: 测试formatValue方法
console.log('\n🔧 测试4: 测试formatValue方法');
const testValues = [
  { name: "John", age: 30 },
  ["item1", "item2"],
  "simple string",
  42,
  true,
  null,
  undefined
];

testValues.forEach((value, index) => {
  console.log(`Value ${index + 1}:`, value);
  console.log(`Formatted:`, JsonProcessor.formatValue(value));
  console.log('');
});

console.log('✨ 测试完成！');

// 测试5: 模拟实际使用场景
console.log('\n🔧 测试5: 模拟实际使用场景');
console.log('场景：Excel中有一列包含JSON数组，每个数组元素是对象');

const excelCellData = '[{"product": "iPhone", "price": 999}, {"product": "iPad", "price": 599}]';
console.log('Excel单元格数据:', excelCellData);

try {
  // 模拟数组转字符串操作
  const arrayItems = JsonProcessor.extractArrayItems(excelCellData, '');
  console.log('提取的数组项:', arrayItems);
  console.log('格式化显示:', JsonProcessor.arrayToString(arrayItems));
  
  // 模拟提取特定字段
  const products = arrayItems.map(item => item.product);
  console.log('产品名称:', JsonProcessor.arrayToString(products));
  
} catch (error) {
  console.log('❌ 错误:', error.message);
}