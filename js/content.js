'use strict';

let $ = window.jQuery;

/** Communicating with the background script */
browser.runtime.onMessage.addListener(getMessage);
function getMessage(data) {
  if (data.do === 'showPopup') {
    GCW.showPopup(data.msg, 1000);
    return Promise.resolve({ response: 'show popup' });
  }
  if (data.do === 'openLink') {
    window.open(data.href);
    return Promise.resolve({ response: 'open ' + data.href });
  }
  return Promise.resolve({ response: 'did nothing' });
}

window.addEventListener('contextmenu', function (e) {
  function handleResponse(message) {
    console.log('GCW response: ' + message.response);
  }
  function handleError(error) {
    console.error('GCW Error: ' + error);
  }
  let selection = window.getSelection().toString();
  let sending = browser.runtime.sendMessage({ do: 'contextmenu', selection: selection });
  sending.then(handleResponse, handleError);
});

/** Helper functions and const variabels */
String.prototype.toHtmlEntities = function () {
  return this.replace(/[\u00A0-\u9999<>\&]/g, function (i) {
    return '&#' + i.charCodeAt(0) + ';';
  });
};

// Thanks to the GClh
String.prototype.decodeUnicodeURIComponent = function () {
  function unicodeToChar(text) {
    return text.replace(/%u[\dA-F]{4}/gi, function (match) {
      return String.fromCharCode(parseInt(match.replace(/%u/g, ''), 16));
    });
  }
  return decodeURIComponent(unicodeToChar(this));
};

// GCW related constants and functions
const GCW = {};

GCW.requestUrl = 'https://gcwizard.net/#/';
GCW.settings = {};
// Because the storage API is asynchronous, the storage is loaded into a non-asynchronous object
GCW.loadSettings = function () {
  function onError(e) {
    console.error('GCW Error: ' + e);
  }
  function onGot(val) {
    // Default values
    GCW.settings['analyze_html_source'] = false;
    GCW.settings['analyze_show_comments'] = false;
    GCW.settings['analyze_html_syntax'] = true;
    // Load values
    for (var key in val) {
      GCW.settings[key] = val[key];
    }
  }
  let gettingItem = browser.storage.local.get();
  gettingItem.then(onGot, onError);
};
GCW.setVal = function (key, val) {
  let obj = {};
  obj[key] = val;
  browser.storage.local.set(obj);
  // Keep the static storage actual
  GCW.settings[key] = val;
};
GCW.getVal = function (key) {
  return GCW.settings[key];
};

GCW.i18n = function (msg) {
  return browser.i18n.getMessage(msg);
};

GCW.showPopup = function (msg = '', time = 500) {
  $('#gcw_popup_msg').html(msg);
  $('#gcw_popup').fadeIn(500).delay(time).fadeOut(500);
};

GCW.buildToggle = function (id, label, info = '') {
  return (
    '<div class="gcw_toggle">' +
    '    <label>' +
    label +
    '        <input type="checkbox" id="' +
    id +
    '"' +
    (GCW.getVal(id) ? ' checked' : '') +
    '><span class="slider"></span>' +
    '    </label>' +
    (info != ''
      ? '    <label for="' +
        id +
        '_info" class="gcw_btn_info"> ?</label>' +
        '    <input type="checkbox" id="' +
        id +
        '_info" class="gcw_info">' +
        '    <div class="gcw_info">' +
        info +
        '</div>'
      : '') +
    '</div>'
  );
};

// Main functions on the cache detail page
GCW.main = function () {
  // Run only on cache detail page
  if (!document.location.href.match(/\.com\/(seek\/cache_details\.aspx|geocache\/)/)) return;

  // Add the Popup
  function addPopup() {
    let html = '<div id="gcw_popup"><span id="gcw_popup_msg">GCW_Popup</span></div>';
    $('body').append(html);
  }
  addPopup();

  // Add Sidebar
  function addSidebar() {
    let html =
      '<div class="CacheDetailNavigationWidget TopSpacing BottomSpacing">' +
      '    <h3 class="WidgetHeader">' +
      GCW.i18n('extension_name') +
      '</h3>' +
      '    <div class="WidgetBody">' +
      "        <a href=\"javascript:void(0)\" onclick=\"$('#gcw_analyze').show('slow');$('#aspnetForm').hide('slow');\">" +
      GCW.i18n('analyze') +
      '</a>' +
      '    </div>' +
      '</div>';
    $('.CacheDetailNavigation.NoPrint').after(html);
  }
  addSidebar();

  // Add analyze
  function addAnalyzePage() {
    // Helper functions for analyze Cache Description
    function toggelHtml() {
      GCW.setVal('analyze_html_source', $('#analyze_html_source').is(':checked'));
      changehtml(GCW.getVal('analyze_html_source'));
    }
    function toggelHtmlColors() {
      GCW.setVal('analyze_html_syntax', $('#analyze_html_syntax').is(':checked'));
      changehtml(GCW.getVal('analyze_html_source'));
    }
    function changehtml(isSource) {
      // Note dependency when switch to source code | Has to run BEFORE changehtml()
      if (GCW.getVal('analyze_html_source')) {
        $('#analyze_show_comments').parents('.gcw_toggle').hide('slow');
        changeComments(false);
        $('#analyze_html_syntax').parents('.gcw_toggle').show('slow');
      }
      // Change the html
      let html = '';
      if (isSource) {
        if ($('#ctl00_ContentBody_ShortDescription').html().trim() !== '') {
          html +=
            '<h3>' +
            GCW.i18n('analyze_short_description') +
            '</h3>' +
            '<span>' +
            $('#ctl00_ContentBody_ShortDescription').html().toHtmlEntities() +
            '</span>' +
            '<h3>' +
            GCW.i18n('analyze_long_description') +
            '</h3>';
        }
        html += '<span>' + $('#ctl00_ContentBody_LongDescription').html().toHtmlEntities() + '</span>';
        if (GCW.getVal('analyze_html_syntax')) {
          // Highlight tags
          html = html.replace(/&#60;("[^"]*"|'[^']*'|[^'"&#62;])*&#62;/gm, function (match) {
            match = match.replace(
              /(\w+)(=)(".*?")/gm,
              '<span class="gcw_html_attr">$1<span class="gcw_html_equal_sign">$2</span><span class="gcw_html_value">$3</span></span>'
            );
            return '<span class="gcw_html_tag">' + match + '</span>';
          });
          // Highlight comments
          html = html.replace(/(&#60;!--.*?--&#62;)/gm, '<span class="gcw_html_comment">$&</span>');
          // Highlight &...;
          html = html.replace(/&#38;\w+;/gm, '<span class="gcw_html_unicode">$&</span>');
        }
        $('#gcw_analyze_listing_content').html(html);
      } else {
        if ($('#ctl00_ContentBody_ShortDescription').html().trim() !== '') {
          html += '<h3>' + GCW.i18n('analyze_short_description') + '</h3>';
          html += $('#ctl00_ContentBody_ShortDescription').html();
          html += '<h3>' + GCW.i18n('analyze_long_description') + '</h3>';
        }
        html += $('#ctl00_ContentBody_LongDescription').html();
        $('#gcw_analyze_listing_content').html(html);
      }
      // Note dependency when switch to html view | Has to run AFTER changehtml()
      if (!GCW.getVal('analyze_html_source')) {
        $('#analyze_show_comments').parents('.gcw_toggle').show('slow');
        changeComments(GCW.getVal('analyze_show_comments'));
        $('#analyze_html_syntax').parents('.gcw_toggle').hide('slow');
      }
    }

    function toggelComments() {
      GCW.setVal('analyze_show_comments', $('#analyze_show_comments').is(':checked'));
      changeComments(GCW.getVal('analyze_show_comments'));
    }
    function changeComments(isOn) {
      if (isOn && !GCW.getVal('analyze_html_source')) {
        // Note dependency
        let html = $('#gcw_analyze_listing_content').html();
        html = html.replace(/<(!--.*--)>/gm, '$&<span class="gcw_html_comment">&lt;$1&gt;</span>');
        $('#gcw_analyze_listing_content').html(html);
        if (!html.match(/<!--.*-->/gm)) {
          $('#analyze_show_comments')
            .parents('.gcw_toggle label')
            .after('<span class="gcw_toggel_warn">' + GCW.i18n('analyze_no_comments') + '</span>');
        }
      } else {
        let html = '';
        if ($('#ctl00_ContentBody_ShortDescription').html().trim() !== '') {
          html += '<h3>' + GCW.i18n('analyze_short_description') + '</h3>';
          html += $('#ctl00_ContentBody_ShortDescription').html();
          html += '<h3>' + GCW.i18n('analyze_long_description') + '</h3>';
        }
        html += $('#ctl00_ContentBody_LongDescription').html();
        $('#gcw_analyze_listing_content').html(html);
        if ($('.gcw_toggel_warn')[0]) $('.gcw_toggel_warn').remove();
      }
    }

    // Get the Hint of the Cache
    let hint = '';
    if ($('#ctl00_ContentBody_lnkDH')[0].title == 'Decrypt') {
      $('#ctl00_ContentBody_lnkDH')[0].click();
      hint = $('#div_hint').html();
      $('#ctl00_ContentBody_lnkDH')[0].click();
    } else {
      hint = $('#div_hint').html();
    }
    if (hint.trim() === '') hint = GCW.i18n('analyze_no_hint');
    // Add the html of the GCW analyze page
    let html =
      '<div id="gcw_analyze"><div style="margin:auto;width: max-content;">' +
      "    <h1><a id=\"gcw_link_back\" href=\"javascript:void(0)\" onclick=\"$('#gcw_analyze').hide('slow');$('#aspnetForm').show('slow');\">&lt;= " +
      GCW.i18n('analyze_back_to_listing') +
      '</a></h1>' +
      '    <h1>' +
      GCW.i18n('analyze_owner') +
      '</h1>' +
      '    <div id="gcw_analyze_owner">' +
      '        <span>' +
      GCW.i18n('analyze_owner') +
      ':</span><span>' +
      $('#ctl00_ContentBody_bottomSection a[href*="/play/search?owner[0]="]')[0]
        .href.match(/\?owner\[0\]=(.*?)&/)[1]
        .decodeUnicodeURIComponent() +
      '</span>' +
      '        <span>' +
      GCW.i18n('analyze_pseudonym') +
      ':</span><span>' +
      $('#ctl00_ContentBody_mcd1 a')[0].innerHTML +
      '</span>' +
      '    </div>' +
      '    <h1>' +
      GCW.i18n('analyze_description') +
      '</h1>' +
      GCW.buildToggle('analyze_html_source', GCW.i18n('analyze_show_html_source')) +
      GCW.buildToggle('analyze_show_comments', GCW.i18n('analyze_show_comments')) +
      GCW.buildToggle('analyze_html_syntax', GCW.i18n('analyze_show_html_syntax')) +
      '    <fieldset id="gcw_analyze_listing">' +
      '        <legend>' +
      GCW.i18n('analyze_description') +
      '</legend>' +
      '        <div id="gcw_analyze_listing_content"></div>' +
      '    </fieldset>' +
      '    <div id="gcw_analyze_hint">' +
      '        <div style="display:flex;align-items:center;gap:1em;"><h1>' +
      GCW.i18n('analyze_hint') +
      '</h1> ' +
      GCW.i18n('analyze_hint_without_colors') +
      '</div>' +
      '        <p>' +
      hint.replace(/<(?!(br|img)).*?>/gim, '') +
      '</p>' +
      '    </div>' +
      '</div></div>';
    $('body').append(html);
    // Event Listener for toggels
    $('#analyze_html_source').bind('click', toggelHtml);
    changehtml(GCW.getVal('analyze_html_source'));
    $('#analyze_show_comments').bind('click', toggelComments);
    $('#analyze_html_syntax').bind('click', toggelHtmlColors);
    // Set width of listing
    $('#gcw_analyze_listing').css('width', $('.UserSuppliedContent')[0].offsetWidth);
  }
  addAnalyzePage();

  // Add a Flag Counter to count the users
  $('body').append(
    '<img id="gcw_visiter_counter" src="https://s04.flagcounter.com/count2/fPzU/bg_FFFFFF/txt_000000/border_CCCCCC/columns_5/maxflags_12/viewers_0/labels_0/pageviews_1/flags_0/percent_0/" style="display:none;"'
  );
};

/** Start the script when the page has finished loading and the Settings are loaded **/
GCW.loadSettings();
$(document).ready(function () {
  function waitForStorage(waitCount) {
    if (GCW.settings != {}) GCW.main();
    else {
      if (waitCount <= 100) {
        waitCount++;
        window.setTimeout(function () {
          waitForStorage(waitCount);
        }, 100);
      }
    }
  }
  waitForStorage(0);
});
