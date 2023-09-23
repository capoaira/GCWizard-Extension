'use strict';

function onError(msg) {
  console.error('GCW Error: ' + msg);
}

function copy2clipboard(text) {
  function oncopy(e) {
    document.removeEventListener('copy', oncopy, true);
    // Hide the event from the page to prevent tampering.
    e.stopImmediatePropagation();

    // Overwrite the clipboard content.
    e.preventDefault();
    e.clipboardData.setData('text/plain', text);
  }
  document.addEventListener('copy', oncopy, true);
  document.execCommand('copy');
}

function sendMessage(tabId, msg) {
  browser.tabs
    .sendMessage(tabId, msg)
    .then((response) => {
      console.log('GCW response: ' + response.response);
    })
    .catch(onError);
}

// Create GCW context menu entry
const GCW_MENU = browser.contextMenus.create({
  id: 'gcw',
  title: browser.i18n.getMessage('extension_name'),
  contexts: ['selection'],
});

const GCW = {};
// Links to Caches, TBs, Bookmarks or GeoTours
GCW.code_for_link = false;
GCW.open_id = 1;
// Links to online Tools
GCW.tools = [
  {
    name: 'alphabetvalues',
    params: [{ name: 'input' }, { name: 'mode', values: ['encode', 'decode'] }],
  },
  {
    name: 'base16',
    params: [{ name: 'input' }, { name: 'mode', values: ['encode', 'decode'] }],
  },
  {
    name: 'base32',
    params: [{ name: 'input' }, { name: 'mode', values: ['encode', 'decode'] }],
  },
  {
    name: 'base58',
    params: [{ name: 'input' }, { name: 'mode', values: ['encode', 'decode'] }],
  },
  {
    name: 'base64',
    params: [{ name: 'input' }, { name: 'mode', values: ['encode', 'decode'] }],
  },
  {
    name: 'base85',
    params: [{ name: 'input' }, { name: 'mode', values: ['encode', 'decode'] }],
  },
  {
    name: 'base91',
    params: [{ name: 'input' }, { name: 'mode', values: ['encode', 'decode'] }],
  },
  {
    name: 'base122',
    params: [{ name: 'input' }, { name: 'mode', values: ['encode', 'decode'] }],
  },
];
GCW.selection;

const ENTRY_OPEN_GCW = browser.contextMenus.create({
  id: 'open_gcw',
  title: browser.i18n.getMessage('open_gcw'),
  contexts: ['selection'],
  parentId: GCW_MENU,
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  // ToDo: Entschlüsseln; einzelne Verschlüsslungen auflisten
  /*if (info.menuItemId == 'encrypt') {
    copy2clipboard(info.selectionText);
    sendMessage(tab.id, { do: 'showPopup', msg: browser.i18n.getMessage('encryption_copied') });
  }
  if (info.menuItemId == 'decrypt') {
    copy2clipboard(info.selectionText);
    sendMessage(tab.id, { do: 'showPopup', msg: browser.i18n.getMessage('decryption_copied') });
  }*/
  // Open in GCW
  if (info.menuItemId.match(/open_gcw/i)) {
    let match = info.menuItemId.match(/open_gcw_(\w+)_(\w+)/i);
    sendMessage(tab.id, { do: 'openGCW', tool: match[1], params: { input: GCW.selection, mode: match[2] } });
  }
  if (info.menuItemId.match(/open\d+/i)) {
    // Open Cache, TB, Bookmark or GeoTour
    sendMessage(tab.id, { do: 'openLink', href: 'https://coord.info/' + GCW.code_for_link });
  }
  // Remove option to open caches, TBs, Bookmarks or GeoTours
  if (GCW.code_for_link !== false) {
    browser.contextMenus.remove('open' + GCW.open_id);
    GCW.open_id++;
    GCW.code_for_link = false;
    browser.contextMenus.refresh();
  }
});

function handleMessage(request, sender, sendResponse) {
  GCW.selection = request.selection;
  if (request.do === 'contextmenu') {
    for (let i = 0; i < GCW.tools.length; i++) {
      const tool = GCW.tools[i];
      console.log('tool', i, tool);
      const ENTRY = browser.contextMenus.create({
        id: tool.name,
        title: browser.i18n.getMessage(tool.name),
        contexts: ['selection'],
        parentId: ENTRY_OPEN_GCW,
      });
      for (let j = 0; j < tool.params[1].values.length; j++) {
        const mode = tool.params[1].values[j];
        browser.contextMenus.create({
          id: `open_gcw_${tool.name}_${mode}`,
          title: browser.i18n.getMessage(mode),
          contexts: ['selection'],
          parentId: tool.name,
        });
      }
    }
    // Open Caches, TBs, Bookmarks and GeoTours
    if (request.selection.match(/(GC|TB|BM|GT)[A-Z0-9]+/i)) {
      let type = 'gc';
      if (request.selection.match(/TB[A-Z0-9]+/i)) type = 'tb';
      if (request.selection.match(/BM[A-Z0-9]+/i)) type = 'bm';
      if (request.selection.match(/GT[A-Z0-9]+/i)) type = 'gt';
      GCW.code_for_link = request.selection.match(/(GC|TB|BM|GT)[A-Z0-9]+\b/i)[0];
      browser.contextMenus.create({
        id: 'open' + GCW.open_id,
        title: browser.i18n.getMessage('open_' + type),
        contexts: ['selection'],
        parentId: GCW_MENU,
      });
      browser.contextMenus.refresh();
      return Promise.resolve({ response: 'add open ' + GCW.code_for_link });
    }
    browser.contextMenus.refresh();
    return Promise.resolve({ response: 'add tool' });
  }
  return Promise.resolve({ response: 'did nothing' });
}

browser.runtime.onMessage.addListener(handleMessage);
