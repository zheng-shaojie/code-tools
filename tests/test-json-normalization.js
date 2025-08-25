// JSON规范化功能测试脚本
// 模拟JsonProcessor类的功能进行测试

class JsonProcessor {
  /**
   * 规范化JSON字符串，修复常见的格式问题
   * @param {string} jsonString - 可能不标准的JSON字符串
   * @returns {string} 规范化后的JSON字符串
   */
  static normalizeJsonString(jsonString) {
    if (typeof jsonString !== 'string') {
      return jsonString
    }

    let normalized = jsonString.trim()
    
    // 1. 处理单引号替换为双引号
    normalized = normalized.replace(/'/g, '"')
    
    // 2. 处理正则表达式（在属性名处理之前）
    normalized = normalized.replace(/:\s*\/([^/\n\r]+)\/([gimuy]*)/g, ': "[RegExp]"')
    
    // 3. 处理属性名没有引号的情况（多次处理确保完整）
    // 第一轮：处理对象开始后的属性名
    normalized = normalized.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
    // 第二轮：处理可能漏掉的属性名
    normalized = normalized.replace(/(\s)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
    
    // 4. 处理尾随逗号
    normalized = normalized.replace(/,\s*([}\]])/g, '$1')
    
    // 5. 处理JavaScript对象表示法中的undefined
    normalized = normalized.replace(/:\s*undefined/g, ': null')
    
    // 6. 处理函数值（将其转换为字符串）
    normalized = normalized.replace(/:\s*function\s*\([^)]*\)\s*\{[^}]*\}/g, ': "[Function]"')
    
    // 7. 处理NaN和Infinity
    normalized = normalized.replace(/:\s*NaN/g, ': null')
    normalized = normalized.replace(/:\s*Infinity/g, ': null')
    normalized = normalized.replace(/:\s*-Infinity/g, ': null')
    
    // 8. 处理注释（单行和多行）
    normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '')
    normalized = normalized.replace(/\/\/.*$/gm, '')
    
    // 9. 处理多余的空白字符
    normalized = normalized.replace(/\s+/g, ' ').trim()
    
    return normalized
  }

  /**
   * 尝试解析JSON字符串，自动应用规范化
   * @param {string} jsonString - JSON字符串
   * @returns {any} 解析后的对象，如果失败则抛出错误
   */
  static safeParseJson(jsonString) {
    if (typeof jsonString !== 'string') {
      throw new Error('输入必须是字符串')
    }

    // 首先尝试直接解析
    try {
      return JSON.parse(jsonString)
    } catch (firstError) {
      // 如果失败，尝试规范化后再解析
      try {
        const normalized = JsonProcessor.normalizeJsonString(jsonString)
        return JSON.parse(normalized)
      } catch (secondError) {
        // 如果还是失败，提供更详细的错误信息
        throw new Error(`JSON解析失败: ${firstError.message}。规范化后仍然失败: ${secondError.message}`)
      }
    }
  }
}

// 测试用例
const testCases = [
  {
    name: "单引号问题",
    input: "{'name': 'John', 'age': 30}",
    expected: true
  },
  {
    name: "属性名无引号",
    input: "{name: 'Alice', userId: 123, isActive: true}",
    expected: true
  },
  {
    name: "尾随逗号",
    input: '{"items": ["apple", "banana", "orange",], "count": 3,}',
    expected: true
  },
  {
    name: "JavaScript特殊值",
    input: '{"name": "Bob", "value": undefined, "number": NaN, "inf": Infinity}',
    expected: true
  },
  {
    name: "包含注释",
    input: `{
      "name": "Carol", // 用户姓名
      /* 用户ID */ "id": 456,
      "active": true
    }`,
    expected: true
  },
  {
    name: "复杂嵌套对象",
    input: `{
      name: 'Dave',
      profile: {
        age: undefined,
        skills: ['JS', 'Vue',], // 技能列表
        regex: /test/g,
      },
      isAdmin: true,
    }`,
    expected: true
  },
  {
    name: "标准JSON（应该直接解析成功）",
    input: '{"name": "Eve", "age": 25, "items": [1, 2, 3]}',
    expected: true
  },
  {
    name: "完全无效的字符串",
    input: "这不是JSON数据",
    expected: false
  }
]

console.log("🧪 JSON规范化功能测试开始\n")

testCases.forEach((testCase, index) => {
  console.log(`📋 测试用例 ${index + 1}: ${testCase.name}`)
  console.log(`📥 输入: ${testCase.input}`)
  
  try {
    const result = JsonProcessor.safeParseJson(testCase.input)
    console.log(`✅ 解析成功:`, JSON.stringify(result, null, 2))
    
    if (testCase.expected) {
      console.log(`🎉 测试通过`)
    } else {
      console.log(`❌ 测试失败: 期望解析失败，但实际成功了`)
    }
  } catch (error) {
    console.log(`❌ 解析失败: ${error.message}`)
    
    if (!testCase.expected) {
      console.log(`🎉 测试通过`)
    } else {
      console.log(`❌ 测试失败: 期望解析成功，但实际失败了`)
    }
  }
  
  console.log(`🔄 规范化结果: ${JsonProcessor.normalizeJsonString(testCase.input)}`)
  console.log("─".repeat(80) + "\n")
})

console.log("✨ 测试完成！")

// 性能测试
console.log("\n⚡ 性能测试:")
const standardJson = '{"name": "Test", "value": 123}'
const nonStandardJson = "{name: 'Test', value: 123,}"

console.time("标准JSON解析(1000次)")
for (let i = 0; i < 1000; i++) {
  JsonProcessor.safeParseJson(standardJson)
}
console.timeEnd("标准JSON解析(1000次)")

console.time("非标准JSON解析(1000次)")
for (let i = 0; i < 1000; i++) {
  JsonProcessor.safeParseJson(nonStandardJson)
}
console.timeEnd("非标准JSON解析(1000次)")