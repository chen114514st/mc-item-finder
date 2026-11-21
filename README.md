# MC 物品查询器

一个纯前端的《我的世界》物品查询网页：Java 版 6 个版本 + 基岩版 4 个版本、22 种语言（21 套语言包 + 英文）、**全部物品变体**（药水/附魔书/山羊角/画/烟花等）与**方块状态属性**、拼音搜索、`/give` 命令一键复制。无需联网、无需构建工具，双击打开即可用。

![版本](https://img.shields.io/badge/版本-26.1%20~%201.20.1-5ad06a) ![依赖](https://img.shields.io/badge/依赖-无-blue)

- **在线使用**：<https://chen114514st.github.io/mc-item-finder/>
- **仓库**：<https://github.com/chen114514st/mc-item-finder>

## 两种用法

| 方式 | 文件 | 说明 |
| --- | --- | --- |
| **单文件版**（推荐） | `dist/mc-item-finder.html` | 约 5.1 MB 单 HTML，图标、数据、语言全内联，拷哪里都能开，离线可用 |
| 目录版 | `index.html` + `data/` + `assets/` | 数据按版本/语言分文件按需加载，首屏更快，适合放服务器 |

### 手机上打开

- 单文件版：用文件管理器点开 `mc-item-finder.html`，选浏览器打开。
- 目录版（Chrome 对 `file://` 下的相对脚本加载有限制时）：

```bash
cd mc-item-finder
python3 -m http.server 8080
# 浏览器访问 http://127.0.0.1:8080
```

## 功能

- **版本切换**：Java 版 26.1 / 1.21.11 / 1.21.8 / 1.21.4 / 1.20.6 / 1.20.1；基岩版 1.26.60 / 1.21.100 / 1.21.50 / 1.20.80（下拉按「Java 版」「基岩版」分组）
- **全部物品变体**：药水（普通/喷溅/滞留/箭，26 种效果）、附魔书（按版本附魔与满级）、山羊角（8 种乐器）、画（51 幅）、烟花火箭（飞行时间 1–3）、烟火之星（5 种形状），26.1 共 210 条变体，可单独搜索
- **方块状态**：详情里列出朝向、水位、年龄、连接形状等属性与全部取值，并显示状态组合数、默认状态 ID（Java 用 `blocks.json`，基岩版用 `blockStates.json`）
- **`/give` 双语法**：Java 1.20.5+ 自动用组件语法（如 `potion[potion_contents={potion:"minecraft:night_vision"}]`），1.20.4 及更早用 NBT；基岩版输出 `/give @p <名称>`
- **22 种语言**：简中、繁中、日、韩、俄、德、法、西(ES/MX)、葡、意、波、土、荷、乌、越、泰、印尼、阿、瑞典、捷克、英文
- **搜索**：中文名 / 英文名 / 物品 ID / **拼音全拼与首字母**（如 `mjs` → 木剑类）；空格分词为「与」逻辑
- **分类筛选**：方块、工具、武器、护甲、食物、药水、刷怪蛋、杂项，带数量统计
- **物品详情**：图标、双语名、堆叠数、耐久、食物饱和度、硬度/抗爆/亮度/采掘工具、贴图路径；变体显示类型与基础物品链接，基础物品显示「相关变体」快捷跳转
- **一键复制**：`/give @p <id> 1` 获取命令、物品 ID
- 明暗主题切换、滚动懒加载、手机优先布局；偏好（版本/语言/主题）记在 localStorage

快捷键：`/` 聚焦搜索，`Esc` 关闭详情。

## 数据来源

| 内容 | 来源 |
| --- | --- |
| 物品 / 方块 / 食物数值（Java + 基岩版） | [PrismarineJS/minecraft-data](https://github.com/PrismarineJS/minecraft-data)（MIT） |
| 多语言名称 | [PandaDevOfficial/Minecraft-All-Lang](https://github.com/PandaDevOfficial/Minecraft-All-Lang) 为主，[misode/mcmeta](https://github.com/misode/mcmeta)（MIT）补齐新版键 |
| 物品图标 | Minecraft 官方客户端 `client.jar` 里的 `assets/minecraft/textures/` |
| 拼音索引 | [pypinyin](https://github.com/mozillazg/python-pinyin)（MIT）离线生成 |

> 贴图与游戏名称版权归 Mojang / Microsoft 所有，本项目仅作本地个人查询使用，不用于再分发商用。

## 目录结构

```
mc-item-finder/
├── index.html              页面结构
├── style.css               样式（明暗主题、手机优先）
├── core.js                 纯逻辑：搜索索引、过滤、详情字段（可在 node 测试）
├── app.js                  界面逻辑：渲染、详情面板、复制、版本/语言切换
├── .nomedia                让 Android 相册忽略这些贴图
├── data/
│   ├── meta.js             版本与语言清单（含 family / 物品与变体数）
│   ├── items-<版本>.js     Java 版数据 window.MCDATA.versions["<版本>"]
│   ├── be-items-<版本>.js  基岩版数据 window.MCDATA.versions["be:<版本>"]
│   └── lang-<语言>.js      window.MCDATA.langs["<语言>"]（含变体名 vn/vp）
├── assets/icons/           1194 张物品/方块贴图（item/、block/）；基岩版独有物品用分类字形兜底
├── build/
│   ├── fetch-data.mjs      抓 minecraft-data 的 26.1 / 1.21.x 版本数据
│   ├── fetch-rest.mjs      抓旧版目录别名数据（1.20.6/1.20.1）+ All-Lang 语言文件
│   ├── fetch-jar.mjs       下载官方客户端 client.jar（图标来源）
│   ├── fetch-mcmeta-lang.mjs 抓 mcmeta 最新语言文件补全新键
│   ├── fetch-extra.mjs     抓药水/附魔/乐器注册表 + 基岩版 items/blocks/blockStates
│   ├── resolve-icons.py    物品名 → 贴图路径多规则匹配（含基岩版旧名称），并提取 PNG
│   ├── build_data.py       生成 data/*.js（含拼音表、变体、方块状态）
│   ├── standalone.py       打包成单文件 HTML
│   ├── make_zip.py         打包目录版 zip
│   └── test/               jsdom 冒烟测试（smoke.mjs / smoke-single.mjs / smoke-zip.mjs）
└── dist/
    ├── mc-item-finder.html 单文件产物
    └── mc-item-finder.zip  目录版发布包（含 data/、assets/、build 脚本）
```

## 数据更新

```bash
node build/fetch-data.mjs         # 1. 物品/方块/食物数值（minecraft-data）
node build/fetch-rest.mjs         # 2. 旧版目录别名数据 + All-Lang 语言文件
node build/fetch-jar.mjs          # 3. 官方客户端 client.jar（图标来源，约 40 MB）
node build/fetch-mcmeta-lang.mjs  # 4. mcmeta 最新语言文件（补全新版本键）
node build/fetch-extra.mjs        # 5. 变体注册表 + 基岩版数据
python3 build/resolve-icons.py    # 6. 匹配贴图并提取到 assets/icons/
python3 build/build_data.py       # 7. 生成 data/*.js（含拼音表）
python3 build/standalone.py       # 8. 打包单文件 HTML
python3 build/make_zip.py         # 9. 打包 zip
cd build/test && npm i jsdom && node smoke.mjs   # 10. 冒烟测试
```

抓取全部走国内可访问的 jsDelivr / gh-proxy 镜像，raw.githubusercontent.com 仅作兜底。

新增版本时：在 `build/build_data.py` 的 `VERSIONS` 里加一行，并确认该版本目录存在于 minecraft-data 的 `dataPaths.json`。

## 测试

`build/test/smoke.mjs` 用 jsdom 启动真实页面，覆盖：数据加载、首屏渲染、搜索（中文/拼音首字母/全拼/英文/变体/无结果）、分类筛选、详情面板、变体 `/give` 双语法、方块状态、语言切换、版本切换（Java 旧版 + 基岩版）、控制台报错。当前 **32/32 通过**；`smoke-single.mjs` 测单文件版 **11/11 通过**；`smoke-zip.mjs` 解压 zip 后再跑一遍目录版。
