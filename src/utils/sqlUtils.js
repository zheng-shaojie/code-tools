// SQL 工具函数库

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