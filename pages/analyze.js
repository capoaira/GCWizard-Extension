'use strict';

$(document).ready(async () => {
  // Helper function to format HTML
  const formatHTML = (html, indent = 0) => {
    if (!html) return '';
    html = html.replace(
      /(?<!\n)\s*(&#60;br[ \/]{0,2}&#62;<br[ \/]{0,2}>)/g,
      '$1' + '&nbsp;'.repeat(4)
    );
    const regex =
      /&#60;(?:([a-zA-Z]+)((?:"[^"]*"|'[^']*'|[^'"&#62;])*&#62;)|!--)((?:(?!\1&#62;.*?&#60;\1).)*)(&#60;\/\1&#62;|--&#62;)/gs;
    let result = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      const [fullMatch, openingTag, attributes, innerHTML, closingTag] = match;
      if (openingTag)
        result.push(
          '&#60;' +
            openingTag +
            attributes +
            (fullMatch.length > 90
              ? '<br />' +
                '&nbsp;'.repeat(4 * (indent + 1)) +
                formatHTML(innerHTML, indent + 1) +
                '<br />' +
                '&nbsp;'.repeat(4 * indent) +
                closingTag
              : innerHTML + closingTag)
        );
      else result.push(fullMatch);
    }
    return result.length === 0
      ? html
      : result.join('<br />' + '&nbsp;'.repeat(4 * indent));
  };

  // Function to handle HTML formatting and syntax highlighting
  const updateHtml = async () => {
    const isSource = await GCW.getVal('analyze_html_source');
    let html = '';
    if (isSource) {
      if (data.shortDescription.trim() !== '') {
        html += `<h3>${GCW.i18n('analyze_short_description')}</h3>
          <span>${data.shortDescription}</span>
          <h3>${GCW.i18n('analyze_long_description')}</h3>`;
      }
      let description = data.longDescription.toHtmlEntities();

      if (await GCW.getVal('analyze_html_structure')) {
        description = description.replace(
          /(&#60;br[ \/]{0,2}&#62;)/g,
          '$1<br>'
        );
        description = formatHTML(description);
      }

      if (await GCW.getVal('analyze_html_syntax')) {
        // Highlight tags
        description = description.replace(
          /&#60;("[^"]*"|'[^']*'|[^'"&#62;])*&#62;/gm,
          (match) => {
            match = match.replace(
              /(\w+)(=)(".*?")/gm,
              '<span class="gcw_html_key">$1</span><span class="gcw_html_equal_sign">$2</span><span class="gcw_html_value">$3</span>'
            );
            return '<span class="gcw_html_tag">' + match + '</span>';
          }
        );
        // Highlight comments
        description = description.replace(
          /(&#60;!--.*?--&#62;)/gm,
          '<span class="gcw_html_comment">$&</span>'
        );
        // Highlight '&...;'
        description = description.replace(
          /&#38;\w+;/gm,
          '<span class="gcw_html_unicode">$&</span>'
        );
      }

      html += `<span>${description}</span>`;
      $('#gcw_analyze_listing_content').html(html);
    } else {
      if (await GCW.getVal('analyze_show_comments')) {
        let html = data.longDescription;
        html = html.replace(
          /<(!--.*--)>/gm,
          '$&<span class="gcw_html_comment">&lt;$1&gt;</span>'
        );
        $('#gcw_analyze_listing_content').html(html);
        if (!html.match(/<!--.*-->/gm)) {
          $('#analyze_show_comments')
            .parents('.gcw_toggle label')
            .after(
              `<span class="gcw_toggel_warn">${GCW.i18n('analyze_no_comments')}</span>`
            );
        }
      } else {
        let html = '';
        if (data.shortDescription !== '') {
          html += '<h3>' + GCW.i18n('analyze_short_description') + '</h3>';
          html += data.shortDescription;
          html += '<h3>' + GCW.i18n('analyze_long_description') + '</h3>';
        }
        html += data.longDescription;
        $('#gcw_analyze_listing_content').html(html);
        if ($('.gcw_toggel_warn')[0]) $('.gcw_toggel_warn').remove();
      }
    }

    if (!(await GCW.getVal('analyze_html_source'))) {
      $('#analyze_show_comments').parent().show();
      $('#analyze_html_syntax').parent().hide();
      $('#analyze_html_structure').parent().hide();
    } else {
      $('#analyze_show_comments').parent().hide();
      $('#analyze_html_syntax').parent().show();
      $('#analyze_html_structure').parent().show();
    }
  };

  // Retrieve the data from storage and update the page
  const updatePage = (data) => {
    $('#gcw_analyze_hint').html(`
      <div style="display:flex;align-items:center;gap:1em;">
        <h1>${GCW.i18n('analyze_hint')}</h1> ${GCW.i18n('analyze_hint_without_colors')}
      </div>
      <p>${data.hint.replace(/<(?!(br|img)).*?>/gim, '')}</p>
    `);
  };

  const fillTemplate = async (data) => {
    // Fill the template with localized strings
    const i18ns = $('[i18n]:not(.gcw_toggle)');
    for (const i18n of i18ns) {
      const key = $(i18n).attr('i18n');
      $(i18n).html(GCW.i18n(key));
      if ($(i18n).attr('append')) {
        $(i18n).append($(i18n).attr('append'));
      }
    }
    // Fill the template with data
    const fills = $('[fill]');
    for (const fill of fills) {
      const key = $(fill).attr('fill');
      $(fill).html(data[key]);
    }
    // Build the toggles
    const toggles = $('.gcw_toggle');
    for (const toggle of toggles) {
      const key = $(toggle).attr('key');
      await GCW.setVal(key, !!$(toggle).attr('checked'));
      $(toggle).html(
        await GCW.buildToggle(key, GCW.i18n($(toggle).attr('i18n')))
      );
      $(toggle).on('click', async () => {
        await GCW.setVal(key, !(await GCW.getVal(key)));
        await updateHtml();
      });
    }

    // initialize the page with the data
    await updateHtml();
  };

  // Fetch the data from storage and call the updatePage function
  const data = await GCW.getVal('analyzeData');
  if (data) {
    await fillTemplate(data);
  }
});
