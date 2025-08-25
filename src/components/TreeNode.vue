<template>
  <div v-if="node.visible !== false" class="tree-node-container">
    <div @click="selectNode" 
         @contextmenu.prevent="showContextMenu($event)"
         class="tree-node"
         :class="{ 'selected': selectedPath === node.path, 'has-children': hasChildren }"
         :style="{ paddingLeft: (node.depth * 20 + 10) + 'px' }">
      <span v-if="hasChildren" 
            @click.stop="toggleExpand" 
            class="node-expand-icon"
            :class="{ 'expanded': node.expanded }">
        ▶
      </span>
      <span v-else class="node-expand-placeholder"></span>
      <span class="node-label">{{ node.label }}</span>
      <span class="node-description">{{ node.description }}</span>
      <span class="node-actions">
        <button @click.stop="copyPath" class="copy-path-btn" title="复制路径">📋</button>
      </span>
    </div>
    <div v-if="node.expanded && hasChildren" class="tree-children">
      <TreeNode v-for="child in node.children" 
                :key="child.id"
                :node="child"
                :rule-index="ruleIndex"
                :selected-path="selectedPath"
                @select="$emit('select', $event)"
                @copy-path="$emit('copy-path', $event)"></TreeNode>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TreeNode',
  props: {
    node: {
      type: Object,
      required: true
    },
    ruleIndex: {
      type: Number,
      required: true
    },
    selectedPath: {
      type: String,
      default: null
    }
  },
  emits: ['select', 'copy-path'],
  computed: {
    hasChildren() {
      return this.node.children && this.node.children.length > 0
    }
  },
  methods: {
    selectNode() {
      this.$emit('select', { ruleIndex: this.ruleIndex, path: this.node.path })
    },
    toggleExpand() {
      this.node.expanded = !this.node.expanded
    },
    copyPath() {
      this.$emit('copy-path', this.node.path)
    },
    showContextMenu(event) {
      // 右键菜单功能
      event.preventDefault()
      this.copyPath()
    }
  }
}
</script>

<style scoped>
.tree-node-container {
  position: relative;
}

.tree-node {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.2s;
  position: relative;
}

.tree-node:hover {
  background-color: #f0f8ff;
}

.tree-node.selected {
  background-color: #e6f3ff;
  border-left: 3px solid #1890ff;
}

.tree-node.root-node {
  font-weight: bold;
  background-color: #fafafa;
  border: 1px solid #d9d9d9;
  margin-bottom: 5px;
}

.tree-node.has-children {
  padding-left: 5px;
}

.node-expand-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 5px;
  font-size: 10px;
  color: #666;
  transition: transform 0.2s;
  cursor: pointer;
}

.node-expand-icon.expanded {
  transform: rotate(90deg);
}

.node-expand-placeholder {
  width: 16px;
  margin-right: 5px;
}

.node-label {
  font-weight: 500;
  color: #333;
  margin-right: 8px;
  min-width: 120px;
}

.node-description {
  color: #666;
  font-size: 12px;
  flex: 1;
}

.node-actions {
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.2s;
}

.tree-node:hover .node-actions {
  opacity: 1;
}

.copy-path-btn {
  padding: 2px 4px;
  font-size: 10px;
  border: 1px solid #ddd;
  border-radius: 2px;
  background: white;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.copy-path-btn:hover {
  background: #e6f3ff;
  border-color: #1890ff;
  color: #1890ff;
}

.tree-children {
  margin-left: 15px;
  border-left: 1px dashed #d9d9d9;
  position: relative;
}
</style>