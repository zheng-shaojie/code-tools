/**
 * 测试递归JSON路径建议功能
 * 测试深度嵌套的JSON结构的路径建议
 */

// 导入ES6模块（如果在浏览器环境中使用）
// import { JsonProcessor } from '../src/utils/jsonProcessor.js'

// Node.js环境导入（如果有ES6模块支持）
import { JsonProcessor } from '../src/utils/jsonProcessor.js'

console.log('🚀 测试递归JSON路径建议功能\n')

// 测试1: 复杂嵌套对象
console.log('=== 测试1: 复杂嵌套对象 ===')
const complexObject = {
  "user": {
    "id": 123,
    "profile": {
      "name": "张三",
      "age": 30,
      "contact": {
        "email": "zhangsan@example.com",
        "phone": {
          "mobile": "13800138000",
          "home": "010-12345678"
        }
      },
      "preferences": {
        "theme": "dark",
        "language": "zh-CN",
        "notifications": {
          "email": true,
          "sms": false,
          "push": {
            "enabled": true,
            "frequency": "daily"
          }
        }
      }
    },
    "orders": [
      {
        "id": "ORD001",
        "items": [
          {
            "name": "商品A",
            "price": 100,
            "quantity": 2
          },
          {
            "name": "商品B", 
            "price": 200,
            "quantity": 1
          }
        ],
        "shipping": {
          "address": "北京市朝阳区xxx",
          "method": "express"
        }
      }
    ]
  },
  "settings": {
    "app": {
      "version": "2.1.0",
      "features": ["feature1", "feature2", "feature3"]
    }
  }
}

const objectSuggestions = JsonProcessor.getObjectPathSuggestions(JSON.stringify(complexObject), 5)
console.log('对象路径建议 (深度5层):')
objectSuggestions.forEach((suggestion, index) => {
  console.log(`${index + 1}. ${suggestion.label}`)
  console.log(`   路径: ${suggestion.path}`)
  console.log(`   描述: ${suggestion.description}`)
  console.log(`   深度: ${suggestion.depth}, 类型: ${suggestion.type}`)
  console.log('')
})

console.log('\n=== 测试2: 复杂嵌套数组 ===')
const complexArray = [
  {
    "category": "电子产品",
    "products": [
      {
        "name": "手机",
        "models": [
          {
            "brand": "苹果",
            "specifications": {
              "screen": "6.1英寸",
              "storage": ["128GB", "256GB", "512GB"],
              "features": {
                "camera": {
                  "main": "12MP",
                  "ultra_wide": "12MP"
                },
                "connectivity": ["5G", "WiFi6", "蓝牙5.0"]
              }
            }
          },
          {
            "brand": "华为",
            "specifications": {
              "screen": "6.5英寸", 
              "storage": ["128GB", "256GB"],
              "features": {
                "camera": {
                  "main": "50MP",
                  "telephoto": "8MP"
                }
              }
            }
          }
        ]
      }
    ]
  },
  {
    "category": "服装",
    "products": [
      {
        "name": "T恤",
        "variants": [
          {
            "color": "白色",
            "sizes": ["S", "M", "L", "XL"],
            "material": {
              "primary": "棉",
              "blend": ["聚酯纤维", "氨纶"]
            }
          }
        ]
      }
    ]
  }
]

const arraySuggestions = JsonProcessor.getArrayPathSuggestions(JSON.stringify(complexArray), 4)
console.log('数组路径建议 (深度4层):')
arraySuggestions.forEach((suggestion, index) => {
  console.log(`${index + 1}. ${suggestion.label}`)
  console.log(`   路径: ${suggestion.path}`)
  console.log(`   描述: ${suggestion.description}`)
  console.log(`   深度: ${suggestion.depth}, 类型: ${suggestion.type}`)
  console.log('')
})

console.log('\n=== 测试3: 测试具体路径提取 ===')
// 测试一些深层路径的提取
const testPaths = [
  '$.user.profile.contact.phone.mobile',
  '$.user.profile.preferences.notifications.push.frequency',
  '$.user.orders[0].items[0].name',
  '$.user.orders[0].shipping.address',
  '$.settings.app.features[1]'
]

console.log('测试深层路径提取:')
testPaths.forEach(path => {
  try {
    const result = JsonProcessor.extractJsonData(JSON.stringify(complexObject), path)
    console.log(`${path} => ${JSON.stringify(result)}`)
  } catch (error) {
    console.log(`${path} => 错误: ${error.message}`)
  }
})

console.log('\n=== 测试4: 不同深度限制的效果 ===')
console.log('深度限制为2层的建议数量:', JsonProcessor.getObjectPathSuggestions(JSON.stringify(complexObject), 2).length)
console.log('深度限制为3层的建议数量:', JsonProcessor.getObjectPathSuggestions(JSON.stringify(complexObject), 3).length)
console.log('深度限制为4层的建议数量:', JsonProcessor.getObjectPathSuggestions(JSON.stringify(complexObject), 4).length)
console.log('深度限制为5层的建议数量:', JsonProcessor.getObjectPathSuggestions(JSON.stringify(complexObject), 5).length)

console.log('\n✅ 递归JSON路径建议功能测试完成!')