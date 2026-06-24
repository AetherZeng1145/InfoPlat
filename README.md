# InfoPlat - 信息平台

基于小米Vela JS技术栈的信息平台应用，运行在openvela平台上，硬件分辨率800x600，方形屏幕无圆角。

## 功能特性

### 新闻功能
- 使用currentsapi获取最新新闻
- 支持新闻分类：综合、商业、科技、娱乐、体育
- 新闻列表展示
- 新闻详情查看

### 天气功能（开发中）
- 实时天气信息
- 天气预报

### 快递功能（开发中）
- 快递查询
- 物流跟踪

## 技术栈

- 小米Vela JS
- openvela运行平台
- aiot-toolkit开发工具

## 项目结构

```
src/
├── app.ux                    # 应用入口
├── manifest.json             # 应用配置
├── pages/
│   ├── index/                # 主页面（左侧栏+右侧内容区）
│   │   └── index.ux
│   ├── detail/               # 新闻详情页
│   │   └── detail.ux
│   ├── weather/              # 天气页面
│   │   └── weather.ux
│   └── express/              # 快递页面
│       └── express.ux
└── i18n/                     # 国际化配置
    ├── defaults.json
    ├── zh-CN.json
    └── en.json
```

## 开发环境

### 1. 开发

```
npm install
npm run start
```

### 2. 构建

```
npm run build
npm run release
```

### 3. 代码规范化配置
代码规范化可以帮助开发者在git commit前进行代码校验、格式化、commit信息校验

使用前提：必须先关联git

macOS or Linux
```
sh husky.sh
```

windows
```
./husky.sh
```

## API Key配置

### Currents API
1. 访问 https://api.currentsapi.services/ 注册账号
2. 获取API Key
3. 在 `src/pages/index/index.ux` 文件中配置API Key：
   ```javascript
   apiKey: 'YOUR_API_KEY_HERE'
   ```

## UI设计

### 布局说明
- **左侧栏**：功能菜单和新闻分类选择
- **右侧内容区**：显示具体内容

### 设计规格
- 屏幕分辨率：800x600
- 屏幕形状：方形，无圆角
- 左侧栏宽度：200px
- 右侧内容区：自适应宽度

## 配置说明

### manifest.json
- `package`: 应用包名
- `name`: 应用名称
- `versionName`: 版本号
- `deviceTypeList`: 支持的设备类型
- `features`: 应用特性（路由、网络请求、提示等）
- `router`: 页面路由配置

## 注意事项

1. 确保API Key已正确配置
2. 网络请求需要设备联网
3. 天气和快递功能暂未实现，保留接口结构
4. 适配800x600方形屏幕

## 后续开发计划

- [ ] 实现天气功能模块
- [ ] 实现快递功能模块
- [ ] 添加新闻搜索功能
- [ ] 优化UI交互体验
- [ ] 添加数据缓存机制
- [ ] 实现离线模式

## 了解更多

你可以通过我们的[官方文档](https://iot.mi.com/vela/quickapp)熟悉和了解快应用。