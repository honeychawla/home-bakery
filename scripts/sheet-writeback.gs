/**
 * Order Hub → Google Sheet write-back.
 *
 * Deploy (5 minutes, done by the sheet's owner):
 *   1. Open your orders Google Sheet → Extensions → Apps Script.
 *   2. Paste this whole file, replacing any starter code.
 *   3. Change SECRET below to a random string you invent.
 *   4. Deploy → New deployment → type "Web app" →
 *      Execute as: Me · Who has access: Anyone → Deploy.
 *      Approve the one-time authorization prompt.
 *   5. Copy the web app URL (…/exec) and paste it, plus your secret,
 *      into Order Hub → Settings → "Sheet write-back".
 *
 * To update later: edit code → Deploy → Manage deployments → ✎ → New version.
 * The URL stays the same.
 */

var SECRET = 'CHANGE_ME_TO_A_RANDOM_STRING';

// Column layout of each weekly tab (matches the Tart Theory orders sheet).
var HEADER = [
  'Timestamp', 'Order #', 'Items', 'Total', 'Paid via Venmo',
  'Amount Received', 'Venmo Name', 'Pickup Day', 'Pickup Time',
  'Pickup Place', 'Language'
];

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'invalid JSON' });
  }
  if (!data || data.secret !== SECRET) {
    return reply({ ok: false, error: 'unauthorized' });
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (data.action === 'appendOrder') {
    var sheet = getOrCreateTab(ss, String(data.weekLabel || 'Orders'));
    sheet.appendRow([
      data.timestamp ? new Date(data.timestamp) : new Date(),
      str(data.orderNum), str(data.items), num(data.total), !!data.paid,
      data.amountReceived == null ? '' : num(data.amountReceived),
      str(data.venmoName), str(data.pickupDay), str(data.pickupTime),
      str(data.pickupPlace), str(data.lang)
    ]);
    return reply({ ok: true, tab: sheet.getName() });
  }

  if (data.action === 'updateOrder') {
    // Field-level edit of an existing row, matched by Order #.
    // Accepted fields → columns: items(3), total(4), venmoName(7),
    // pickupDay(8), pickupTime(9), pickupPlace(10), lang(11).
    var found = findOrderRow(ss, data.weekLabel, data.orderNum);
    if (!found) return reply({ ok: false, error: 'order not found: ' + data.orderNum });
    var cols = { items: 3, total: 4, venmoName: 7, pickupDay: 8, pickupTime: 9, pickupPlace: 10, lang: 11 };
    var updated = [];
    for (var key in cols) {
      if (data.fields && data.fields.hasOwnProperty(key)) {
        var value = key === 'total' ? num(data.fields[key]) : str(data.fields[key]);
        found.sheet.getRange(found.row, cols[key]).setValue(value);
        updated.push(key);
      }
    }
    return reply({ ok: true, tab: found.sheet.getName(), row: found.row, updated: updated });
  }

  if (data.action === 'updatePayment') {
    var hit = findOrderRow(ss, data.weekLabel, data.orderNum);
    if (!hit) return reply({ ok: false, error: 'order not found: ' + data.orderNum });
    hit.sheet.getRange(hit.row, 5).setValue(!!data.paid); // Paid via Venmo
    hit.sheet.getRange(hit.row, 6).setValue(
      data.paid && data.amountReceived != null ? num(data.amountReceived) : ''
    );
    if (data.venmoName) hit.sheet.getRange(hit.row, 7).setValue(str(data.venmoName));
    return reply({ ok: true, tab: hit.sheet.getName(), row: hit.row });
  }

  return reply({ ok: false, error: 'unknown action' });
}

// Find a row by Order # (column B): the named weekly tab first, then every tab.
function findOrderRow(ss, weekLabel, orderNum) {
  var tabs = [];
  if (weekLabel) {
    var named = ss.getSheetByName(String(weekLabel));
    if (named) tabs.push(named);
  }
  ss.getSheets().forEach(function (s) {
    if (tabs.indexOf(s) === -1) tabs.push(s);
  });
  for (var t = 0; t < tabs.length; t++) {
    var sheet = tabs[t];
    var rows = sheet.getLastRow();
    if (rows < 1) continue;
    var orderCol = sheet.getRange(1, 2, rows, 1).getValues(); // column B
    for (var r = 0; r < orderCol.length; r++) {
      if (String(orderCol[r][0]).trim() === String(orderNum).trim()) {
        return { sheet: sheet, row: r + 1 };
      }
    }
  }
  return null;
}

function getOrCreateTab(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function str(v) { return v == null ? '' : String(v); }
function num(v) {
  var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? '' : n;
}
