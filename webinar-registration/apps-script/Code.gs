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
 * 6. Add property: WEBINAR_ID = your_webinar_id
 * 7. Click Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 8. Copy the Web App URL — use this in the registration page config
 */

// ═══ CONFIG ══════════════════════════════════════════════

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    apiKey: props.getProperty('WEBINARGEEK_API_KEY') || '',
    webinarId: props.getProperty('WEBINAR_ID') || '',
  };
}

const WG_BASE = 'https://app.webinargeek.com/api/v2';

// ═══ ENTRY POINTS ════════════════════════════════════════

/**
 * Handles GET requests (webinar info + page content)
 */
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'content';

  try {
    if (action === 'webinar-info') {
      return respond(getWebinarInfo());
    }
    if (action === 'content') {
      return respond(getSheetContent());
    }
    if (action === 'all') {
      // Single call to get BOTH content + webinar info
      const content = getSheetContent();
      const webinar = getWebinarInfo();
      return respond({ content: content.content, webinar: webinar.webinar, broadcasts: webinar.broadcasts });
    }
    return respond({ error: 'Unknown action: ' + action }, 400);
  } catch (err) {
    return respond({ error: err.message }, 500);
  }
}

/**
 * Handles POST requests (registration)
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const result = registerSubscriber(body);
    return respond(result);
  } catch (err) {
    return respond({ error: err.message }, 500);
  }
}

// ═══ GET CONTENT FROM SHEET ══════════════════════════════

function getSheetContent() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Content') || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  
  const content = {};
  for (let i = 0; i < data.length; i++) {
    const key = data[i][0];
    const value = data[i][1];
    if (key && typeof key === 'string' && key.trim()) {
      content[key.trim()] = value !== undefined && value !== null ? String(value) : '';
    }
  }
  
  return { content };
}

// ═══ GET WEBINAR INFO ════════════════════════════════════

function getWebinarInfo() {
  const config = getConfig();
  if (!config.apiKey || !config.webinarId) {
    throw new Error('Missing WEBINARGEEK_API_KEY or WEBINAR_ID in Script Properties');
  }

  // Get webinar metadata
  const webinar = wgFetch('/webinars/' + config.webinarId, config.apiKey);

  // Get episodes
  const episodes = wgFetch('/webinars/' + config.webinarId + '/episodes', config.apiKey);
  const episodeList = episodes.data || episodes || [];

  // Get broadcasts for each episode
  var allBroadcasts = [];
  for (var i = 0; i < episodeList.length; i++) {
    var ep = episodeList[i];
    var broadcasts = wgFetch(
      '/webinars/' + config.webinarId + '/episodes/' + ep.id + '/broadcasts',
      config.apiKey
    );
    var bcList = broadcasts.data || broadcasts || [];
    
    for (var j = 0; j < bcList.length; j++) {
      var bc = bcList[j];
      if (bc.status === 'scheduled' || bc.status === 'live' || !bc.status) {
        allBroadcasts.push({
          broadcast_id: bc.id,
          episode_id: ep.id,
          episode_title: ep.title || webinar.title,
          date: bc.starts_at || bc.date,
          duration_minutes: bc.duration || null,
          status: bc.status || 'scheduled',
        });
      }
    }
  }

  // Sort by date
  allBroadcasts.sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });

  return {
    webinar: { id: webinar.id, title: webinar.title, description: webinar.description || '' },
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
  var webinarId = body.webinar_id || config.webinarId;

  if (!email || !broadcastId || !episodeId) {
    throw new Error('Missing required fields: email, broadcast_id, episode_id');
  }

  // Split name
  var parts = name.trim().split(/\s+/);
  var firstName = parts[0] || '';
  var lastName = parts.slice(1).join(' ') || '';

  try {
    var subscription = wgFetch(
      '/webinars/' + webinarId + '/episodes/' + episodeId + '/broadcasts/' + broadcastId + '/subscriptions',
      config.apiKey,
      'POST',
      { email: email, first_name: firstName, last_name: lastName }
    );

    return {
      success: true,
      subscription_id: subscription.id || (subscription.data && subscription.data.id),
      confirmation_link: subscription.confirmation_link || (subscription.data && subscription.data.confirmation_link),
      message: 'Registration successful',
    };
  } catch (err) {
    // Handle "already registered" case
    if (err.message && err.message.toLowerCase().indexOf('already') >= 0) {
      try {
        var subs = wgFetch(
          '/webinars/' + webinarId + '/episodes/' + episodeId + '/broadcasts/' + broadcastId + '/subscriptions',
          config.apiKey
        );
        var subList = subs.data || subs || [];
        if (Array.isArray(subList)) {
          for (var i = 0; i < subList.length; i++) {
            if (subList[i].email === email) {
              return {
                success: true,
                already_registered: true,
                subscription_id: subList[i].id,
                confirmation_link: subList[i].confirmation_link || null,
                message: 'You were already registered. Here is your join link.',
              };
            }
          }
        }
      } catch (e) {
        // Fall through
      }
    }
    throw err;
  }
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

function respond(data, statusCode) {
  // Google Apps Script web apps always return 200, 
  // but we include status in the JSON for the client to check
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
