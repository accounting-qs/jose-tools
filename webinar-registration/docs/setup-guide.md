# Setup Guide — Webinar Registration Page

**No terminal, no CLI, no coding needed.** Everything is set up in the browser.

---

## Overview: What You'll Set Up

For each client, you need:

1. ✅ A **Google Sheet** (content + middleware) — copy a template, fill in content
2. ✅ The **registration page** embedded in GoHighLevel

**Time to set up per client: ~15 minutes**

---

## Step 1: Create the Google Sheet (One-Time Template)

### 1.1 Create a new Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) → click **Blank spreadsheet**
2. Name it: **"[Client Name] - Webinar Registration"**

### 1.2 Set up the Content tab

1. Rename the first sheet tab to **`Content`** (click the tab name at the bottom → rename)
2. Fill in Column A with the **key names** and Column B with the **values**:

| Column A (Key) | Column B (Value) |
|---|---|
| `page_title` | Master AI for Accounting — Free Live Training |
| `headline` | Discover How to Automate 80% of Your Accounting Tasks |
| `sub_headline` | Join 500+ professionals who transformed their workflow |
| `banner_image_url` | *(paste the URL of the client's banner image)* |
| `brand_color` | #6C3AED |
| `bullet_1_icon` | 🚀 |
| `bullet_1` | How to set up AI automation in under 30 minutes |
| `bullet_2_icon` | 💡 |
| `bullet_2` | The 3 biggest mistakes professionals make with AI |
| `bullet_3_icon` | 🎯 |
| `bullet_3` | A step-by-step action plan to implement today |
| `bullet_4_icon` | 🏆 |
| `bullet_4` | Live Q&A — get your questions answered |
| `speaker_name` | Jane Smith |
| `speaker_title` | CEO at Acme Corp · AI Expert |
| `speaker_image_url` | *(paste speaker headshot URL)* |
| `speaker_bio` | With 15+ years in accounting... |
| `social_proof_text` | 2,340+ |
| `social_proof_label` | professionals already registered |
| `testimonial_1_text` | This training changed how our firm works. |
| `testimonial_1_author` | John D., CFO |
| `testimonial_2_text` | Already saving 10+ hours monthly. |
| `testimonial_2_author` | Sarah M., Accountant |
| `faq_1_q` | Is this webinar really free? |
| `faq_1_a` | Yes! Completely free. No credit card needed. |
| `faq_2_q` | Will there be a replay? |
| `faq_2_a` | Replay not guaranteed. Attend live! |
| `faq_3_q` | Who is this for? |
| `faq_3_a` | Accounting professionals and firm owners. |
| `cta_button_text` | Reserve My Spot Now → |
| `urgency_text` | Only 50 spots available — register now! |

> **Tip:** You can add up to 6 bullets, 4 testimonials, and 8 FAQs.

---

## Step 2: Add the Apps Script (Middleware)

This is the code that connects your page to WebinarGeek. You do this once per sheet.

### 2.1 Open the Script Editor

1. In your Google Sheet, go to **Extensions → Apps Script**
2. This opens a new tab with a code editor

### 2.2 Paste the Code

1. **Delete** any existing code in the editor (select all → delete)
2. Open the file `apps-script/Code.gs` from this repository
3. **Copy the entire contents** and paste it into the Apps Script editor
4. Click **💾 Save** (or Ctrl+S / Cmd+S)

### 2.3 Set the Script Properties

1. Click the **⚙️ gear icon** (Project Settings) in the left sidebar
2. Scroll down to **Script Properties**
3. Click **Add Script Property** and add these two:

| Property | Value |
|---|---|
| `WEBINARGEEK_API_KEY` | Your WebinarGeek API key (find it at: WebinarGeek → Account → Integrations → API) |
| `WEBINAR_ID` | The webinar ID (from the WebinarGeek URL: `app.webinargeek.com/webinars/`**`THIS_PART`**) |

4. Click **Save script properties**

### 2.4 Deploy as Web App

1. Click **Deploy → New deployment** (top right)
2. Click the **⚙️ gear icon** next to "Select type" → choose **Web app**
3. Set:
   - **Description**: "Webinar Registration API"
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone**
4. Click **Deploy**
5. Click **Authorize access** → select your Google account → **Allow**
   - If you see "This app isn't verified": click **Advanced** → **Go to [project name]** → **Allow**
6. **Copy the Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/ABCDEF.../exec
   ```

> **Save this URL!** You'll need it for the GHL page.

---

## Step 3: Embed in GoHighLevel

### 3.1 Create the Funnel Page

1. Go to **GHL → Sites → Funnels** (or Websites)
2. Create a new funnel or add a page
3. Choose a **blank template**

### 3.2 Add the Registration Page

1. Drag a **"Custom Code"** element onto the page
2. Make it **full width** (remove all padding/margins from the section)
3. Open the file `registration-page.html` from this repository
4. **Copy the entire contents** and paste into the Code element

### 3.3 Add the JavaScript

1. Go to **Page Settings → Tracking Code → Body Code**
2. Add this:
   ```html
   <script src="registration.js"></script>
   ```
   **OR** copy the contents of `registration.js`, wrap in `<script>...</script>` tags, and paste

### 3.4 Configure the Script URL

**Option A — Via URL parameter:**
Set the page URL to include the script URL:
```
https://your-domain.com/webinar?script_url=https://script.google.com/macros/s/YOUR_ID/exec
```

**Option B — Hardcode it (simpler):**
Edit the top of `registration.js` and replace:
```javascript
const SCRIPT_URL = params.get('script_url') || '';
```
with:
```javascript
const SCRIPT_URL = params.get('script_url') || 'https://script.google.com/macros/s/YOUR_ID/exec';
```

---

## Step 4: Test It

1. **Open your GHL page** in a browser
2. ✅ Verify content loads (headline, bullets, speaker, FAQs)
3. ✅ Verify countdown shows correct date/time in your timezone
4. ✅ Submit a test registration with a test email
5. ✅ Verify "Join Webinar" button appears with the correct link
6. ✅ Submit again with the same email → should show "Welcome Back!"
7. ✅ Test on mobile phone

---

## Setting Up a New Client (Quick Checklist)

Once your template is working, setting up a new client takes ~15 minutes:

- [ ] Copy the Google Sheet template
- [ ] Update the Content tab with client's info
- [ ] Update Script Properties with client's WebinarGeek API key + Webinar ID
- [ ] Deploy the Apps Script as a new Web App
- [ ] Copy the Web App URL
- [ ] Create a GHL page, paste the HTML + JS
- [ ] Set the script_url parameter
- [ ] Test the page

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Page shows fallback content | Check that `script_url` is set correctly |
| "Missing WEBINARGEEK_API_KEY" error | Go to Apps Script → Project Settings → Script Properties |
| "Authorization required" | Re-deploy the Apps Script and authorize again |
| CORS / network error | Make sure the Apps Script is deployed with "Anyone" access |
| Registration fails | Check the WebinarGeek webinar ID and API key are correct |
| Countdown shows wrong time | The time auto-converts to viewer's timezone — verify the broadcast time in WebinarGeek is set correctly (it uses the timezone you configured there) |

---

## Updating Content

Clients can update their page content at any time by editing the Google Sheet:

1. Open the Google Sheet
2. Change any value in Column B
3. The page automatically picks up changes (may take a few seconds to refresh)

**No need to re-deploy or touch the code!**
