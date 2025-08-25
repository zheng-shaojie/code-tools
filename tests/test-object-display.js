// 测试嵌套数组对象显示修复 (CommonJS版本)
console.log('🧪 测试嵌套数组对象显示修复\n');

// 模拟JsonProcessor类的修复版本
class JsonProcessor {
  /**
   * 格式化单个值用于显示
   * @param {any} value - 要格式化的值
   * @returns {string} 格式化后的字符串
   */
  static formatValue(value) {
    if (value === null) {
      return 'null'
    }
    if (value === undefined) {
      return 'undefined'
    }
    if (typeof value === 'string') {
      return value
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    if (typeof value === 'object') {
      try {
        // 对于对象和数组，格式化为紧凑的JSON
        return JSON.stringify(value)
      } catch (error) {
        // 如果JSON.stringify失败（如循环引用），返回类型描述
        return Array.isArray(value) ? `[Array(${value.length})]` : '[Object]'
      }
    }
    return String(value)
  }

  /**
   * 将数组转换为字符串（用于单个字段显示）
   * @param {Array} array - 数组数据
   * @param {string} separator - 分隔符，默认为逗号
   * @returns {string} 转换后的字符串
   */
  static arrayToString(array, separator = ', ') {
    if (!Array.isArray(array)) {
      // 如果不是数组，直接格式化单个值
      return JsonProcessor.formatValue(array)
    }

    return array.map(item => JsonProcessor.formatValue(item)).join(separator)
  }

  /**
   * 提取数组中的所有元素（模拟版本）
   */
  static extractArrayItems(sourceData, itemPath = '') {
    try {
      const data = JSON.parse(sourceData)
      if (!Array.isArray(data)) {
        throw new Error('数据不是数组类型')
      }

      if (!itemPath) {
        return data
      }

      const results = []
      data.forEach((item, index) => {
        try {
          const extracted = JsonProcessor.getValueByPath(item, itemPath)
          if (Array.isArray(extracted)) {
            results.push(...extracted)
          } else {
            results.push(extracted)
          }
        } catch (error) {
          console.warn(`提取数组第${index}项时出错:`, error)
          results.push(null)
        }
      })
      
      return results
    } catch (error) {
      throw new Error('数组提取失败: ' + error.message)
    }
  }

  /**
   * 根据路径从对象中获取值（简化版本）
   */
  static getValueByPath(obj, path) {
    if (!path) return obj
    
    const parts = path.split('.')
    let current = obj
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined
      }
      current = current[part]
    }
    
    return current
  }
}

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
  console.log('修复前 (会显示[object Object]):', skillsArrays.map(item => String(item)).join(', '));
  console.log('修复后 (正确显示JSON):', JsonProcessor.arrayToString(skillsArrays));
} catch (error) {
  console.log('❌ 错误:', error.message);
}

// 测试2: 提取details对象
console.log('\n🔧 测试2: 提取details对象');
try {
  const details = JsonProcessor.extractArrayItems(jsonString, 'details');
  console.log('提取结果:', details);
  console.log('修复前 (会显示[object Object]):', details.map(item => String(item)).join(', '));
  console.log('修复后 (正确显示JSON):', JsonProcessor.arrayToString(details));
} catch (error) {
  console.log('❌ 错误:', error.message);
}

// 测试3: 测试formatValue方法的各种情况
console.log('\n🔧 测试3: 测试formatValue方法');
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
  console.log(`值 ${index + 1}:`, value);
  console.log(`修复前 (String())：`, String(value));
  console.log(`修复后 (formatValue())：`, JsonProcessor.formatValue(value));
  console.log('');
});

// 测试4: 模拟实际使用场景
console.log('\n🔧 测试4: 模拟实际Excel使用场景');
console.log('场景：Excel中有一列包含JSON数组，每个数组元素是对象');

const excelCellData = '[{"product": "iPhone", "price": 999}, {"product": "iPad", "price": 599}]';
console.log('Excel单元格数据:', excelCellData);

try {
  const arrayItems = JsonProcessor.extractArrayItems(excelCellData, '');
  console.log('提取的数组项:', arrayItems);
  console.log('修复前显示:', arrayItems.map(item => String(item)).join(', '));
  console.log('修复后显示:', JsonProcessor.arrayToString(arrayItems));
  
} catch (error) {
  console.log('❌ 错误:', error.message);
}

console.log('\n✨ 测试完成！');
console.log('\n🎯 总结：');
console.log('- 修复前：对象显示为 "[object Object]"');
console.log('- 修复后：对象显示为完整的JSON字符串，如 {"name":"John","age":30}');
console.log('- 这样用户就能看到对象的实际内容，而不是无意义的 [object Object]');