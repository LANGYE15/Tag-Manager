import * as vscode from 'vscode';
import { TagManager } from './TagManager';

export class WebviewManager {
  private panel: vscode.WebviewPanel | undefined;
  private tagManager: TagManager;

  constructor(extensionUri: vscode.Uri, tagManager: TagManager) {
    this.tagManager = tagManager;
  }

  // show webview
  show() {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'tagManager',
        'Tag Manager',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true, // retain Webview state
        }
      );

      this.panel.webview.html = this.getWebviewContent(this.getStyle());
      this.panel.onDidDispose(() => (this.panel = undefined));
      // listen Webview close event
      this.panel.onDidDispose(() => {
        this.panel = undefined; // clear panel reference
        this.tagManager.saveTags();
      });

      // listen Webview message
      this.panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.type) {
          case 'search':
            vscode.commands.executeCommand('search.action.openNewEditor', {
              query: message.pattern,
              isRegex: true,
              triggerSearch: true
            });
            vscode.commands.executeCommand('toggleSearchEditorRegex');
            vscode.commands.executeCommand('toggleSearchEditorContextLines', { lines: 0 });
            break;
          case 'delete':
            this.tagManager.deleteTag(message.name);
            this.refresh();
            break;
          case 'add':
            const success = this.tagManager.addTag(message.tag);
            if (!success) {
              vscode.window.showErrorMessage('tag-name exists already.');
            } else {
              this.refresh();
            }
            break;
          case 'update':
            this.tagManager.updateTag(message.name, message.tag);
            break;
          case 'export':
            const tags = this.tagManager.exportTags();
            this.panel?.webview.postMessage({ type: 'exportData', data: tags });
            break;
          case 'import':
            await this.tagManager.importTags();
            this.refresh();
            break;
          case 'debug':
            vscode.window.showInformationMessage(message.data);
            break;
        }
      });
    }
    this.panel.reveal();
  }

  // refresh Webview content
  refresh() {
    if (this.panel) {
      this.panel.webview.html = this.getWebviewContent(this.getStyle());
    }
  }

  getStyle() {
    const style = `
      body {
        font-family: var(--vscode-editor-font-family);
        font-size: var(--vscode-editor-font-size);
        font-weight: var(--vscode-font-weight);
        background-color: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        margin: 0;
        padding: 10px;
      }

      input {
        width: 100%;
        font-family: var(--vscode-editor-font-family);
        font-size: var(--vscode-editor-font-size);
        height: calc(var(--vscode-editor-font-size) + 10px);
        background-color: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        padding-left: 5px;
      }

      button {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: 1px solid var(--vscode-button-border);
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        border-radius: 2px;
        cursor: pointer;
        padding: 5px 10px;
      }

      button:hover {
        background-color: var(--vscode-button-hoverBackground);
      }

      button:active {
        background-color: var(--vscode-button-background);
        opacity: 0.8;
      }

      input::placeholder {
        color: var(--vscode-input-placeholderForeground);
        font-family: var(--vscode-editor-font-family);
        font-size: var(--vscode-editor-font-size);
      }

      input:focus {
        border-color: var(--vscode-input-border);
        outline-color: var(--vscode-input-border);
      }

      .highlight {
        background-color: var(--vscode-editor-findMatchHighlightBackground);
        color: var(--vscode-editor-foreground);
      }

      .tags-container {
        display: flex;
        flex-direction: column;
        gap: 0rem;
        background-color:var(--vscode-div-background);
        outline: 0px;
      }

      .tag-item {
        display: grid;
        grid-template-columns: 30fr 70fr 5fr;
        gap: 0rem;
        align-items: center;
        border: 0px;
        padding: 0rem;
        border-radius: 2px;
        margin-top: 5px;
      }

      .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
      }

      .tag {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .description {
        grid-column: 1 / -1;
        white-space: pre-line;
        word-break: break-word;
        color: var(--vscode-input-placeholderForeground);
      }

      .hidden {
        display: none;
      }

      [contenteditable="true"]:focus {
        outline: 0px;
        background-color: var(--vscode-div-background);
      }

      .edit {
        background-color: var(--vscode-input-background);
        margin-top: 5px;
        padding: 5px;
        color: var(--vscode-input-placeholderForeground);
        cursor: text;
      }

      // #pagination {
      //   display: flex;
      //   justify-content: center;
      //   align-items: center; 
      //   gap: 10px; 
      //   margin-top: 20px; 
      // }
    `;
    return style;
  }

  // get Webview HTML content
  private getWebviewContent(style: string): string {
    const tags = this.tagManager.getTags();

    return `
      <html>
        <head>
          <style>
            ${style}
          </style>
        </head>
        <body>
          <input type="text" id="search" placeholder="Search..." />
          <div class="tag-item edit">
            <div id="name" class="name edit div-hint" contenteditable="true">input your tag-name</div>
            <div id="tag" class="tag edit div-hint" contenteditable="true">input your tag-content</div>
            <button class="description-button" onclick="addTag()">Add</button>
            <div id="description" class="description edit div-hint" contenteditable="true">input your tag-description, this may very long.</div>
          </div>
          <div id="tags" class="tags-container">
          </div>
          <div id="pagination">
            <button onclick="prevPage()">Previous</button>
            <span id="pageInfo"></span>
            <button onclick="nextPage()">Next</button>
            <button onclick="importTags()">Import</button>
            <button onclick="exportTags()">Export</button>
          </div>
          
          <script type="text/javascript">
            const vscode = acquireVsCodeApi();
            let tags = ${JSON.stringify(tags)};
            let currentPage = 1;
            const pageSize = 1000;
            let displayTagsLength = tags.length;

            function highlightText(text, keyword) {
              if (!keyword) return text;
              const regex = new RegExp(\`(\${keyword})\`, 'gi');
              return text.replace(regex, '<span class="highlight">$1</span>');
            }

            function renderTags(query = '') {
              // vscode.postMessage({ type: 'debug', data: 'render tags...' });
              const filteredTags = query ? tags.filter(tag =>
                tag.name.includes(query) ||
                tag.description.includes(query) ||
                tag.tag.includes(query)
              ) : tags;
              displayTagsLength = filteredTags.length;
              if (query) {
                currentPage = 1;
              }
              const start = (currentPage - 1) * pageSize;
              const end = start + pageSize;
              const pageTags = filteredTags.slice(start, end);
              const tagList = pageTags.map(tag => \`
                <div class="tag-item">
                  <div class="name" contenteditable="false" onclick="toggleContent(this)" ondblclick="searchWithTag(this)" >\${highlightText(tag.name, query)}</div>
                  <div class="tag" contenteditable="true" oninput="updateTag('\${tag.name}', 'tag', this.innerText)">\${highlightText(tag.tag, query)}</div>
                  <button class="delete-button" onclick="deleteTag('\${tag.name}')">Delete</button>
                  <div class="description hidden" contenteditable="true" oninput="updateTag('\${tag.name}', 'description', this.innerText)">\${highlightText(tag.description, query)}</div>
                </div>
              \`).join('');
              document.getElementById('tags').innerHTML = tagList;
              document.getElementById('pageInfo').innerText = \`Page \${currentPage} of \${Math.ceil(filteredTags.length / pageSize)}\`;
            }

            function addTag() {
              const name = document.getElementById('name').innerText;
              const tag = document.getElementById('tag').innerText;
              const tempDescription = document.getElementById('description').innerText;

              if (name && tag && tempDescription) {
                const description = tempDescription.replaceAll('<div>','\\n').replaceAll('</div>','').replaceAll('<br>','\\n');
                const newTag = {  name, tag, description };
                vscode.postMessage({ type: 'add', tag: newTag });
                document.getElementById('name').innerText = '';
                document.getElementById('tag').innerText = '';
                document.getElementById('description').innerText = '';
                renderTags();
              } else {
                vscode.postMessage({ type: 'error', message: 'All fields are required!' });
              }
            }

            function updateTag(name, field, value) {
              const tag = tags.find(tag => tag.name === name);
              if (tag) {
                tag[field] = value;
                vscode.postMessage({ type: 'update', name: name, tag: tag });
              }
            }

            function deleteTag(name) {
              // tags = tags.filter(tag => tag.name !== name);
              vscode.postMessage({ type: 'delete', name: name });
              renderTags();
            }

            function prevPage() {
              if (currentPage > 1) {
                currentPage--;
                renderTags();
              }
            }

            function nextPage() {
              if (currentPage < Math.ceil(displayTagsLength / pageSize)) {
                currentPage++;
                renderTags();
              }
            }
            function exportTags() {
              vscode.postMessage({ type: 'export' });
            }

            function importTags() {
              vscode.postMessage({ type: 'import' });
            }

            document.getElementById('search').addEventListener('input', (e) => {
              renderTags(e.target.value);
            });

            const hintDivs = document.querySelectorAll('.div-hint');

            hintDivs.forEach(div => {
              const initialContent = div.textContent;

              // clear text when user click div
              div.addEventListener('focus', () => {
                if (div.textContent === initialContent) {
                  div.textContent = ''; 
                }
              });

              // recover text content when user click other place
              div.addEventListener('blur', () => {
                if (div.textContent.trim() === '') {
                  div.textContent = initialContent;
                }
              });
            });

            // display/hide description
            function toggleContent(nameDiv) {
              const parent = nameDiv.parentElement;
              const descriptionDiv = parent.querySelector('.description');
              descriptionDiv.classList.toggle("hidden");
            }

            function searchWithTag(nameDiv) {
              const parent = nameDiv.parentElement;
              const tagDiv = parent.querySelector('.tag');
              vscode.postMessage({ type: 'search', pattern: tagDiv.innerText });
            }

            renderTags();
          </script>
        </body>
      </html>
    `;
  }

}