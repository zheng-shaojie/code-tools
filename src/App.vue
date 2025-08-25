<template>
  <div class="container">
    <header>
      <div class="header-content">
        <div class="header-text">
          <h1>{{ pageTitle }}</h1>
          <p class="subtitle">{{ pageSubtitle }}</p>
        </div>
        <div class="header-actions" v-if="currentView !== 'home'">
          <button 
            class="btn-back-home" 
            @click="switchView('home')">
            <svg class="back-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L9 5.414V17a1 1 0 102 0V5.414l5.293 5.293a1 1 0 001.414-1.414l-7-7z"/>
            </svg>
            返回主页
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main>
      <!-- 首页 -->
      <HomePage v-if="currentView === 'home'" @switch-view="switchView" />
      
      <!-- SQL IN 条件生成器 -->
      <SqlInGenerator v-if="currentView === 'sql-in'" />
      
      <!-- Excel 转 SQL 生成器 -->
      <ExcelSqlGenerator v-if="currentView === 'excel-sql'" />
    </main>

    <footer>
      <p>
        <strong>SQL 工具集 v2.0.0</strong> | 
        本地处理，保护隐私 | 
        <a href="#" @click="showAbout">关于</a>
      </p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import HomePage from './components/HomePage.vue'
import SqlInGenerator from './components/SqlInGenerator.vue'
import ExcelSqlGenerator from './components/ExcelSqlGenerator.vue'

// 响应式数据
const currentView = ref('home')

// 计算属性 - 页面标题
const pageTitle = computed(() => {
  switch (currentView.value) {
    case 'home':
      return 'SQL 工具集'
    case 'sql-in':
      return 'SQL IN 条件生成器'
    case 'excel-sql':
      return 'Excel 转 SQL 生成器'
    default:
      return 'SQL 工具集'
  }
})

// 计算属性 - 页面副标题
const pageSubtitle = computed(() => {
  switch (currentView.value) {
    case 'home':
      return '强大的SQL开发辅助工具集合'
    case 'sql-in':
      return '智能分析多种分隔符，自动去除引号，生成SQL IN条件'
    case 'excel-sql':
      return '支持批量插入、自定义列、动态值（时间戳、雪花ID、UUID等）'
    default:
      return '强大的SQL开发辅助工具集合'
  }
})

// 方法
const switchView = (view) => {
  console.log('切换到视图:', view)
  currentView.value = view
  
  // 更新URL参数（但不刷新页面）
  const url = new URL(window.location)
  if (view === 'home') {
    url.searchParams.delete('feature')
  } else {
    url.searchParams.set('feature', view)
  }
  window.history.pushState({}, '', url)
}

const showAbout = () => {
  alert('SQL 工具集 v2.0.0\n\n功能特点：\n• SQL IN 条件生成器 - 智能分析多种分隔符\n• Excel 转 SQL 生成器 - 支持批量插入、自定义列\n• 支持动态值：时间戳、雪花ID、UUID、自增序号\n• 智能引号处理、空值过滤、自动去重\n\n本地处理，保护隐私\n数据不会上传到服务器')
}

// 初始化时检查URL参数
const initializeFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const feature = urlParams.get('feature')
  
  if (feature && (feature === 'sql-in' || feature === 'excel-sql')) {
    currentView.value = feature
  }
}

// 组件挂载时初始化
onMounted(() => {
  initializeFromUrl()
  
  // 监听浏览器前进后退
  window.addEventListener('popstate', () => {
    initializeFromUrl()
  })
})
</script>