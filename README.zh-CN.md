# Custom Buttons for VS Code

一个可以在 VS Code 中创建自定义按钮，并绑定任意已注册 VS Code Command 的扩展喵。

## 功能

- 创建自定义按钮喵
- 绑定任意 VS Code Command ID 喵
- 支持按钮文字和 Codicon 图标喵
- 支持 Tooltip 提示喵
- 支持传递命令参数喵
- 支持按钮优先级和启用状态喵
- 支持通过命令面板交互式添加和删除按钮喵
- 配置修改后自动重新加载按钮喵
- 内置“切换当前编辑器只读状态”预设喵

## 支持的位置

当前支持以下位置喵：

| 配置值 | 位置 | 说明 |
| --- | --- | --- |
| `statusBarLeft` | 底部状态栏左侧 | 完全动态创建喵 |
| `statusBarRight` | 底部状态栏右侧 | 完全动态创建喵 |
| `editorTitle` | 编辑器 / 标签栏右侧工具栏 | 通过预注册槽位实现喵 |
| `viewTitle` | View 标题工具栏 | 通过预注册槽位实现喵 |
| `debugToolbar` | Debug 工具栏 | 通过预注册槽位实现喵 |

## VS Code API 限制

VS Code 当前没有提供受支持的 API，让扩展把任意 Command Button 直接插入以下区域喵：

- 最顶部的 File / Edit / Selection / View / Go / Run / Terminal / Help 主菜单栏喵
- 左侧 Activity Bar 作为普通命令按钮喵

Activity Bar 只支持扩展贡献 View Container，而不是普通点击执行 Command 的按钮喵。

另外，`editor/title`、`view/title`、`debug/toolBar` 等菜单位置必须预先在 `package.json` 中声明，无法在运行时真正动态新增 Contribution 喵。

因此本扩展为这些位置预注册了固定数量的 Slot，再把用户配置动态映射到这些 Slot 中喵。

## 默认只读切换预设

扩展默认包含一个只读切换按钮喵：

```json
{
  "id": "toggle-readonly",
  "text": "$(lock) Readonly",
  "tooltip": "Toggle active editor readonly in this session",
  "command": "workbench.action.files.toggleActiveEditorReadonlyInSession",
  "location": "statusBarRight",
  "priority": 100,
  "enabled": true
}
```

它调用的是 VS Code 自带的命令喵：

```text
workbench.action.files.toggleActiveEditorReadonlyInSession
```

也可以在命令面板运行喵：

```text
Custom Buttons: Add Readonly Toggle Preset
```

## 不修改 JSON 添加按钮

在命令面板中运行喵：

```text
Custom Buttons: Add Custom Button
```

然后依次进行以下操作喵：

1. 从 VS Code 当前已经注册的 Command ID 中选择一个命令喵
2. 输入按钮显示文字喵
3. 选择按钮显示位置喵

扩展会自动保存到 VS Code 的全局用户配置中喵。

## 手动配置

可以直接在 `settings.json` 中配置喵：

```json
{
  "customButtons.buttons": [
    {
      "id": "readonly",
      "text": "$(lock) Readonly",
      "tooltip": "Toggle readonly",
      "command": "workbench.action.files.toggleActiveEditorReadonlyInSession",
      "location": "statusBarRight",
      "priority": 100,
      "enabled": true
    },
    {
      "id": "format",
      "text": "$(wand) Format",
      "tooltip": "Format current document",
      "command": "editor.action.formatDocument",
      "location": "editorTitle",
      "enabled": true
    }
  ]
}
```

## 可用命令

扩展当前提供以下命令喵：

- `Custom Buttons: Add Custom Button` 喵
- `Custom Buttons: Remove Custom Button` 喵
- `Custom Buttons: Run Custom Button` 喵
- `Custom Buttons: Reload Custom Buttons` 喵
- `Custom Buttons: Edit Button Configuration` 喵
- `Custom Buttons: Add Readonly Toggle Preset` 喵

## 本地开发

安装依赖喵：

```bash
npm install
```

编译 TypeScript 喵：

```bash
npm run compile
```

在 VS Code 中按 `F5` 可以启动 Extension Development Host 进行调试喵。

## 打包 VSIX

本地可以运行喵：

```bash
npm run package
```

生成的 `.vsix` 文件可以通过 VS Code 的以下功能安装喵：

```text
Extensions: Install from VSIX...
```

## GitHub Actions 自动构建

仓库中已经包含喵：

```text
.github/workflows/build-vsix.yml
```

在以下情况下会自动构建 VSIX 喵：

- 推送影响扩展代码的内容到 `main` 分支喵
- 在 GitHub Actions 页面手动运行 `Build VSIX` Workflow 喵

构建完成后可以进入喵：

```text
GitHub
→ Actions
→ Build VSIX
→ 对应的构建记录
→ Artifacts
→ custom-buttons-vsix
```

下载压缩包后即可获得实际可安装的 `.vsix` 扩展文件喵。

生成文件名类似喵：

```text
custom-buttons-v0.2.0.vsix
```

## License

MIT 喵。
