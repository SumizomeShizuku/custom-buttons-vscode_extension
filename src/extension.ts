import * as vscode from 'vscode';

const STATIC_SLOT_COUNT = 10;

type ButtonLocation =
    | 'statusBarLeft'
    | 'statusBarRight'
    | 'editorTitle'
    | 'viewTitle'
    | 'debugToolbar';

/**
 * User configuration for one custom button.
 */
interface CustomButtonConfig {
    /** Unique identifier for this button. */
    id: string;

    /** Visible text. Status bar locations support VS Code Codicons such as "$(lock)". */
    text: string;

    /** Optional hover text. */
    tooltip?: string;

    /** VS Code command ID executed when the button is clicked. */
    command: string;

    /** Optional positional arguments passed to the target command. */
    arguments?: unknown[];

    /** UI location used for this button. */
    location: ButtonLocation;

    /** Ordering priority when the target location supports it. */
    priority?: number;

    /** Whether the button should be active. */
    enabled?: boolean;
}

/**
 * Maps a statically contributed toolbar slot to the user's runtime button configuration.
 */
const staticSlotBindings = new Map<string, CustomButtonConfig>();

/** Runtime-created status bar items. */
let statusBarItems: vscode.StatusBarItem[] = [];

/**
 * Activates the extension and registers all commands.
 *
 * @param context VS Code extension context used to own registered disposables.
 */
export function activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('customButtons.reload', () => reloadButtons()),
        vscode.commands.registerCommand('customButtons.editConfiguration', editConfiguration),
        vscode.commands.registerCommand('customButtons.openCommandPicker', showButtonPicker),
        vscode.commands.registerCommand('customButtons.addButton', addButtonInteractively),
        vscode.commands.registerCommand('customButtons.removeButton', removeButtonInteractively),
        vscode.commands.registerCommand('customButtons.addReadonlyPreset', addReadonlyPreset)
    );

    registerStaticSlotCommands(context);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            // Rebuild all UI immediately after the user edits this extension's settings.
            if (event.affectsConfiguration('customButtons.buttons')) {
                void reloadButtons();
            }
        })
    );

    void reloadButtons();
}

/**
 * Releases runtime-created status bar items.
 */
export function deactivate(): void {
    disposeStatusBarItems();
}

/**
 * Registers the fixed command IDs used by static VS Code toolbar contribution points.
 *
 * VS Code requires toolbar/menu entries to be declared in package.json, so each supported
 * static location receives a finite number of slots. The slots are rebound to user commands
 * every time configuration is reloaded.
 *
 * @param context VS Code extension context used to own command registrations.
 */
function registerStaticSlotCommands(context: vscode.ExtensionContext): void {
    const locations: Exclude<ButtonLocation, 'statusBarLeft' | 'statusBarRight'>[] = [
        'editorTitle',
        'viewTitle',
        'debugToolbar'
    ];

    for (const location of locations) {
        for (let slot = 1; slot <= STATIC_SLOT_COUNT; slot += 1) {
            const commandId = getSlotCommandId(location, slot);

            context.subscriptions.push(
                vscode.commands.registerCommand(commandId, async (...menuArguments: unknown[]) => {
                    const button = staticSlotBindings.get(commandId);
                    if (!button) {
                        return;
                    }

                    // User-defined arguments take precedence. If none are supplied, preserve
                    // contextual arguments provided by VS Code menus such as resource URIs.
                    const argumentsToUse = button.arguments ?? menuArguments;
                    await vscode.commands.executeCommand(button.command, ...argumentsToUse);
                })
            );
        }
    }
}

/**
 * Rebuilds dynamic status bar items and remaps all static toolbar slots.
 */
async function reloadButtons(): Promise<void> {
    disposeStatusBarItems();
    staticSlotBindings.clear();

    const configuration = vscode.workspace.getConfiguration('customButtons');
    const buttons = configuration.get<CustomButtonConfig[]>('buttons', []);
    const enabledButtons = buttons.filter((button) => button.enabled !== false && isValidButtonConfig(button));

    createStatusBarButtons(enabledButtons);
    await bindStaticToolbarButtons(enabledButtons);
}

/**
 * Creates fully dynamic status bar buttons.
 *
 * @param buttons All validated and enabled button configurations.
 */
function createStatusBarButtons(buttons: CustomButtonConfig[]): void {
    for (const button of buttons) {
        if (button.location !== 'statusBarLeft' && button.location !== 'statusBarRight') {
            continue;
        }

        const alignment = button.location === 'statusBarLeft'
            ? vscode.StatusBarAlignment.Left
            : vscode.StatusBarAlignment.Right;

        const item = vscode.window.createStatusBarItem(
            `customButtons.${button.id}`,
            alignment,
            button.priority ?? 0
        );

        item.name = `Custom Button: ${button.id}`;
        item.text = button.text;
        item.tooltip = button.tooltip ?? `Run command: ${button.command}`;
        item.command = {
            title: button.tooltip ?? button.text,
            command: button.command,
            arguments: button.arguments
        };
        item.show();

        statusBarItems.push(item);
    }
}

/**
 * Assigns user buttons to statically contributed toolbar slots.
 *
 * @param buttons All validated and enabled button configurations.
 */
async function bindStaticToolbarButtons(buttons: CustomButtonConfig[]): Promise<void> {
    const locations: Exclude<ButtonLocation, 'statusBarLeft' | 'statusBarRight'>[] = [
        'editorTitle',
        'viewTitle',
        'debugToolbar'
    ];

    for (const location of locations) {
        const locationButtons = buttons.filter((button) => button.location === location);

        for (let slot = 1; slot <= STATIC_SLOT_COUNT; slot += 1) {
            const commandId = getSlotCommandId(location, slot);
            const contextKey = `customButtons.${location}.slot${slot}`;
            const button = locationButtons[slot - 1];

            if (button) {
                staticSlotBindings.set(commandId, button);
            }

            // The package.json menu entry observes this key to show or hide its slot.
            await vscode.commands.executeCommand('setContext', contextKey, Boolean(button));
        }

        if (locationButtons.length > STATIC_SLOT_COUNT) {
            console.warn(
                `[Custom Buttons] ${location} supports up to ${STATIC_SLOT_COUNT} toolbar buttons; extra entries were ignored.`
            );
        }
    }
}

/**
 * Opens VS Code settings focused on this extension.
 */
async function editConfiguration(): Promise<void> {
    await vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:sumizomeshizuku.custom-buttons customButtons.buttons'
    );
}

/**
 * Opens a picker containing all enabled custom buttons and runs the selected command.
 */
async function showButtonPicker(): Promise<void> {
    const buttons = getConfiguredButtons().filter(
        (button) => button.enabled !== false && isValidButtonConfig(button)
    );

    if (buttons.length === 0) {
        const action = await vscode.window.showInformationMessage(
            'No Custom Buttons are configured.',
            'Add Button',
            'Open Settings'
        );

        if (action === 'Add Button') {
            await addButtonInteractively();
        } else if (action === 'Open Settings') {
            await editConfiguration();
        }
        return;
    }

    const selected = await vscode.window.showQuickPick(
        buttons.map((button) => ({
            label: button.text,
            description: button.tooltip,
            detail: `${button.location} · ${button.command}`,
            button
        })),
        {
            title: 'Custom Buttons',
            placeHolder: 'Select a configured button to run'
        }
    );

    if (!selected) {
        return;
    }

    await vscode.commands.executeCommand(
        selected.button.command,
        ...(selected.button.arguments ?? [])
    );
}

/**
 * Interactively creates a button by selecting from all registered VS Code command IDs.
 */
async function addButtonInteractively(): Promise<void> {
    const commandIds = (await vscode.commands.getCommands(true)).sort();
    const command = await vscode.window.showQuickPick(commandIds, {
        title: 'Add Custom Button',
        placeHolder: 'Choose a VS Code command ID',
        matchOnDescription: true
    });

    if (!command) {
        return;
    }

    const text = await vscode.window.showInputBox({
        title: 'Button text',
        prompt: 'Enter button text. Status bar buttons may include Codicons such as $(lock).',
        value: command
    });

    if (!text) {
        return;
    }

    const locationItem = await vscode.window.showQuickPick(
        [
            { label: 'Bottom status bar · Left', value: 'statusBarLeft' as ButtonLocation },
            { label: 'Bottom status bar · Right', value: 'statusBarRight' as ButtonLocation },
            { label: 'Editor / tab title toolbar', value: 'editorTitle' as ButtonLocation },
            { label: 'View title toolbar', value: 'viewTitle' as ButtonLocation },
            { label: 'Debug toolbar', value: 'debugToolbar' as ButtonLocation }
        ],
        {
            title: 'Button location',
            placeHolder: 'Choose where the button should appear'
        }
    );

    if (!locationItem) {
        return;
    }

    const buttons = getConfiguredButtons();
    buttons.push({
        id: createUniqueId(command, buttons),
        text,
        tooltip: `Run command: ${command}`,
        command,
        location: locationItem.value,
        enabled: true
    });

    await saveButtons(buttons);
}

/**
 * Adds the built-in readonly toggle preset requested for this extension.
 *
 * The preset uses VS Code's native session-only readonly toggle command.
 */
async function addReadonlyPreset(): Promise<void> {
    const buttons = getConfiguredButtons();
    const command = 'workbench.action.files.toggleActiveEditorReadonlyInSession';

    if (buttons.some((button) => button.command === command)) {
        void vscode.window.showInformationMessage('A readonly toggle button is already configured.');
        return;
    }

    buttons.push({
        id: createUniqueId('toggle-readonly', buttons),
        text: '$(lock) Readonly',
        tooltip: 'Toggle active editor readonly in this session',
        command,
        location: 'statusBarRight',
        priority: 100,
        enabled: true
    });

    await saveButtons(buttons);
    void vscode.window.showInformationMessage('Readonly toggle preset added.');
}

/**
 * Lets the user select and remove one configured button.
 */
async function removeButtonInteractively(): Promise<void> {
    const buttons = getConfiguredButtons();

    const selected = await vscode.window.showQuickPick(
        buttons.map((button, index) => ({
            label: button.text,
            description: button.command,
            detail: button.location,
            index
        })),
        {
            title: 'Remove Custom Button',
            placeHolder: 'Choose a button to remove'
        }
    );

    if (!selected) {
        return;
    }

    buttons.splice(selected.index, 1);
    await saveButtons(buttons);
}

/**
 * Reads the complete current button configuration.
 *
 * @returns A mutable copy of the configured button array.
 */
function getConfiguredButtons(): CustomButtonConfig[] {
    const configuration = vscode.workspace.getConfiguration('customButtons');
    return [...configuration.get<CustomButtonConfig[]>('buttons', [])];
}

/**
 * Saves button configuration to the user's global VS Code settings.
 *
 * @param buttons Complete replacement button configuration.
 */
async function saveButtons(buttons: CustomButtonConfig[]): Promise<void> {
    const configuration = vscode.workspace.getConfiguration('customButtons');

    await configuration.update(
        'buttons',
        buttons,
        vscode.ConfigurationTarget.Global
    );
}

/**
 * Creates a stable unique ID derived from a command ID.
 *
 * @param base Source text used to create the ID.
 * @param existing Existing buttons that must not share the resulting ID.
 * @returns A unique configuration ID.
 */
function createUniqueId(base: string, existing: CustomButtonConfig[]): string {
    const normalized = base
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'button';

    const existingIds = new Set(existing.map((button) => button.id));
    let candidate = normalized;
    let suffix = 2;

    while (existingIds.has(candidate)) {
        candidate = `${normalized}-${suffix}`;
        suffix += 1;
    }

    return candidate;
}

/**
 * Validates the minimum fields required by a button.
 *
 * @param value Candidate object read from VS Code settings.
 * @returns true when the button can be executed and rendered.
 */
function isValidButtonConfig(value: CustomButtonConfig): boolean {
    const validLocations: ButtonLocation[] = [
        'statusBarLeft',
        'statusBarRight',
        'editorTitle',
        'viewTitle',
        'debugToolbar'
    ];

    return typeof value?.id === 'string'
        && value.id.trim().length > 0
        && typeof value.text === 'string'
        && value.text.trim().length > 0
        && typeof value.command === 'string'
        && value.command.trim().length > 0
        && validLocations.includes(value.location);
}

/**
 * Returns the command ID corresponding to one static toolbar slot.
 *
 * @param location Static toolbar location.
 * @param slot One-based slot number.
 * @returns Registered bridge command ID.
 */
function getSlotCommandId(
    location: Exclude<ButtonLocation, 'statusBarLeft' | 'statusBarRight'>,
    slot: number
): string {
    return `customButtons.slot.${location}.${slot}`;
}

/**
 * Disposes all runtime-created status bar items.
 */
function disposeStatusBarItems(): void {
    for (const item of statusBarItems) {
        item.dispose();
    }

    statusBarItems = [];
}
