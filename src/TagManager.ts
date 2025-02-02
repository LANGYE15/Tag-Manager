import * as vscode from 'vscode';
import {importTags, exportTags} from './utils';


export interface Tag {
  // name as unique-key
  name: string; 
  description: string; 
  // this commons means regex
  tag: string; 
}

export class TagManager {
  private tags: Tag[] = [];
  private storage: vscode.Memento;

  constructor(storage: vscode.Memento) {
    this.storage = storage;
    this.loadTags();
  }

  // load tags from storage
  private loadTags() {
    const savedTags = this.storage.get<Tag[]>('tags', []);
    this.tags = savedTags;
  }

  saveTags() {
    this.storage.update('tags', this.tags);
  }

  getTags(): Tag[] {
    return this.tags;
  }

  addTag(tag: Tag): boolean {
    const exists = this.tags.some(t => t.name === tag.name);
    if (exists) {
      return false;
    }
    this.tags.unshift(tag);
    this.saveTags();
    return true;
  }

  deleteTag(name: string) {
    this.tags = this.tags.filter(tag => tag.name !== name);
    this.saveTags();
  }

  updateTag(name: string, newTag: Tag) {
    this.tags = this.tags.map(tag => (tag.name === name ? newTag : tag));
    this.saveTags();
  }

  searchTags(query: string): Tag[] {
    return this.tags.filter(tag =>
      tag.name.includes(query) ||
      tag.description.includes(query) ||
      tag.tag.includes(query)
    );
  }

  // import tags from json file
  async importTags() {
    this.tags = await importTags(this.tags);
    this.saveTags();
  }

  exportTags() {
    exportTags(this.tags);
  }
}