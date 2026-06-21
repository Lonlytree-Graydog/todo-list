# 📋 待办事项

一个功能丰富的本地任务管理工具，纯前端实现，无需服务器，所有数据存储在浏览器本地。

## ✨ 功能特性

### 任务管理
- **创建任务**：标题、优先级（高/中/低）、截止日期、分类、文件夹、预计时长、描述
- **编辑/删除**：双击任务或点击 ✏️ 按钮编辑，点击 🗑 删除
- **完成标记**：点击左侧方框切换完成状态
- **紧凑已完成**：一键收起已完成任务

### 📁 文件夹
- 创建、重命名、删除文件夹
- 按文件夹筛选任务
- 右键拖拽移动任务到文件夹

### 🔄 重复任务
- **四种模式**：每天、工作日、休息日、每周指定日
- 每日首次打开自动推送当天任务实例
- 总时长按周期天数均分到每日
- 规则支持修改、重推、拖拽排序

### 🔍 追踪任务
- 未完成任务次日自动前移，始终只保留一条
- 完成后自动停用
- 任务卡片独立标签 + 工具栏统计

### 📅 日期分组
- 7 个时间桶：已过期 / 今天 / 明天 / 本周 / 下周 / 更远 / 无截止日期
- 分组可折叠/展开，组内支持拖拽排序

### 📋 子任务
- 任务内创建子步骤，独立标题和时长
- 子任务总时长不超过父任务时长
- 右键「成为子任务」将任务转为另一个任务的子任务

### 🗓️ 日历视图
- 月历网格展示，格内显示任务缩略
- 点击日期查看当日完整任务列表
- 月份切换、键盘导航

### 🎨 主题与背景
- 亮色 / 暗色模式一键切换
- 6 张背景图片循环切换
- 主题和背景偏好持久保存

### 💾 数据管理
- 所有数据保存在浏览器 localStorage
- 导出 / 导入 JSON 备份
- 无需服务器，数据仅供本地使用

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + K` | 聚焦搜索框 |
| `Ctrl + 1/2/3` | 筛选：全部 / 进行中 / 已完成 |
| `Ctrl + Shift + G` | 切换日期分组 |
| `Ctrl + Shift + M` | 展开/收起添加表单 |
| `Ctrl + Shift + C` | 切换紧凑已完成 |
| `Ctrl + Shift + Del` | 清除已完成任务 |
| `Ctrl + B` | 切换背景图片 |
| `Ctrl + Alt + T` | 切换亮色/暗色主题 |
| `Ctrl + Shift + H` | 打开/关闭帮助弹窗 |
| `N` | 聚焦任务输入框 |
| `Enter` | 提交表单 / 保存编辑 |
| `Esc` | 取消 / 关闭弹窗 / 清除搜索 |
| `Tab / Shift+Tab` | 表单字段间前进/后退 |

## 🗂️ 文件结构

```
todo-list/
├── index.html          # 主页面（待办事项）
├── styles.css          # 主样式（暖色调主题 + 暗色模式）
├── app.js              # 主逻辑（~2400行）
├── calendar.html       # 日历视图页面
├── calendar.css        # 日历样式
├── calendar.js         # 日历逻辑
├── bg/                 # 6 张背景图片
│   ├── indax.jpg
│   └── ...
├── video/              # 介绍视频素材
└── README.md           # 本文件
```

## 🛠️ 技术栈

- 纯 HTML + CSS + JavaScript（ES5，无框架）
- 数据持久化：localStorage
- 主题：CSS 变量 + `.dark` 类切换
- 拖拽排序：自定义 mousedown/mousemove/mouseup 实现
- 平滑动画：CSS transition + JS 高度测量

## 🚀 快速开始

1. 克隆或下载本项目
2. 直接用浏览器打开 `index.html`
3. 点击 `calendar.html` 查看日历视图

## 📝 数据格式

### 任务
```json
{
  "id": "task_xxx",
  "title": "任务标题",
  "priority": "high|medium|low",
  "dueDate": "2026-06-19",
  "category": "work|study|life|other",
  "folderId": "folder_xxx",
  "estimatedMinutes": 60,
  "desc": "描述",
  "completed": false,
  "createdAt": 1718700000000,
  "subtasks": [...],
  "trackingId": "trk_xxx",
  "recurringSourceId": "rec_xxx"
}
```

### 文件夹
```json
{
  "id": "folder_xxx",
  "name": "文件夹名",
  "createdAt": 1718600000000
}
```

### 重复规则
```json
{
  "id": "rec_xxx",
  "title": "每日英语听力",
  "startDate": "2026-06-01",
  "endDate": "2026-07-31",
  "repeatType": "daily|weekday|weekend|weekly",
  "weeklyDays": [1, 3, 5],
  "totalEstimatedMinutes": 600,
  "active": true
}
```

## 📄 License

MIT
