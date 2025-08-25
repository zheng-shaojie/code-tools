import { JsonProcessor } from './jsonProcessor.js'
import { ExcelProcessor } from './excelProcessor.js'

/**
 * 数据提取器类
 */
export class DataExtractor {
  /**
   * 预览单个提取规则的结果
   * @param {Array<Array>} previewData - 预览数据
   * @param {Object} rule - 提取规则
   * @returns {string} 预览结果
   */
  static previewExtractionRule(previewData, rule) {
    if ((!rule.sourceColumn && rule.sourceColumn !== 0) || !rule.jsonPath) {
      return ''
    }

    // 找一个有数据的行进行预览
    const sampleRow = previewData.find(row => {
      const cellData = row[rule.sourceColumn]
      return cellData && JsonProcessor.isJsonData(cellData)
    })

    if (sampleRow) {
      try {
        const sourceData = sampleRow[rule.sourceColumn]
        
        // 检查是否为数组类型
        const dataType = JsonProcessor.getJsonDataType(sourceData)
        
        if (dataType.type === 'array' && rule.extractionType) {
          switch (rule.extractionType) {
            case 'array_string': {
              // 数组转字符串
              const arrayItems = JsonProcessor.extractArrayItems(sourceData, rule.arrayItemPath || '')
              return JsonProcessor.arrayToString(arrayItems, rule.arraySeparator || ', ')
            }
            case 'array_expand': {
              // 数组展开（仅显示第一个元素作为预览）
              const arrayItems = JsonProcessor.extractArrayItems(sourceData, rule.arrayItemPath || '')
              if (arrayItems.length > 0) {
                const firstItem = JsonProcessor.formatValue(arrayItems[0])
                return `${firstItem} (数组共${arrayItems.length}项)`
              } else {
                return '空数组'
              }
            }
            default:
              return '未支持的提取类型'
          }
        } else {
          // 非数组类型，普通提取
          const extracted = JsonProcessor.extractJsonData(sourceData, rule.jsonPath)
          return extracted !== null && extracted !== undefined ? String(extracted) : ''
        }
      } catch (error) {
        console.error('提取失败:', error)
        return '提取失败: ' + error.message
      }
    } else {
      return '未找到JSON数据'
    }
  }

  /**
   * 执行数据提取
   * @param {Array<Array>} previewData - 源数据
   * @param {Array} headers - 表头
   * @param {Array} extractionRules - 提取规则数组
   * @param {Function} onProgress - 进度回调函数 (可选)
   * @returns {Object} 提取结果 {headers: Array, data: Array<Array>, newColumnsCount: number, mergeInfo?: Array}
   */
  static executeExtraction(previewData, headers, extractionRules, onProgress) {
    // 准备新的数据结构
    const newHeaders = [...headers]
    let allNewData = []
    let mergeInfo = []
    
    // 过滤出有效的提取规则
    const validRules = extractionRules.filter(rule => {
      const hasSourceColumn = (rule.sourceColumn || rule.sourceColumn === 0)
      const hasNewColumnName = rule.newColumnName
      
      if (!hasSourceColumn || !hasNewColumnName) {
        return false
      }
      
      // 对于数组类型，检查是否有适当的路径配置
      if (rule.extractionType === 'array_string' || rule.extractionType === 'array_expand') {
        // 数组类型不需要jsonPath，但可能需要arrayItemPath
        return true
      } else {
        // 对象类型或普通的JSON路径提取需要jsonPath
        return rule.jsonPath && rule.jsonPath.trim() !== ''
      }
    })
    
    // 检查是否有数组展开规则
    const hasArrayExpandRules = validRules.some(rule => rule.extractionType === 'array_expand')
    
    // 添加新列名
    validRules.forEach(rule => {
      newHeaders.push(rule.newColumnName)
    })
    
    // 处理每一行数据
    let currentRowIndex = 1 // 从1开始，因为0是表头
    const totalRows = previewData.length
    
    previewData.forEach((row, rowIndex) => {
      // 更新进度
      if (onProgress && totalRows > 100) {
        const percent = Math.round((rowIndex / totalRows) * 100)
        onProgress(percent, `正在处理第 ${rowIndex + 1} 行 / 共 ${totalRows} 行`, `处理进度: ${percent}%`)
      }
      
      if (hasArrayExpandRules) {
        // 如果有数组展开规则，需要特殊处理
        const expandResult = DataExtractor.processRowWithArrayExpansion(row, validRules, currentRowIndex, headers.length)
        allNewData.push(...expandResult.data)
        mergeInfo.push(...expandResult.mergeInfo)
        currentRowIndex += expandResult.data.length
      } else {
        // 普通处理
        const newRow = [...row]
        
        validRules.forEach(rule => {
          try {
            const sourceData = row[rule.sourceColumn]
            
            if (sourceData && JsonProcessor.isJsonData(sourceData)) {
              let extracted
              
              if (rule.extractionType === 'array_string') {
                // 数组转字符串
                const arrayItems = JsonProcessor.extractArrayItems(sourceData, rule.arrayItemPath || '')
                extracted = JsonProcessor.arrayToString(arrayItems, rule.arraySeparator || ', ')
              } else {
                // 普通的JSON路径提取
                const rawValue = JsonProcessor.extractJsonData(sourceData, rule.jsonPath || '')
                extracted = JsonProcessor.formatValue(rawValue)
              }
              
              newRow.push(extracted !== null && extracted !== undefined ? extracted : '')
            } else {
              newRow.push('')
            }
          } catch (error) {
            console.error('JSON提取失败:', error)
            newRow.push('提取失败')
          }
        })
        
        allNewData.push(newRow)
        currentRowIndex++
      }
    })
    
    const result = {
      headers: newHeaders,
      data: allNewData,
      newColumnsCount: validRules.length
    }
    
    // 如果有合并信息，添加到结果中
    if (mergeInfo.length > 0) {
      result.mergeInfo = mergeInfo
    }
    
    return result
  }
  
  /**
   * 处理包含数组展开的行数据
   * @param {Array} row - 原始行数据
   * @param {Array} validRules - 有效规则
   * @param {number} startRowIndex - 起始行索引
   * @param {number} originalColumnCount - 原始列数
   * @returns {Object} 展开后的行数据和合并信息 {data: Array<Array>, mergeInfo: Array}
   */
  static processRowWithArrayExpansion(row, validRules, startRowIndex, originalColumnCount) {
    // 找到第一个数组展开规则的数组长度
    let maxArrayLength = 1
    const arrayData = new Map()
    
    validRules.forEach((rule, ruleIndex) => {
      if (rule.extractionType === 'array_expand') {
        try {
          const sourceData = row[rule.sourceColumn]
          if (sourceData && JsonProcessor.isJsonData(sourceData)) {
            const arrayItems = JsonProcessor.extractArrayItems(sourceData, rule.arrayItemPath || '')
            arrayData.set(ruleIndex, arrayItems)
            maxArrayLength = Math.max(maxArrayLength, arrayItems.length)
          }
        } catch (error) {
          console.error('数组展开失败:', error)
          arrayData.set(ruleIndex, [])
        }
      }
    })
    
    // 生成展开后的行
    const expandedRows = []
    const mergeInfo = []
    
    for (let i = 0; i < maxArrayLength; i++) {
      const newRow = [...row]
      
      validRules.forEach((rule, ruleIndex) => {
        try {
          const sourceData = row[rule.sourceColumn]
          
          if (sourceData && JsonProcessor.isJsonData(sourceData)) {
            let extracted
            
            if (rule.extractionType === 'array_expand') {
              // 数组展开：取对应索引的值
              const arrayItems = arrayData.get(ruleIndex) || []
              const rawValue = i < arrayItems.length ? arrayItems[i] : ''
              extracted = JsonProcessor.formatValue(rawValue)
            } else {
              // 非数组展开规则：只在第一行显示
              if (i === 0) {
                if (rule.extractionType === 'array_string') {
                  const arrayItems = JsonProcessor.extractArrayItems(sourceData, rule.arrayItemPath || '')
                  extracted = JsonProcessor.arrayToString(arrayItems, rule.arraySeparator || ', ')
                } else {
                  // 普通的JSON路径提取
                  const rawValue = JsonProcessor.extractJsonData(sourceData, rule.jsonPath || '')
                  extracted = JsonProcessor.formatValue(rawValue)
                }
              } else {
                extracted = ''
              }
            }
            
            newRow.push(extracted !== null && extracted !== undefined ? extracted : '')
          } else {
            newRow.push(i === 0 ? '' : '')
          }
        } catch (error) {
          console.error('JSON提取失败:', error)
          newRow.push(i === 0 ? '提取失败' : '')
        }
      })
      
      expandedRows.push(newRow)
    }
    
    // 计算需要合并的单元格
    if (maxArrayLength > 1) {
      // 对于原始数据列，如果有展开的行，需要合并单元格
      for (let col = 0; col < originalColumnCount; col++) {
        mergeInfo.push({
          startRow: startRowIndex,
          endRow: startRowIndex + maxArrayLength - 1,
          startCol: col,
          endCol: col
        })
      }
      
      // 对于非数组展开的新列，也需要合并
      let newColIndex = originalColumnCount
      validRules.forEach((rule) => {
        if (rule.extractionType !== 'array_expand') {
          mergeInfo.push({
            startRow: startRowIndex,
            endRow: startRowIndex + maxArrayLength - 1,
            startCol: newColIndex,
            endCol: newColIndex
          })
        }
        newColIndex++
      })
    }
    
    return {
      data: expandedRows,
      mergeInfo: mergeInfo
    }
  }

  /**
   * 生成并下载提取结果
   * @param {Array<Array>} previewData - 源数据
   * @param {Array} headers - 表头
   * @param {Array} extractionRules - 提取规则数组
   * @param {string} filename - 文件名，默认为 'extracted_data.xlsx'
   * @returns {Object} 操作结果统计
   */
  static async generateAndDownload(previewData, headers, extractionRules, filename = 'extracted_data.xlsx') {
    try {
      // 执行数据提取
      const result = DataExtractor.executeExtraction(previewData, headers, extractionRules)
      
      // 生成Excel文件（带合并单元格支持）
      let resultBuffer
      if (result.mergeInfo && result.mergeInfo.length > 0) {
        resultBuffer = ExcelProcessor.generateExcelFileWithMerge([result.headers, ...result.data], result.mergeInfo)
      } else {
        resultBuffer = ExcelProcessor.generateExcelFile([result.headers, ...result.data])
      }
      
      // 下载文件
      ExcelProcessor.downloadExcelFile(resultBuffer, filename)
      
      return {
        success: true,
        rows: result.data.length,
        newColumns: result.newColumnsCount
      }
    } catch (error) {
      console.error('生成文件失败:', error)
      throw new Error('处理失败: ' + error.message)
    }
  }

  /**
   * 验证提取规则
   * @param {Array} extractionRules - 提取规则数组
   * @returns {Object} 验证结果
   */
  static validateRules(extractionRules) {
    const validRules = extractionRules.filter(rule => {
      return (rule.sourceColumn || rule.sourceColumn === 0) && 
             rule.jsonPath && 
             rule.newColumnName &&
             JsonProcessor.validateJsonPath(rule.jsonPath)
    })

    const invalidRules = extractionRules.filter(rule => {
      return !((rule.sourceColumn || rule.sourceColumn === 0) && 
               rule.jsonPath && 
               rule.newColumnName &&
               JsonProcessor.validateJsonPath(rule.jsonPath))
    })

    return {
      isValid: invalidRules.length === 0,
      validCount: validRules.length,
      invalidCount: invalidRules.length,
      validRules,
      invalidRules
    }
  }

  /**
   * 创建新的提取规则
   * @returns {Object} 新规则对象
   */
  static createNewRule() {
    return {
      sourceColumn: '',
      jsonPath: '',
      newColumnName: '',
      extractionType: null, // 不设置默认值，由数据类型决定
      arraySeparator: '', // 数组转字符串时的分隔符
      arrayItemPath: '', // 数组元素内的路径
      preview: ''
    }
  }

  /**
   * 获取调试信息
   * @param {Array} extractionRules - 提取规则数组
   * @param {Array<Array>} previewData - 预览数据
   * @returns {Object} 调试信息
   */
  static getDebugInfo(extractionRules, previewData) {
    const validation = DataExtractor.validateRules(extractionRules)
    
    return {
      rulesCount: extractionRules.length,
      dataRows: previewData.length,
      validRules: validation.validCount,
      invalidRules: validation.invalidCount,
      rules: extractionRules.map((rule, index) => ({
        index: index + 1,
        sourceColumn: rule.sourceColumn,
        jsonPath: rule.jsonPath,
        newColumnName: rule.newColumnName,
        extractionType: rule.extractionType || 'single',
        isValid: validation.validRules.includes(rule)
      }))
    }
  }
  
  /**
   * 获取数组路径建议
   * @param {Array<Array>} previewData - 预览数据
   * @param {number} columnIndex - 列索引
   * @returns {Array} 路径建议数组
   */
  static getArrayPathSuggestions(previewData, columnIndex) {
    // 找到第一个有JSON数据的行
    const sampleRow = previewData.find(row => {
      const cellData = row[columnIndex]
      return cellData && JsonProcessor.isJsonData(cellData)
    })
    
    if (!sampleRow) {
      return []
    }
    
    const jsonData = sampleRow[columnIndex]
    return JsonProcessor.getArrayPathSuggestions(jsonData)
  }
}