import * as XLSX from 'xlsx'

/**
 * Excel 文件处理工具类
 */
export class ExcelProcessor {
  /**
   * 读取Excel文件并解析工作表
   * @param {File} file - Excel文件
   * @returns {Promise<{sheets: string[], workbook: XLSX.WorkBook}>}
   */
  static async readExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'array' })
          const sheets = workbook.SheetNames
          resolve({ sheets, workbook })
        } catch (error) {
          reject(new Error('读取Excel文件失败: ' + error.message))
        }
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 解析工作表数据
   * @param {XLSX.WorkBook} workbook - 工作簿对象
   * @param {string} sheetName - 工作表名称
   * @returns {Array<Array>} 二维数组数据
   */
  static parseSheetData(workbook, sheetName) {
    const worksheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  }

  /**
   * 处理数据（跳过表头）
   * @param {Array<Array>} rawData - 原始数据
   * @param {number} skipRows - 跳过的行数
   * @returns {{headers: Array, previewData: Array<Array>}}
   */
  static processData(rawData, skipRows = 0) {
    if (rawData.length === 0) {
      return { headers: [], previewData: [] }
    }

    const startRow = skipRows
    if (startRow >= rawData.length) {
      return { headers: [], previewData: [] }
    }

    const headers = rawData[startRow] || []
    const previewData = rawData.slice(startRow + 1)
    
    return { headers, previewData }
  }

  /**
   * 生成Excel文件
   * @param {Array<Array>} data - 数据数组（包含表头）
   * @returns {ArrayBuffer} Excel文件缓冲区
   */
  static generateExcelFile(data) {
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ExtractedData')
    
    // 生成Excel文件缓冲区
    const buffer = XLSX.write(workbook, { 
      type: 'array', 
      bookType: 'xlsx' 
    })
    
    return buffer
  }
  
  /**
   * 生成带合并单元格的Excel文件
   * @param {Array<Array>} data - 数据数组（包含表头）
   * @param {Array} mergeInfo - 合并信息数组 {startRow, endRow, startCol, endCol}
   * @returns {ArrayBuffer} Excel文件缓冲区
   */
  static generateExcelFileWithMerge(data, mergeInfo = []) {
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // 添加合并单元格信息
    if (mergeInfo.length > 0) {
      worksheet['!merges'] = mergeInfo.map(merge => ({
        s: { r: merge.startRow, c: merge.startCol }, // start
        e: { r: merge.endRow, c: merge.endCol }     // end
      }))
    }
    
    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ExtractedData')
    
    // 生成Excel文件缓冲区
    const buffer = XLSX.write(workbook, { 
      type: 'array', 
      bookType: 'xlsx' 
    })
    
    return buffer
  }

  /**
   * 下载Excel文件
   * @param {ArrayBuffer} buffer - 文件缓冲区
   * @param {string} filename - 文件名
   */
  static downloadExcelFile(buffer, filename) {
    try {
      // 确保buffer是有效的
      if (!buffer || buffer.byteLength === 0) {
        throw new Error('无效的文件数据')
      }
      
      // 创建Blob对象
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      // 检查文件大小
      if (blob.size === 0) {
        throw new Error('生成的文件为空')
      }
      
      // 直接使用传统方法下载，避免复杂逻辑导致的重复下载
      this.downloadWithAnchor(blob, filename)
    } catch (error) {
      console.error('下载文件时出错:', error)
      throw new Error('下载失败: ' + (error.message || '未知错误'))
    }
  }
  
  /**
   * 执行文件下载
   * @param {Blob} blob - 文件Blob对象
   * @param {string} filename - 文件名
   */
  static performDownload(blob, filename) {
    // 直接使用传统下载方式
    this.downloadWithAnchor(blob, filename)
  }
  
  /**
   * 使用锚点元素下载文件 (传统方式)
   * @param {Blob} blob - 文件Blob对象
   * @param {string} filename - 文件名
   */
  static downloadWithAnchor(blob, filename) {
    // 创建对象URL
    const url = URL.createObjectURL(blob)
    
    // 创建临时下载链接
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'download.xlsx'
    
    // 确保元素不会显示在页面上
    a.style.display = 'none'
    
    // 添加到文档中
    document.body.appendChild(a)
    
    // 触发点击事件
    try {
      // 创建并派发点击事件
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      })
      a.dispatchEvent(clickEvent)
    } catch (eventError) {
      // 如果MouseEvent不支持，使用click()方法
      console.warn('MouseEvent创建失败，使用click()方法:', eventError)
      a.click()
    }
    
    // 延迟清理资源
    setTimeout(() => {
      try {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (cleanupError) {
        console.warn('清理资源时出错:', cleanupError)
      }
    }, 1000)
  }
  
  /**
   * 使用现代文件系统API下载文件
   * @param {Blob} blob - 文件Blob对象
   * @param {string} filename - 文件名
   */
  static async downloadWithFilePicker(blob, filename) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename || 'download.xlsx',
        types: [{
          description: 'Excel文件',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
          }
        }]
      })
      
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
      return true
    } catch (error) {
      // 用户取消或不支持时抛出错误
      if (error.name === 'AbortError') {
        throw new Error('用户取消了下载')
      }
      throw error
    }
  }

  /**
   * 格式化文件大小
   * @param {number} size - 文件大小（字节）
   * @returns {string} 格式化后的文件大小
   */
  static formatFileSize(size) {
    const units = ['B', 'KB', 'MB', 'GB']
    let unitIndex = 0
    let fileSize = size

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024
      unitIndex++
    }

    return `${fileSize.toFixed(1)} ${units[unitIndex]}`
  }

  /**
   * 验证文件类型
   * @param {File} file - 文件对象
   * @returns {boolean} 是否为有效的Excel文件
   */
  static isValidExcelFile(file) {
    return file && file.name.match(/\.(xlsx|xls)$/i)
  }
}