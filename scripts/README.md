# 新闻源管理脚本

本目录包含用于管理AI新闻源的实用脚本。

## 可用脚本

### 1. check-sources.py - 检查源可用性

检查所有新闻源的可访问性并生成详细报告。

**使用方法:**
```bash
python3 scripts/check-sources.py
```

**功能:**
- 检查每个源的HTTP状态（200, 301, 403, 404等）
- 识别重定向并提供新URL建议
- 检测不可访问的源
- 生成详细报告并保存到 `source-check-report.txt`
- 可选：自动更新数据库（禁用不可用的源）

**输出示例:**
```
[1/54] 检查 OpenAI... ❌ HTTP错误: 403
[2/54] 检查 DeepMind... 🔄 重定向到: /blog/
[3/54] 检查 Google AI Blog... ✅ 可访问
...
```

### 2. reinit-sources.py - 重新初始化源数据库

清空并使用最新配置重新初始化新闻源数据库。

**使用方法:**
```bash
python3 scripts/reinit-sources.py
```

**功能:**
- 清空 `news_sources` 表
- 使用 `news_fetcher.py` 中的最新配置初始化
- 显示按类别分组的统计信息
- 列出已禁用的源

**何时使用:**
- 更新源URL后
- 添加或删除源后
- 数据库损坏需要重置时

### 3. dev-backend.sh - 启动后端服务器

启动Python后端开发服务器。

**使用方法:**
```bash
./scripts/dev-backend.sh
```

### 4. dev-sync-server.sh - 启动同步服务器

启动同步服务器用于多设备同步。

**使用方法:**
```bash
./scripts/dev-sync-server.sh
```

### 5. setup.sh - 项目初始化

首次设置项目环境。

**使用方法:**
```bash
./scripts/setup.sh
```

## 工作流程示例

### 定期维护检查
```bash
# 1. 检查所有源的状态
python3 scripts/check-sources.py

# 2. 根据报告，编辑 python-backend/news_fetcher.py
# 更新URL或禁用不可用的源

# 3. 重新初始化数据库
python3 scripts/reinit-sources.py

# 4. 重启后端服务器
./scripts/dev-backend.sh
```

### 添加新源
```bash
# 1. 编辑 python-backend/news_fetcher.py
# 在 NEWS_SOURCES 列表中添加新源

# 2. 重新初始化数据库
python3 scripts/reinit-sources.py

# 3. 验证新源
python3 scripts/check-sources.py
```

## 新闻源配置

所有新闻源定义在 `python-backend/news_fetcher.py` 的 `NEWS_SOURCES` 列表中。

**源结构:**
```python
{
    "id": 1,                    # 唯一ID
    "name": "OpenAI",          # 显示名称
    "url": "https://...",      # 主页URL
    "rss_url": "https://...",  # RSS URL (可选)
    "category": "research"     # 类别
}
```

**支持的类别:**
- `research` - 研究机构
- `academic` - 学术与预印本
- `media` - 科技媒体
- `blog` - 专业博客
- `newsletter` - Newsletter
- `science` - 综合科技

## 故障排除

### 源检查失败

**问题:** 脚本报告大量源不可访问

**解决方案:**
1. 检查网络连接
2. 确认没有使用VPN或代理
3. 某些网站可能阻止脚本的User-Agent，这是正常的

### 数据库为空

**问题:** Web界面显示没有源

**解决方案:**
```bash
# 重新初始化数据库
python3 scripts/reinit-sources.py

# 检查数据库内容
sqlite3 database.sqlite "SELECT COUNT(*) FROM news_sources;"
```

### 403/404错误

**问题:** 某些源返回403或404

**解决方案:**
1. 这些源可能已更改URL或阻止爬虫
2. 检查源的官方网站确认新URL
3. 更新 `news_fetcher.py` 中的URL
4. 如果源持续不可用，考虑注释禁用它

## 最佳实践

1. **定期检查:** 每月至少运行一次 `check-sources.py`
2. **保持ID稳定:** 删除源时不要重用ID
3. **测试RSS feed:** RSS通常比网页抓取更可靠
4. **记录变更:** 在 `SOURCE_CHECK_REPORT.md` 中记录主要变更
5. **备份数据库:** 在大规模变更前备份 `database.sqlite`

## 相关文件

- `python-backend/news_fetcher.py` - 源配置和抓取逻辑
- `python-backend/db.py` - 数据库操作
- `database.sqlite` - SQLite数据库文件
- `SOURCE_CHECK_REPORT.md` - 最新检查报告

## 需要帮助？

如有问题，请参考：
1. `SOURCE_CHECK_REPORT.md` - 最新的源状态报告
2. `QUICKSTART.md` - 项目快速入门
3. `README.md` - 项目主要文档

