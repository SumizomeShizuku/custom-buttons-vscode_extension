[简体中文](./README.zh-CN.md)
# Custom Buttons for VS Code

Create configurable buttons in VS Code and bind them to any registered VS Code command.

## Supported locations

- Bottom status bar, left side
- Bottom status bar, right side
- Editor toolbar / tab area right side
- View title toolbar
- Debug toolbar

Status bar buttons are fully dynamic and support custom text plus Codicons such as `$(lock)`.

Toolbar locations are implemented with pre-registered slots because VS Code menu contribution points are declared statically in `package.json`. Each toolbar location currently provides 10 configurable slots.

## API limitations

VS Code does not currently expose a supported API for extensions to insert arbitrary command buttons directly into:

- the top-level File / Edit / Selection / View / Go / Run / Terminal / Help menu bar
- the Activity Bar as arbitrary executable buttons

The Activity Bar supports contributed View Containers, not arbitrary command buttons.

## Default readonly preset

The extension ships with a default button:

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

You can also run:

`Custom Buttons: Add Readonly Toggle Preset`

from the Command Palette.

## Add a button without editing JSON

Run:

`Custom Buttons: Add Custom Button`

Then:

1. Select any registered VS Code command ID.
2. Enter the button text.
3. Select the target location.

The configuration is saved to the user's global VS Code settings.

## Manual configuration

Example:

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

## Available locations

| Value | Location | Dynamic appearance |
| --- | --- | --- |
| `statusBarLeft` | Bottom status bar, left | Yes |
| `statusBarRight` | Bottom status bar, right | Yes |
| `editorTitle` | Editor toolbar / tab area right | Command binding is dynamic; toolbar icon/title uses a pre-registered slot |
| `viewTitle` | View title toolbar | Command binding is dynamic; toolbar icon/title uses a pre-registered slot |
| `debugToolbar` | Debug toolbar | Command binding is dynamic; toolbar icon/title uses a pre-registered slot |

## Commands

- `Custom Buttons: Add Custom Button`
- `Custom Buttons: Remove Custom Button`
- `Custom Buttons: Run Custom Button`
- `Custom Buttons: Reload Custom Buttons`
- `Custom Buttons: Edit Button Configuration`
- `Custom Buttons: Add Readonly Toggle Preset`

## Development

```bash
npm install
npm run compile
```

Press `F5` in VS Code to launch an Extension Development Host.

To package a VSIX:

```bash
npm run package
```

## License

MIT
