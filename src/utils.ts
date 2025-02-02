import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Tag } from './TagManager';

/**
 * generate  ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * read file
 */
export function readFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * write file
 */
export function writeFile(filePath: string, data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, 'utf-8', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * open dialog for file selection, import json file to tags
 */
export async function importTags(tags: any[]): Promise<any[]> {
  const fileUri = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      JSON: ['json'],
    },
  });

  if (fileUri && fileUri[0]) {
    const filePath = fileUri[0].fsPath;
    try {
      const data = await readFile(filePath);
      let newTags: Tag[] = JSON.parse(data);
      newTags.forEach(tag => {
        if(!tags.some(t => t.name === tag.name)){
          tags.unshift(tag);
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import tags: ${error}`);
      return tags;
    }
  }
  return tags;
}

/**
 * open dialog for exporting json file
 */
export async function exportTags(tags: any[]): Promise<void> {
  const fileUri = await vscode.window.showSaveDialog({
    filters: {
      JSON: ['json'],
    },
  });

  if (fileUri) {
    const filePath = fileUri.fsPath;
    try {
      await writeFile(filePath, JSON.stringify(tags, null, 2));
      vscode.window.showInformationMessage(`Tags exported successfully to ${filePath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export tags: ${error}`);
    }
  }
}