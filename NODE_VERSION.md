# Node.js版本配置说明

## 当前使用版本
- Node.js: v22.13.0
- npm: v10.9.2

## 版本兼容性
本项目支持Node.js >= 18.0.0版本。

## 版本管理
项目根目录包含`.nvmrc`文件，如果您使用nvm管理Node.js版本，可以通过以下命令切换到项目指定版本：

```bash
# 使用项目指定的Node.js版本
nvm use

# 或者安装并使用指定版本
nvm install $(cat .nvmrc)
nvm use $(cat .nvmrc)
```

## 环境验证
在开始开发前，请确保Node.js和npm版本满足要求：

```bash
node --version  # 应该显示 v22.13.0 或更高版本
npm --version   # 应该显示 10.9.2 或更高版本
```

## 开发环境设置
1. 确保Node.js版本正确
2. 安装项目依赖：`npm install`
3. 启动开发服务器：`npm run dev`
4. 构建项目：`npm run build`