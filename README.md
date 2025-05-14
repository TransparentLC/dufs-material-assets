# dufs-material-assets

[![CI](https://github.com/TransparentLC/dufs-material-assets/actions/workflows/ci.yml/badge.svg)](https://github.com/TransparentLC/dufs-material-assets/actions/workflows/ci.yml)

[dufs](https://github.com/sigoden/dufs) 的 Material Design 风格自定义前端界面。

使用 Vue 3 + Vuetify 构建，部分设计参考 [Cloudreve](https://github.com/cloudreve/Cloudreve)，添加了一些额外的功能。

<picture>
    <source media="(prefers-color-scheme:dark)" srcset="https://github.com/TransparentLC/dufs-material-assets/assets/47057319/f8488128-ad2b-4f3d-950e-10c2a11ac390">
    <img src="https://github.com/TransparentLC/dufs-material-assets/assets/47057319/094fa2be-afeb-4010-9bec-d014b888b97b">
</picture>

## 已实现/适配的功能

标有✨的是原版前端界面未支持，在本项目中额外添加的功能。

* 文件列表
* URL 路径前缀
* 显示符号链接
* 打包下载
* 文件上传
    * 支持拖拽
* 新建文件夹
* 移动/重命名/删除/编辑文件
* 搜索
* 深色模式
* 响应式设计
* 文本文件预览✨
    * 代码高亮（使用 [prism](https://prismjs.com) 实现）
    * 数学公式渲染（使用 https://i.upmath.me/ 的 API 实现）
    * 支持渲染 Markdown 文件（使用 [Marked](https://marked.js.org/) 实现）
* README 文件展示✨
    * 自动在文件列表下方展示当前目录的 `README.md`、`README.txt` 或 `README` 文件
* 图片查看器
* 视频播放器
    * 使用 `<video>` 标签实现，支持的封装和编码可以参见 [caniuse](https://caniuse.com/?search=video%20format)
* 音乐播放器✨
    * 使用 `<audio>` 标签实现，支持的封装和编码可以参见 [caniuse](https://caniuse.com/?search=audio%20format)
    * 同一目录下音频文件顺序/随机/循环播放
    * 解析并展示标题、艺术家、专辑名称、封面图等元数据（使用 [jsmediatags](https://www.npmjs.com/package/jsmediatags) 实现）
* 自定义页面标题和主题色✨
* 分页展示文件✨
    * 适用于目录内有上千个文件的情况
    * 默认不启用，需要自定义分页大小
* 多语言支持✨
    * 已支持的语言或添加翻译请参见 [`src/i18n.js`](https://github.com/TransparentLC/dufs-material-assets/blob/master/src/i18n.js)

## 使用方法

从 [GitHub Actions](https://github.com/TransparentLC/dufs-material-assets/actions) 或 [nightly.link](https://nightly.link/TransparentLC/dufs-material-assets/workflows/ci/master) 下载前端资源后，假定保存在 `dufs-material-assets` 目录，在启动 dufs 时添加参数 `--assets dufs-material-assets`。

也可以自己构建前端资源。

如果不想单独保存这个项目的前端资源和在每次启动 dufs 时设定 `--assets` 参数，在 Actions 里面也有编译好的、嵌入了这个项目的前端资源（替换了原版的前端资源）的 dufs [二进制文件](https://github.com/TransparentLC/dufs-material-assets/actions/workflows/build-embed.yml)。

<details>

<summary>自定义页面标题、主题色和分页大小</summary>

按照以下指引修改 `index.html` 的 `<script>` 部分：

```js
// 自定义标题
window.__CUSTOM_DOCUMENT_TITLE__ = 'Index of ${path} - Custom title';
window.__CUSTOM_PAGE_TITLE__ = 'Custom title';

// 自定义浅色和深色主题
window.__CUSTOM_THEME__ = {
    light: {
        primary: '#0288d1',
        secondary: '#00b0ff',
    },
    dark: {
        primary: '#026da7',
        secondary: '#008dcc',
    },
};

// 自定义分页大小
window.__CUSTOM_PAGE_SIZE__ = 100;

// 由dufs填充的页面内容，不要修改
window.__INITIAL_DATA__ = __INDEX_DATA__;
window.__DUFS_PREFIX__ = "__ASSETS_PREFIX__";
```

</details>

<details>

<summary>对于开发的补充说明</summary>

```shell
pnpm run dev
pnpm run dufs-api
```

为了方便适配各个功能，`dufs-api` 固定了一些启动 dufs 的参数，与代码中仅在开发模式下会运行的部分对应。

由于 Vite 的 dev server 与 dufs 运行在不同的端口上，dufs 也无法在 HTML 代码的占位符处填充页面内容，开发模式下部分代码的运行效果与实际使用稍微存在一些差异（例如底部的版本号在开发模式下使用 `v0.0.0` 作为模拟；使用访问控制的情况下，实际使用时浏览器会弹出输入用户名和密码的对话框，而在开发模式中不会弹出，此时会使用项目中对于 HTTP 的 Digest 认证的模拟实现）。

</details>

## 截图

<details>

<summary>搜索/响应式设计</summary>

![](https://github.com/TransparentLC/dufs-material-assets/assets/47057319/bbf048b9-5be6-49fe-a9b1-22467575f5be)

</details>

<details>

<summary>文本文件预览</summary>

![](https://github.com/TransparentLC/dufs-material-assets/assets/47057319/5f094480-1e53-4d80-8a5a-56b2db95be23)

</details>

<details>

<summary>图片查看器</summary>

![](https://github.com/TransparentLC/dufs-material-assets/assets/47057319/17119400-d218-4a6d-85dd-3b9fa9e436e1)

</details>

<details>

<summary>视频播放器</summary>

![](https://github.com/TransparentLC/dufs-material-assets/assets/47057319/253dd093-de65-4ffc-8461-6139b23b47a7)

</details>

<details>

<summary>音乐播放器</summary>

![](https://github.com/TransparentLC/dufs-material-assets/assets/47057319/c7852e66-495c-4ec0-86e6-db8a6c316f20)

</details>
