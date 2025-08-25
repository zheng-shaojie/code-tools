<template>
  <div class="excel-json-extractor">
    <div class="header">
      <h2>Excel JSON 数据提取器</h2>
      <p>从 Excel 文件中提取 JSON 字段数据，生成新的 Excel 文件</p>
    </div>

    <div class="upload-section">
      <div class="upload-area" 
           @drop="handleFileDrop" 
           @dragover.prevent 
           @dragenter.prevent
           :class="{ 'drag-over': isDragOver }">
        <input 
          type="file" 
          ref="fileInput" 
          @change="handleFileSelect" 
          accept=".xlsx,.xls" 
          style="display: none;">
        <div class="upload-content" @click="$refs.fileInput.click()">
          <div class="upload-icon">📄</div>
          <p>拖拽 Excel 文件到此处或点击选择文件</p>
          <span class="file-types">支持 .xlsx, .xls 格式</span>
        </div>
      </div>
      
      <div v-if="selectedFile" class="file-info">
        <div class="file-info-content">
          <p>已选择文件: <strong>{{ selectedFile.name }}</strong></p>
          <p>文件大小: {{ ExcelProcessor.formatFileSize(selectedFile.size) }}</p>
        </div>
        <button class="btn-remove" @click="removeFile">移除</button>
      </div>
      
      <!-- 进度显示 -->
      <div class="progress-section" v-if="isProcessing">
        <div class="progress-info">
          <div class="progress-title">
            <svg class="progress-icon spinning" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="62.83" stroke-dashoffset="31.42"></circle>
            </svg>
            {{ progressText }}
          </div>
          <div class="progress-details" v-if="progressDetails">
            {{ progressDetails }}
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="progress-percent">{{ Math.round(progressPercent) }}%</div>
      </div>
    </div>

    <div v-if="sheets.length > 0" class="sheet-selector">
      <label>选择工作表:</label>
      <select v-model="selectedSheet" @change="loadSheetData">
        <option value="">请选择工作表</option>
        <option v-for="sheet in sheets" :key="sheet" :value="sheet">{{ sheet }}</option>
      </select>
    </div>

    <div v-if="selectedSheet" class="header-skip">
      <label>跳过表头行数:</label>
      <input 
        type="number" 
        v-model.number="skipRows" 
        min="0" 
        max="10" 
        @change="processData">
      <span class="helper-text">从第 {{ skipRows + 1 }} 行开始读取数据</span>
    </div>

    <div v-if="previewData.length > 0" class="data-preview">
      <h3>数据预览 (前5行)</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th v-for="(header, index) in headers" :key="index">
                {{ header }}
                <span v-if="JsonProcessor.hasJsonData(previewData, index)" class="json-indicator">JSON</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in previewData.slice(0, 5)" :key="rowIndex">
              <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                <div class="cell-content">
                  {{ JsonProcessor.formatCellValue(cell) }}
                  <button 
                    v-if="JsonProcessor.isJsonData(cell)" 
                    @click="showJsonDialog(cell, cellIndex)"
                    class="json-btn">
                    JSON
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="previewData.length > 0" class="json-extraction">
      <h3>JSON 数据提取配置</h3>
      <div class="extraction-rules">
        <div v-for="(rule, index) in extractionRules" :key="index" class="rule-item">
          <div class="rule-header">
            <label>提取规则 {{ index + 1 }}</label>
            <button @click="removeRule(index)" class="remove-btn">删除</button>
          </div>
          <div class="rule-config">
            <!-- 基础配置区域 -->
            <div class="config-section">
              <div class="config-row">
                <label class="config-label">源列:</label>
                <select v-model="rule.sourceColumn" @change="updateColumnSelection(index)" class="config-select">
                  <option value="">请选择包含JSON的列</option>
                  <option v-for="(header, colIndex) in headers" :key="colIndex" :value="colIndex">
                    {{ header }} ({{ JsonProcessor.hasJsonData(previewData, colIndex) ? '包含JSON' : '无JSON' }})
                  </option>
                </select>
              </div>
              
              <!-- 数据类型显示 -->
              <div v-if="rule.sourceColumn !== '' && rule.dataTypeInfo" class="config-row">
                <label class="config-label">数据类型:</label>
                <div class="data-type-display">
                  <span v-if="rule.dataTypeInfo.type === 'array'" class="type-badge array-badge">
                    🔢 数组类型 (共{{ rule.dataTypeInfo.length }}个元素)
                  </span>
                  <span v-else-if="rule.dataTypeInfo.type === 'object'" class="type-badge object-badge">
                    📦 对象类型
                  </span>
                  <span v-else class="type-badge primitive-badge">
                    📄 基本类型
                  </span>
                </div>
              </div>
            </div>
            
            <!-- 数组类型专用配置 -->
            <div v-if="rule.dataTypeInfo && rule.dataTypeInfo.type === 'array'" class="config-section array-config">
              <h4 class="section-title">数组处理配置</h4>
              
              <div class="config-row">
                <label class="config-label">提取类型:</label>
                <select v-model="rule.extractionType" @change="previewExtraction(index)" class="config-select">
                  <option value="array_string">🔗 数组转字符串</option>
                  <option value="array_expand">📋 数组展开（每个元素一行）</option>
                </select>
              </div>
              
              <div class="config-row path-row">
                <label class="config-label">数组元素路径:</label>
                <div class="path-input-group">
                  <input 
                    v-model="rule.arrayItemPath" 
                    placeholder="如: name 或 user.id（空白表示整个元素）"
                    @input="previewExtraction(index)"
                    class="config-input path-input">
                  <button v-if="rule.pathSuggestions && rule.pathSuggestions.length > 0" 
                          @click="showPathSuggestions(index)" 
                          class="suggestions-btn" 
                          type="button"
                          title="查看路径建议">
                    💡 建议
                  </button>
                </div>
                
                <!-- 数组类型专用路径建议下拉框 -->
                <div v-if="rule.showSuggestions" class="path-suggestions array-tree-suggestions">
                  <div class="suggestions-header">
                    <div class="header-left">
                      🔢 数组元素路径建议: 
                      <span class="node-count" v-if="rule.pathSuggestionsTree">
                        ({{ getVisibleNodeCount(rule.pathSuggestionsTree) }}/{{ getTotalNodeCount(rule.pathSuggestionsTree) }} 节点)
                      </span>
                    </div>
                    <div class="tree-controls">
                      <input v-model="rule.searchQuery" 
                             @input="filterTreeSuggestions(index)"
                             placeholder="搜索数组路径..." 
                             class="tree-search-input"
                             type="text">
                      <button @click="expandAllSuggestions(index)" class="tree-control-btn" title="展开全部">📂</button>
                      <button @click="collapseAllSuggestions(index)" class="tree-control-btn" title="折叠全部">📁</button>
                      <button @click="clearSearch(index)" class="tree-control-btn" title="清除搜索">🔍</button>
                    </div>
                  </div>
                  <div class="tree-container">
                    <div v-if="rule.pathSuggestionsTree" class="tree-root">
                      <div @click="selectArrayTreeSuggestion({ ruleIndex: index, path: rule.pathSuggestionsTree.path })" 
                           class="tree-node root-node array-root-node"
                           :class="{ 'selected': rule.selectedPath === rule.pathSuggestionsTree.path }">
                        <span class="node-expand-icon"
                              v-if="rule.pathSuggestionsTree.children && rule.pathSuggestionsTree.children.length > 0"
                              @click.stop="rule.pathSuggestionsTree.expanded = !rule.pathSuggestionsTree.expanded"
                              :class="{ 'expanded': rule.pathSuggestionsTree.expanded }">
                          ▶
                        </span>
                        <span v-else class="node-expand-placeholder"></span>
                        <span class="node-label">{{ rule.pathSuggestionsTree.label }}</span>
                        <span class="node-description">{{ rule.pathSuggestionsTree.description }}</span>
                      </div>
                      <div v-if="rule.pathSuggestionsTree.expanded && rule.pathSuggestionsTree.children && rule.pathSuggestionsTree.children.length > 0" class="tree-children">
                        <TreeNode v-for="child in rule.pathSuggestionsTree.children" 
                                  :key="child.id"
                                  :node="child"
                                  :rule-index="index"
                                  :selected-path="rule.selectedPath"
                                  @select="selectArrayTreeSuggestion"
                                  @copy-path="copyPathToClipboard"></TreeNode>
                      </div>
                    </div>
                    <div v-else-if="rule.pathSuggestions && rule.pathSuggestions.length > 0" class="fallback-list">
                      <!-- 备用的列表显示，当树形数据不可用时使用 -->
                      <div v-for="suggestion in rule.pathSuggestions" 
                           :key="suggestion.path" 
                           @click="selectArraySuggestion(index, suggestion.path)"
                           class="suggestion-item array-suggestion-item"
                           :class="{ 'selected': rule.selectedPath === suggestion.path }">
                        <div class="suggestion-path">{{ suggestion.label }}</div>
                        <div class="suggestion-desc">{{ suggestion.description }}</div>
                      </div>
                    </div>
                    <div v-else class="no-suggestions">
                      暂无可用的数组路径建议
                    </div>
                  </div>
                </div>
                
                <div class="path-help">💡 提示: 空白表示整个元素，或输入如 name、user.id 等路径</div>
              </div>
              
              <!-- 分隔符配置（仅array_string） -->
              <div v-if="rule.extractionType === 'array_string'" class="config-row">
                <label class="config-label">分隔符:</label>
                <input 
                  v-model="rule.arraySeparator" 
                  placeholder="默认为逗号空格 (, )"
                  @input="previewExtraction(index)"
                  class="config-input separator-input">
              </div>
            </div>
            
            <!-- 对象/基本类型配置 -->
            <div v-if="!rule.dataTypeInfo || rule.dataTypeInfo.type !== 'array'" class="config-section object-config">
              <h4 class="section-title">JSON路径配置</h4>
              
              <div class="config-row path-row">
                <label class="config-label">JSON路径:</label>
                <div class="path-input-group">
                  <input 
                    v-model="rule.jsonPath" 
                    placeholder="例如: $.user.name 或 data[0].id"
                    @input="previewExtraction(index)"
                    class="config-input json-path-input">
                  <button v-if="rule.pathSuggestions && rule.pathSuggestions.length > 0" 
                          @click="showPathSuggestions(index)" 
                          class="suggestions-btn" 
                          type="button"
                          title="查看路径建议">
                    💡 建议
                  </button>
                </div>
                
                <!-- 路径建议下拉框 -->
                <div v-if="rule.showSuggestions" class="path-suggestions tree-suggestions">
                  <div class="suggestions-header">
                    <div class="header-left">
                      路径建议: 
                      <span class="node-count" v-if="rule.pathSuggestionsTree">
                        ({{ getVisibleNodeCount(rule.pathSuggestionsTree) }}/{{ getTotalNodeCount(rule.pathSuggestionsTree) }} 节点)
                      </span>
                    </div>
                    <div class="tree-controls">
                      <input v-model="rule.searchQuery" 
                             @input="filterTreeSuggestions(index)"
                             placeholder="搜索路径..." 
                             class="tree-search-input"
                             type="text">
                      <button @click="expandAllSuggestions(index)" class="tree-control-btn" title="展开全部">📂</button>
                      <button @click="collapseAllSuggestions(index)" class="tree-control-btn" title="折叠全部">📁</button>
                      <button @click="clearSearch(index)" class="tree-control-btn" title="清除搜索">🔍</button>
                    </div>
                  </div>
                  <div class="tree-container">
                    <div v-if="rule.pathSuggestionsTree" class="tree-root">
                      <div @click="selectTreeSuggestion({ ruleIndex: index, path: rule.pathSuggestionsTree.path })" 
                           class="tree-node root-node"
                           :class="{ 'selected': rule.selectedPath === rule.pathSuggestionsTree.path }">
                        <span class="node-expand-icon"
                              v-if="rule.pathSuggestionsTree.children && rule.pathSuggestionsTree.children.length > 0"
                              @click.stop="rule.pathSuggestionsTree.expanded = !rule.pathSuggestionsTree.expanded"
                              :class="{ 'expanded': rule.pathSuggestionsTree.expanded }">
                          ▶
                        </span>
                        <span v-else class="node-expand-placeholder"></span>
                        <span class="node-label">{{ rule.pathSuggestionsTree.label }}</span>
                        <span class="node-description">{{ rule.pathSuggestionsTree.description }}</span>
                      </div>
                      <div v-if="rule.pathSuggestionsTree.expanded && rule.pathSuggestionsTree.children && rule.pathSuggestionsTree.children.length > 0" class="tree-children">
                        <TreeNode v-for="child in rule.pathSuggestionsTree.children" 
                                  :key="child.id"
                                  :node="child"
                                  :rule-index="index"
                                  :selected-path="rule.selectedPath"
                                  @select="selectTreeSuggestion"
                                  @copy-path="copyPathToClipboard"></TreeNode>
                      </div>
                    </div>
                    <div v-else-if="rule.pathSuggestions && rule.pathSuggestions.length > 0" class="fallback-list">
                      <!-- 备用的列表显示，当树形数据不可用时使用 -->
                      <div v-for="suggestion in rule.pathSuggestions" 
                           :key="suggestion.path" 
                           @click="selectObjectSuggestion(index, suggestion.path)"
                           class="suggestion-item"
                           :class="{ 'selected': rule.selectedPath === suggestion.path }">
                        <div class="suggestion-path">{{ suggestion.label }}</div>
                        <div class="suggestion-desc">{{ suggestion.description }}</div>
                      </div>
                    </div>
                    <div v-else class="no-suggestions">
                      暂无可用的路径建议
                    </div>
                  </div>
                </div>
                
                <div class="path-help">💡 提示: 使用JSONPath语法访问对象属性</div>
              </div>
            </div>
            
            <!-- 输出配置 -->
            <div class="config-section output-config">
              <h4 class="section-title">输出配置</h4>
              
              <div class="config-row">
                <label class="config-label">新列名:</label>
                <input 
                  v-model="rule.newColumnName" 
                  placeholder="提取后的新列名"
                  class="config-input column-name-input">
              </div>
            </div>
          </div>
          
          <div v-if="rule.preview" class="rule-preview">
            <small>预览: {{ rule.preview }}</small>
          </div>
        </div>
        
        <button @click="addRule" class="add-rule-btn">添加提取规则</button>
      </div>
    </div>

    <div v-if="previewData.length > 0 && extractionRules.length > 0" class="actions">
      <button @click="previewResult" class="preview-btn" :disabled="isProcessing">
        {{ isProcessing ? '处理中...' : '🔍 预览提取结果' }}
      </button>
    </div>

    <!-- JSON预览对话框 -->
    <div v-if="showJsonPreview" class="json-dialog-overlay" @click="closeJsonDialog">
      <div class="json-dialog" @click.stop>
        <div class="dialog-header">
          <h4>JSON 数据预览</h4>
          <button @click="closeJsonDialog" class="close-btn">×</button>
        </div>
        <div class="dialog-content">
          <pre>{{ formattedJson }}</pre>
        </div>
      </div>
    </div>

    <!-- 结果预览区域 -->
    <div v-if="previewResultData" class="result-preview-section">
      <h3>提取结果预览</h3>
      <div class="preview-actions">
        <button @click="downloadFromPreview" class="download-btn-inline">下载Excel文件</button>
        <button @click="closeResultPreview" class="clear-btn">清除预览</button>
      </div>
      <div class="preview-stats">
        <p>共 {{ previewResultData.data.length }} 行数据，新增 {{ previewResultData.newColumnsCount }} 列</p>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th v-for="(header, index) in previewResultData.headers" :key="'header-' + index">
                {{ header || '空列' }}
                <span v-if="index >= headers.length" class="new-column-indicator">新</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in previewResultData.data.slice(0, 10)" :key="'row-' + rowIndex">
              <template v-for="(cell, cellIndex) in row" :key="'cell-' + rowIndex + '-' + cellIndex">
                <td v-if="!shouldMergeCell(rowIndex + 1, cellIndex) || shouldMergeCell(rowIndex + 1, cellIndex)?.isFirst"
                    :class="{
                      'new-column': cellIndex >= headers.length,
                      [getMergeCellClass(rowIndex + 1, cellIndex)]: true
                    }"
                    :rowspan="shouldMergeCell(rowIndex + 1, cellIndex)?.rowspan || 1"
                    :colspan="shouldMergeCell(rowIndex + 1, cellIndex)?.colspan || 1">
                  <div class="cell-content">
                    {{ JsonProcessor.formatPreviewCell(cell) }}
                    <span v-if="shouldMergeCell(rowIndex + 1, cellIndex)?.isFirst" class="merge-indicator">合并</span>
                  </div>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
        <div v-if="previewResultData.data.length > 10" class="preview-more">
          <p>仅显示前 10 行，共 {{ previewResultData.data.length }} 行数据</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { nextTick } from 'vue'
import { ExcelProcessor } from '../utils/excelProcessor.js'
import { JsonProcessor } from '../utils/jsonProcessor.js'
import { DataExtractor } from '../utils/dataExtractor.js'
import TreeNode from './TreeNode.vue'

export default {
  name: 'ExcelJsonExtractor',
  components: {
    TreeNode
  },
  data() {
    return {
      selectedFile: null,
      isDragOver: false,
      sheets: [],
      selectedSheet: '',
      skipRows: 0,
      rawData: [],
      previewData: [],
      headers: [],
      extractionRules: [],
      showJsonPreview: false,
      currentJsonData: null,
      currentColumnIndex: null,
      isProcessing: false,
      previewResultData: null,
      workbook: null,
      // 添加进度显示相关数据
      progressPercent: 0,
      progressText: '',
      progressDetails: ''
    }
  },
  computed: {
    // 静态引用工具类，方便在模板中使用
    ExcelProcessor: () => ExcelProcessor,
    JsonProcessor: () => JsonProcessor,
    DataExtractor: () => DataExtractor,
    
    // 格式化的JSON数据用于预览
    formattedJson() {
      return JsonProcessor.formatJson(this.currentJsonData)
    }
  },
  methods: {
    // 文件拖拽处理
    handleFileDrop(e) {
      e.preventDefault()
      this.isDragOver = false
      const files = e.dataTransfer.files
      if (files.length > 0) {
        this.processFile(files[0])
      }
    },
    
    // 文件选择处理
    handleFileSelect(e) {
      const file = e.target.files[0]
      if (file) {
        this.processFile(file)
      }
    },
    
    // 处理选择的文件
    processFile(file) {
      if (!ExcelProcessor.isValidExcelFile(file)) {
        alert('请选择有效的 Excel 文件 (.xlsx 或 .xls)')
        return
      }
      
      // 在处理新文件前清空之前的状态
      this.clearAllStates()
      
      this.selectedFile = file
      this.readExcelFile(file)
    },
    
    // 读取Excel文件
    async readExcelFile(file) {
      try {
        // 清空之前的所有状态
        this.clearAllStates()
        
        const { sheets, workbook } = await ExcelProcessor.readExcelFile(file)
        this.sheets = sheets
        this.workbook = workbook
        
        // 自动选择第一个sheet并加载数据
        if (this.sheets.length > 0) {
          this.selectedSheet = this.sheets[0]
          this.loadSheetDataInternal()
        } else {
          this.selectedSheet = ''
          this.previewData = []
          this.headers = []
        }
        
      } catch (error) {
        console.error('读取Excel文件失败:', error)
        alert(error.message)
      }
    },
    
    // 清空所有状态数据
    clearAllStates() {
      // 清空数据相关状态
      this.rawData = []
      this.previewData = []
      this.headers = []
      this.sheets = []
      this.selectedSheet = ''
      this.skipRows = 0
      
      // 清空提取规则相关状态
      this.extractionRules = []
      
      // 清空预览结果相关状态
      this.previewResultData = null
      
      // 清空JSON预览相关状态
      this.showJsonPreview = false
      this.currentJsonData = null
      this.currentColumnIndex = null
      
      // 重置处理状态
      this.isProcessing = false
    },
    
    // 加载工作表数据
    loadSheetData() {
      // 切换工作表时清空相关状态
      this.extractionRules = []
      this.previewResultData = null
      this.showJsonPreview = false
      this.currentJsonData = null
      this.currentColumnIndex = null
      
      this.loadSheetDataInternal()
    },
    
    // 内部加载工作表数据方法
    loadSheetDataInternal() {
      if (!this.workbook || !this.selectedSheet) return
      
      try {
        this.rawData = ExcelProcessor.parseSheetData(this.workbook, this.selectedSheet)
        this.processData()
      } catch (error) {
        console.error('解析工作表失败:', error)
        alert('解析工作表失败: ' + error.message)
      }
    },
    
    // 处理数据（跳过表头）
    processData() {
      const result = ExcelProcessor.processData(this.rawData, this.skipRows)
      this.headers = result.headers
      this.previewData = result.previewData
    },
    
    // 显示JSON对话框
    showJsonDialog(data, columnIndex) {
      this.currentJsonData = data
      this.currentColumnIndex = columnIndex
      this.showJsonPreview = true
    },
    
    // 关闭JSON对话框
    closeJsonDialog() {
      this.showJsonPreview = false
      this.currentJsonData = null
      this.currentColumnIndex = null
    },
    
    // 添加提取规则
    addRule() {
      const newRule = DataExtractor.createNewRule()
      // 确保所有属性都是响应式的
      newRule.dataTypeInfo = null
      newRule.pathSuggestions = []
      newRule.pathSuggestionsTree = null
      newRule.showSuggestions = false
      newRule.selectedPath = null
      newRule.searchQuery = '' // 添加搜索查询属性
      this.extractionRules.push(newRule)
    },
    
    // 删除提取规则
    removeRule(index) {
      this.extractionRules.splice(index, 1)
    },
    
    // 预览提取规则
    previewExtraction(ruleIndex) {
      const rule = this.extractionRules[ruleIndex]
      rule.preview = DataExtractor.previewExtractionRule(this.previewData, rule)
    },
    
    // 更新列选择，检查数据类型
    updateColumnSelection(ruleIndex) {
      const rule = this.extractionRules[ruleIndex]
      
      if ((rule.sourceColumn || rule.sourceColumn === 0) && this.previewData.length > 0) {
        // 检查数据类型
        const sampleRow = this.previewData.find(row => {
          const cellData = row[rule.sourceColumn]
          return cellData && JsonProcessor.isJsonData(cellData)
        })
        
        if (sampleRow) {
          const jsonData = sampleRow[rule.sourceColumn]
          const dataTypeInfo = JsonProcessor.getJsonDataType(jsonData)
          
          console.log('数据类型检测结果:', dataTypeInfo)
          
          // 直接赋值，Vue 3 会自动检测变化
          rule.dataTypeInfo = dataTypeInfo
          
          // 根据数据类型设置提取类型
          if (dataTypeInfo.type === 'array') {
            // 数组类型：获取树形路径建议
            const pathSuggestionsTree = JsonProcessor.getArrayPathSuggestionsTree(jsonData)
            const pathSuggestions = JsonProcessor.getArrayPathSuggestions(jsonData) // 保留列表形式作为备用
            console.log('数组路径建议（树形）:', pathSuggestionsTree)
            console.log('数组路径建议（列表）:', pathSuggestions)
            
            // 初始化树形节点的可见性和展开状态
            if (pathSuggestionsTree) {
              this.initializeTreeNode(pathSuggestionsTree)
            }
            
            rule.pathSuggestionsTree = pathSuggestionsTree
            rule.pathSuggestions = pathSuggestions
            rule.showSuggestions = false
            rule.selectedPath = null
            
            // 默认设置为数组转字符串
            if (!rule.extractionType) {
              rule.extractionType = 'array_string'
            }
            if (!rule.arraySeparator) {
              rule.arraySeparator = ', '
            }
          } else if (dataTypeInfo.type === 'object') {
            // 对象类型：获取树形路径建议
            const pathSuggestionsTree = JsonProcessor.getObjectPathSuggestionsTree(jsonData)
            const pathSuggestions = JsonProcessor.getObjectPathSuggestions(jsonData) // 保留列表形式作为备用
            console.log('对象路径建议（树形）:', pathSuggestionsTree)
            console.log('对象路径建议（列表）:', pathSuggestions)
            
            // 初始化树形节点的可见性和展开状态
            if (pathSuggestionsTree) {
              this.initializeTreeNode(pathSuggestionsTree)
            }
            
            rule.pathSuggestionsTree = pathSuggestionsTree
            rule.pathSuggestions = pathSuggestions
            rule.showSuggestions = false
            rule.selectedPath = null
            
            // 清除数组相关设置
            rule.extractionType = null
            rule.arrayItemPath = ''
            rule.arraySeparator = ''
          } else {
            // 基本类型：清除所有数组和对象相关设置
            rule.extractionType = null
            rule.pathSuggestions = []
            rule.pathSuggestionsTree = null
            rule.showSuggestions = false
            rule.arrayItemPath = ''
            rule.arraySeparator = ''
          }
        } else {
          // 没有找到JSON数据，清除所有相关设置
          rule.dataTypeInfo = null
          rule.pathSuggestions = []
          rule.pathSuggestionsTree = null
          rule.showSuggestions = false
          rule.selectedPath = null
          rule.extractionType = null
          rule.arrayItemPath = ''
          rule.arraySeparator = ''
        }
      } else {
        // 没有选择列，清除所有相关设置
        rule.dataTypeInfo = null
        rule.pathSuggestions = []
        rule.pathSuggestionsTree = null
        rule.showSuggestions = false
        rule.selectedPath = null
        rule.extractionType = null
        rule.arrayItemPath = ''
        rule.arraySeparator = ''
      }
      
      this.previewExtraction(ruleIndex)
    },
    
    // 显示路径建议
    showPathSuggestions(ruleIndex) {
      const rule = this.extractionRules[ruleIndex]
      rule.showSuggestions = !rule.showSuggestions
    },
    
    // 选择路径建议
    selectSuggestion(ruleIndex, path) {
      const rule = this.extractionRules[ruleIndex]
      rule.arrayItemPath = path
      rule.showSuggestions = false
      this.previewExtraction(ruleIndex)
    },
    
    // 选择对象路径建议
    selectObjectSuggestion(ruleIndex, path) {
      const rule = this.extractionRules[ruleIndex]
      rule.jsonPath = path
      rule.selectedPath = path
      rule.showSuggestions = false
      this.previewExtraction(ruleIndex)
    },

    // 选择树形路径建议（对象类型）
    selectTreeSuggestion(data) {
      const { ruleIndex, path } = data
      const rule = this.extractionRules[ruleIndex]
      
      // 对象类型使用 jsonPath
      rule.jsonPath = path
      rule.selectedPath = path
      rule.showSuggestions = false
      this.previewExtraction(ruleIndex)
    },

    // 选择数组类型的树形路径建议
    selectArrayTreeSuggestion(data) {
      const { ruleIndex, path } = data
      const rule = this.extractionRules[ruleIndex]
      
      // 数组类型使用 arrayItemPath
      rule.arrayItemPath = path
      rule.selectedPath = path
      rule.showSuggestions = false
      this.previewExtraction(ruleIndex)
    },

    // 选择数组类型的列表建议（备用方法）
    selectArraySuggestion(ruleIndex, path) {
      const rule = this.extractionRules[ruleIndex]
      
      // 数组类型使用 arrayItemPath
      rule.arrayItemPath = path
      rule.selectedPath = path
      rule.showSuggestions = false
      this.previewExtraction(ruleIndex)
    },

    // 展开所有建议
    expandAllSuggestions(ruleIndex) {
      const rule = this.extractionRules[ruleIndex]
      if (rule.pathSuggestionsTree) {
        this.expandNodeRecursively(rule.pathSuggestionsTree)
      }
    },

    // 折叠所有建议
    collapseAllSuggestions(ruleIndex) {
      const rule = this.extractionRules[ruleIndex]
      if (rule.pathSuggestionsTree) {
        this.collapseNodeRecursively(rule.pathSuggestionsTree)
        rule.pathSuggestionsTree.expanded = true // 保持根节点展开
      }
    },

    // 递归展开节点
    expandNodeRecursively(node) {
      node.expanded = true
      if (node.children) {
        node.children.forEach(child => this.expandNodeRecursively(child))
      }
    },

    // 递归折叠节点
    collapseNodeRecursively(node) {
      node.expanded = false
      if (node.children) {
        node.children.forEach(child => this.collapseNodeRecursively(child))
      }
    },

    // 清除搜索
    clearSearch(ruleIndex) {
      const rule = this.extractionRules[ruleIndex]
      rule.searchQuery = ''
      this.filterTreeSuggestions(ruleIndex)
    },

    // 过滤树形建议
    filterTreeSuggestions(ruleIndex) {
      const rule = this.extractionRules[ruleIndex]
      const query = (rule.searchQuery || '').toLowerCase().trim()
      
      if (!rule.pathSuggestionsTree) return
      
      if (!query) {
        // 没有搜索查询时，恢复原始状态
        this.restoreTreeVisibility(rule.pathSuggestionsTree)
      } else {
        // 有搜索查询时，过滤节点
        this.filterTreeNodes(rule.pathSuggestionsTree, query)
      }
    },

    // 恢复树形节点的可见性
    restoreTreeVisibility(node) {
      node.visible = true
      if (node.children) {
        node.children.forEach(child => this.restoreTreeVisibility(child))
      }
    },

    // 过滤树形节点
    filterTreeNodes(node, query) {
      let hasVisibleChild = false
      
      // 首先处理子节点
      if (node.children) {
        node.children.forEach(child => {
          this.filterTreeNodes(child, query)
          if (child.visible) {
            hasVisibleChild = true
          }
        })
      }
      
      // 检查当前节点是否匹配搜索条件
      const matchesSearch = 
        node.label.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query) ||
        node.path.toLowerCase().includes(query)
      
      // 节点可见的条件：自身匹配搜索或有可见的子节点
      node.visible = matchesSearch || hasVisibleChild
      
      // 如果节点匹配搜索或有可见子节点，自动展开
      if (node.visible && (matchesSearch || hasVisibleChild)) {
        node.expanded = true
      }
    },

    // 智能展开相关节点
    smartExpandRelevantNodes(ruleIndex, searchTerm) {
      const rule = this.extractionRules[ruleIndex]
      if (!rule.pathSuggestionsTree) return
      
      this.expandRelevantNodes(rule.pathSuggestionsTree, searchTerm.toLowerCase())
    },

    // 展开相关节点
    expandRelevantNodes(node, searchTerm) {
      let shouldExpand = false
      
      // 检查自身是否相关
      if (node.label.toLowerCase().includes(searchTerm) ||
          node.description.toLowerCase().includes(searchTerm) ||
          node.path.toLowerCase().includes(searchTerm)) {
        shouldExpand = true
      }
      
      // 检查子节点
      if (node.children) {
        node.children.forEach(child => {
          if (this.expandRelevantNodes(child, searchTerm)) {
            shouldExpand = true
          }
        })
      }
      
      if (shouldExpand) {
        node.expanded = true
      }
      
      return shouldExpand
    },

    // 初始化树形节点
    initializeTreeNode(node) {
      // 设置默认可见性
      if (node.visible === undefined) {
        node.visible = true
      }
      
      // 设置默认展开状态（根节点默认展开，其他节点默认折叠）
      if (node.expanded === undefined) {
        node.expanded = node.depth === 0 // 只有根节点默认展开
      }
      
      // 递归初始化子节点
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          this.initializeTreeNode(child)
        })
      }
    },

    // 获取可见节点数量
    getVisibleNodeCount(node) {
      if (!node) return 0
      
      let count = (node.visible !== false) ? 1 : 0
      
      if (node.children) {
        node.children.forEach(child => {
          count += this.getVisibleNodeCount(child)
        })
      }
      
      return count
    },

    // 获取总节点数量
    getTotalNodeCount(node) {
      if (!node) return 0
      
      let count = 1
      
      if (node.children) {
        node.children.forEach(child => {
          count += this.getTotalNodeCount(child)
        })
      }
      
      return count
    },

    // 复制路径到剪贴板
    copyPathToClipboard(path) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(path).then(() => {
          // 显示复制成功的提示
          this.showCopySuccess()
        }).catch(err => {
          console.error('复制失败:', err)
          this.fallbackCopyToClipboard(path)
        })
      } else {
        this.fallbackCopyToClipboard(path)
      }
    },

    // 后备复制方法
    fallbackCopyToClipboard(text) {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
        this.showCopySuccess()
      } catch (err) {
        console.error('复制失败:', err)
      }
      
      document.body.removeChild(textArea)
    },

    // 显示复制成功提示
    showCopySuccess() {
      // 这里可以添加一个简单的提示消息
      const originalTitle = document.title
      document.title = '路径已复制!'
      setTimeout(() => {
        document.title = originalTitle
      }, 2000)
    },

    // 预览提取结果
    previewResult() {
      this.isProcessing = true
      this.progressPercent = 0
      this.progressText = '正在处理数据...'
      this.progressDetails = '开始提取JSON数据'
      
      // 使用setTimeout确保UI更新
      setTimeout(() => {
        try {
          // 使用带进度回调的executeExtraction方法
          this.previewResultData = DataExtractor.executeExtraction(
            this.previewData, 
            this.headers, 
            this.extractionRules,
            (percent, text, details) => {
              // 更新进度
              this.progressPercent = percent
              this.progressText = text
              this.progressDetails = details
            }
          )
          
          // 滚动到预览区域
          nextTick(() => {
            const previewElement = document.querySelector('.result-preview-section')
            if (previewElement) {
              previewElement.scrollIntoView({ behavior: 'smooth' })
            }
          })
          
        } catch (error) {
          console.error('预览错误:', error)
          alert('预览失败: ' + error.message)
        } finally {
          this.isProcessing = false
        }
      }, 100)
    },
    
    // 清除结果预览
    closeResultPreview() {
      this.previewResultData = null
    },
    
    // 检查单元格是否需要合并显示
    shouldMergeCell(rowIndex, colIndex) {
      if (!this.previewResultData || !this.previewResultData.mergeInfo) {
        return null
      }
      
      // 查找是否有合并信息覆盖当前单元格
      const mergeInfo = this.previewResultData.mergeInfo.find(merge => {
        return rowIndex >= merge.startRow && rowIndex <= merge.endRow &&
               colIndex >= merge.startCol && colIndex <= merge.endCol
      })
      
      if (mergeInfo) {
        // 如果是合并区域的第一个单元格，返回合并信息
        if (rowIndex === mergeInfo.startRow && colIndex === mergeInfo.startCol) {
          return {
            rowspan: mergeInfo.endRow - mergeInfo.startRow + 1,
            colspan: mergeInfo.endCol - mergeInfo.startCol + 1,
            isFirst: true
          }
        } else {
          // 如果是合并区域的其他单元格，标记为隐藏
          return { isHidden: true }
        }
      }
      
      return null
    },
    
    // 获取合并单元格的样式
    getMergeCellClass(rowIndex, colIndex) {
      const mergeCell = this.shouldMergeCell(rowIndex, colIndex)
      if (mergeCell) {
        if (mergeCell.isHidden) {
          return 'merge-hidden'
        } else if (mergeCell.isFirst) {
          return 'merge-cell'
        }
      }
      return ''
    },
    
    // 从预览区域下载
    async downloadFromPreview() {
      if (this.previewResultData) {
        try {
          let resultBuffer
          
          // 检查是否有合并信息
          if (this.previewResultData.mergeInfo && this.previewResultData.mergeInfo.length > 0) {
            resultBuffer = ExcelProcessor.generateExcelFileWithMerge([
              this.previewResultData.headers, 
              ...this.previewResultData.data
            ], this.previewResultData.mergeInfo)
          } else {
            resultBuffer = ExcelProcessor.generateExcelFile([
              this.previewResultData.headers, 
              ...this.previewResultData.data
            ])
          }
          
          ExcelProcessor.downloadExcelFile(resultBuffer, 'extracted_data.xlsx')
          
          // 显示成功提示
          alert(`成功下载！\n共处理 ${this.previewResultData.data.length} 行数据，新增 ${this.previewResultData.newColumnsCount} 列`)
        } catch (error) {
          console.error('下载失败:', error)
          alert('下载失败: ' + error.message)
        }
      }
    },
    
    // 移除文件
    removeFile() {
      this.selectedFile = null
      this.sheets = []
      this.selectedSheet = ''
      this.headers = []
      this.previewData = []
      this.fullData = []
      this.extractionRules = [this.createDefaultRule()]
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    }
  }
}
</script>

<style scoped>
/* 数组类型专用的树形路径建议样式 */
.array-tree-suggestions {
  max-height: 400px;
  overflow-y: auto;
  border: 2px solid #ff7875;
  border-radius: 6px;
  background: #fff7f7;
}

.array-tree-suggestions .suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #ffebeb;
  border-bottom: 1px solid #ff7875;
  font-weight: bold;
  color: #cf1322;
}

.array-tree-suggestions .tree-search-input {
  border-color: #ff7875;
}

.array-tree-suggestions .tree-search-input:focus {
  border-color: #ff4d4f;
  box-shadow: 0 0 3px rgba(255, 77, 79, 0.3);
}

.array-tree-suggestions .tree-control-btn {
  border-color: #ff7875;
}

.array-tree-suggestions .tree-control-btn:hover {
  background: #ffebeb;
  border-color: #ff4d4f;
}

/* 数组根节点样式 */
.array-root-node {
  background: linear-gradient(90deg, #ffebeb 0%, #fff2f2 100%);
  border: 1px solid #ff7875;
  border-radius: 4px;
  margin-bottom: 3px;
}

.array-root-node:hover {
  background: linear-gradient(90deg, #ffe0e0 0%, #ffebeb 100%);
  border-color: #ff4d4f;
}

.array-root-node.selected {
  background: linear-gradient(90deg, #ff4d4f 0%, #ff7875 100%);
  color: white;
  border-color: #cf1322;
}

/* 数组建议项样式 */
.array-suggestion-item {
  border-left: 3px solid #ff7875;
  background: #fff7f7;
}

.array-suggestion-item:hover {
  background-color: #ffebeb;
}

.array-suggestion-item.selected {
  background-color: #ffe0e0;
  border-left-color: #ff4d4f;
  color: #cf1322;
}

/* 树形路径建议样式 */
.tree-suggestions {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
}

.tree-suggestions .suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  font-weight: bold;
  color: #333;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-count {
  font-size: 11px;
  color: #666;
  font-weight: normal;
  background: #e9e9e9;
  padding: 2px 6px;
  border-radius: 10px;
}

.tree-controls {
  display: flex;
  gap: 5px;
  align-items: center;
}

.tree-search-input {
  padding: 3px 6px;
  font-size: 11px;
  border: 1px solid #ccc;
  border-radius: 3px;
  width: 120px;
  margin-right: 5px;
}

.tree-search-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 3px rgba(24, 144, 255, 0.3);
}

.tree-control-btn {
  padding: 3px 6px;
  font-size: 11px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  color: #666;
  min-width: 24px;
  text-align: center;
}

.tree-control-btn:hover {
  background: #e9e9e9;
  border-color: #999;
}

.tree-container {
  padding: 5px;
}

.tree-root {
  user-select: none;
}

.tree-children {
  margin-left: 15px;
  border-left: 1px dashed #d9d9d9;
  position: relative;
}

.fallback-list {
  max-height: 300px;
  overflow-y: auto;
}

.no-suggestions {
  padding: 20px;
  text-align: center;
  color: #999;
  font-style: italic;
}

/* 原有样式的改进 */
.path-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-top: 2px;
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.suggestion-item:hover {
  background-color: #f0f8ff;
}

.suggestion-item.selected {
  background-color: #e6f3ff;
  border-left: 3px solid #1890ff;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-path {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  color: #1890ff;
  font-weight: 500;
  margin-bottom: 2px;
}

.suggestion-desc {
  font-size: 11px;
  color: #666;
}

/* 保持原有的其他样式 */
</style>

<style src="../styles/ExcelJsonExtractor.css"></style>