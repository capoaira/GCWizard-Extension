'use strict';

/**
 * Outputs an error message to the Web console
 * @param {string} msg
 */
const onError = (msg) => {
  console.error('GCW Error: ' + msg);
};

/**
 * Copy text to clipboard
 * @param {string} text
 */
// eslint-disable-next-line no-unused-vars
const copy2clipboard = (text) => {
  const oncopy = (e) => {
    document.removeEventListener('copy', oncopy, true);
    // Hide the event from the page to prevent tampering.
    e.stopImmediatePropagation();

    // Overwrite the clipboard content.
    e.preventDefault();
    e.clipboardData.setData('text/plain', text);
  };
  document.addEventListener('copy', oncopy, true);
  document.execCommand('copy');
};

/**
 * Sends a massage to to
 * @param {?} tabId
 * @param {string} msg
 */
const sendMessage = (tabId, msg) => {
  browser.tabs
    .sendMessage(tabId, msg)
    .then((response) => {
      console.info('GCW response: ' + response.response);
    })
    .catch(onError);
};

/**
 * Handels Messages from the content script
 *
 * @param {?} request
 * @param {?} _sender
 * @param {?} _sendResponse
 * @returns The completed action
 */
const handleMessage = (request, _sender, _sendResponse) => {
  GCW.selection = request.selection;
  if (request.do === 'contextmenu') {
    if (request.selection.match(/(GC|TB|BM|GT)[A-Z0-9]+/i)) {
      browser.contextMenus.create({
        id: 'open_with_gcw',
        title: GCW.i18n('open_gcw'),
        contexts: ['selection'],
        parentId: 'gcw',
      });
      browser.contextMenus.refresh();
    }
    const parentId = request.selection.match(/(GC|TB|BM|GT)[A-Z0-9]+/i)
      ? 'open_with_gcw'
      : 'gcw';
    let subMenus = {};
    // Create Menuentries for tools
    for (const tool of GCW.tools) {
      let [toolName, val] = Object.entries(tool)[0];
      toolName = toolName.split('/')[1];
      // Test if there is a supercategory (like base or rotation)
      if (toolName.includes('_')) {
        const superCat = toolName.split('_')[0];
        if (!subMenus[superCat]) {
          // No? => Create
          const sc = browser.contextMenus.create({
            id: superCat,
            title: GCW.i18n(superCat),
            contexts: ['selection'],
            parentId: parentId,
          });
          browser.contextMenus.refresh();
          subMenus[superCat] = sc;
        }
      }
      // Create Tool entry
      const entry = browser.contextMenus.create({
        id: `open_gcw-${toolName}`,
        title: GCW.i18n(toolName),
        contexts: ['selection'],
        parentId: toolName.includes('_') ? toolName.split('_')[0] : parentId,
      });
      browser.contextMenus.refresh();
      const params = val['get']['parameters'];
      if (!params) {
        console.error('no params', toolName);
        continue;
      }
      for (const param of params) {
        switch (param.name) {
          case 'mode':
          case 'lang':
            for (const name of param.schema.enum) {
              browser.contextMenus.create({
                id: `open_gcw-${toolName}-${name}`,
                title: GCW.i18n(name),
                contexts: ['selection'],
                parentId: entry,
              });
              browser.contextMenus.refresh();
            }
        }
      }
    }
    // Open Caches, TBs, Bookmarks and GeoTours
    if (request.selection.match(/(GC|TB|BM|GT)[A-Z0-9]+/i)) {
      let type = 'gc';
      if (request.selection.match(/TB[A-Z0-9]+/i)) type = 'tb';
      if (request.selection.match(/BM[A-Z0-9]+/i)) type = 'bm';
      if (request.selection.match(/GT[A-Z0-9]+/i)) type = 'gt';
      GCW.code_for_link = request.selection.match(
        /(GC|TB|BM|GT)[A-Z0-9]+\b/i
      )[0];
      browser.contextMenus.create({
        id: 'open' + GCW.open_id,
        title: GCW.i18n('open_' + type),
        contexts: ['selection'],
        parentId: 'gcw',
      });
      browser.contextMenus.refresh();
    } else {
      // Remove option to open caches, TBs, Bookmarks or GeoTours (If it was added)
      if (GCW.code_for_link !== false) {
        browser.contextMenus.remove('open' + GCW.open_id);
        browser.contextMenus.remove('open_with_gcw');
        GCW.open_id++;
        GCW.code_for_link = false;
        browser.contextMenus.refresh();
      }
    }
  } else if (request.do === 'openTab') {
    browser.storage.local.set({ analyzeData: request.payload });
    browser.tabs.create({ url: request.url });
  }
  browser.contextMenus.refresh();
  return Promise.resolve({ response: 'did nothing' });
};

async function main() {
  // Create GCW context menu entry
  browser.contextMenus.create({
    id: 'gcw',
    title: GCW.i18n('extension_name'),
    contexts: ['selection'],
  });
  browser.contextMenus.refresh();

  // Links to Caches, TBs, Bookmarks or GeoTours
  GCW.code_for_link = false;
  GCW.open_id = 1;
  // Links to online Tools
  const jsonFilePath = browser.runtime.getURL('data/tools.json');
  // Funktion zum Laden der JSON-Datei
  async function loadJSONFile(filePath) {
    try {
      const response = await fetch(filePath);
      const json = await response.json();
      console.info('JSON-Datei loaded:', json);
      return json;
    } catch (error) {
      console.error('Error loading JSON file:', error);
    }
  }
  GCW.tools = await loadJSONFile(jsonFilePath);
  GCW.selection;

  browser.contextMenus.onClicked.addListener((info, tab) => {
    // Open in GCW
    if (info.menuItemId.match(/open_gcw/i)) {
      let options = info.menuItemId.split('-');
      let params = { input: GCW.selection };
      if (options[2]) {
        let key = `/${options[1]}`;
        let tool = GCW.tools
          .filter((tool) => key in tool)
          .map((tool) => tool[key])[0];
        params[tool.get.parameters.mode ? 'mode' : 'lang'] = options[2];
      }
      sendMessage(tab.id, { do: 'openGCW', tool: options[1], params: params });
    }
    if (info.menuItemId.match(/open\d+/i)) {
      // Open Cache, TB, Bookmark or GeoTour
      sendMessage(tab.id, {
        do: 'openLink',
        href: 'https://coord.info/' + GCW.code_for_link,
      });
    }
    // Remove option to open caches, TBs, Bookmarks or GeoTours (If it was added)
    if (GCW.code_for_link !== false) {
      browser.contextMenus.remove('open' + GCW.open_id);
      browser.contextMenus.remove('open_with_gcw');
      GCW.open_id++;
      GCW.code_for_link = false;
      browser.contextMenus.refresh();
    }
  });

  // Messages from content script
  browser.runtime.onMessage.addListener(handleMessage);
}

const GCW = {};
GCW.tools = [];
GCW.selection = '';
GCW.i18n = (msg) => browser.i18n.getMessage(msg) || msg;

main();
