'use strict';

let $ = window.jQuery;

/** Communicating with the background script */
const getMessage = (data) => {
  switch (data.do) {
    case 'showPopup':
      GCW.showPopup(data.msg, 1000);
      return Promise.resolve({ response: 'show popup' });
    case 'openLink':
      window.open(data.href);
      return Promise.resolve({ response: 'open ' + data.href });
    case 'openGCW':
      const link = `https://gcwizard.net/#/${data.tool}?${toQueryString(data.params)}`;
      window.open(link);
      return Promise.resolve({ response: 'open ' + data.tool });
    default:
      return Promise.resolve({ response: 'did nothing' });
  }
};
browser.runtime.onMessage.addListener(getMessage);

const handleResponse = (message) =>
  console.info('GCW response: ' + message.response);

const handleError = (error) => console.error('GCW Error: ' + error);

const sendMessage = (request) =>
  browser.runtime.sendMessage(request).then(handleResponse, handleError);

window.addEventListener('contextmenu', (_e) =>
  sendMessage({
    do: 'contextmenu',
    selection: window.getSelection().toString(),
  })
);

const toQueryString = (obj) =>
  Object.keys(obj)
    .map((key) => {
      const value = obj[key];
      if (Array.isArray(value)) {
        // Wenn der Wert ein Array ist (z. B. für 'values'), wandeln wir es in eine kommagetrennte Zeichenkette um
        return `${encodeURIComponent(key)}=${value.map(encodeURIComponent).join(',')}`;
      }
      // Andernfalls kodieren wir den Wert und den Schlüssel und fügen sie dem Query-String hinzu
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');

// Main functions on the cache detail page
const main = () => {
  // Run only on cache detail page
  if (
    !document.location.href.match(
      /\.com\/(seek\/cache_details\.aspx|geocache\/)/
    )
  )
    return;

  // Add the Popup
  const addPopup = () =>
    $('body').append(
      '<div id="gcw_popup"><span id="gcw_popup_msg">GCW_Popup</span></div>'
    );

  addPopup();

  // Add Sidebar
  const addSidebar = () => {
    const html = `<div class="CacheDetailNavigationWidget TopSpacing BottomSpacing">
      <h3 class="WidgetHeader">${GCW.i18n('extension_name')}</h3>
      <div class="WidgetBody">
        <a id="openAnalyze" href="javascript:void(0)">
          ${GCW.i18n('analyze')}
        </a>
      </div>
    </div>`;
    $('.CacheDetailNavigation.NoPrint').after(html);
  };
  addSidebar();

  $('#openAnalyze').click(() => {
    // Ensure data is fetched and sent correctly
    let hint = '';
    if ($('#ctl00_ContentBody_lnkDH')[0].title == 'Decrypt') {
      $('#ctl00_ContentBody_lnkDH')[0].click();
      hint = $('#div_hint').html();
      $('#ctl00_ContentBody_lnkDH')[0].click();
    } else {
      hint = $('#div_hint').html();
    }
    const data = {
      shortDescription: $('#ctl00_ContentBody_ShortDescription').html(),
      longDescription: $('#ctl00_ContentBody_LongDescription').html(),
      hint: hint,
      owner: $(
        '#ctl00_ContentBody_bottomSection a[href*="/play/search?owner[0]="]'
      )
        .attr('href')
        .match(/\?owner\[0\]=(.*?)&/)[1],
      pseudonym: $('#ctl00_ContentBody_mcd1 > a').html(),
      gccode: $(
        '#ctl00_ContentBody_CoordInfoLinkControl1_uxCoordInfoCode'
      ).html(),
      name: $('#ctl00_ContentBody_CacheName').html(),
    };
    // Sending message to open the new tab
    browser.runtime.sendMessage({
      do: 'openTab',
      url: browser.runtime.getURL('pages/analyze.html'),
      payload: data,
    });
  });

  // Add a Flag Counter to count the users
  $('body').append(
    '<img id="gcw_visiter_counter" src="https://s04.flagcounter.com/count2/fPzU/bg_FFFFFF/txt_000000/border_CCCCCC/columns_5/maxflags_12/viewers_0/labels_0/pageviews_1/flags_0/percent_0/" style="display:none;"'
  );
};

/** Start the script when the page has finished loading **/
$(document).ready(main);
