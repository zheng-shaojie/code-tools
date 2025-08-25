/**
 * JSON 数据处理工具类
 */
export class JsonProcessor {
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
    
    // 10. 修复常见的语法错误
    // 修复缺少冒号的情况 (如 "c", [...] 应该是 "c": [...])
    normalized = normalized.replace(/("[^"]*"),\s*(\[|\{)/g, '$1: $2')
    
    // 修复数组或对象前缺少引号和冒号的键
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
  /**
   * 检查值是否为JSON数据
   * @param {any} value - 要检查的值
   * @returns {boolean} 是否为JSON数据
   */
  static isJsonData(value) {
    if (typeof value !== 'string') return false
    try {
      JsonProcessor.safeParseJson(value)
      return true
    } catch {
      return false
    }
  }

  /**
   * 检查指定列是否包含JSON数据
   * @param {Array<Array>} previewData - 预览数据
   * @param {number} columnIndex - 列索引
   * @returns {boolean} 是否包含JSON数据
   */
  static hasJsonData(previewData, columnIndex) {
    return previewData.some(row => 
      row[columnIndex] && JsonProcessor.isJsonData(row[columnIndex])
    )
  }

  /**
   * 格式化JSON数据用于显示
   * @param {string} jsonData - JSON字符串
   * @returns {string} 格式化后的JSON字符串
   */
  static formatJson(jsonData) {
    if (!jsonData) return ''
    try {
      const parsed = JsonProcessor.safeParseJson(jsonData)
      return JSON.stringify(parsed, null, 2)
    } catch {
      // 如果解析失败，尝试显示原始数据和错误信息
      try {
        const normalized = JsonProcessor.normalizeJsonString(jsonData)
        return `/* 原始数据无法解析，已尝试规范化 */\n${normalized}`
      } catch {
        return `/* 无法解析的JSON数据 */\n${jsonData}`
      }
    }
  }

  /**
   * 格式化单元格值用于显示
   * @param {any} value - 单元格值
   * @param {number} maxLength - 最大长度，默认50
   * @returns {string} 格式化后的值
   */
  static formatCellValue(value, maxLength = 50) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string' && value.length > maxLength) {
      return value.substring(0, maxLength) + '...'
    }
    return String(value)
  }

  /**
   * 格式化预览单元格值
   * @param {any} value - 单元格值
   * @returns {string} 格式化后的值
   */
  static formatPreviewCell(value) {
    return JsonProcessor.formatCellValue(value, 100)
  }

  /**
   * 从JSON数据中按路径提取值
   * @param {string} sourceData - JSON字符串
   * @param {string} jsonPath - JSON路径
   * @returns {any} 提取的值
   */
  static extractJsonData(sourceData, jsonPath) {
    try {
      const data = JsonProcessor.safeParseJson(sourceData)
      return JsonProcessor.getValueByPath(data, jsonPath)
    } catch (error) {
      throw new Error('JSON解析失败: ' + error.message)
    }
  }

  /**
   * 根据路径从对象中获取值
   * @param {Object} obj - 源对象
   * @param {string} path - 路径字符串
   * @returns {any} 提取的值
   */
  static getValueByPath(obj, path) {
    // 简单的JSONPath实现，支持点号和方括号表示法
    const cleanPath = path.replace(/^\$\./, '') // 去除开头的 $.
    
    if (!cleanPath) return obj

    const parts = JsonProcessor.parsePath(cleanPath)
    let current = obj

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined
      }

      if (Array.isArray(current) && /^\d+$/.test(part)) {
        // 数组索引访问
        current = current[parseInt(part)]
      } else if (typeof current === 'object') {
        // 对象属性访问
        current = current[part]
      } else {
        return undefined
      }
    }

    return current
  }

  /**
   * 解析路径字符串
   * @param {string} path - 路径字符串
   * @returns {Array<string>} 路径段数组
   */
  static parsePath(path) {
    const parts = []
    let current = ''
    let inBrackets = false
    let i = 0

    while (i < path.length) {
      const char = path[i]

      if (char === '[') {
        if (current) {
          parts.push(current)
          current = ''
        }
        inBrackets = true
      } else if (char === ']') {
        if (current) {
          parts.push(current)
          current = ''
        }
        inBrackets = false
      } else if (char === '.' && !inBrackets) {
        if (current) {
          parts.push(current)
          current = ''
        }
      } else if (char === '"' || char === "'") {
        // 跳过引号
      } else {
        current += char
      }

      i++
    }

    if (current) {
      parts.push(current)
    }

    return parts
  }

  /**
   * 验证JSON路径格式
   * @param {string} path - JSON路径
   * @returns {boolean} 路径是否有效
   */
  static validateJsonPath(path) {
    if (!path || typeof path !== 'string') {
      return false
    }

    try {
      JsonProcessor.parsePath(path.replace(/^\$\./, ''))
      return true
    } catch {
      return false
    }
  }

  /**
   * 检查JSON数据是否为数组
   * @param {string} jsonData - JSON字符串
   * @returns {boolean} 是否为数组
   */
  static isJsonArray(jsonData) {
    try {
      const data = JsonProcessor.safeParseJson(jsonData)
      return Array.isArray(data)
    } catch {
      return false
    }
  }

  /**
   * 获取JSON数据的类型信息
   * @param {string} jsonData - JSON字符串
   * @returns {Object} 类型信息 {type: 'array'|'object'|'primitive', length?: number}
   */
  static getJsonDataType(jsonData) {
    try {
      const data = JsonProcessor.safeParseJson(jsonData)
      if (Array.isArray(data)) {
        return { type: 'array', length: data.length }
      } else if (typeof data === 'object' && data !== null) {
        return { type: 'object', keys: Object.keys(data) }
      } else {
        return { type: 'primitive', value: data }
      }
    } catch {
      return { type: 'invalid' }
    }
  }

  /**
   * 提取数组中的所有元素（用于循环展示）
   * @param {string} sourceData - JSON字符串
   * @param {string} itemPath - 数组元素内的路径，如 'name' 或 'user.id'
   * @returns {Array} 提取的值数组
   */
  static extractArrayItems(sourceData, itemPath = '') {
    try {
      const data = JsonProcessor.safeParseJson(sourceData)
      if (!Array.isArray(data)) {
        throw new Error('数据不是数组类型')
      }

      if (!itemPath) {
        // 返回整个数组
        return data
      }

      // 从每个数组元素中提取指定路径的值
      const results = []
      
      data.forEach((item, index) => {
        try {
          const extracted = JsonProcessor.getValueByPath(item, itemPath)
          
          // 如果提取的值也是数组，支持嵌套数组展开
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
   * 获取数组路径建议
   * @param {string} jsonData - JSON字符串
   * @param {number} maxDepth - 最大递归深度，默认为3
   * @returns {Array} 路径建议数组
   */
  static getArrayPathSuggestions(jsonData, maxDepth = 3) {
    try {
      const data = JsonProcessor.safeParseJson(jsonData)
      if (!Array.isArray(data) || data.length === 0) {
        return []
      }

      const suggestions = [
        { 
          path: '', 
          label: '🔢 整个数组元素', 
          description: `提取每个元素的完整内容（共 ${data.length} 个元素）`,
          depth: 0,
          type: 'array'
        }
      ]

      // 分析数组元素结构
      const uniqueStructures = new Map()
      
      // 分析前几个元素的结构（最多5个）
      for (let i = 0; i < Math.min(data.length, 5); i++) {
        const item = data[i]
        
        if (typeof item === 'object' && item !== null) {
          // 生成结构签名（用于去重）
          const structureKey = Array.isArray(item) 
            ? `array_${item.length}`
            : `object_${Object.keys(item).sort().join(',')}`
          
          if (!uniqueStructures.has(structureKey)) {
            uniqueStructures.set(structureKey, { item, index: i })
            
            if (Array.isArray(item)) {
              // 嵌套数组 - 不添加数组索引路径，因为我们处理的是每个元素
              // 如果需要访问嵌套数组的内容，需要用户手动输入路径
            } else {
              // 对象元素 - 分析对象属性，但不包含数组索引
              JsonProcessor.analyzeArrayElementPaths(item, '', suggestions, 1, maxDepth)
            }
          }
        } else {
          // 基本类型元素（只添加一次）
          if (i === 0) {
            const valueType = item === null ? 'null' : typeof item
            const typeDesc = {
              'string': '字符串',
              'number': '数字',
              'boolean': '布尔值',
              'null': '空值'
            }[valueType] || valueType
            
            suggestions.push({
              path: '',
              label: '📄 数组元素值',
              description: `${typeDesc}类型数组的每个元素`,
              depth: 1,
              type: 'primitive'
            })
          }
        }
      }
      
      // 按深度排序
      suggestions.sort((a, b) => {
        if (a.depth !== b.depth) {
          return a.depth - b.depth
        }
        // 同一深度内，按类型排序
        const typeOrder = { 'primitive': 0, 'object': 1, 'array': 2 }
        return (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3)
      })

      return suggestions
    } catch {
      return []
    }
  }
  
  /**
   * 递归分析数组元素的路径（不包含数组索引）
   * @param {Object} obj - 要分析的对象
   * @param {string} basePath - 基础路径
   * @param {Array} suggestions - 建议数组
   * @param {number} depth - 当前深度
   * @param {number} maxDepth - 最大深度
   */
  static analyzeArrayElementPaths(obj, basePath, suggestions, depth, maxDepth) {
    if (depth >= maxDepth || typeof obj !== 'object' || obj === null) {
      return
    }
    
    const keys = Object.keys(obj)
    keys.forEach(key => {
      const value = obj[key]
      // 数组元素路径不包含数组索引，直接使用属性名
      const currentPath = basePath ? `${basePath}.${key}` : key
      
      if (Array.isArray(value)) {
        // 数组字段
        const depthPrefix = '  '.repeat(depth)
        suggestions.push({
          path: currentPath,
          label: `${depthPrefix}🔢 ${key}`,
          description: `元素的数组属性 (${value.length} 个子元素)`,
          depth: depth,
          type: 'array'
        })
        
        // 如果数组不为空，分析其元素结构（但不递归太深）
        if (value.length > 0 && depth < maxDepth - 1) {
          const firstElement = value[0]
          if (typeof firstElement === 'object' && firstElement !== null && !Array.isArray(firstElement)) {
            // 只分析对象数组的第一层属性
            const elementKeys = Object.keys(firstElement)
            elementKeys.forEach(elementKey => {
              suggestions.push({
                path: `${currentPath}[0].${elementKey}`,
                label: `${depthPrefix}  📄 ${key}[0].${elementKey}`,
                description: `数组元素的 ${elementKey} 属性`,
                depth: depth + 1,
                type: 'primitive'
              })
            })
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // 嵌套对象
        const depthPrefix = '  '.repeat(depth)
        const objKeys = Object.keys(value)
        suggestions.push({
          path: currentPath,
          label: `${depthPrefix}📦 ${key}`,
          description: `元素的对象属性 (${objKeys.length} 个属性)`,
          depth: depth,
          type: 'object'
        })
        
        // 递归分析嵌套对象
        JsonProcessor.analyzeArrayElementPaths(value, currentPath, suggestions, depth + 1, maxDepth)
      } else {
        // 基本类型
        const depthPrefix = '  '.repeat(depth)
        const valueType = value === null ? 'null' : typeof value
        const typeDesc = {
          'string': '字符串',
          'number': '数字',
          'boolean': '布尔值',
          'null': '空值'
        }[valueType] || valueType
        
        // 格式化值的预览
        let valuePreview = String(value)
        if (valuePreview.length > 30) {
          valuePreview = valuePreview.substring(0, 30) + '...'
        }
        
        suggestions.push({
          path: currentPath,
          label: `${depthPrefix}📄 ${key}`,
          description: `${typeDesc}: ${valuePreview}`,
          depth: depth,
          type: 'primitive'
        })
      }
    })
  }
  
  /**
   * 获取对象路径建议（列表形式）
   * @param {string} jsonData - JSON字符串
   * @param {number} maxDepth - 最大递归深度，默认为4
   * @returns {Array} 路径建议数组
   */
  static getObjectPathSuggestions(jsonData, maxDepth = 4) {
    try {
      const data = JsonProcessor.safeParseJson(jsonData)
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return []
      }

      const suggestions = []
      
      // 添加整个对象的建议
      suggestions.push({
        path: '$',
        label: '📦 整个对象',
        description: `包含 ${Object.keys(data).length} 个属性`,
        depth: 0,
        type: 'object'
      })
      
      // 分析对象的所有路径
      JsonProcessor.analyzeObjectPaths(data, '$', suggestions, 0, maxDepth)
      
      // 按深度和类型排序建议
      suggestions.sort((a, b) => {
        if (a.depth !== b.depth) {
          return a.depth - b.depth // 深度优先
        }
        // 同一深度内，按类型排序：基本类型 > 对象 > 数组
        const typeOrder = { 'primitive': 0, 'object': 1, 'array': 2 }
        return (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3)
      })
      
      return suggestions
    } catch {
      return []
    }
  }

  /**
   * 获取对象路径建议（树形结构）
   * @param {string} jsonData - JSON字符串
   * @param {number} maxDepth - 最大递归深度，默认为4
   * @returns {Object} 树形结构的路径建议
   */
  static getObjectPathSuggestionsTree(jsonData, maxDepth = 4) {
    try {
      const data = JsonProcessor.safeParseJson(jsonData)
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return null
      }

      // 创建根节点
      const rootNode = {
        id: 'root',
        path: '$',
        label: '📦 整个对象',
        description: `包含 ${Object.keys(data).length} 个属性`,
        type: 'object',
        depth: 0,
        children: [],
        expanded: true
      }
      
      // 构建树形结构
      JsonProcessor.buildPathTree(data, '$', rootNode, 0, maxDepth)
      
      return rootNode
    } catch {
      return null
    }
  }

  /**
   * 获取数组路径建议（树形结构）
   * @param {string} jsonData - JSON字符串
   * @param {number} maxDepth - 最大递归深度，默认为3
   * @returns {Object} 树形结构的路径建议
   */
  static getArrayPathSuggestionsTree(jsonData, maxDepth = 3) {
    try {
      const data = JsonProcessor.safeParseJson(jsonData)
      if (!Array.isArray(data) || data.length === 0) {
        return null
      }

      // 创建根节点
      const rootNode = {
        id: 'root',
        path: '',
        label: '🔢 整个数组元素',
        description: `提取每个元素的完整内容（共 ${data.length} 个元素）`,
        type: 'array',
        depth: 0,
        children: [],
        expanded: true
      }
      
      // 分析数组元素结构
      const uniqueStructures = new Map()
      
      // 分析前几个元素的结构（最多5个）
      for (let i = 0; i < Math.min(data.length, 5); i++) {
        const item = data[i]
        
        if (typeof item === 'object' && item !== null) {
          // 生成结构签名（用于去重）
          const structureKey = Array.isArray(item) 
            ? `array_${item.length}`
            : `object_${Object.keys(item).sort().join(',')}`
          
          if (!uniqueStructures.has(structureKey)) {
            uniqueStructures.set(structureKey, { item, index: i })
            
            if (!Array.isArray(item)) {
              // 对象元素 - 构建元素内部的属性树
              JsonProcessor.buildArrayElementTree(item, '', rootNode, 1, maxDepth)
            }
            // 如果是嵌套数组，不处理，需要用户手动输入
          }
        } else {
          // 基本类型元素（只添加一次）
          if (i === 0) {
            const valueType = item === null ? 'null' : typeof item
            const typeDesc = {
              'string': '字符串',
              'number': '数字',
              'boolean': '布尔值',
              'null': '空值'
            }[valueType] || valueType
            
            rootNode.children.push({
              id: 'array_element_value',
              path: '',
              label: '📄 数组元素值',
              description: `${typeDesc}类型数组的每个元素`,
              type: 'primitive',
              depth: 1,
              children: [],
              expanded: false
            })
          }
        }
      }
      
      return rootNode
    } catch {
      return null
    }
  }

  /**
   * 构建数组元素的树形结构（不包含数组索引）
   * @param {Object} obj - 要分析的对象
   * @param {string} basePath - 基础路径
   * @param {Object} parentNode - 父节点
   * @param {number} depth - 当前深度
   * @param {number} maxDepth - 最大深度
   */
  static buildArrayElementTree(obj, basePath, parentNode, depth, maxDepth) {
    if (depth >= maxDepth || typeof obj !== 'object' || obj === null) {
      return
    }
    
    const keys = Object.keys(obj)
    keys.forEach((key, index) => {
      const value = obj[key]
      // 数组元素路径不包含数组索引，直接使用属性名
      const currentPath = basePath ? `${basePath}.${key}` : key
      const nodeId = `${parentNode.id}_${key}_${depth}_${index}`
      
      if (Array.isArray(value)) {
        // 数组字段
        const arrayNode = {
          id: nodeId,
          path: currentPath,
          label: `🔢 ${key}`,
          description: `元素的数组属性 (${value.length} 个子元素)`,
          type: 'array',
          depth: depth,
          children: [],
          expanded: false
        }
        
        // 如果数组不为空且元素是对象，可以显示一些子属性作为参考
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
          const firstElement = value[0]
          const elementKeys = Object.keys(firstElement)
          elementKeys.slice(0, 3).forEach((elementKey, subIndex) => { // 只显示前3个属性作为参考
            arrayNode.children.push({
              id: `${nodeId}_sub_${subIndex}`,
              path: `${currentPath}[0].${elementKey}`,
              label: `📄 ${elementKey}`,
              description: `数组元素的 ${elementKey} 属性（参考）`,
              type: 'primitive',
              depth: depth + 1,
              children: [],
              expanded: false
            })
          })
        }
        
        parentNode.children.push(arrayNode)
      } else if (typeof value === 'object' && value !== null) {
        // 嵌套对象
        const objKeys = Object.keys(value)
        const objectNode = {
          id: nodeId,
          path: currentPath,
          label: `📦 ${key}`,
          description: `元素的对象属性 (${objKeys.length} 个属性)`,
          type: 'object',
          depth: depth,
          children: [],
          expanded: false
        }
        
        // 递归构建嵌套对象
        JsonProcessor.buildArrayElementTree(value, currentPath, objectNode, depth + 1, maxDepth)
        parentNode.children.push(objectNode)
      } else {
        // 基本类型
        const valueType = value === null ? 'null' : typeof value
        const typeDesc = {
          'string': '字符串',
          'number': '数字',
          'boolean': '布尔值',
          'null': '空值'
        }[valueType] || valueType
        
        // 格式化值的预览
        let valuePreview = String(value)
        if (valuePreview.length > 30) {
          valuePreview = valuePreview.substring(0, 30) + '...'
        }
        
        parentNode.children.push({
          id: nodeId,
          path: currentPath,
          label: `📄 ${key}`,
          description: `${typeDesc}: ${valuePreview}`,
          type: 'primitive',
          depth: depth,
          children: [],
          expanded: false
        })
      }
    })
  }

  /**
   * 构建路径树形结构
   * @param {Object} obj - 要分析的对象
   * @param {string} basePath - 基础路径
   * @param {Object} parentNode - 父节点
   * @param {number} depth - 当前深度
   * @param {number} maxDepth - 最大深度
   */
  static buildPathTree(obj, basePath, parentNode, depth, maxDepth) {
    if (depth >= maxDepth || typeof obj !== 'object' || obj === null) {
      return
    }
    
    const keys = Object.keys(obj)
    keys.forEach((key, index) => {
      const value = obj[key]
      let currentPath
      
      // 根据基础路径是否以$开头来构建路径
      if (basePath === '$' || basePath.startsWith('$.')) {
        currentPath = basePath === '$' ? `$.${key}` : `${basePath}.${key}`
      } else {
        currentPath = basePath ? `${basePath}.${key}` : key
      }
      
      const nodeId = `${parentNode.id}_${key}_${depth}_${index}`
      
      if (Array.isArray(value)) {
        // 数组字段
        const arrayNode = {
          id: nodeId,
          path: currentPath,
          label: `🔢 ${key}`,
          description: `数组字段 (${value.length} 个元素)`,
          type: 'array',
          depth: depth,
          children: [],
          expanded: false
        }
        
        // 如果数组不为空，分析其元素结构
        if (value.length > 0) {
          const firstElement = value[0]
          if (typeof firstElement === 'object' && firstElement !== null) {
            // 对象数组 - 添加数组元素节点
            const elementNode = {
              id: `${nodeId}_element_0`,
              path: `${currentPath}[0]`,
              label: Array.isArray(firstElement) ? '🔢 数组元素' : '📦 数组元素',
              description: Array.isArray(firstElement)
                ? `嵌套数组 (${firstElement.length} 个元素)`
                : `对象元素 (${Object.keys(firstElement).length} 个属性)`,
              type: Array.isArray(firstElement) ? 'array' : 'object',
              depth: depth + 1,
              children: [],
              expanded: false
            }
            
            // 递归分析对象结构
            JsonProcessor.buildPathTree(firstElement, `${currentPath}[0]`, elementNode, depth + 2, maxDepth)
            arrayNode.children.push(elementNode)
            
            // 检查是否有不同结构的元素
            for (let i = 1; i < Math.min(value.length, 3); i++) {
              if (typeof value[i] === 'object' && value[i] !== null) {
                const currentKeys = Object.keys(value[i])
                const firstKeys = Object.keys(firstElement)
                if (!JsonProcessor.arraysEqual(currentKeys.sort(), firstKeys.sort())) {
                  const variantNode = {
                    id: `${nodeId}_element_${i}`,
                    path: `${currentPath}[${i}]`,
                    label: Array.isArray(value[i]) ? `🔢 数组元素[${i}]` : `📦 数组元素[${i}]`,
                    description: Array.isArray(value[i])
                      ? `变体嵌套数组 (${value[i].length} 个元素)`
                      : `变体对象元素 (${Object.keys(value[i]).length} 个属性)`,
                    type: Array.isArray(value[i]) ? 'array' : 'object',
                    depth: depth + 1,
                    children: [],
                    expanded: false
                  }
                  
                  JsonProcessor.buildPathTree(value[i], `${currentPath}[${i}]`, variantNode, depth + 2, maxDepth)
                  arrayNode.children.push(variantNode)
                }
              }
            }
          } else {
            // 基本类型数组
            const elementType = typeof firstElement
            const typeDesc = {
              'string': '字符串',
              'number': '数字',
              'boolean': '布尔值',
              'null': '空值'
            }[elementType] || elementType
            
            arrayNode.children.push({
              id: `${nodeId}_primitive_element`,
              path: `${currentPath}[0]`,
              label: '📄 数组元素',
              description: `${typeDesc}类型数组的元素`,
              type: 'primitive',
              depth: depth + 1,
              children: [],
              expanded: false
            })
          }
        }
        
        parentNode.children.push(arrayNode)
      } else if (typeof value === 'object' && value !== null) {
        // 嵌套对象
        const objKeys = Object.keys(value)
        const objectNode = {
          id: nodeId,
          path: currentPath,
          label: `📦 ${key}`,
          description: `对象字段 (${objKeys.length} 个属性: ${objKeys.slice(0, 3).join(', ')}${objKeys.length > 3 ? '...' : ''})`,
          type: 'object',
          depth: depth,
          children: [],
          expanded: false
        }
        
        // 递归分析嵌套对象
        JsonProcessor.buildPathTree(value, currentPath, objectNode, depth + 1, maxDepth)
        parentNode.children.push(objectNode)
      } else {
        // 基本类型
        const valueType = value === null ? 'null' : typeof value
        const typeDesc = {
          'string': '字符串',
          'number': '数字',
          'boolean': '布尔值',
          'null': '空值'
        }[valueType] || valueType
        
        // 格式化值的预览
        let valuePreview = String(value)
        if (valuePreview.length > 30) {
          valuePreview = valuePreview.substring(0, 30) + '...'
        }
        
        parentNode.children.push({
          id: nodeId,
          path: currentPath,
          label: `📄 ${key}`,
          description: `${typeDesc}: ${valuePreview}`,
          type: 'primitive',
          depth: depth,
          children: [],
          expanded: false
        })
      }
    })
  }
  
  /**
   * 递归分析对象路径
   * @param {Object} obj - 要分析的对象
   * @param {string} basePath - 基础路径
   * @param {Array} suggestions - 建议数组
   * @param {number} depth - 当前深度
   * @param {number} maxDepth - 最大深度
   */
  static analyzeObjectPaths(obj, basePath, suggestions, depth, maxDepth) {
    if (depth >= maxDepth || typeof obj !== 'object' || obj === null) {
      return
    }
    
    const keys = Object.keys(obj)
    keys.forEach(key => {
      const value = obj[key]
      let currentPath
      
      // 根据基础路径是否以$开头来构建路径
      if (basePath === '$' || basePath.startsWith('$.')) {
        currentPath = basePath === '$' ? `$.${key}` : `${basePath}.${key}`
      } else {
        currentPath = basePath ? `${basePath}.${key}` : key
      }
      
      if (Array.isArray(value)) {
        // 数组字段
        const depthPrefix = '  '.repeat(depth)
        const arrayDesc = basePath.startsWith('$.') ? '数组字段' : '嵌套数组'
        suggestions.push({
          path: currentPath,
          label: `${depthPrefix}🔢 ${key}`,
          description: `${arrayDesc} (${value.length} 个元素)`,
          depth: depth,
          type: 'array'
        })
        
        // 如果数组不为空，分析其元素结构
        if (value.length > 0) {
          // 分析数组中的第一个元素
          const firstElement = value[0]
          if (typeof firstElement === 'object' && firstElement !== null) {
            // 对象数组 - 递归分析对象结构
            JsonProcessor.analyzeObjectPaths(firstElement, `${currentPath}[0]`, suggestions, depth + 1, maxDepth)
            
            // 如果有多个元素，也分析其他几个元素的结构（最多分析前3个）
            for (let i = 1; i < Math.min(value.length, 3); i++) {
              if (typeof value[i] === 'object' && value[i] !== null) {
                // 检查结构是否与第一个元素不同
                const currentKeys = Object.keys(value[i])
                const firstKeys = Object.keys(firstElement)
                if (!JsonProcessor.arraysEqual(currentKeys.sort(), firstKeys.sort())) {
                  // 结构不同，也分析这个元素
                  JsonProcessor.analyzeObjectPaths(value[i], `${currentPath}[${i}]`, suggestions, depth + 1, maxDepth)
                }
              }
            }
          } else {
            // 基本类型数组
            const elementType = typeof firstElement
            const typeDesc = {
              'string': '字符串',
              'number': '数字',
              'boolean': '布尔值',
              'null': '空值'
            }[elementType] || elementType
            
            suggestions.push({
              path: `${currentPath}[0]`,
              label: `${depthPrefix}  📄 数组元素`,
              description: `${typeDesc}类型数组的元素`,
              depth: depth + 1,
              type: 'primitive'
            })
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // 嵌套对象
        const depthPrefix = '  '.repeat(depth)
        const objDesc = basePath.startsWith('$.') ? '对象字段' : '嵌套对象'
        const objKeys = Object.keys(value)
        suggestions.push({
          path: currentPath,
          label: `${depthPrefix}📦 ${key}`,
          description: `${objDesc} (${objKeys.length} 个属性: ${objKeys.slice(0, 3).join(', ')}${objKeys.length > 3 ? '...' : ''})`,
          depth: depth,
          type: 'object'
        })
        
        // 递归分析嵌套对象
        JsonProcessor.analyzeObjectPaths(value, currentPath, suggestions, depth + 1, maxDepth)
      } else {
        // 基本类型
        const depthPrefix = '  '.repeat(depth)
        const valueType = value === null ? 'null' : typeof value
        const typeDesc = {
          'string': '字符串',
          'number': '数字',
          'boolean': '布尔值',
          'null': '空值'
        }[valueType] || valueType
        
        // 格式化值的预览
        let valuePreview = String(value)
        if (valuePreview.length > 30) {
          valuePreview = valuePreview.substring(0, 30) + '...'
        }
        
        suggestions.push({
          path: currentPath,
          label: `${depthPrefix}📄 ${key}`,
          description: `${typeDesc}: ${valuePreview}`,
          depth: depth,
          type: 'primitive'
        })
      }
    })
  }

  /**
   * 比较两个数组是否相等
   * @param {Array} arr1 - 第一个数组
   * @param {Array} arr2 - 第二个数组
   * @returns {boolean} 是否相等
   */
  static arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false
    }
    return true
  }
}