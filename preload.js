// uTools 插件预加载脚本
// 这个文件在插件加载时运行，用于初始化插件环境

window.exports = {
    "sql_in_generator": {
        mode: "doc",
        args: {
            // 进入插件时的处理
            enter: (action, callbackSetList) => {
                // 可以在这里处理一些初始化逻辑
                console.log('SQL IN Generator 插件启动');
                
                // 设置回调列表（如果需要）
                if (callbackSetList) {
                    callbackSetList([
                        {
                            title: "SQL IN 条件生成器",
                            description: "将文本转换为SQL IN查询条件",
                            icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgNkg4VjRINlYySDhWMEg0VjJIMlY0SDRWNloiIGZpbGw9IiM0Rjc5QTQiLz4KPHBhdGggZD0iTTEwIDZIMTRWNEgxMlYySDEwVjZaIiBmaWxsPSIjNEY3OUE0Ii8+CjxwYXRoIGQ9Ik0xNiA2SDIwVjRIMThWMkgxNlY2WiIgZmlsbD0iIzRGNzlBNCIvPgo8cGF0aCBkPSJNNCA4SDhWMTBINFY4WiIgZmlsbD0iIzRGNzlBNCIvPgo8cGF0aCBkPSJNMTAgOEgxNFYxMEgxMFY4WiIgZmlsbD0iIzRGNzlBNCIvPgo8cGF0aCBkPSJNMTYgOEgyMFYxMEgxNlY4WiIgZmlsbD0iIzRGNzlBNCIvPgo8L3N2Zz4K"
                        }
                    ]);
                }
            },
            
            // 选择列表项时的处理
            select: (action, itemData, callbackSetList) => {
                window.utools.hideMainWindow();
                window.utools.showMainWindow();
                return true;
            },
            
            // 搜索处理
            search: (action, searchWord, callbackSetList) => {
                // 可以根据搜索词返回相关结果
                if (!searchWord) return;
                
                callbackSetList([
                    {
                        title: `生成 "${searchWord}" 的SQL IN条件`,
                        description: "点击进入插件生成SQL条件",
                        searchWord: searchWord
                    }
                ]);
            }
        }
    },
    
    "excel_sql_generator": {
        mode: "doc",
        args: {
            enter: (action, callbackSetList) => {
                console.log('Excel SQL Generator 插件启动');
                
                // 不再手动跳转，让uTools使用配置中的main页面
                
                if (callbackSetList) {
                    callbackSetList([
                        {
                            title: "Excel 转 SQL 生成器",
                            description: "将Excel数据转换为INSERT/UPDATE语句",
                            icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE0IDJINmEyIDIgMCAwIDAtMiAydjE2YTIgMiAwIDAgMCAyIDJoMTJhMiAyIDAgMCAwIDItMlY4eiI+PC9wYXRoPgo8cG9seWxpbmUgcG9pbnRzPSIxNCwyIDE0LDggMjAsOCI+PC9wb2x5bGluZT4KPGxpbmUgeDE9IjE2IiB5MT0iMTMiIHgyPSI4IiB5Mj0iMTMiPjwvbGluZT4KPGxpbmUgeDE9IjE2IiB5MT0iMTciIHgyPSI4IiB5Mj0iMTciPjwvbGluZT4KPHBvbHlsaW5lIHBvaW50cz0iMTAsOSA5LDkgOCw5Ij48L3BvbHlsaW5lPgo8L3N2Zz4K"
                        }
                    ]);
                }
            },
            
            select: (action, itemData, callbackSetList) => {
                window.utools.hideMainWindow();
                window.utools.showMainWindow();
                return true;
            },
            
            search: (action, searchWord, callbackSetList) => {
                if (!searchWord) return;
                
                callbackSetList([
                    {
                        title: `Excel数据转换为SQL`,
                        description: "点击进入Excel处理功能",
                        searchWord: searchWord
                    }
                ]);
            }
        }
    }
};

// 插件工具函数
window.sqlUtils = {
    // 快速生成SQL IN条件的工具函数
    quickGenerate: (text, options = {}) => {
        const {
            separator = '\n',
            addQuotes = true,
            trimSpaces = true,
            removeEmpty = true,
            columnName = 'id'
        } = options;
        
        if (!text || !text.trim()) {
            return '';
        }
        
        let items = text.split(separator);
        
        if (trimSpaces) {
            items = items.map(item => item.trim());
        }
        
        if (removeEmpty) {
            items = items.filter(item => item.length > 0);
        }
        
        // 去重
        items = [...new Set(items)];
        
        if (addQuotes) {
            items = items.map(item => window.sqlUtils.escapeAndQuoteString(item));
        }
        
        return `${columnName} IN (${items.join(', ')})`;
    },
    
    // 字符串转义和加引号处理（与main.js保持一致）
    escapeAndQuoteString: (str) => {
        if (typeof str !== 'string') {
            str = String(str);
        }
        
        // 首先清理字符串：去除首尾的引号（如果有的话）
        let cleaned = str.trim();
        
        // 检查是否已经被引号包围，如果是则去除外层引号
        if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
            (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            // 去除外层引号
            cleaned = cleaned.slice(1, -1);
        }
        
        // 转义SQL中的特殊字符
        // 转义单引号：将 ' 替换为 ''
        let escaped = cleaned.replace(/'/g, "''");
        
        // 用单引号包围
        return `'${escaped}'`;
    },
    
    // 检测文本中可能的分隔符
    detectSeparator: (text) => {
        const separators = ['\n', ',', ';', '|', ' ', '\t'];
        const counts = separators.map(sep => ({
            separator: sep,
            count: (text.split(sep).length - 1)
        }));
        
        // 返回出现次数最多的分隔符
        return counts.reduce((max, current) => 
            current.count > max.count ? current : max
        ).separator;
    }
};