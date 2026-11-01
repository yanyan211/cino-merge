# Cino Merge · 合成小瑞瑞

合成大西瓜玩法的粉丝小游戏，带账号登录、个人中心和实时排行榜（本周榜 / 总榜）。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `index.html` | 游戏本体 |
| `assets/` | 图片、音效、字体和程序库，文件名带指纹，可以长期缓存 |
| `_headers` | Cloudflare Pages 的缓存规则 |
| `config.js` | 填 Supabase 地址和 key 的地方，只需要改这个文件 |
| `supabase/setup.sql` | 在 Supabase 里建表用的脚本，跑一次就行 |
| `README.md` | 就是这份说明 |

`config.js` 没填的时候，游戏照样能玩，只是不显示登录按钮，排行榜会提示「还没连上服务器」。

---

## 第一步：Supabase 数据库

1. **建表**：打开 Supabase 项目 → 左侧 **SQL Editor** → **New query**，把 `supabase/setup.sql` 的全部内容粘进去，点 **Run**，看到 Success 就好。
2. **关掉邮箱验证**：**Authentication → Sign In / Providers → Email**，保持 Email 打开，把 **Confirm email** 关掉，保存。
   游戏用「账号 + 密码」登录，账号在后台存成 `账号@xiaoruirui.game` 这种假邮箱，不会真的发邮件，所以必须关掉。
3. **填 config.js**：**Project Settings → API**（新版叫 **Data API / API Keys**），复制：
   - Project URL（像 `https://abcdefg.supabase.co`）
   - anon public key（新版叫 publishable key）

   用记事本或 VS Code 打开 `config.js`，填进引号里，保存。
   **service_role / secret key 千万不要填。**

## 第二步：上传到 GitHub

在 `Cino Merge` 文件夹里打开终端（文件夹空白处按住 Shift 右键 →「在此处打开 PowerShell 窗口」/「在终端中打开」），依次运行：

```bash
gh auth login            # 第一次用 gh 才需要，按提示用浏览器登录
git init
git add .
git commit -m "Cino Merge 合成小瑞瑞"
git branch -M main
gh repo create cino-merge --public --source=. --push
```

跑完后，仓库地址是 `https://github.com/你的用户名/cino-merge`。

## 第三步：部署到 Cloudflare Pages

1. 登录 Cloudflare → 左侧 **Workers & Pages** → **Create** → 选 **Pages** → **Connect to Git**。
2. 授权 GitHub，选择 `cino-merge` 仓库。
3. 构建设置：
   - Project name：`cino-merge`（网址就是 `cino-merge.pages.dev`）
   - Framework preset：**None**
   - Build command：**留空**
   - Build output directory：**/**（或留空）
4. 点 **Save and Deploy**，一两分钟后网址就能打开了。

以后改了文件，只需要在终端里：

```bash
git add .
git commit -m "更新"
git push
```

Cloudflare 会自动重新部署，不用再手动操作。

---

## 需要知道的几件事

- **不登录也能玩**，只是成绩不上榜。一局结束后再登录，这一局的成绩会自动补交。
- **换浏览器、换手机**都用同一个账号密码登录，最高分和头像跟着账号走。
- **账号和昵称都不能和别人重复**，重复时会提示「已经有娘娘使用这个帐号/昵称啦」。
- **排行榜分本周榜和总榜**：本周榜每周一 0 点（北京时间）自动换新的一周，旧数据保留在 `weekly_scores` 表里。
- **忘记密码没法自助找回**（没有真邮箱）。有人忘了的话，在 **Authentication → Users** 里找到 `账号@xiaoruirui.game`，帮他重置密码或删掉重新注册。
- **分数是网页自己上报的**，懂技术的人能伪造。脚本限制了上限 100000 分；榜上有明显作弊的，在 **Table Editor → profiles**（总榜）或 **weekly_scores**（周榜）里把那一行的分数改成 0。
- **anon key 放在公开仓库里是正常的**，数据安全靠的是建表脚本里的权限规则：每个人只能改自己的昵称和头像，分数只能通过提交函数写入。
