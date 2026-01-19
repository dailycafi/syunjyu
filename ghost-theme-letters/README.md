# Letters to Syunjyu - Ghost 主题

一个清新简洁的 Ghost 博客主题，专为"给 Syunjyu 写信"设计。

## ✨ 特性

- 🎨 **信件风格设计** - 温暖的米色纸张背景，优雅的中文衬线字体
- 💬 **内置回复功能** - 使用 Ghost 原生评论系统，Syunjyu 可以回复每封信
- 📱 **响应式设计** - 完美适配桌面、平板和手机
- 🌙 **深色模式** - 自动跟随系统设置
- ⚡ **性能优化** - 轻量级代码，快速加载
- 🖨️ **打印友好** - 专门优化的打印样式

## 📦 安装

### 方法一：上传 ZIP 文件

1. 将 `ghost-theme-letters` 文件夹打包成 ZIP 文件：
   ```bash
   cd /path/to/syunjyu
   zip -r letters-to-syunjyu.zip ghost-theme-letters
   ```

2. 登录 Ghost 管理后台 (`blog.syunjyu.com/ghost`)

3. 进入 **Settings** → **Design** → **Change theme**

4. 点击 **Upload theme** 上传 ZIP 文件

5. 激活主题

### 方法二：直接部署到服务器

```bash
# 复制主题到 Ghost 的 themes 目录
cp -r ghost-theme-letters /var/www/ghost/content/themes/letters-to-syunjyu

# 重启 Ghost
ghost restart
```

## ⚙️ 配置

### 启用评论功能（让 Syunjyu 回复）

1. 进入 Ghost 管理后台
2. **Settings** → **Membership**
3. 启用 **Enable commenting**
4. 设置为 **All members** 或 **Paid members only**

### 自定义主题颜色

在 Ghost 管理后台 **Settings** → **Design** → **Site-wide** 中可以设置：

- **Accent Color**: 主题强调色（默认 #8B7355 温暖棕色）
- **Letter Paper Color**: 信纸背景色（默认 #FDF8F3 米白色）
- **Show Reply Section**: 是否显示回复区域

### 导航菜单设置

建议的导航结构：

| 标签 | URL |
|------|-----|
| 首页 | / |
| 关于 | /about/ |
| 标签 | /tags/ |

## 🖋️ 使用建议

### 写信格式

每篇文章就是一封信。建议格式：

```
标题：第一封信 / 关于春天的思念 / ...

内容：
亲爱的 Syunjyu，

[正文内容]

此致
[你的名字]
```

### 标签使用

可以用标签来分类信件：

- `日常` - 日常生活分享
- `思念` - 想念的话语
- `旅行` - 旅途见闻
- `美食` - 美食推荐

### Syunjyu 回复

Syunjyu 可以通过评论功能回复每封信。评论会显示在文章底部的"Syunjyu 的回复"区域。

## 🛠️ 服务器部署指南

### 使用 Docker 部署 Ghost

```yaml
# docker-compose.yml
version: '3.8'
services:
  ghost:
    image: ghost:5-alpine
    restart: always
    ports:
      - 2368:2368
    environment:
      url: https://blog.syunjyu.com
      database__client: mysql
      database__connection__host: db
      database__connection__user: ghost
      database__connection__password: your_password
      database__connection__database: ghost
    volumes:
      - ghost-content:/var/lib/ghost/content
    depends_on:
      - db

  db:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: your_root_password
      MYSQL_USER: ghost
      MYSQL_PASSWORD: your_password
      MYSQL_DATABASE: ghost
    volumes:
      - ghost-db:/var/lib/mysql

volumes:
  ghost-content:
  ghost-db:
```

### Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name blog.syunjyu.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name blog.syunjyu.com;

    ssl_certificate /etc/letsencrypt/live/blog.syunjyu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blog.syunjyu.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:2368;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL 证书（Let's Encrypt）

```bash
# 安装 certbot
apt install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d blog.syunjyu.com
```

## 📁 文件结构

```
ghost-theme-letters/
├── assets/
│   ├── css/
│   │   └── style.css      # 主样式文件
│   └── js/
│       └── main.js        # JavaScript 功能
├── partials/
│   ├── header.hbs         # 页头组件
│   ├── footer.hbs         # 页脚组件
│   └── navigation.hbs     # 导航组件
├── default.hbs            # 基础布局
├── index.hbs              # 首页模板
├── post.hbs               # 文章/信件模板
├── page.hbs               # 页面模板
├── tag.hbs                # 标签页模板
├── author.hbs             # 作者页模板
├── error.hbs              # 错误页模板
├── package.json           # 主题配置
└── README.md              # 说明文档
```

## 🎨 自定义样式

如需自定义样式，可以在 Ghost 管理后台 **Settings** → **Code injection** → **Site Header** 中添加：

```html
<style>
  :root {
    --accent-color: #your-color;
    --letter-paper: #your-color;
    --font-serif: 'Your Font', serif;
  }
</style>
```

## 📝 许可证

MIT License

---

💌 用心写每一封信，等待 Syunjyu 的回复
