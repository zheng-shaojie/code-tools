/**
 * 测试对象类型路径建议功能
 * 验证getObjectPathSuggestions方法是否正常工作
 */

import { JsonProcessor } from '../src/utils/jsonProcessor.js'

console.log('🔍 测试对象类型路径建议功能\n')

// 测试对象数据
const testObjectData = {
  "user": {
    "id": 123,
    "profile": {
      "name": "张三",
      "email": "zhangsan@example.com",
      "contact": {
        "phone": "13800138000",
        "address": {
          "city": "北京",
          "district": "朝阳区"
        }
      }
    },
    "settings": {
      "theme": "dark",
      "notifications": {
        "email": true,
        "sms": false
      }
    }
  },
  "permissions": ["read", "write", "admin"],
  "isActive": true,
  "lastLogin": "2023-12-01T10:30:00Z"
}

console.log('=== 测试1: getObjectPathSuggestions 方法存在性检查 ===')
if (typeof JsonProcessor.getObjectPathSuggestions === 'function') {
  console.log('✅ getObjectPathSuggestions 方法存在')
} else {
  console.log('❌ getObjectPathSuggestions 方法不存在')
  console.log('可用方法:', Object.getOwnPropertyNames(JsonProcessor).filter(name => typeof JsonProcessor[name] === 'function'))
}

console.log('\n=== 测试2: 对象路径建议生成 ===')
try {
  const suggestions = JsonProcessor.getObjectPathSuggestions(JSON.stringify(testObjectData))
  
  console.log(`生成了 ${suggestions.length} 个路径建议:`)
  console.log('')
  
  suggestions.forEach((suggestion, index) => {
    console.log(`${index + 1}. ${suggestion.label}`)
    console.log(`   路径: ${suggestion.path}`)
    console.log(`   描述: ${suggestion.description}`)
    console.log(`   类型: ${suggestion.type}, 深度: ${suggestion.depth}`)
    console.log('')
  })
  
  if (suggestions.length > 0) {
    console.log('✅ 对象路径建议生成成功')
  } else {
    console.log('❌ 对象路径建议为空')
  }
} catch (error) {
  console.log('❌ 对象路径建议生成失败:', error.message)
}

console.log('\n=== 测试3: 数据类型检测 ===')
try {
  const dataType = JsonProcessor.getJsonDataType(JSON.stringify(testObjectData))
  console.log('数据类型检测结果:', dataType)
  
  if (dataType.type === 'object') {
    console.log('✅ 正确识别为对象类型')
  } else {
    console.log('❌ 数据类型识别错误，期望: object，实际:', dataType.type)
  }
} catch (error) {
  console.log('❌ 数据类型检测失败:', error.message)
}

console.log('\n=== 测试4: 模拟Vue组件逻辑 ===')
// 模拟Vue组件中的逻辑
const rule = {
  sourceColumn: 0,
  pathSuggestions: [],
  showSuggestions: false
}

const previewData = [
  [JSON.stringify(testObjectData), 'other_data'],
  ['non_json_data', 'more_data']
]

console.log('模拟数据:', previewData[0][0].substring(0, 100) + '...')

// 模拟数据类型检测逻辑
const sampleRow = previewData.find(row => {
  const cellData = row[rule.sourceColumn]
  return cellData && JsonProcessor.isJsonData(cellData)
})

if (sampleRow) {
  const jsonData = sampleRow[rule.sourceColumn]
  const dataTypeInfo = JsonProcessor.getJsonDataType(jsonData)
  
  console.log('检测到的数据类型:', dataTypeInfo)
  
  if (dataTypeInfo.type === 'object') {
    const pathSuggestions = JsonProcessor.getObjectPathSuggestions(jsonData)
    rule.pathSuggestions = pathSuggestions
    
    console.log(`设置了 ${pathSuggestions.length} 个路径建议`)
    
    // 检查建议按钮是否应该显示
    const shouldShowButton = rule.pathSuggestions && rule.pathSuggestions.length > 0
    console.log('建议按钮是否应该显示:', shouldShowButton ? '✅ 是' : '❌ 否')
    
    if (shouldShowButton && pathSuggestions.length > 0) {
      console.log('✅ 模拟Vue组件逻辑测试通过')
      console.log('前5个建议:')
      pathSuggestions.slice(0, 5).forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion.label} (${suggestion.path})`)
      })
    } else {
      console.log('❌ 模拟Vue组件逻辑测试失败')
    }
  } else {
    console.log('❌ 数据类型不是对象，建议按钮不会显示')
  }
} else {
  console.log('❌ 未找到包含JSON数据的行')
}

console.log('\n=== 测试5: 方法完整性检查 ===')
const requiredMethods = [
  'getObjectPathSuggestions',
  'getObjectPathSuggestionsTree', 
  'getArrayPathSuggestions',
  'getJsonDataType',
  'isJsonData',
  'analyzeObjectPaths'
]

console.log('检查必需的方法:')
requiredMethods.forEach(method => {
  if (typeof JsonProcessor[method] === 'function') {
    console.log(`✅ ${method} - 存在`)
  } else {
    console.log(`❌ ${method} - 缺失`)
  }
})

console.log('\n✅ 对象类型路径建议功能测试完成!')