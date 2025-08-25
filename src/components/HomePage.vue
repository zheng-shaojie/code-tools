<template>
  <div class="feature-selector">
    <div class="feature-grid">
      <div class="feature-card" @click="$emit('switch-view', 'sql-in')">
        <div class="feature-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <path d="M8 14h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M16 14h.01"></path>
          </svg>
        </div>
        <h3>SQL IN 条件生成器</h3>
        <p>智能分析分隔符，快速生成SQL IN条件</p>
        <div class="feature-tags">
          <span class="tag">智能分析</span>
          <span class="tag">IN条件</span>
        </div>
      </div>

      <div class="feature-card" @click="$emit('switch-view', 'excel-sql')">
        <div class="feature-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </div>
        <h3>Excel 转 SQL 生成器</h3>
        <p>批量插入、自定义列、动态值生成</p>
        <div class="feature-tags">
          <span class="tag">批量插入</span>
          <span class="tag">动态值</span>
        </div>
      </div>

      <div class="feature-card" @click="$emit('switch-view', 'excel-json')">
        <div class="feature-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <circle cx="9.5" cy="12" r="1"></circle>
            <circle cx="14.5" cy="12" r="1"></circle>
          </svg>
        </div>
        <h3>Excel JSON 数据提取器</h3>
        <p>提取JSON字段，支持路径解析转换</p>
        <div class="feature-tags">
          <span class="tag">JSON提取</span>
          <span class="tag">路径解析</span>
        </div>
      </div>
    </div>

    <div class="quick-access">
      <h4>快速访问</h4>
      <div class="quick-links">
        <button class="quick-btn" @click="$emit('switch-view', 'sql-in')">
          <span>SQL IN</span>
          <small>智能分析分隔符</small>
        </button>
        <button class="quick-btn" @click="$emit('switch-view', 'excel-sql')">
          <span>Excel转SQL</span>
          <small>批量插入+动态值</small>
        </button>
        <button class="quick-btn" @click="$emit('switch-view', 'excel-json')">
          <span>JSON提取</span>
          <small>Excel JSON字段提取</small>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// 定义发射的事件
defineEmits(['switch-view'])
</script>