import * as vscode from 'vscode';
import { TagManager } from './TagManager';
import { WebviewManager } from './WebviewManager';

let tagManager: TagManager;
let webviewManager: WebviewManager;

export function activate(context: vscode.ExtensionContext) {
  // init TagManager
  tagManager = new TagManager(context.globalState);

  // init WebviewManager
  webviewManager = new WebviewManager(context.extensionUri, tagManager);

  // register command, open tag manager
  context.subscriptions.push(
    vscode.commands.registerCommand('tagManager.open', () => {
      webviewManager.show();
    })
  );

  // register command：add regex from selection
  context.subscriptions.push(
    vscode.commands.registerCommand('tagManager.addFromSelection', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (selectedText) {
          tagManager.addTag({
            name: `New Tag ${tagManager.getTags().length + 1}`,
            description: '',
            tag: selectedText,
          });
          webviewManager.refresh();
          webviewManager.show();
        }
      }
    })
  );

  // register right key menu
  context.subscriptions.push(
    vscode.commands.registerCommand('tagManager.addFromContextMenu', (uri, selections) => {
      const selectedText = selections[0].text;
      if (selectedText) {
        tagManager.addTag({
          name: `New Tag ${tagManager.getTags().length + 1}`,
          description: '',
          tag: selectedText,
        });
        webviewManager.refresh();
        webviewManager.show();
      }
    })
  );
}

export function deactivate() {}

