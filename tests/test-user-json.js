// 测试用户提供的有问题的JSON字符串
const JsonProcessor = require('./src/utils/jsonProcessor.js').JsonProcessor || class JsonProcessor {
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
    
    // 10. 尝试修复常见的语法错误
    // 修复缺少冒号的情况 (如 "c", [...] 应该是 "c": [...])
    normalized = normalized.replace(/("[^"]*"),\s*(\[|\{)/g, '$1: $2')
    
    // 修复数组或对象前缺少引号的键
    normalized = normalized.replace(/,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*,\s*(\[|\{)/g, ', "$1": $2')
    
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

// 用户提供的有问题的JSON字符串
const userJsonString = `{
    "a": 1,
    "b": 2,
"c", [{
"a": 1
}]
}`

console.log("🧪 测试用户提供的JSON字符串\n")
console.log("📥 原始输入:")
console.log(userJsonString)
console.log("\n" + "─".repeat(60))

console.log("\n🔍 问题分析:")
console.log("1. 'c', [...]' - 这里缺少冒号，应该是 'c': [...]")
console.log("2. 键值对的语法错误：键和值之间应该用冒号(:)而不是逗号(,)")

try {
  console.log("\n🔧 尝试规范化:")
  const normalized = JsonProcessor.normalizeJsonString(userJsonString)
  console.log("规范化结果:", normalized)
  
  console.log("\n✅ 尝试解析规范化后的JSON:")
  const result = JsonProcessor.safeParseJson(userJsonString)
  console.log("解析成功:", JSON.stringify(result, null, 2))
} catch (error) {
  console.log("\n❌ 解析失败:", error.message)
  
  console.log("\n🛠️ 手动修复建议:")
  const manualFix = userJsonString.replace(/"c",\s*\[/g, '"c": [')
  console.log("建议修复为:", manualFix)
  
  try {
    const fixedResult = JSON.parse(manualFix)
    console.log("✅ 手动修复后解析成功:", JSON.stringify(fixedResult, null, 2))
  } catch (fixError) {
    console.log("❌ 手动修复后仍然失败:", fixError.message)
  }
}

console.log("\n📚 正确的JSON格式应该是:")
const correctJson = `{
    "a": 1,
    "b": 2,
    "c": [{
        "a": 1
    }]
}`
console.log(correctJson)

try {
  const correctResult = JSON.parse(correctJson)
  console.log("✅ 正确格式解析成功:", JSON.stringify(correctResult, null, 2))
} catch (error) {
  console.log("❌ 正确格式解析失败:", error.message)
}