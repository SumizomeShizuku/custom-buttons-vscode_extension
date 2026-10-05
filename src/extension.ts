import * as vscode from 'vscode';

/**
 * Configuration structure for one user-defined status bar button.
 */
interface CustomButtonConfig {
    /** Unique identifier used internally by this extension. */
    id: string;

    /** Visible status bar text. Codicons such as "$(lock)" are supported. */
    text: string;

    /** Optional hover text shown for the button. */
    tooltip?: string;

    /** VS Code command ID executed when the button is clicked. */
    command: string;

    /** Optional positional arguments passed to the target command. */
    arguments?: unknown[];

    /** Side of the status bar where the button is displayed. */
    alignment?: 'left' | 'right';

    /** Position priority inside the selected status bar side. */
    priority?: number;

    /** Whether the button should currently be created and shown. */
    enabled?: boolean;
}

/**
 * Runtime representation of a configured button.
 */
interface RuntimeButton {
    /** Original configuration used to create the status bar item. */
    config: CustomButtonConfig;

    /** VS Code status bar item owned by this extension. */
    item: vscode.StatusBarItem;
}

/** Active custom status bar buttons currently managed by the extension. */
let runtimeButtons: RuntimeButton[] = [];

/**
 * Activates the extension.
 *
 * The extension loads configured buttons, watches for settings changes,
 * and registers helper commands used by the editor-title launcher.
 *
 * @param context VS Code extension context used to register disposables.
 */
export function activate(context: vscode.ExtensionContext): void {
    const reloadDisposable = vscode.commands.registerCommand(
        'customButtons.reload',
        () => reloadButtons(context)
    );

    const editConfigurationDisposable = vscode.commands.registerCommand(
        'customButtons.editConfiguration',
        async () => {
            // Open the Settings UI directly at this extension's button configuration.
            await vscode.commands.executeCommand(
                'workbench.action.openSettings',
                '@ext:sumizomeshizuku.custom-buttons customButtons.buttons'
            );
        }
    );

    const openCommandPickerDisposable = vscode.commands.registerCommand(
        'customButtons.openCommandPicker',
        () => showButtonPicker()
    );

    const configurationDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
        // Rebuild buttons immediately when the user edits customButtons.buttons.
        if (event.affectsConfiguration('customButtons.buttons')) {
            reloadButtons(context);
        }
    });

    context.subscriptions.push(
        reloadDisposable,
        editConfigurationDisposable,
        openCommandPickerDisposable,
        configurationDisposable
    );

    reloadButtons(context);
}

/**
 * Deactivates the extension and removes all status bar items.
 */
export function deactivate(): void {
    disposeRuntimeButtons();
}

/**
 * Rebuilds all status bar buttons from the current VS Code configuration.
 *
 * @param context VS Code extension context that owns created status bar items.
 */
function reloadButtons(context: vscode.ExtensionContext): void {
    disposeRuntimeButtons();

    const configuration = vscode.workspace.getConfiguration('customButtons');
    const configuredButtons = configuration.get<CustomButtonConfig[]>('buttons', []);

    const usedIds = new Set<string>();

    for (const buttonConfig of configuredButtons) {
        // Ignore disabled entries without creating any VS Code UI object.
        if (buttonConfig.enabled === false) {
            continue;
        }

        // Invalid entries are skipped so one bad setting does not break all buttons.
        if (!isValidButtonConfig(buttonConfig)) {
            console.warn('[Custom Buttons] Ignoring invalid button configuration:', buttonConfig);
            continue;
        }

        // Duplicate IDs are ambiguous and therefore skipped after the first occurrence.
        if (usedIds.has(buttonConfig.id)) {
            console.warn(`[Custom Buttons] Duplicate button id ignored: ${buttonConfig.id}`);
            continue;
        }
        usedIds.add(buttonConfig.id);

        const alignment = buttonConfig.alignment === 'left'
            ? vscode.StatusBarAlignment.Left
            : vscode.StatusBarAlignment.Right;

        const item = vscode.window.createStatusBarItem(
            `customButtons.${buttonConfig.id}`,
            alignment,
            buttonConfig.priority ?? 0
        );

        item.name = `Custom Button: ${buttonConfig.id}`;
        item.text = buttonConfig.text;
        item.tooltip = buttonConfig.tooltip ?? `Run command: ${buttonConfig.command}`;

        // A Command object lets configuration pass arbitrary command arguments.
        item.command = {
            title: buttonConfig.tooltip ?? buttonConfig.text,
            command: buttonConfig.command,
            arguments: buttonConfig.arguments
        };

        item.show();

        runtimeButtons.push({
            config: buttonConfig,
            item
        });

        // Register every created item for automatic cleanup when VS Code unloads the extension.
        context.subscriptions.push(item);
    }
}

/**
 * Opens a Quick Pick containing every currently visible custom button.
 *
 * This command is also exposed as the fixed editor-title toolbar button because
 * VS Code does not provide a runtime API for dynamically adding arbitrary
 * editor-title menu entries from user configuration.
 */
async function showButtonPicker(): Promise<void> {
    if (runtimeButtons.length === 0) {
        const action = await vscode.window.showInformationMessage(
            'No Custom Buttons are configured.',
            'Open Settings'
        );

        if (action === 'Open Settings') {
            await vscode.commands.executeCommand('customButtons.editConfiguration');
        }
        return;
    }

    const selected = await vscode.window.showQuickPick(
        runtimeButtons.map(({ config }) => ({
            label: config.text,
            description: config.tooltip,
            detail: config.command,
            config
        })),
        {
            title: 'Custom Buttons',
            placeHolder: 'Select a configured button to run its command'
        }
    );

    if (!selected) {
        return;
    }

    // Execute the configured command exactly as the status bar button would.
    await vscode.commands.executeCommand(
        selected.config.command,
        ...(selected.config.arguments ?? [])
    );
}

/**
 * Validates the minimum fields required to create a functional button.
 *
 * @param value Candidate configuration object read from VS Code settings.
 * @returns true when the object contains non-empty id, text, and command strings.
 */
function isValidButtonConfig(value: CustomButtonConfig): boolean {
    return typeof value?.id === 'string'
        && value.id.trim().length > 0
        && typeof value.text === 'string'
        && value.text.trim().length > 0
        && typeof value.command === 'string'
        && value.command.trim().length > 0;
}

/**
 * Disposes every runtime-created status bar item and clears the local registry.
 */
function disposeRuntimeButtons(): void {
    for (const runtimeButton of runtimeButtons) {
        runtimeButton.item.dispose();
    }

    runtimeButtons = [];
}
