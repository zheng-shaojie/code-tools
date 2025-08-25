// SQL 工具函数库

// 重新导出新模块的功能，保持向后兼容
export { JsonProcessor } from './jsonProcessor.js'
export { ExcelProcessor } from './excelProcessor.js'
export { DataExtractor } from './dataExtractor.js'

// 为了向后兼容，保持原有的函数名
export const extractJsonData = (jsonString, path) => {
  const { JsonProcessor } = require('./jsonProcessor.js')
  return JsonProcessor.extractJsonData(jsonString, path)
}

/**
 * 字符串转义和加引号处理
 * 遵循字符串转义处理规范
 */
export const escapeAndQuoteString = (str) => {
  if (typeof str !== 'string') {
    str = String(str)
  }
  
  let cleaned = str.trim()
  
  // 检查是否已经被引号包围，如果是则去除外层引号
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1)
  }
  
  // 转义SQL中的特殊字符：将 ' 替换为 ''
  let escaped = cleaned.replace(/'/g, "''")
  
  // 用单引号包围
  return `'${escaped}'`
}

/**
 * 生成数据库字段名建议
 */
export const generateFieldName = (header) => {
  if (!header) return ''
  
  // 转换为小写，替换空格和特殊字符为下划线
  return header.toString()
    .toLowerCase()
    .replace(/[\s\-\.\(\)\[\]]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
}

/**
 * 快速生成SQL IN条件的工具函数
 */
export const quickGenerate = (text, options = {}) => {
  const {
    separator = '\n',
    addQuotes = true,
    trimSpaces = true,
    removeEmpty = true,
    columnName = 'id'
  } = options
  
  if (!text || !text.trim()) {
    return ''
  }
  
  let items = text.split(separator)
  
  if (trimSpaces) {
    items = items.map(item => item.trim())
  }
  
  if (removeEmpty) {
    items = items.filter(item => item.length > 0)
  }
  
  // 去重
  items = [...new Set(items)]
  
  if (addQuotes) {
    items = items.map(item => escapeAndQuoteString(item))
  }
  
  return `${columnName} IN (${items.join(', ')})`
}

/**
 * 检测文本中可能的分隔符
 */
export const detectSeparator = (text) => {
  const separators = ['\n', ',', ';', '|', ' ', '\t']
  const counts = separators.map(sep => ({
    separator: sep,
    count: (text.split(sep).length - 1)
  }))
  
  // 返回出现次数最多的分隔符
  return counts.reduce((max, current) => 
    current.count > max.count ? current : max
  ).separator
}



/**
 * 根据路径从对象中提取值
 */
const extractValueByPath = (obj, path) => {
  if (!path) return obj
  
  // 清理路径，移除开头的 $ 符号
  let cleanPath = path.replace(/^\$\.?/, '')
  
  // 处理不同的路径格式
  const pathSegments = parsePath(cleanPath)
  
  let current = obj
  for (const segment of pathSegments) {
    if (current === null || current === undefined) {
      return null
    }
    
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      // 数组索引访问
      current = current[parseInt(segment)]
    } else if (typeof current === 'object') {
      // 对象属性访问
      current = current[segment]
    } else {
      return null
    }
  }
  
  return current
}

/**
 * 解析路径字符串为路径段数组
 */
const parsePath = (path) => {
  const segments = []
  let current = ''
  let inBrackets = false
  let inQuotes = false
  let quoteChar = ''
  
  for (let i = 0; i < path.length; i++) {
    const char = path[i]
    
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true
      quoteChar = char
      continue
    }
    
    if (inQuotes && char === quoteChar) {
      inQuotes = false
      quoteChar = ''
      continue
    }
    
    if (!inQuotes) {
      if (char === '[') {
        if (current) {
          segments.push(current)
          current = ''
        }
        inBrackets = true
        continue
      }
      
      if (char === ']') {
        if (current) {
          segments.push(current)
          current = ''
        }
        inBrackets = false
        continue
      }
      
      if (char === '.' && !inBrackets) {
        if (current) {
          segments.push(current)
          current = ''
        }
        continue
      }
    }
    
    current += char
  }
  
  if (current) {
    segments.push(current)
  }
  
  return segments
}

/**
 * 从Excel数据生成Excel文件缓冲区
 * 使用xlsx库生成Excel文件
 */
export const generateExcelFromData = (data) => {
  try {
    // 导入xlsx模块（需要确保已安装）
    const XLSX = require('xlsx')
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    
    // 生成Excel文件缓冲区
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })
    
    return buffer
  } catch (error) {
    throw new Error(`生成Excel文件失败: ${error.message}`)
  }
}

/**
 * 验证JSON路径的有效性
 */
export const validateJsonPath = (path) => {
  if (!path || typeof path !== 'string') {
    return { valid: false, error: '路径不能为空' }
  }
  
  try {
    // 简单的路径格式验证
    const cleanPath = path.replace(/^\$\.?/, '')
    if (!cleanPath) {
      return { valid: false, error: '路径格式无效' }
    }
    
    // 检查是否有未配对的括号
    const brackets = cleanPath.match(/[\[\]]/g) || []
    let openCount = 0
    for (const bracket of brackets) {
      if (bracket === '[') openCount++
      else openCount--
      if (openCount < 0) {
        return { valid: false, error: '括号不匹配' }
      }
    }
    
    if (openCount !== 0) {
      return { valid: false, error: '括号不匹配' }
    }
    
    return { valid: true }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

/**
 * 获取JSON路径的建议
 * 分析JSON数据结构，提供可能的路径建议
 */
export const getJsonPathSuggestions = (jsonString, maxDepth = 3) => {
  try {
    const data = JSON.parse(jsonString)
    const suggestions = []
    
    const traverse = (obj, path = '', depth = 0) => {
      if (depth >= maxDepth) return
      
      if (Array.isArray(obj)) {
        // 数组：提供索引示例
        if (obj.length > 0) {
          suggestions.push(`${path}[0]`)
          if (typeof obj[0] === 'object' && obj[0] !== null) {
            traverse(obj[0], `${path}[0]`, depth + 1)
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        // 对象：遍历所有属性
        Object.keys(obj).forEach(key => {
          const newPath = path ? `${path}.${key}` : key
          suggestions.push(newPath)
          
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            traverse(obj[key], newPath, depth + 1)
          }
        })
      }
    }
    
    traverse(data)
    return suggestions.slice(0, 20) // 限制建议数量
  } catch (error) {
    return []
  }
}