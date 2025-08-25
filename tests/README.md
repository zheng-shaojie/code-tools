# 测试文件说明

本文件夹包含了项目开发过程中用于测试和演示的文件。

## 📁 文件分类

### 🧪 JavaScript 测试文件
- `test-json-normalization.js` - JSON字符串规范化功能测试
- `test-object-display.js` - 嵌套数组对象显示修复测试
- `test-user-json.js` - 用户提供的有问题JSON字符串测试
- `test-nested-object-display.js` - 嵌套对象显示测试（ES6模块版本）
- `test-recursive-path-suggestions.js` - 递归JSON路径建议功能测试
- `test-tree-path-suggestions.js` - 树形结构JSON路径建议功能测试

### 🎨 HTML 演示文件
- `JSON规范化功能展示.html` - JSON规范化功能的详细展示页面
- `对象类型路径建议展示.html` - 对象类型路径建议功能演示
- `界面优化展示.html` - 界面优化前后对比展示
- `紧凑版界面展示.html` - 紧凑布局优化效果展示
- `test_merge_cells.html` - 合并单元格功能测试页面
- `递归路径建议功能演示.html` - 递归JSON路径建议功能演示
- `树形路径建议功能演示.html` - 树形结构JSON路径建议功能演示
- `完整树形建议功能展示.html` - **NEW** 完整的树形建议功能展示，包含搜索、过滤、复制等所有功能
- `树形建议修复验证.html` - **NEW** 树形建议修复后的验证页面，用于确认修复效果

- `logo_generator.html` - Logo生成器模板

### 📝 说明文档
- `对象类型提取修复说明.md` - 对象类型数据提取问题修复文档
- `状态清空功能修复说明.md` - 文件重新上传状态管理修复文档
- `TreeNode组件拆分说明.md` - **NEW** TreeNode组件模块化拆分的详细说明
- `对象嵌套数组处理指南.md` - **NEW** 复杂JSON数据结构处理的完整指南

## 🚀 运行测试

### JavaScript 测试文件
```bash
# 在项目根目录下运行
cd /Users/zhengshaojie/Work/test/code-tools

# 运行JSON规范化测试
node tests/test-json-normalization.js

# 运行对象显示修复测试
node tests/test-object-display.js

# 运行用户JSON测试
node tests/test-user-json.js

# 运行递归路径建议功能测试
node tests/test-recursive-path-suggestions.js

# 运行树形路径建议功能测试
node tests/test-tree-path-suggestions.js
```

### HTML 演示文件
直接在浏览器中打开对应的HTML文件即可查看演示效果。

## 📋 测试覆盖的功能

1. **JSON规范化处理**
   - 单引号转双引号
   - 属性名添加引号
   - 尾随逗号处理
   - JavaScript特殊值处理
   - 注释移除

2. **对象显示修复**
   - `[object Object]` 问题修复
   - JSON格式化显示
   - 嵌套数组对象处理

3. **界面优化**
   - 紧凑布局设计
   - 功能分组展示
   - 响应式设计

4. **数据处理功能**
   - 数组展开处理
   - 合并单元格显示
   - 路径建议系统
   - 递归JSON结构分析
   - 深度嵌套路径提取
   - 树形结构展示
   - 可折叠节点交互
   - **智能搜索过滤** - 实时搜索树形节点
   - **节点统计功能** - 显示可见/总节点数
   - **路径复制功能** - 一键复制节点路径
   - **展开/折叠控制** - 批量操作节点状态

## 🛠️ 开发说明

这些测试文件用于：
- 验证功能实现的正确性
- 展示功能特性和改进效果
- 作为开发过程的测试用例
- 提供功能使用的参考示例

在开发新功能或修复问题时，可以参考这些测试文件的实现方式。