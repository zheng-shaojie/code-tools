<template>
  <div>
    <!-- 文件上传区域 -->
    <div class="file-section">
      <div class="file-header">
        <h3>选择Excel文件</h3>
      </div>
      <div class="file-drop-zone" :class="{ dragover: isDragOver }" @click="triggerFileInput"
        @dragover.prevent="isDragOver = true" @dragleave="isDragOver = false" @drop.prevent="handleFileDrop">
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
      <input type="file" ref="fileInput" accept=".xlsx,.xls" style="display: none;" @change="handleFileSelect">

      <div class="file-info" v-if="selectedFile">
        <span class="file-name">{{ selectedFile.name }}</span>
        <button class="btn-remove" @click="removeFile">移除</button>
      </div>

      <!-- 进度显示 -->
      <div class="progress-section" v-if="isProcessing">
        <div class="progress-info">
          <div class="progress-title">
            <svg class="progress-icon spinning" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="62.83"
                stroke-dashoffset="31.42"></circle>
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
          <input type="number" id="headerRows" v-model.number="headerRows" min="0" max="10" @change="loadSheetData"
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
            <input type="text" id="tableName" v-model="tableName" placeholder="请输入数据库表名（例如：users, orders, products）"
              class="table-name-input" :class="{ 'input-error': !tableName.trim(), 'input-success': tableName.trim() }">
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
        <button type="button" class="btn-toggle-config" @click="toggleConfigCollapse"
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
                <input type="number" id="batchSize" v-model.number="batchSize" min="1" max="20000" placeholder="1000">
                <small>建议1000-5000，上限20000</small>
              </div>
            </div>
          </div>

          <!-- INSERT自定义列配置 -->
          <div class="insert-custom-columns" v-if="sqlType === 'insert'">
            <label>自定义列配置（可选）:</label>
            <small class="config-hint">可以添加时间戳、ID等动态字段，也可以不配置直接使用Excel数据</small>
            <div class="custom-columns-container">
              <div v-for="(column, index) in customColumns" :key="index" class="custom-column-row">
                <input type="text" v-model="column.name" placeholder="列名" class="column-name-input">
                <select v-model="column.valueType" class="value-type-select">
                  <option value="fixed">固定值</option>
                  <option value="timestamp">时间戳</option>
                  <option value="datetime">当前时间</option>
                  <option value="snowflake_string">雪花ID(字符串)</option>
                  <option value="snowflake_long">雪花ID(数字)</option>
                  <option value="uuid">UUID</option>
                  <option value="increment">自增序号</option>
                </select>
                <input v-if="column.valueType === 'fixed'" type="text" v-model="column.value" placeholder="固定值"
                  class="column-value-input">
                <select v-if="column.valueType === 'increment'" v-model="column.startValue" class="start-value-select">
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
                <button type="button" class="btn-remove-column" @click="removeCustomColumn(index)">
                  删除
                </button>
              </div>
              <div class="custom-column-actions" v-if="customColumns.length === 0">
                <p class="no-custom-columns">当前无自定义列，将只使用Excel列数据生成INSERT语句</p>
              </div>
              <button type="button" class="btn-add-column" @click="addCustomColumn">
                + 添加自定义列
              </button>
            </div>
          </div>

          <div class="config-row" v-if="sqlType === 'update'">
            <label>WHERE条件配置:</label>
            <div class="where-conditions">
              <div v-for="(condition, index) in whereConditions" :key="index" class="where-condition-row">
                <select v-model="condition.columnType" class="condition-column-type">
                  <option value="custom">自定义列名</option>
                  <option value="excel">Excel列</option>
                </select>

                <input v-if="condition.columnType === 'custom'" v-model="condition.column" type="text"
                  placeholder="输入列名" class="condition-column">

                <select v-else v-model="condition.column" class="condition-column">
                  <option value="">选择列</option>
                  <option v-for="(mapping, mappingIndex) in columnMappings.filter(m => m.enabled && m.dbField.trim())"
                    :key="mappingIndex" :value="mapping.dbField">
                    {{ getExcelColumnName(mapping.columnIndex) }} - {{ mapping.dbField.length > 8 ?
                      mapping.dbField.substring(0, 8) + '...' : mapping.dbField }}
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

                <input v-if="!['IS NULL', 'IS NOT NULL'].includes(condition.operator)" v-model="condition.value"
                  type="text" placeholder="条件值或选择列" class="condition-value" list="condition-value-options">

                <!-- 条件值的列选择提示 -->
                <datalist id="condition-value-options">
                  <option v-for="(mapping, mappingIndex) in columnMappings.filter(m => m.enabled && m.dbField.trim())"
                    :key="mappingIndex" :value="'${' + getExcelColumnName(mapping.columnIndex) + '}'">
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

                <button type="button" class="btn-remove-condition" @click="removeWhereCondition(index)"
                  :disabled="whereConditions.length === 1">
                  删除
                </button>
              </div>

              <button type="button" class="btn-add-condition" @click="addWhereCondition">
                + 添加条件
              </button>
            </div>
          </div>
        </div>

        <!-- 列映射配置 -->
        <div class="column-mapping">
          <div class="mapping-header">
            <h4>列映射配置</h4>
            <button type="button" class="btn-toggle-mapping" @click="toggleColumnMappingCollapse"
              :title="isColumnMappingCollapsed ? '展开列映射配置' : '收起列映射配置'">
              {{ isColumnMappingCollapsed ? '展开' : '收起' }}
              <span class="toggle-icon" :class="{ collapsed: isColumnMappingCollapsed }">▼</span>
            </button>
          </div>
          <div class="mapping-info">
            <p>为每个Excel列设置对应的数据库字段名</p>
          </div>
          <div class="mapping-container" v-show="!isColumnMappingCollapsed">
            <div v-for="(mapping, index) in columnMappings" :key="index" class="mapping-row"
              :class="{ inactive: !mapping.enabled }">
              <div class="excel-column">
                <strong>{{ getExcelColumnName(index) }}</strong><br>
                <small>{{ headers[index] || `列${index + 1}` }}</small>
              </div>
              <div class="db-field-config">
                <input type="text" class="db-field-input" v-model="mapping.dbField" :disabled="!mapping.enabled"
                  placeholder="数据库字段名">
                <div class="quote-options">
                  <label class="quote-option">
                    <input type="radio" :name="`quote-${index}`" :value="'auto'" v-model="mapping.quoteMode"
                      :disabled="!mapping.enabled">
                    <span>智能引号</span>
                  </label>
                  <label class="quote-option">
                    <input type="radio" :name="`quote-${index}`" :value="'force'" v-model="mapping.quoteMode"
                      :disabled="!mapping.enabled">
                    <span>强制引号</span>
                  </label>
                  <label class="quote-option">
                    <input type="radio" :name="`quote-${index}`" :value="'none'" v-model="mapping.quoteMode"
                      :disabled="!mapping.enabled">
                    <span>不加引号</span>
                  </label>
                </div>
              </div>
              <input type="checkbox" class="mapping-checkbox" v-model="mapping.enabled">
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
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z">
                </path>
              </svg>
              {{ sqlCopyButtonText }}
            </button>
            <button class="btn-download" @click="downloadSQL" :disabled="!sqlOutput">
              <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clip-rule="evenodd"></path>
              </svg>
              下载SQL
            </button>
          </div>
        </div>
      </div>
      <div class="sql-display">
        <div class="sql-container">
          <textarea v-model="displayedSql" readonly placeholder="生成的SQL语句将显示在这里..." :rows="displayRows"
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
          <button @click="currentPage = Math.max(1, currentPage - 1)" :disabled="currentPage === 1"
            class="btn-page btn-page-prev">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clip-rule="evenodd"></path>
            </svg>
            上一页
          </button>
          <div class="page-info">
            <span class="current-page">第 {{ currentPage }}</span>
            <span class="page-separator">/</span>
            <span class="total-pages">{{ totalPages }} 页</span>
          </div>
          <button @click="currentPage = Math.min(totalPages, currentPage + 1)" :disabled="currentPage === totalPages"
            class="btn-page btn-page-next">
            下一页
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as XLSX from 'xlsx'
import { escapeAndQuoteString } from '@/utils/sqlUtils'
// 从外部文件导入所有需要的变量和方法
import {
  // 响应式数据
  selectedFile,
  workbook,
  sheetNames,
  selectedSheet,
  headerRows,
  headers,
  previewData,
  fullData,
  isDragOver,
  sqlType,
  tableName,
  insertMode,
  batchSize,
  whereField,
  whereConditions,
  columnMappings,
  sqlOutput,
  sqlCopyButtonText,
  customColumns,
  formatOutput,
  displayLimit,
  currentPage,
  isConfigCollapsed,
  isColumnMappingCollapsed,
  isProcessing,
  progressPercent,
  progressText,
  progressDetails,
  fileInput,

  // 计算属性
  sqlCount,
  canGenerateSQL,
  sqlStatements,
  totalPages,
  displayedSql,
  displayRows,
  formatFileSize,

  // 方法
  triggerFileInput,
  formatSqlStatements,
  getExcelColumnName,
  toggleConfigCollapse,
  toggleColumnMappingCollapse,
  addCustomColumn,
  removeCustomColumn,
  generateDynamicValue,
  addWhereCondition,
  removeWhereCondition,
  handleFileSelect,
  handleFileDrop,
  handleFile,
  loadSheetData,
  generateFieldName,
  generateSQL,
  generateInsertStatement,
  generateBatchInsertStatement,
  generateSingleInsertStatement,
  generateUpdateStatement,
  formatSqlValue,
  formatValueWithQuote,
  parseConditionValue,
  getColumnIndexByName,
  copySQL,
  downloadSQL,
  removeFile,
  resetAll
} from './ExcelSqlGenerator.js'
</script>

<style src="../styles/ExcelSqlGenerator.css"></style>