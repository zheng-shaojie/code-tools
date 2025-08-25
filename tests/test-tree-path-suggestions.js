/**
 * 测试树形结构JSON路径建议功能
 * 验证树形数据结构的生成和遍历
 */

import { JsonProcessor } from '../src/utils/jsonProcessor.js'

console.log('🌳 测试树形结构JSON路径建议功能\n')

// 测试数据
const complexObject = {
  "user": {
    "id": 123,
    "profile": {
      "name": "张三",
      "contact": {
        "phone": {
          "mobile": "13800138000"
        }
      }
    },
    "orders": [
      {
        "id": "ORD001",
        "items": [
          {"name": "商品A", "price": 100}
        ]
      }
    ]
  },
  "settings": {
    "theme": "dark"
  }
}

// 测试1: 对象树形结构
console.log('=== 测试1: 对象树形结构生成 ===')
const objectTree = JsonProcessor.getObjectPathSuggestionsTree(JSON.stringify(complexObject), 4)

function printTree(node, indent = '') {
  console.log(`${indent}${node.label} [${node.path || 'ROOT'}] (${node.type})`)
  console.log(`${indent}  描述: ${node.description}`)
  console.log(`${indent}  深度: ${node.depth}, 展开: ${node.expanded}`)
  
  if (node.children && node.children.length > 0) {
    console.log(`${indent}  子节点 (${node.children.length}个):`)
    node.children.forEach(child => {
      printTree(child, indent + '    ')
    })
  }
  console.log('')
}

if (objectTree) {
  console.log('对象树形结构:')
  printTree(objectTree)
} else {
  console.log('❌ 对象树形结构生成失败')
}

// 测试2: 数组树形结构
console.log('\n=== 测试2: 数组树形结构生成 ===')
const arrayData = [
  {
    "category": "电子产品",
    "products": [
      {
        "name": "手机",
        "specs": {
          "screen": "6.1英寸",
          "storage": ["128GB", "256GB"]
        }
      }
    ]
  },
  {
    "category": "服装",
    "products": [
      {
        "name": "T恤",
        "sizes": ["S", "M", "L"]
      }
    ]
  }
]

const arrayTree = JsonProcessor.getArrayPathSuggestionsTree(JSON.stringify(arrayData), 4)

if (arrayTree) {
  console.log('数组树形结构:')
  printTree(arrayTree)
} else {
  console.log('❌ 数组树形结构生成失败')
}

// 测试3: 树形结构验证
console.log('\n=== 测试3: 树形结构验证 ===')

function validateTree(node, expectedDepth = 0, path = '') {
  const issues = []
  
  // 验证基本属性
  if (!node.id) issues.push('缺少id属性')
  if (!node.label) issues.push('缺少label属性')
  if (node.depth !== expectedDepth) issues.push(`深度不匹配: 期望${expectedDepth}, 实际${node.depth}`)
  if (!['object', 'array', 'primitive'].includes(node.type)) issues.push(`无效的类型: ${node.type}`)
  
  // 验证路径
  if (node.path !== undefined) {
    console.log(`✓ 节点 "${node.label}" 路径: ${node.path || 'ROOT'}`)
  }
  
  // 递归验证子节点
  if (node.children && node.children.length > 0) {
    node.children.forEach((child, index) => {
      const childIssues = validateTree(child, expectedDepth + 1, `${path}[${index}]`)
      issues.push(...childIssues.map(issue => `子节点${index}: ${issue}`))
    })
  }
  
  return issues
}

if (objectTree) {
  const objectIssues = validateTree(objectTree)
  if (objectIssues.length === 0) {
    console.log('✅ 对象树形结构验证通过')
  } else {
    console.log('❌ 对象树形结构验证失败:')
    objectIssues.forEach(issue => console.log(`  - ${issue}`))
  }
}

if (arrayTree) {
  const arrayIssues = validateTree(arrayTree)
  if (arrayIssues.length === 0) {
    console.log('✅ 数组树形结构验证通过')
  } else {
    console.log('❌ 数组树形结构验证失败:')
    arrayIssues.forEach(issue => console.log(`  - ${issue}`))
  }
}

// 测试4: 路径提取验证
console.log('\n=== 测试4: 路径提取验证 ===')

function collectAllPaths(node, paths = []) {
  if (node.path && node.path !== '') {
    paths.push(node.path)
  }
  
  if (node.children) {
    node.children.forEach(child => {
      collectAllPaths(child, paths)
    })
  }
  
  return paths
}

if (objectTree) {
  const allPaths = collectAllPaths(objectTree)
  console.log(`对象树共包含 ${allPaths.length} 个可用路径:`)
  
  // 测试路径提取
  const testPaths = allPaths.slice(0, 5) // 测试前5个路径
  testPaths.forEach(path => {
    try {
      const result = JsonProcessor.extractJsonData(JSON.stringify(complexObject), path)
      console.log(`✓ ${path} => ${JSON.stringify(result)}`)
    } catch (error) {
      console.log(`❌ ${path} => 错误: ${error.message}`)
    }
  })
}

// 测试5: 性能测试
console.log('\n=== 测试5: 性能测试 ===')

function measurePerformance(fn, iterations = 100) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  return (end - start) / iterations
}

const objectTreeTime = measurePerformance(() => {
  JsonProcessor.getObjectPathSuggestionsTree(JSON.stringify(complexObject), 4)
})

const arrayTreeTime = measurePerformance(() => {
  JsonProcessor.getArrayPathSuggestionsTree(JSON.stringify(arrayData), 4)
})

console.log(`对象树形结构生成平均耗时: ${objectTreeTime.toFixed(2)}ms`)
console.log(`数组树形结构生成平均耗时: ${arrayTreeTime.toFixed(2)}ms`)

// 测试6: 深度控制测试
console.log('\n=== 测试6: 深度控制测试 ===')

for (let depth = 1; depth <= 5; depth++) {
  const tree = JsonProcessor.getObjectPathSuggestionsTree(JSON.stringify(complexObject), depth)
  if (tree) {
    const nodeCount = countTreeNodes(tree)
    const maxDepth = getTreeMaxDepth(tree)
    console.log(`深度限制${depth}: ${nodeCount}个节点, 实际最大深度${maxDepth}`)
  }
}

function countTreeNodes(node) {
  let count = 1
  if (node.children) {
    node.children.forEach(child => {
      count += countTreeNodes(child)
    })
  }
  return count
}

function getTreeMaxDepth(node) {
  let maxDepth = node.depth
  if (node.children) {
    node.children.forEach(child => {
      maxDepth = Math.max(maxDepth, getTreeMaxDepth(child))
    })
  }
  return maxDepth
}

console.log('\n✅ 树形结构JSON路径建议功能测试完成!')
console.log('\n🎯 主要改进点:')
console.log('1. 真正的树形数据结构，支持父子关系')
console.log('2. 可展开/折叠的节点，提升用户体验')
console.log('3. 完整的节点信息（id、路径、类型、深度、描述）')
console.log('4. 支持递归遍历和验证')
console.log('5. 优化的性能和可控的深度限制')