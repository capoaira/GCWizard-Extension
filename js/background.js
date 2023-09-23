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
var gcw = browser.contextMenus.create({
  id: 'gcw',
  title: browser.i18n.getMessage('extension_name'),
  contexts: ['selection'],
});

browser.contextMenus.create({
  id: 'encrypt',
  title: browser.i18n.getMessage('encrypt'),
  contexts: ['selection'],
  parentId: gcw,
});

browser.contextMenus.create({
  id: 'decrypt',
  title: browser.i18n.getMessage('decrypt'),
  contexts: ['selection'],
  parentId: gcw,
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  // ToDo: Entschlüsseln; einzelne Verschlüsslungen auflisten
  if (info.menuItemId == 'encrypt') {
    copy2clipboard(info.selectionText);
    sendMessage(tab.id, { do: 'showPopup', msg: browser.i18n.getMessage('encryption_copied') });
  }
  if (info.menuItemId == 'decrypt') {
    copy2clipboard(info.selectionText);
    sendMessage(tab.id, { do: 'showPopup', msg: browser.i18n.getMessage('decryption_copied') });
  }
  if (info.menuItemId.match(/open\d+/i)) {
    sendMessage(tab.id, { do: 'openLink', href: 'https://coord.info/' + GCW.code_for_link });
  }
});

var GCW = {};
GCW.code_for_link = false;
GCW.open_id = 1;
function handleMessage(request, sender, sendResponse) {
  if (GCW.code_for_link !== false) {
    browser.contextMenus.remove('open' + GCW.open_id);
    GCW.open_id++;
    GCW.code_for_link = false;
    browser.contextMenus.refresh();
  }
  if (request.do === 'contextmenu' && request.selection.match(/(GC|TB|BM|GT)[A-Z0-9]+/i)) {
    let type = 'gc';
    if (request.selection.match(/TB[A-Z0-9]+/i)) type = 'tb';
    if (request.selection.match(/BM[A-Z0-9]+/i)) type = 'bm';
    if (request.selection.match(/GT[A-Z0-9]+/i)) type = 'gt';
    GCW.code_for_link = request.selection.match(/(GC|TB|BM|GT)[A-Z0-9]+/i)[0];
    browser.contextMenus.create({
      id: 'open' + GCW.open_id,
      title: browser.i18n.getMessage('open_' + type),
      contexts: ['selection'],
      parentId: gcw,
    });
    browser.contextMenus.refresh();
    return Promise.resolve({ response: 'add open ' + GCW.code_for_link });
  }
  return Promise.resolve({ response: 'did nothing' });
}

browser.runtime.onMessage.addListener(handleMessage);
