<template>
  <div>
    <!-- 文件上传区域 -->
    <div class="file-section">
      <div class="file-header">
        <h3>选择Excel文件</h3>
      </div>
      <div 
        class="file-drop-zone" 
        :class="{ dragover: isDragOver }"
        @click="triggerFileInput"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @drop.prevent="handleFileDrop">
        <div class="file-drop-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <p>点击选择文件或拖拽Excel文件到此处</p>
          <small>支持 .xlsx 和 .xls 格式</small>
        </div>
      </div>
      <input 
        type="file" 
        ref="fileInput"
        accept=".xlsx,.xls" 
        style="display: none;"
        @change="handleFileSelect">
        
      <div class="file-info" v-if="selectedFile">
        <span class="file-name">{{ selectedFile.name }}</span>
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

    <!-- 工作表选择区域 -->
    <div class="sheet-section" v-if="workbook">
      <div class="sheet-header-skip">
        <div class="sheet-config">
          <label>选择工作表:</label>
          <select v-model="selectedSheet" @change="loadSheetData">
            <option v-for="sheetName in sheetNames" :key="sheetName" :value="sheetName">
              {{ sheetName }}
            </option>
          </select>
        </div>
        
        <!-- 表头配置 -->
        <div class="skip-config" v-if="selectedSheet">
          <label for="headerRows">跳过表头行数:</label>
          <input 
            type="number" 
            id="headerRows"
            v-model.number="headerRows" 
            min="0" 
            max="10"
            @change="loadSheetData"
            placeholder="表头占用的行数">
          <span class="helper-text">从第 {{ headerRows + 1 }} 行开始是数据</span>
        </div>
      </div>
      
      <div class="sheet-preview" v-if="previewData.length > 0">
        <div class="preview-info">数据预览（前10行）</div>
        <div class="preview-table-container">
          <table class="preview-table">
            <thead>
              <tr>
                <th>Excel列</th>
                <th v-for="(header, index) in headers" :key="index">
                  {{ getExcelColumnName(index) }} ({{ header || `列${index + 1}` }})
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in previewData.slice(0, 10)" :key="rowIndex">
                <td><strong>{{ rowIndex + headerRows + 1 }}</strong></td>
                <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                  {{ cell || '' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 数据库表名配置区域（独立高亮区域） -->
    <div class="table-name-section" v-if="headers.length > 0">
      <div class="table-name-header">
        <h3>📋 数据库表配置</h3>
        <div class="table-name-status">
          <span v-if="tableName.trim()" class="status-success">✓ 已配置</span>
          <span v-else class="status-required">⚠️ 必填项</span>
        </div>
      </div>
      <div class="table-name-content">
        <div class="table-name-input-wrapper">
          <label for="tableName" class="table-name-label">
            目标表名 <span class="required-mark">*</span>
          </label>
          <div class="table-name-field-container">
            <input 
              type="text" 
              id="tableName"
              v-model="tableName" 
              placeholder="请输入数据库表名（例如：users, orders, products）"
              class="table-name-input"
              :class="{ 'input-error': !tableName.trim(), 'input-success': tableName.trim() }">
            <div class="table-name-hints">
              <small v-if="!tableName.trim()" class="hint-error">
                <i>⚠</i> 请输入目标数据库表名
              </small>
              <small v-else class="hint-success">
                <i>✓</i> 将生成到表：<strong>{{ tableName }}</strong>
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SQL配置区域 -->
    <div class="sql-config-section" v-if="headers.length > 0">
      <div class="config-header">
        <h3>SQL配置</h3>
        <button 
          type="button" 
          class="btn-toggle-config"
          @click="toggleConfigCollapse"
          :title="isConfigCollapsed ? '展开配置' : '收起配置'">
          {{ isConfigCollapsed ? '展开配置' : '收起配置' }}
          <span class="toggle-icon" :class="{ collapsed: isConfigCollapsed }">▼</span>
        </button>
      </div>
      
      <div class="config-content" v-show="!isConfigCollapsed">
        <div class="config-group">
          <div class="config-row">
            <label>SQL类型:</label>
            <div class="radio-group">
              <label>
                <input type="radio" v-model="sqlType" value="insert"> INSERT
              </label>
              <label>
                <input type="radio" v-model="sqlType" value="update"> UPDATE
              </label>
            </div>
          </div>
          
          <!-- 批量INSERT配置 -->
          <div class="batch-insert-config" v-if="sqlType === 'insert'">
            <div class="config-row">
              <label>插入模式:</label>
              <div class="radio-group">
                <label>
                  <input type="radio" v-model="insertMode" value="single"> 单条插入
                </label>
                <label>
                  <input type="radio" v-model="insertMode" value="batch"> 批量插入
                </label>
              </div>
            </div>
            <div class="config-row" v-if="insertMode === 'batch'">
              <label for="batchSize">每批次数量:</label>
              <div class="batch-size-input">
                <input 
                  type="number" 
                  id="batchSize"
                  v-model.number="batchSize" 
                  min="1" 
                  max="20000"
                  placeholder="1000">
                <small>建议1000-5000，上限20000</small>
              </div>
            </div>
          </div>
        
        <!-- INSERT自定义列配置 -->
        <div class="insert-custom-columns" v-if="sqlType === 'insert'">
          <label>自定义列配置（可选）:</label>
          <small class="config-hint">可以添加时间戳、ID等动态字段，也可以不配置直接使用Excel数据</small>
          <div class="custom-columns-container">
            <div 
              v-for="(column, index) in customColumns" 
              :key="index"
              class="custom-column-row">
              <input 
                type="text" 
                v-model="column.name"
                placeholder="列名"
                class="column-name-input">
              <select v-model="column.valueType" class="value-type-select">
                <option value="fixed">固定值</option>
                <option value="timestamp">时间戳</option>
                <option value="datetime">当前时间</option>
                <option value="snowflake_string">雪花ID(字符串)</option>
                <option value="snowflake_long">雪花ID(数字)</option>
                <option value="uuid">UUID</option>
                <option value="increment">自增序号</option>
              </select>
              <input 
                v-if="column.valueType === 'fixed'"
                type="text" 
                v-model="column.value"
                placeholder="固定值"
                class="column-value-input">
              <select 
                v-if="column.valueType === 'increment'"
                v-model="column.startValue"
                class="start-value-select">
                <option :value="1">从1开始</option>
                <option :value="0">从0开始</option>
                <option :value="1000">从1000开始</option>
                <option :value="10000">从10000开始</option>
              </select>
              <select v-model="column.quoteMode" class="quote-mode-select">
                <option value="auto">智能引号</option>
                <option value="force">强制引号</option>
                <option value="none">不加引号</option>
              </select>
              <button 
                type="button" 
                class="btn-remove-column" 
                @click="removeCustomColumn(index)">
                删除
              </button>
            </div>
            <div class="custom-column-actions" v-if="customColumns.length === 0">
              <p class="no-custom-columns">当前无自定义列，将只使用Excel列数据生成INSERT语句</p>
            </div>
            <button 
              type="button" 
              class="btn-add-column" 
              @click="addCustomColumn">
              + 添加自定义列
            </button>
          </div>
        </div>
        <div class="config-row" v-if="sqlType === 'update'">
          <label>WHERE条件配置:</label>
          <div class="where-conditions">
            <div 
              v-for="(condition, index) in whereConditions" 
              :key="index"
              class="where-condition-row">
              <select v-model="condition.columnType" class="condition-column-type">
                <option value="custom">自定义列名</option>
                <option value="excel">Excel列</option>
              </select>
              
              <input 
                v-if="condition.columnType === 'custom'"
                v-model="condition.column" 
                type="text" 
                placeholder="输入列名"
                class="condition-column">
              
              <select 
                v-else
                v-model="condition.column" 
                class="condition-column">
                <option value="">选择列</option>
                <option 
                  v-for="(mapping, mappingIndex) in columnMappings.filter(m => m.enabled && m.dbField.trim())" 
                  :key="mappingIndex"
                  :value="mapping.dbField">
                  {{ getExcelColumnName(mapping.columnIndex) }} - {{ mapping.dbField.length > 8 ? mapping.dbField.substring(0, 8) + '...' : mapping.dbField }}
                </option>
              </select>
              
              <select v-model="condition.operator" class="condition-operator">
                <option value="=">=</option>
                <option value="!=">!=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="LIKE">LIKE</option>
                <option value="IN">IN</option>
                <option value="IS NULL">IS NULL</option>
                <option value="IS NOT NULL">IS NOT NULL</option>
              </select>
              
              <input 
                v-if="!['IS NULL', 'IS NOT NULL'].includes(condition.operator)"
                v-model="condition.value" 
                type="text" 
                placeholder="条件值或选择列"
                class="condition-value"
                list="condition-value-options">
              
              <!-- 条件值的列选择提示 -->
              <datalist id="condition-value-options">
                <option 
                  v-for="(mapping, mappingIndex) in columnMappings.filter(m => m.enabled && m.dbField.trim())" 
                  :key="mappingIndex"
                  :value="'${' + getExcelColumnName(mapping.columnIndex) + '}'">
                  {{ getExcelColumnName(mapping.columnIndex) }} - {{ mapping.dbField }}
                </option>
              </datalist>
              
              <!-- 引号配置 -->
              <div class="quote-config" v-if="!['IS NULL', 'IS NOT NULL'].includes(condition.operator)">
                <select v-model="condition.quoteMode" class="quote-select">
                  <option value="auto">智能引号</option>
                  <option value="force">强制引号</option>
                  <option value="none">不加引号</option>
                </select>
              </div>
              
              <button 
                type="button" 
                class="btn-remove-condition" 
                @click="removeWhereCondition(index)"
                :disabled="whereConditions.length === 1">
                删除
              </button>
            </div>
            
            <button 
              type="button" 
              class="btn-add-condition" 
              @click="addWhereCondition">
              + 添加条件
            </button>
          </div>
        </div>
      </div>

      <!-- 列映射配置 -->
      <div class="column-mapping">
        <h4>列映射配置</h4>
        <div class="mapping-info">
          <p>为每个Excel列设置对应的数据库字段名</p>
        </div>
        <div class="mapping-container">
          <div 
            v-for="(mapping, index) in columnMappings" 
            :key="index"
            class="mapping-row"
            :class="{ inactive: !mapping.enabled }">
            <div class="excel-column">
              <strong>{{ getExcelColumnName(index) }}</strong><br>
              <small>{{ headers[index] || `列${index + 1}` }}</small>
            </div>
            <div class="db-field-config">
              <input 
                type="text" 
                class="db-field-input"
                v-model="mapping.dbField"
                :disabled="!mapping.enabled"
                placeholder="数据库字段名">
              <div class="quote-options">
                <label class="quote-option">
                  <input 
                    type="radio" 
                    :name="`quote-${index}`"
                    :value="'auto'"
                    v-model="mapping.quoteMode"
                    :disabled="!mapping.enabled">
                  <span>智能引号</span>
                </label>
                <label class="quote-option">
                  <input 
                    type="radio" 
                    :name="`quote-${index}`"
                    :value="'force'"
                    v-model="mapping.quoteMode"
                    :disabled="!mapping.enabled">
                  <span>强制引号</span>
                </label>
                <label class="quote-option">
                  <input 
                    type="radio" 
                    :name="`quote-${index}`"
                    :value="'none'"
                    v-model="mapping.quoteMode"
                    :disabled="!mapping.enabled">
                  <span>不加引号</span>
                </label>
              </div>
            </div>
            <input 
              type="checkbox" 
              class="mapping-checkbox"
              v-model="mapping.enabled">
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions" v-if="headers.length > 0">
      <button class="btn-primary" @click="generateSQL" :disabled="!canGenerateSQL">
        生成 SQL
      </button>
      <button class="btn-secondary" @click="resetAll">重置</button>
    </div>

    <!-- 输出区域 -->
    <div class="output-section" v-if="sqlOutput">
      <div class="output-header">
        <div class="output-title">
          <h3>生成的SQL语句</h3>
          <div class="output-stats">
            <span class="stats-badge">{{ sqlCount }}</span>
            <span class="file-size">{{ formatFileSize }}</span>
          </div>
        </div>
        <div class="output-controls">
          <div class="output-options">
            <label class="format-option">
              <input type="checkbox" v-model="formatOutput">
              <span class="option-label">格式化显示</span>
            </label>
            <select v-model="displayLimit" class="limit-select">
              <option :value="10">显示10条</option>
              <option :value="50">显示50条</option>
              <option :value="100">显示100条</option>
              <option :value="-1">显示全部</option>
            </select>
          </div>
          <div class="action-buttons">
            <button class="btn-copy" @click="copySQL" :disabled="!sqlOutput">
              <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
              </svg>
              {{ sqlCopyButtonText }}
            </button>
            <button class="btn-download" @click="downloadSQL" :disabled="!sqlOutput">
              <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
              </svg>
              下载SQL
            </button>
          </div>
        </div>
      </div>
      <div class="sql-display">
        <div class="sql-container">
          <textarea 
            v-model="displayedSql" 
            readonly 
            placeholder="生成的SQL语句将显示在这里..."
            :rows="displayRows"
            class="sql-textarea">
          </textarea>
          <div class="textarea-overlay" v-if="!sqlOutput">
            <div class="placeholder-content">
              <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <p>配置完成后点击"生成SQL"按钮</p>
            </div>
          </div>
        </div>
        <div class="pagination" v-if="totalPages > 1">
          <button 
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage === 1"
            class="btn-page btn-page-prev">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
            上一页
          </button>
          <div class="page-info">
            <span class="current-page">第 {{ currentPage }}</span>
            <span class="page-separator">/</span>
            <span class="total-pages">{{ totalPages }} 页</span>
          </div>
          <button 
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="btn-page btn-page-next">
            下一页
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import { escapeAndQuoteString } from '@/utils/sqlUtils'

// 响应式数据
const selectedFile = ref(null)
const workbook = ref(null)
const sheetNames = ref([])
const selectedSheet = ref('')
const headerRows = ref(1) // 表头行数，默认为1
const headers = ref([])
const previewData = ref([])
const fullData = ref([])
const isDragOver = ref(false)
const sqlType = ref('insert')
const tableName = ref('')
const insertMode = ref('batch') // 默认为批量插入
const batchSize = ref(1000) // 批量插入每批次数量
const whereField = ref('') // 保留兼容性
const whereConditions = ref([
  {
    columnType: 'custom', // 默认为自定义列名
    column: '',
    operator: '=',
    value: '',
    quoteMode: 'auto' // 引号模式：auto, force, none
  }
])
const columnMappings = ref([])
const sqlOutput = ref('')
const sqlCopyButtonText = ref('复制全部')

// INSERT自定义列配置
const customColumns = ref([])

// 结果显示配置
const formatOutput = ref(false)
const displayLimit = ref(50)
const currentPage = ref(1)

// 界面控制
const isConfigCollapsed = ref(true) // 默认收起配置区域
const isProcessing = ref(false)
const progressPercent = ref(0)
const progressText = ref('')
const progressDetails = ref('')

// 文件输入引用
const fileInput = ref(null)

// 计算属性
const sqlCount = computed(() => {
  if (!sqlOutput.value) return '等待生成...'
  const statements = sqlOutput.value.split('\n\n').filter(s => s.trim())
  return `已生成 ${statements.length} 条SQL语句`
})

const canGenerateSQL = computed(() => {
  const hasTableName = tableName.value && tableName.value.trim().length > 0
  const hasEnabledColumns = columnMappings.value.some(m => m.enabled && m.dbField.trim())
  
  // 对于UPDATE，检查WHERE条件是否完整
  let hasValidWhereConditions = true
  if (sqlType.value === 'update') {
    hasValidWhereConditions = whereConditions.value.every(condition => {
      const hasColumn = condition.column.trim()
      const hasValue = ['IS NULL', 'IS NOT NULL'].includes(condition.operator) || condition.value.trim()
      return hasColumn && hasValue
    })
  }
  
  return hasTableName && hasEnabledColumns && hasValidWhereConditions
})

// 结果显示相关计算属性
const sqlStatements = computed(() => {
  if (!sqlOutput.value) return []
  return sqlOutput.value.split('\n\n').filter(s => s.trim())
})

const totalPages = computed(() => {
  if (displayLimit.value === -1) return 1
  return Math.ceil(sqlStatements.value.length / displayLimit.value)
})

const displayedSql = computed(() => {
  const statements = sqlStatements.value
  if (displayLimit.value === -1) {
    return formatOutput.value ? formatSqlStatements(statements) : statements.join('\n\n')
  }
  
  const start = (currentPage.value - 1) * displayLimit.value
  const end = start + displayLimit.value
  const pageStatements = statements.slice(start, end)
  
  return formatOutput.value ? formatSqlStatements(pageStatements) : pageStatements.join('\n\n')
})

const displayRows = computed(() => {
  const statementCount = displayedSql.value.split('\n').length
  return Math.min(Math.max(8, statementCount + 2), 20)
})

const formatFileSize = computed(() => {
  if (!sqlOutput.value) return ''
  const size = new Blob([sqlOutput.value]).size
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
})

// 方法
const triggerFileInput = () => {
  fileInput.value.click()
}

// 格式化SQL语句
const formatSqlStatements = (statements) => {
  return statements.map((stmt, index) => {
    const formattedStmt = stmt
      .replace(/INSERT INTO/gi, '\nINSERT INTO')
      .replace(/VALUES/gi, '\n  VALUES')
      .replace(/UPDATE/gi, '\nUPDATE')
      .replace(/SET/gi, '\n  SET')
      .replace(/WHERE/gi, '\n  WHERE')
      .replace(/AND/gi, '\n    AND')
      .trim()
    
    return `-- 语句 ${index + 1}\n${formattedStmt}`
  }).join('\n\n')
}

// 生成Excel列名（A, B, C, ..., AA, AB, ...）
const getExcelColumnName = (index) => {
  let columnName = ''
  let temp = index
  while (temp >= 0) {
    columnName = String.fromCharCode(65 + (temp % 26)) + columnName
    temp = Math.floor(temp / 26) - 1
  }
  return columnName
}

// 切换配置区域折叠状态
const toggleConfigCollapse = () => {
  isConfigCollapsed.value = !isConfigCollapsed.value
}

// 添加自定义列
const addCustomColumn = () => {
  customColumns.value.push({
    name: '',
    valueType: 'fixed',
    value: '',
    startValue: 1,
    quoteMode: 'auto'
  })
}

// 删除自定义列
const removeCustomColumn = (index) => {
  if (customColumns.value.length > 1) {
    customColumns.value.splice(index, 1)
  }
}

// 生成动态值
const generateDynamicValue = (column, rowIndex) => {
  switch (column.valueType) {
    case 'timestamp':
      return Date.now()
    case 'datetime':
      return new Date().toISOString().replace('T', ' ').substring(0, 19)
    case 'snowflake_string':
      // 字符串类型的雪花ID（时间戳 + 随机数）
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const sequence = rowIndex.toString().padStart(3, '0')
      return `${timestamp}${random}${sequence}`
    case 'snowflake_long':
      // 数字类型的雪花ID（较短的数字，避免超出JavaScript数字精度）
      const ts = Date.now()
      const rnd = Math.floor(Math.random() * 100)
      const seq = rowIndex % 100
      return ts * 10000 + rnd * 100 + seq
    case 'uuid':
      // 简化版UUID
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    case 'increment':
      return (column.startValue || 1) + rowIndex
    case 'fixed':
    default:
      return column.value || ''
  }
}

// 添加WHERE条件
const addWhereCondition = () => {
  whereConditions.value.push({
    columnType: 'custom',
    column: '',
    operator: '=',
    value: '',
    quoteMode: 'auto'
  })
}

// 删除WHERE条件
const removeWhereCondition = (index) => {
  if (whereConditions.value.length > 1) {
    whereConditions.value.splice(index, 1)
  }
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    handleFile(file)
  }
}

const handleFileDrop = (event) => {
  isDragOver.value = false
  const files = event.dataTransfer.files
  if (files.length > 0) {
    handleFile(files[0])
  }
}

const handleFile = (file) => {
  // 验证文件类型
  const validTypes = ['.xlsx', '.xls']
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
  
  if (!validTypes.includes(fileExtension)) {
    alert('请选择有效的Excel文件（.xlsx 或 .xls）')
    return
  }
  
  selectedFile.value = file
  
  // 开始进度显示
  isProcessing.value = true
  progressPercent.value = 0
  progressText.value = '正在读取文件...'
  progressDetails.value = `文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`
  
  // 读取Excel文件
  const reader = new FileReader()
  
  reader.onprogress = (e) => {
    if (e.lengthComputable) {
      progressPercent.value = (e.loaded / e.total) * 50 // 读取阶段占0-50%
      progressDetails.value = `正在读取: ${(e.loaded / 1024 / 1024).toFixed(2)} / ${(e.total / 1024 / 1024).toFixed(2)} MB`
    }
  }
  
  reader.onload = (e) => {
    try {
      progressPercent.value = 50
      progressText.value = '正在解析Excel文件...'
      progressDetails.value = '解析数据结构中'
      
      // 模拟解析进度
      setTimeout(() => {
        progressPercent.value = 75
        progressDetails.value = '处理工作表数据'
        
        const data = new Uint8Array(e.target.result)
        workbook.value = XLSX.read(data, { type: 'array' })
        sheetNames.value = workbook.value.SheetNames
        
        progressPercent.value = 90
        progressDetails.value = '初始化数据预览'
        
        // 自动选择第一个工作表
        if (sheetNames.value.length > 0) {
          selectedSheet.value = sheetNames.value[0]
          loadSheetData()
        }
        
        setTimeout(() => {
          progressPercent.value = 100
          progressText.value = '完成!'
          progressDetails.value = `成功读取 ${sheetNames.value.length} 个工作表`
          
          // 2秒后隐藏进度条
          setTimeout(() => {
            isProcessing.value = false
          }, 2000)
        }, 500)
      }, 300)
    } catch (error) {
      isProcessing.value = false
      alert('文件读取失败：' + error.message)
      console.error('Excel读取错误:', error)
    }
  }
  
  reader.onerror = () => {
    isProcessing.value = false
    alert('文件读取失败')
  }
  
  reader.readAsArrayBuffer(file)
}

const loadSheetData = () => {
  if (!workbook.value || !selectedSheet.value) return
  
  const worksheet = workbook.value.Sheets[selectedSheet.value]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  
  if (jsonData.length === 0) {
    alert('工作表中没有数据')
    return
  }
  
  // 根据表头行数处理数据
  const headerRowIndex = Math.max(0, headerRows.value - 1)
  
  // 获取表头，如果指定的表头行存在则使用，否则生成默认列名
  if (headerRowIndex < jsonData.length && headerRows.value > 0) {
    headers.value = jsonData[headerRowIndex] || []
  } else {
    // 如果没有表头或表头行为0，生成默认列名
    const maxCols = Math.max(...jsonData.map(row => row.length))
    headers.value = Array.from({ length: maxCols }, (_, i) => `列${i + 1}`)
  }
  
  // 获取数据行（跳过表头行）
  const dataStartIndex = headerRows.value
  fullData.value = jsonData.slice(dataStartIndex)
  previewData.value = fullData.value
  
  // 初始化列映射，增加columnIndex和quoteMode字段
  columnMappings.value = headers.value.map((header, index) => ({
    enabled: true,
    dbField: generateFieldName(header),
    columnIndex: index, // 存储列索引
    quoteMode: 'auto' // 引号模式：auto, force, none
  }))
  
  // 清空WHERE字段选择
  whereField.value = ''
  // 重置WHERE条件
  whereConditions.value = [{
    columnType: 'custom',
    column: '',
    operator: '=',
    value: '',
    quoteMode: 'auto'
  }]
}

const generateFieldName = (header) => {
  if (!header) return ''
  
  return header.toString()
    .toLowerCase()
    .replace(/[\s\-\.\(\)\[\]]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
}

const generateSQL = async () => {
  if (!tableName.value || !tableName.value.trim()) {
    alert('请先输入目标表名')
    return
  }
  
  if (!canGenerateSQL.value) {
    alert('请完善SQL配置')
    return
  }
  
  const enabledMappings = columnMappings.value
    .map((mapping, index) => ({ ...mapping, columnIndex: index }))
    .filter(mapping => mapping.enabled && mapping.dbField.trim())
  
  const totalRows = fullData.value.length
  const statements = []
  
  // 如果数据量大，显示进度
  if (totalRows > 100) {
    isProcessing.value = true
    progressPercent.value = 0
    progressText.value = `正在生成${sqlType.value.toUpperCase()}语句...`
    progressDetails.value = `处理 0 / ${totalRows} 条数据`
  }
  
  if (sqlType.value === 'insert') {
    if (insertMode.value === 'batch') {
      // 批量INSERT模式
      const currentBatchSize = Math.min(Math.max(1, batchSize.value || 1000), 20000)
      
      for (let i = 0; i < totalRows; i += currentBatchSize) {
        const batchData = []
        const batchEnd = Math.min(i + currentBatchSize, totalRows)
        
        // 准备批次数据
        for (let j = i; j < batchEnd; j++) {
          batchData.push({
            row: fullData.value[j],
            rowIndex: j
          })
        }
        
        // 生成批量INSERT语句
        const batchStatement = generateBatchInsertStatement(batchData, enabledMappings)
        if (batchStatement) {
          statements.push(batchStatement)
        }
        
        // 更新进度
        if (totalRows > 100) {
          progressPercent.value = (batchEnd / totalRows) * 100
          progressDetails.value = `处理 ${batchEnd} / ${totalRows} 条数据（批量模式：${currentBatchSize}条/批）`
          
          // 让出控制权，避免界面卡顿
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }
    } else {
      // 单条INSERT模式（原有逻辑）
      const batchSize = 50
      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = fullData.value.slice(i, i + batchSize)
        
        for (let j = 0; j < batch.length; j++) {
          const rowIndex = i + j
          const row = batch[j]
          
          const statement = generateSingleInsertStatement(row, enabledMappings, rowIndex)
          if (statement) {
            statements.push(statement)
          }
        }
        
        // 更新进度
        if (totalRows > 100) {
          const processed = Math.min(i + batchSize, totalRows)
          progressPercent.value = (processed / totalRows) * 100
          progressDetails.value = `处理 ${processed} / ${totalRows} 条数据（单条模式）`
          
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }
    }
  } else if (sqlType.value === 'update') {
    // UPDATE语句处理（保持原有逻辑）
    const batchSize = 50
    for (let i = 0; i < totalRows; i += batchSize) {
      const batch = fullData.value.slice(i, i + batchSize)
      
      for (const row of batch) {
        const statement = generateUpdateStatement(row, enabledMappings)
        if (statement) {
          statements.push(statement)
        }
      }
      
      if (totalRows > 100) {
        const processed = Math.min(i + batchSize, totalRows)
        progressPercent.value = (processed / totalRows) * 100
        progressDetails.value = `处理 ${processed} / ${totalRows} 条数据`
        
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
  }
  
  sqlOutput.value = statements.join('\n\n')
  
  if (totalRows > 100) {
    progressText.value = '完成!'
    const mode = sqlType.value === 'insert' && insertMode.value === 'batch' ? '批量' : '单条'
    progressDetails.value = `成功生成 ${statements.length} 条SQL语句（${mode}模式）`
    
    setTimeout(() => {
      isProcessing.value = false
    }, 1500)
  }
}

const generateInsertStatement = (row, mappings, rowIndex = 0) => {
  // Excel列映射字段
  const excelFields = mappings.map(m => m.dbField)
  const excelValues = mappings.map(m => formatValueWithQuote(row[m.columnIndex], m.quoteMode))
  
  // 自定义列字段（只有当有配置时才处理）
  const customFields = customColumns.value
    .filter(col => col.name && col.name.trim())
    .map(col => col.name.trim())
  
  const customValues = customColumns.value
    .filter(col => col.name && col.name.trim())
    .map(col => {
      const dynamicValue = generateDynamicValue(col, rowIndex)
      // 使用自定义列的引号模式配置
      return formatValueWithQuote(dynamicValue, col.quoteMode || 'auto')
    })
  
  // 合并所有字段和值
  const allFields = [...excelFields, ...customFields]
  const allValues = [...excelValues, ...customValues]
  
  // 检查是否有有效数据
  if (allFields.length === 0 || allValues.every(v => v === 'NULL' || v === "''")) {
    return null
  }
  
  return {
    fields: allFields,
    values: allValues
  }
}

// 生成批量INSERT语句
const generateBatchInsertStatement = (dataRows, mappings) => {
  if (dataRows.length === 0) return null
  
  // 获取第一行数据的字段结构
  const firstRowResult = generateInsertStatement(dataRows[0].row, mappings, dataRows[0].rowIndex)
  if (!firstRowResult) return null
  
  const fields = firstRowResult.fields
  const allValueRows = []
  
  // 处理所有数据行
  for (const { row, rowIndex } of dataRows) {
    const result = generateInsertStatement(row, mappings, rowIndex)
    if (result && result.values.length > 0) {
      allValueRows.push(`(${result.values.join(', ')})`)
    }
  }
  
  if (allValueRows.length === 0) return null
  
  return `INSERT INTO ${tableName.value} (${fields.join(', ')})\nVALUES\n${allValueRows.join(',\n')};`
}

// 原单条INSERT语句生成函数（兼容性）
const generateSingleInsertStatement = (row, mappings, rowIndex = 0) => {
  const result = generateInsertStatement(row, mappings, rowIndex)
  if (!result) return null
  
  return `INSERT INTO ${tableName.value} (${result.fields.join(', ')}) VALUES (${result.values.join(', ')});`
}

const generateUpdateStatement = (row, mappings) => {
  // 构建WHERE条件
  const whereClauses = []
  
  for (const condition of whereConditions.value) {
    if (!condition.column.trim()) continue
    
    let columnValue
    let columnName = condition.column
    
    if (condition.columnType === 'excel') {
      // 从映射中找到对应的列
      const mapping = mappings.find(m => m.dbField === condition.column)
      if (!mapping) continue
      
      columnValue = row[mapping.columnIndex]
      columnName = condition.column
    } else {
      // 自定义列名，使用用户输入的值
      columnValue = condition.value
      columnName = condition.column
    }
    
    // 处理不同的操作符
    let whereClause
    if (condition.operator === 'IS NULL') {
      whereClause = `${columnName} IS NULL`
    } else if (condition.operator === 'IS NOT NULL') {
      whereClause = `${columnName} IS NOT NULL`
    } else {
      let value
      if (condition.columnType === 'excel') {
        value = formatValueWithQuote(columnValue, condition.quoteMode)
      } else {
        // 解析条件值（可能包含列引用）
        const parsedValue = parseConditionValue(condition.value, row, mappings)
        value = formatValueWithQuote(parsedValue, condition.quoteMode)
      }
      
      if (condition.operator === 'IN') {
        // IN 操作符，支持逗号分隔的值
        const values = condition.value.split(',').map(v => formatSqlValue(v.trim()))
        whereClause = `${columnName} IN (${values.join(', ')})`
      } else {
        whereClause = `${columnName} ${condition.operator} ${value}`
      }
    }
    
    whereClauses.push(whereClause)
  }
  
  if (whereClauses.length === 0) {
    return null
  }
  
  // 生成SET子句（排除WHERE条件中使用的Excel列）
  const usedExcelColumns = whereConditions.value
    .filter(c => c.columnType === 'excel' && c.column.trim())
    .map(c => c.column)
  
  const setClauses = mappings
    .filter(m => !usedExcelColumns.includes(m.dbField))
    .map(m => `${m.dbField} = ${formatValueWithQuote(row[m.columnIndex], m.quoteMode)}`)
  
  if (setClauses.length === 0) {
    return null
  }
  
  return `UPDATE ${tableName.value} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`
}

const formatSqlValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'NULL'
  }
  
  // 如果是数字且不以0开头
  if (typeof value === 'number' || 
      (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) && !value.startsWith('0'))) {
    return value.toString()
  }
  
  // 字符串值，需要转义和加引号
  return escapeAndQuoteString(value.toString())
}

// 智能值格式化（根据quoteMode配置）
const formatValueWithQuote = (value, quoteMode = 'auto') => {
  if (value === undefined || value === null || value === '') {
    return 'NULL'
  }
  
  const valueStr = value.toString()
  
  switch (quoteMode) {
    case 'none':
      // 不加引号，直接返回
      return valueStr
    case 'force':
      // 强制加引号
      return escapeAndQuoteString(valueStr)
    case 'auto':
    default:
      // 智能判断是否为数字
      if (typeof value === 'number') {
        // 纯数字类型，不加引号
        return valueStr
      }
      
      // 对于字符串类型，检查是否为纯数字格式
      // 但要排除以0开头的情况（除了单独的'0'）
      if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
        // 是数字格式
        if (valueStr === '0' || !valueStr.startsWith('0')) {
          // 不是以0开头的数字，或者就是单独的'0'
          return valueStr
        }
      }
      
      // 非数字值或以0开头的数字字符串，加引号
      return escapeAndQuoteString(valueStr)
  }
}

// 解析条件值（支持列引用）
const parseConditionValue = (valueStr, row, mappings) => {
  if (!valueStr) return null
  
  // 检查是否为列引用格式 ${A}
  const columnMatch = valueStr.match(/^\$\{([A-Z]+)\}$/)
  if (columnMatch) {
    const columnName = columnMatch[1]
    // 找到对应的列索引
    const columnIndex = getColumnIndexByName(columnName)
    if (columnIndex !== -1 && row[columnIndex] !== undefined) {
      return row[columnIndex]
    }
  }
  
  return valueStr
}

// 根据列名获取列索引
const getColumnIndexByName = (columnName) => {
  // 将A,B,C转换为数字索引
  let index = 0
  for (let i = 0; i < columnName.length; i++) {
    index = index * 26 + (columnName.charCodeAt(i) - 64)
  }
  return index - 1
}

const copySQL = async () => {
  try {
    await navigator.clipboard.writeText(sqlOutput.value)
    sqlCopyButtonText.value = '已复制!'
    setTimeout(() => {
      sqlCopyButtonText.value = '复制全部'
    }, 2000)
  } catch (err) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = sqlOutput.value
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    
    sqlCopyButtonText.value = '已复制!'
    setTimeout(() => {
      sqlCopyButtonText.value = '复制全部'
    }, 2000)
  }
}

const downloadSQL = () => {
  if (!sqlOutput.value) return
  
  // 生成文件名
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
  const filename = `${tableName.value || 'sql_export'}_${timestamp}.sql`
  
  // 创建下载链接
  const blob = new Blob([sqlOutput.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  // 创建临时下载链接
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  // 触发下载
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // 清理内存
  URL.revokeObjectURL(url)
}

const removeFile = () => {
  selectedFile.value = null
  workbook.value = null
  sheetNames.value = []
  selectedSheet.value = ''
  headers.value = []
  previewData.value = []
  fullData.value = []
  columnMappings.value = []
  sqlOutput.value = ''
  fileInput.value.value = ''
}

const resetAll = () => {
  removeFile()
  tableName.value = ''
  whereField.value = ''
  sqlType.value = 'insert'
  insertMode.value = 'batch'
  batchSize.value = 1000
  headerRows.value = 1
  whereConditions.value = [{
    columnType: 'custom',
    column: '',
    operator: '=',
    value: '',
    quoteMode: 'auto'
  }]
  // 重置自定义列
  customColumns.value = []
}
</script>