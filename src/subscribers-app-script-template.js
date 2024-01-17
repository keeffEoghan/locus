/**
 * WIP copying R1C1 forumlas.
 * @see [API](https://developers.google.com/apps-script/reference/spreadsheet/range#setFormulaR1C1(String))
 *
 * Latest code from https://github.com/NoahThatsWack/HTML-Form-to-Google-Sheets
 * Updated for 2021 and ES6 standards in https://github.com/levinunnink/html-form-to-google-sheet
 * Original code from https://github.com/jamiewilson/form-to-google-sheets
 */
const props = PropertiesService.getScriptProperties();

/** [See GitHub XSS escaping](https://github.com/DubFriend/xss-escape/).  */

function isString(data) { return typeof data === 'string'; }

function isArray(value) {
  return Object.prototype.toString.call(value) === "[object Array]";
}

function isObject(value) { return !isArray(value) && value instanceof Object; }

function isNumber(value) { return typeof value === 'number'; }

function isBoolean(value) { return typeof value === 'boolean'; }

function charForLoopStrategy(unescapedString) {
  var i, character, escapedString = '';

  for(i = 0; i < unescapedString.length; i += 1) {
    character = unescapedString.charAt(i);

    switch(character) {
      case '<':
        escapedString += '&lt;';
        break;
      case '>':
        escapedString += '&gt;';
        break;
      case '&':
        escapedString += '&amp;';
        break;
      case '/':
        escapedString += '&#x2F;';
        break;
      case '"':
        escapedString += '&quot;';
        break;
      case "'":
        escapedString += '&#x27;';
        break;
      default:
        escapedString += character;
    }
  }

  return escapedString;
}

function regexStrategy(string) {
  return string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, "&#x27;")
    .replace(/\//g, '&#x2F;');
}

var shiftToRegexStrategyThreshold = 32;

function xssEscape(data, forceStrategy) {
  var escapedData;
  var character;
  var key;
  var i;
  var charArray = [];
  var stringLength;

  if(isString(data)) {
    stringLength = data.length;

    if(forceStrategy === 'charForLoopStrategy') {
      escapedData = charForLoopStrategy(data);
    }
    else if(forceStrategy === 'regexStrategy') {
      escapedData = regexStrategy(data);
    }
    else if(stringLength > shiftToRegexStrategyThreshold) {
      escapedData = regexStrategy(data);
    }
    else {
      escapedData = charForLoopStrategy(data);
    }
  }
  else if(isNumber(data) || isBoolean(data)) { escapedData = data; }
  else if(isArray(data)) {
    escapedData = [];

    for(i = 0; i < data.length; i += 1) {
      escapedData.push(xssEscape(data[i]));
    }
  }
  else if(isObject(data)) {
    escapedData = {};

    for(key in data) {
      if(data.hasOwnProperty(key)) {
        escapedData[key] = xssEscape(data[key]);
      }
    }
  }

  return escapedData;
};

function setup() {
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  props.setProperty('key', activeSpreadsheet.getId());
}

function doPost(d) {
  const lock = LockService.getScriptLock();
  let to;
  const p = d.parameter;

  lock.tryLock(10000);

  try {
    const doc = SpreadsheetApp.openById(props.getProperty('key'));
    const sheet = doc.getSheetByName('Sheet1');
    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const nextRow = sheet.getLastRow()+1;
    const nextRange = sheet.getRange(nextRow, 1, 1, headers.length);

    headers.forEach(function(header, column) {
      const cell = sheet.getCell(nextRow, column);

      if(header in p) {
        return cell.setValue((header === 'Date')? new Date()
          : xssEscape(p[header]));
      }

      const template = sheet.getCell(2, column);
      const static = template.getValue();

      if(static) { return cell.setValue(static); }

      const formula = template.getForumlaR1C1();

      if(formulas) { return cell.setForumlaR1C1(formula); }
    });

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
