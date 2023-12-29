/**
 * Latest code from https://github.com/NoahThatsWack/HTML-Form-to-Google-Sheets
 * Updated for 2021 and ES6 standards in https://github.com/levinunnink/html-form-to-google-sheet
 * Original code from https://github.com/jamiewilson/form-to-google-sheets
 */
const props = PropertiesService.getScriptProperties();

function setup() {
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  props.setProperty('key', activeSpreadsheet.getId());
}

function doPost(e) {
  let to;
  const lock = LockService.getScriptLock();

  lock.tryLock(10000);

  try {
    const doc = SpreadsheetApp.openById(props.getProperty('key'));
    const sheet = doc.getSheetByName('Sheet1');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const nextRow = sheet.getLastRow()+1;
    const toRow = headers.map((header) => ((header === 'Date')? new Date() : e.parameter[header]));

    sheet.getRange(nextRow, 1, 1, toRow.length).setValues([toRow]);
    to = { 'result': 'success', 'row': nextRow };
  }
  catch(e) { to = { 'result': 'error', 'error': e }; }
  finally {
    to = ContentService.createTextOutput(JSON.stringify(to))
      .setMimeType(ContentService.MimeType.JSON);

    lock.releaseLock();
  }

  return to;
}
