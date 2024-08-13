const GCW = {};

/* Storage */
GCW.setVal = async (key, val) =>
  browser.storage.local.set(Object.fromEntries([[key, val]]));

GCW.getVal = async (key, defaultVal) =>
  new Promise((resolve) =>
    browser.storage.local
      .get(key)
      .then((val) => resolve(val[key] || defaultVal))
  );

/* Localisation */
GCW.i18n = (msg) => browser.i18n.getMessage(msg) || msg;

/* Popup */
GCW.showPopup = (msg = '', time = 500) => {
  $('#gcw_popup_msg').html(msg);
  $('#gcw_popup').fadeIn(500).delay(time).fadeOut(500);
};

/* Toggle */
GCW.buildToggle = async (id, label, info = '') => `
    <label>${label}
      <input type="checkbox" id="${id}" ${(await GCW.getVal(id)) ? ' checked' : ''}>
      <span class="slider"></span>
    </label>
    ${
      info != ''
        ? `<label for="${id}_info" class="gcw_btn_info"> ?</label>
            <input type="checkbox" id="${id}_info" class="gcw_info">
            <div class="gcw_info_text">
              ${info}
            </div>`
        : ''
    }`;

/* Helper functions and const variabels */
String.prototype.toHtmlEntities = function () {
  return this.replace(
    /[\u00A0-\u9999<>\&]/g,
    (i) => '&#' + i.charCodeAt(0) + ';'
  );
};

// Thanks to the GClh
String.prototype.decodeUnicodeURIComponent = function () {
  const unicodeToChar = (text) =>
    text.replace(/%u[\dA-F]{4}/gi, (match) =>
      String.fromCharCode(parseInt(match.replace(/%u/g, ''), 16))
    );

  return decodeURIComponent(unicodeToChar(this));
};
