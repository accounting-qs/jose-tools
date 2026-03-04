/**
 * Webinar Registration — Google Apps Script Middleware
 * 
 * This script is attached to the Google Sheet that contains the page content.
 * It acts as a secure proxy between the registration page and WebinarGeek API.
 *
 * SETUP:
 * 1. Open this Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Paste this code (replacing any default code)
 * 4. Go to Project Settings (gear icon) → Script Properties
 * 5. Add property: WEBINARGEEK_API_KEY = your_api_key
 * 6. Click Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy the Web App URL — use this in the registration page config
 *
 * WEBINAR ID:
 * - Add a "webinar_id" row in the Content sheet to use a specific webinar
 * - Leave it blank to auto-detect the next upcoming webinar
 */

// ═══ CONFIG ══════════════════════════════════════════════

function getConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    apiKey: props.getProperty('WEBINARGEEK_API_KEY') || '',
  };
}

var WG_BASE = 'https://app.webinargeek.com/api/v2';

// ═══ ENTRY POINTS ════════════════════════════════════════

function doGet(e) {
  var action = (e.parameter && e.parameter.action) || 'content';
  var callback = e.parameter && e.parameter.callback;

  try {
    var result;

    if (action === 'webinar-info') {
      result = getWebinarInfo();
    } else if (action === 'content') {
      result = getSheetContent();
    } else if (action === 'all') {
      var content = getSheetContent();
      var webinar = getWebinarInfo(content.content);
      result = { content: content.content, webinar: webinar.webinar, broadcasts: webinar.broadcasts };
    } else if (action === 'debug') {
      result = getDebugInfo();
    } else if (action === 'register') {
      // Registration via GET (for JSONP support)
      result = registerSubscriber({
        name: e.parameter.name || '',
        email: e.parameter.email || '',
        broadcast_id: e.parameter.broadcast_id || '',
        episode_id: e.parameter.episode_id || '',
        webinar_id: e.parameter.webinar_id || '',
      });
    } else {
      result = { error: 'Unknown action: ' + action };
    }

    return respond(result, callback);
  } catch (err) {
    return respond({ error: err.message }, callback);
  }
}

function doPost(e) {
  var callback = e.parameter && e.parameter.callback;
  try {
    var body = JSON.parse(e.postData.contents);
    var result = registerSubscriber(body);
    return respond(result, callback);
  } catch (err) {
    return respond({ error: err.message }, callback);
  }
}

// ═══ GET CONTENT FROM SHEET ══════════════════════════════

function getSheetContent() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Content') || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  
  var content = {};
  for (var i = 0; i < data.length; i++) {
    var key = data[i][0];
    var value = data[i][1];
    if (key && typeof key === 'string' && key.trim()) {
      content[key.trim()] = value !== undefined && value !== null ? String(value) : '';
    }
  }
  
  return { content: content };
}

// ═══ HELPER: Parse WebinarGeek list response ═════════════

/**
 * WebinarGeek returns lists under a named key (e.g. "webinars", "subscriptions")
 * This helper extracts the array regardless of format.
 */
function extractList(response) {
  if (Array.isArray(response)) return response;
  if (response.data && Array.isArray(response.data)) return response.data;
  // Check for named keys like "webinars", "subscriptions", etc.
  var keys = Object.keys(response);
  for (var i = 0; i < keys.length; i++) {
    if (Array.isArray(response[keys[i]]) && keys[i] !== 'pages' && keys[i] !== 'registration_fields') {
      return response[keys[i]];
    }
  }
  return [];
}

// ═══ HELPER: Parse WebinarGeek date ══════════════════════

/**
 * WebinarGeek dates are Unix timestamps in SECONDS.
 * JavaScript needs milliseconds.
 */
function parseWgDate(value) {
  if (!value) return null;
  // If it's a number (Unix timestamp in seconds), multiply by 1000
  if (typeof value === 'number') {
    // If it looks like seconds (before year 2100 in seconds = ~4102444800)
    if (value < 10000000000) {
      return new Date(value * 1000);
    }
    return new Date(value);
  }
  // If it's a string, try parsing directly
  return new Date(value);
}

// ═══ RESOLVE WEBINAR ID ══════════════════════════════════

function resolveWebinarId(content) {
  var config = getConfig();
  if (!config.apiKey) throw new Error('Missing WEBINARGEEK_API_KEY in Script Properties');

  // 1. Check the Content sheet for a webinar_id
  if (content && content.webinar_id && content.webinar_id.trim()) {
    return content.webinar_id.trim();
  }

  // 2. Auto-detect: fetch all webinars, use inline episode/broadcast data
  var response = wgFetch('/webinars', config.apiKey);
  var webinarList = extractList(response);
  var now = new Date();

  var bestWebinarId = null;
  var earliestDate = null;

  for (var w = 0; w < webinarList.length; w++) {
    var webinar = webinarList[w];
    var episodes = webinar.episodes || [];

    for (var e = 0; e < episodes.length; e++) {
      var broadcasts = episodes[e].broadcasts || [];

      for (var b = 0; b < broadcasts.length; b++) {
        var bc = broadcasts[b];
        if (bc.has_ended || bc.cancelled) continue;

        var bcDate = parseWgDate(bc.date);
        if (!bcDate || isNaN(bcDate.getTime())) continue;

        if (bcDate > now) {
          if (!earliestDate || bcDate < earliestDate) {
            earliestDate = bcDate;
            bestWebinarId = String(webinar.id);
          }
        }
      }
    }
  }

  if (bestWebinarId) return bestWebinarId;

  throw new Error('No upcoming webinars found. Add a "webinar_id" row in your Content sheet, or schedule a new broadcast in WebinarGeek.');
}

// ═══ GET WEBINAR INFO ════════════════════════════════════

function getWebinarInfo(content) {
  var config = getConfig();
  if (!config.apiKey) throw new Error('Missing WEBINARGEEK_API_KEY in Script Properties');

  var webinarId = resolveWebinarId(content);

  // Fetch the specific webinar (includes episodes + broadcasts inline)
  var webinar = wgFetch('/webinars/' + webinarId, config.apiKey);

  var episodes = webinar.episodes || [];
  var allBroadcasts = [];

  for (var i = 0; i < episodes.length; i++) {
    var ep = episodes[i];
    var broadcasts = ep.broadcasts || [];

    for (var j = 0; j < broadcasts.length; j++) {
      var bc = broadcasts[j];
      if (bc.has_ended || bc.cancelled) continue;

      var bcDate = parseWgDate(bc.date);
      if (!bcDate || isNaN(bcDate.getTime())) continue;

      allBroadcasts.push({
        broadcast_id: bc.id,
        episode_id: ep.id,
        episode_title: ep.title || webinar.title,
        date: bcDate.toISOString(),
        duration_minutes: bc.duration || null,
        has_ended: bc.has_ended || false,
        webinar_id: String(webinar.id),
      });
    }
  }

  // Sort by date
  allBroadcasts.sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });

  return {
    webinar: { id: webinar.id, title: webinar.title, description: webinar.metadata_description || '' },
    broadcasts: allBroadcasts,
  };
}

// ═══ REGISTER SUBSCRIBER ════════════════════════════════

function registerSubscriber(body) {
  var config = getConfig();
  if (!config.apiKey) throw new Error('Missing WEBINARGEEK_API_KEY in Script Properties');

  var email = body.email;
  var name = body.name || '';
  var broadcastId = body.broadcast_id;
  var episodeId = body.episode_id;
  var webinarId = body.webinar_id;

  if (!webinarId) {
    var content = getSheetContent();
    webinarId = resolveWebinarId(content.content);
  }

  if (!email) throw new Error('Email is required');

  // Split name
  var parts = name.trim().split(/\s+/);
  var firstName = parts[0] || '';
  var lastName = parts.slice(1).join(' ') || '';

  // Build subscription payload
  var payload = { email: email, first_name: firstName, last_name: lastName };

  // Register: POST to subscriptions endpoint
  var subPath = '/webinars/' + webinarId + '/subscriptions';

  try {
    var subscription = wgFetch(subPath, config.apiKey, 'POST', payload);

    return {
      success: true,
      subscription_id: subscription.id,
      confirmation_link: subscription.confirmation_link || null,
      message: 'Registration successful',
    };
  } catch (err) {
    // Handle "already registered" — try to find existing subscription
    if (err.message && (err.message.toLowerCase().indexOf('already') >= 0 || err.message.toLowerCase().indexOf('exists') >= 0 || err.message.toLowerCase().indexOf('duplicate') >= 0)) {
      try {
        // Search for the subscriber's existing registration
        var subs = wgFetch('/webinars/' + webinarId + '/subscriptions?email=' + encodeURIComponent(email), config.apiKey);
        var subList = extractList(subs);

        if (subList.length > 0) {
          return {
            success: true,
            already_registered: true,
            subscription_id: subList[0].id,
            confirmation_link: subList[0].confirmation_link || null,
            message: 'You were already registered. Here is your join link.',
          };
        }
      } catch (e) {
        // Fall through
      }
    }
    throw err;
  }
}

// ═══ DEBUG ═══════════════════════════════════════════════

function getDebugInfo() {
  var config = getConfig();
  if (!config.apiKey) return { error: 'Missing WEBINARGEEK_API_KEY' };

  var response = wgFetch('/webinars', config.apiKey);
  var webinarList = extractList(response);
  var now = new Date();

  var debug = {
    total_webinars: webinarList.length,
    current_time: now.toISOString(),
    webinars: [],
  };

  for (var w = 0; w < webinarList.length; w++) {
    var webinar = webinarList[w];
    var episodes = webinar.episodes || [];
    var wData = { id: webinar.id, title: webinar.title, upcoming_broadcasts: [] };

    for (var e = 0; e < episodes.length; e++) {
      var broadcasts = episodes[e].broadcasts || [];
      for (var b = 0; b < broadcasts.length; b++) {
        var bc = broadcasts[b];
        var bcDate = parseWgDate(bc.date);
        wData.upcoming_broadcasts.push({
          broadcast_id: bc.id,
          episode_id: episodes[e].id,
          raw_date: bc.date,
          parsed_date: bcDate ? bcDate.toISOString() : 'PARSE_FAILED',
          has_ended: bc.has_ended,
          cancelled: bc.cancelled,
          is_upcoming: bcDate && bcDate > now && !bc.has_ended && !bc.cancelled,
        });
      }
    }

    debug.webinars.push(wData);
  }

  return debug;
}

// ═══ WEBINARGEEK API HELPER ══════════════════════════════

function wgFetch(path, apiKey, method, payload) {
  var options = {
    method: method || 'GET',
    headers: {
      'Api-Token': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    muteHttpExceptions: true,
  };

  if (payload) {
    options.payload = JSON.stringify(payload);
  }

  var response = UrlFetchApp.fetch(WG_BASE + path, options);
  var code = response.getResponseCode();
  var body = JSON.parse(response.getContentText());

  if (code < 200 || code >= 300) {
    throw new Error(body.message || body.error || 'WebinarGeek API error: ' + code);
  }

  return body;
}

// ═══ RESPONSE HELPER ═════════════════════════════════════

function respond(data, callback) {
  var json = JSON.stringify(data);

  if (callback) {
    // JSONP: wrap in callback function, return as JavaScript
    var output = ContentService.createTextOutput(callback + '(' + json + ')');
    output.setMimeType(ContentService.MimeType.JAVASCRIPT);
    return output;
  }

  var output = ContentService.createTextOutput(json);
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
