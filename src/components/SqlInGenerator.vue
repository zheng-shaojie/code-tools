<template>
  <div>
    <!-- 输入区域 -->
    <div class="input-section">
      <div class="input-header">
        <label for="inputText">输入文本</label>
        <div class="separator-config">
          <label>
            <input type="checkbox" v-model="enableSmartAnalysis" @change="onSmartAnalysisChange"> 
            智能分析
          </label>
          <div class="separator-selection" v-if="!enableSmartAnalysis">
            <label for="separator">分隔符:</label>
            <select id="separator" v-model="separator" @change="generateSQL">
              <option value="\n" selected>换行符</option>
              <option value=",">逗号 (,)</option>
              <option value=";">分号 (;)</option>
              <option value="|">竖线 (|)</option>
              <option value=" ">空格</option>
              <option value="custom">自定义</option>
            </select>
            <input 
              id="customSeparator"
              type="text" 
              v-model="customSeparator" 
              @input="generateSQL"
              placeholder="输入分隔符" 
              v-show="separator === 'custom'">
          </div>
          <div class="smart-analysis-info" v-if="enableSmartAnalysis && analysisResult">
            <small class="analysis-result">
              🤖 智能分析: <strong>{{ analysisResult.detectedSeparator }}</strong> | 
              原始: {{ analysisResult.beforeCount }} 项 → 处理后: {{ analysisResult.afterCount }} 项
              <span v-if="analysisResult.hasQuotes" class="quote-info">
                | ✨ 已去除引号
              </span>
            </small>
          </div>
        </div>
      </div>
      <textarea 
        id="inputText"
        v-model="inputText"
        @input="generateSQL"
        @keydown="handleKeydown"
        placeholder="输入要转换的文本，可以混合使用多种分隔符（逗号、分号、空格、换行符等）。开启智能分析可自动检测最佳分隔符..."
        rows="6">
      </textarea>
    </div>

    <!-- 配置选项 -->
    <div class="options-section">
      <div class="option-group">
        <h3>文本处理选项</h3>
        <div class="option-row">
          <label>
            <input type="checkbox" v-model="addQuotes" @change="generateSQL"> 
            添加单引号
          </label>
          <label>
            <input type="checkbox" v-model="trimSpaces" @change="generateSQL"> 
            去除首尾空格
          </label>
          <label>
            <input type="checkbox" v-model="removeEmpty" @change="generateSQL"> 
            移除空行
          </label>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn-primary" @click="generateSQL">生成 SQL</button>
      <button class="btn-secondary" @click="clearAll">清空</button>
    </div>

    <!-- 输出区域 -->
    <div class="output-section">
      <div class="output-header">
        <label for="outputText">生成结果（IN条件值）</label>
        <button 
          class="btn-copy" 
          :disabled="!outputText"
          @click="copyToClipboard">
          {{ copyButtonText }}
        </button>
      </div>
      <textarea 
        id="outputText"
        v-model="outputText" 
        readonly 
        placeholder="生成的IN条件值将显示在这里（仅括号内容）..."
        rows="8">
      </textarea>
      <div class="info">
        <span id="countInfo">{{ countInfo }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { escapeAndQuoteString } from '@/utils/sqlUtils'

// 响应式数据
const inputText = ref('')
const separator = ref('\n')
const customSeparator = ref('')
const addQuotes = ref(true)
const trimSpaces = ref(true)
const removeEmpty = ref(true)
const outputText = ref('')
const copyButtonText = ref('复制')

// 智能分析相关
const enableSmartAnalysis = ref(false)
const analysisResult = ref(null)

// 计算属性
const countInfo = computed(() => {
  if (!outputText.value) {
    return '等待输入...'
  }
  // 直接统计逗号分隔的项目数
  const items = outputText.value.split(',').length
  return `已生成 ${items} 个条件`
})

// 智能分析功能
// 检测最佳分隔符
const detectSeparator = (text) => {
  const separators = [
    { char: ',', name: '逗号' },
    { char: ';', name: '分号' },
    { char: '|', name: '竖线' },
    { char: '\t', name: 'Tab' },
    { char: ' ', name: '空格' },
    { char: '\n', name: '换行符' }
  ]
  
  // 分析每种分隔符的情况
  const analysis = separators.map(sep => {
    const parts = text.split(sep.char)
    const nonEmptyParts = parts.filter(part => part.trim().length > 0)
    
    // 计算分隔符的有效性得分
    let score = 0
    
    // 基础得分：分割出的有效部分数量
    score += nonEmptyParts.length
    
    // 奖励：如果分割后每个部分长度相对均匀
    if (nonEmptyParts.length > 1) {
      const lengths = nonEmptyParts.map(part => part.trim().length)
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
      const variance = lengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / lengths.length
      
      // 长度方差越小，得分越高（说明分割更均匀）
      if (variance < avgLength) {
        score += 10
      }
    }
    
    // 惩罚：如果分隔符在文本中出现频率过低
    const separatorCount = (text.match(new RegExp(sep.char.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g')) || []).length
    if (separatorCount < Math.floor(text.length / 50)) {
      score -= 5
    }
    
    return {
      ...sep,
      parts: nonEmptyParts,
      count: nonEmptyParts.length,
      score: score,
      separatorCount: separatorCount
    }
  })
  
  // 找出得分最高的分隔符
  let bestSeparator = analysis.reduce((best, current) => {
    return current.score > best.score ? current : best
  })
  
  // 如果最佳分隔符的得分太低，使用换行符作为默认
  if (bestSeparator.score < 2) {
    const newlineSep = analysis.find(sep => sep.char === '\n')
    bestSeparator = newlineSep || bestSeparator
  }
  
  return bestSeparator
}

// 去除字符串首尾引号
const removeQuotes = (str) => {
  const trimmed = str.trim()
  const hasQuotes = (trimmed.startsWith('"') && trimmed.endsWith('"')) || 
                   (trimmed.startsWith("'") && trimmed.endsWith("'"))
  
  if (hasQuotes && trimmed.length > 1) {
    return {
      text: trimmed.slice(1, -1),
      hadQuotes: true
    }
  }
  
  return {
    text: trimmed,
    hadQuotes: false
  }
}

// 智能分析文本
const smartAnalyze = (text) => {
  if (!text.trim()) {
    return null
  }
  
  // 递归分析，处理多种分隔符同时存在的情况
  const recursiveAnalyze = (currentText, usedSeparators = []) => {
    // 检测当前最佳分隔符
    const detectedSep = detectSeparator(currentText)
    
    // 如果已经使用过这个分隔符，停止递归
    if (usedSeparators.includes(detectedSep.char)) {
      return [currentText]
    }
    
    // 使用检测到的分隔符分割文本
    let items = currentText.split(detectedSep.char)
    
    // 过滤空项和去除空格
    items = items.map(item => item.trim()).filter(item => item.length > 0)
    
    // 如果分割后只有一个项目，返回原文本
    if (items.length <= 1) {
      return [currentText]
    }
    
    // 递归分析每个项目，看是否还能进一步分割
    const allItems = []
    const newUsedSeparators = [...usedSeparators, detectedSep.char]
    
    for (const item of items) {
      // 如果项目还能进一步分割，递归分析
      const subItems = recursiveAnalyze(item, newUsedSeparators)
      allItems.push(...subItems)
    }
    
    return allItems
  }
  
  // 进行递归分析
  let items = recursiveAnalyze(text)
  const beforeCount = items.length
  
  // 处理每个项目
  let hasQuotes = false
  let usedSeparators = []
  
  items = items.map(item => {
    if (trimSpaces.value) {
      item = item.trim()
    }
    
    // 去除引号
    const result = removeQuotes(item)
    if (result.hadQuotes) {
      hasQuotes = true
    }
    
    return result.text
  })
  
  // 移除空项
  if (removeEmpty.value) {
    items = items.filter(item => item.length > 0)
  }
  
  // 去重
  items = [...new Set(items)]
  
  // 检测使用了哪些分隔符
  const separators = [',', ';', '|', '\t', ' ', '\n']
  const detectedSeparators = []
  
  for (const sep of separators) {
    if (text.includes(sep)) {
      const sepName = {
        ',': '逗号',
        ';': '分号', 
        '|': '竖线',
        '\t': 'Tab',
        ' ': '空格',
        '\n': '换行符'
      }[sep] || sep
      
      detectedSeparators.push(sepName)
    }
  }
  
  return {
    items,
    detectedSeparator: detectedSeparators.length > 1 ? 
      `多种分隔符(${detectedSeparators.join(', ')})` : 
      detectedSeparators[0] || '换行符',
    beforeCount,
    afterCount: items.length,
    hasQuotes
  }
}

// 智能分析开关变化处理
const onSmartAnalysisChange = () => {
  if (enableSmartAnalysis.value) {
    generateSQL()
  } else {
    analysisResult.value = null
    generateSQL()
  }
}

// 生成SQL条件
const generateSQL = () => {
  if (!inputText.value.trim()) {
    outputText.value = ''
    analysisResult.value = null
    return
  }
  
  let items
  
  if (enableSmartAnalysis.value) {
    // 使用智能分析
    const analysis = smartAnalyze(inputText.value)
    if (analysis) {
      analysisResult.value = analysis
      items = analysis.items
    } else {
      analysisResult.value = null
      items = []
    }
  } else {
    // 使用手动指定的分隔符
    analysisResult.value = null
    let actualSeparator = separator.value === 'custom' ? customSeparator.value : separator.value
    if (actualSeparator === '\n') actualSeparator = '\n'
    
    items = inputText.value.split(actualSeparator)
    
    if (trimSpaces.value) {
      items = items.map(item => item.trim())
    }
    
    if (removeEmpty.value) {
      items = items.filter(item => item.length > 0)
    }
    
    // 去重
    items = [...new Set(items)]
  }
  
  if (addQuotes.value) {
    items = items.map(item => escapeAndQuoteString(item))
  }
  
  // 只生成括号内的条件
  outputText.value = items.join(', ')
}

// 清空所有内容
const clearAll = () => {
  inputText.value = ''
  outputText.value = ''
  copyButtonText.value = '复制'
}

// 复制到剪贴板
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(outputText.value)
    copyButtonText.value = '已复制!'
    setTimeout(() => {
      copyButtonText.value = '复制'
    }, 2000)
  } catch (err) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = outputText.value
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    
    copyButtonText.value = '已复制!'
    setTimeout(() => {
      copyButtonText.value = '复制'
    }, 2000)
  }
}

// 处理快捷键
const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    generateSQL()
  }
}
</script>