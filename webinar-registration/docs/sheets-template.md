# Google Sheets CMS Template

## How It Works

The registration page dynamically loads content from a Google Sheet. Each client gets a copy of the template sheet, fills in their content, and the page auto-updates.

## Sheet Structure

The sheet uses a simple **key-value** format:

| Column A (Key) | Column B (Value) |
|---|---|
| `page_title` | Master AI for Accounting — Free Live Training |
| `headline` | Discover How to Automate 80% of Your Accounting Tasks with AI |
| `sub_headline` | Join 500+ professionals who have already transformed their workflow |
| `banner_image_url` | https://your-image-host.com/banner.jpg |
| `brand_color` | #6C3AED |
| `bullet_1_icon` | 🚀 |
| `bullet_1` | How to set up AI automation in under 30 minutes |
| `bullet_2_icon` | 💡 |
| `bullet_2` | The 3 biggest mistakes professionals make with AI tools |
| `bullet_3_icon` | 🎯 |
| `bullet_3` | A step-by-step action plan to implement immediately |
| `bullet_4_icon` | 🏆 |
| `bullet_4` | Live Q&A — get your specific questions answered |
| `speaker_name` | Jane Smith |
| `speaker_title` | CEO at Acme Corp · AI Automation Expert |
| `speaker_image_url` | https://your-image-host.com/jane.jpg |
| `speaker_bio` | With 15+ years in accounting and technology, Jane has helped over 200 firms automate their workflows using AI. |
| `social_proof_text` | 2,340+ |
| `social_proof_label` | professionals already registered |
| `testimonial_1_text` | This training completely transformed how our firm handles bookkeeping. Incredible value. |
| `testimonial_1_author` | John D., CFO at TechCorp |
| `testimonial_2_text` | I implemented the strategies the same week. Already saving 10+ hours monthly. |
| `testimonial_2_author` | Sarah M., Senior Accountant |
| `faq_1_q` | Is this webinar really free? |
| `faq_1_a` | Yes! This is a completely free live training. No credit card required. |
| `faq_2_q` | Will there be a replay? |
| `faq_2_a` | A replay is not guaranteed. We strongly recommend attending live. |
| `faq_3_q` | Who is this for? |
| `faq_3_a` | This training is designed for accounting professionals, CFOs, and firm owners looking to leverage AI. |
| `faq_4_q` | What do I need to join? |
| `faq_4_a` | Just a computer or phone with internet access. You'll receive a unique join link after registering. |
| `cta_button_text` | Reserve My Spot Now → |
| `urgency_text` | Only 50 spots available — don't miss out! |

## Setup Steps

1. **Create a new Google Sheet** and name it (e.g., "Client Name - Webinar Config")
2. **Column A** = key names (exactly as shown above)
3. **Column B** = values for each key
4. **Publish the sheet**: Go to `File → Share → Publish to Web → Entire Document → Publish`
5. **Copy the Sheet ID** from the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
6. Use this Sheet ID in the page URL parameter: `?sheet_id=SHEET_ID_HERE`

## Supported Keys

You can add up to:
- **6 bullets** (`bullet_1` through `bullet_6`, each with matching `_icon`)
- **4 testimonials** (`testimonial_1` through `testimonial_4`, each with `_text` and `_author`)
- **8 FAQs** (`faq_1` through `faq_8`, each with `_q` and `_a`)

Leave unused keys empty or omit them — the page will only render sections with content.
