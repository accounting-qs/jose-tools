/**
 * Webinar Registration Page — JavaScript
 * Handles: config loading, countdown, date selection, form submission, thank-you state
 *
 * Config via URL params:
 *   ?script_url=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 *
 * The Apps Script handles everything:
 *   - Content from the Google Sheet
 *   - Webinar info from WebinarGeek API
 *   - Subscriber registration
 */

(function () {
    'use strict';

    // ─── Config from URL params ────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const SCRIPT_URL = params.get('script_url') || 'https://script.google.com/a/macros/quantum-scaling.com/s/AKfycbz9g01QsAPLjGV-5nDwQqG63l-6KXseVawMGdvoS_ztjASQUW_Kgy8mnWuRBZzaYdK2mg/exec';

    // ─── State ─────────────────────────────────────────────
    let selectedBroadcast = null;
    let allBroadcasts = [];
    let webinarTitle = '';
    let countdownInterval = null;
    let content = {};

    // ─── JSONP Helper (bypasses CORS) ─────────────────────
    var jsonpCounter = 0;
    function jsonp(url) {
        return new Promise(function (resolve, reject) {
            var callbackName = '_wbr_cb_' + (++jsonpCounter) + '_' + Date.now();
            var script = document.createElement('script');
            var timer = setTimeout(function () {
                cleanup();
                reject(new Error('Request timed out'));
            }, 30000);

            function cleanup() {
                clearTimeout(timer);
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);
            }

            window[callbackName] = function (data) {
                cleanup();
                resolve(data);
            };

            script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
            script.onerror = function () { cleanup(); reject(new Error('Network error')); };
            document.head.appendChild(script);
        });
    }

    // ─── Init ──────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        setupScrollReveal();
        setupMobileCta();
        setupForm();

        if (!SCRIPT_URL) {
            applyContent(getFallbackContent());
            return;
        }

        try {
            var data = await jsonp(SCRIPT_URL + '?action=all');

            if (data.error) throw new Error(data.error);

            applyContent(data.content || getFallbackContent());
            applyWebinarInfo(data);
        } catch (err) {
            console.warn('Data load failed, using fallback:', err);
            applyContent(getFallbackContent());
        }
    });

    // ─── Fallback Content ──────────────────────────────────
    function getFallbackContent() {
        return {
            page_title: 'Free Live Webinar',
            headline: 'Join Our Free Live Training',
            sub_headline: 'Discover strategies that top professionals use to get ahead',
            banner_image_url: '',
            brand_color: '#6C3AED',
            bullet_1_icon: '🚀', bullet_1: 'Proven strategies you can implement immediately',
            bullet_2_icon: '💡', bullet_2: 'Inside secrets from industry leaders',
            bullet_3_icon: '🎯', bullet_3: 'Step-by-step action plan you can follow',
            bullet_4_icon: '🏆', bullet_4: 'Live Q&A with the expert presenter',
            speaker_name: 'Expert Speaker', speaker_title: 'Industry Leader',
            speaker_image_url: '', speaker_bio: 'A recognized expert with years of experience.',
            social_proof_text: '1,250+', social_proof_label: 'professionals already registered',
            testimonial_1_text: 'This training completely changed my approach.',
            testimonial_1_author: 'Happy Attendee',
            testimonial_2_text: 'The most valuable webinar I have ever attended.',
            testimonial_2_author: 'Satisfied Professional',
            faq_1_q: 'Is this webinar really free?',
            faq_1_a: 'Yes! This is a completely free live training session.',
            faq_2_q: 'Will there be a replay?',
            faq_2_a: 'A replay is not guaranteed. We recommend attending live.',
            faq_3_q: 'Who is this for?',
            faq_3_a: 'This is designed for professionals who want to level up their skills.',
            cta_button_text: 'Reserve My Spot Now →',
            urgency_text: 'Limited spots available — register now!',
        };
    }

    // ─── Apply Content to Page ─────────────────────────────
    function applyContent(c) {
        content = c;

        // Brand color
        if (c.brand_color) {
            document.documentElement.style.setProperty('--brand', c.brand_color);
            document.documentElement.style.setProperty('--brand-light', adjustColor(c.brand_color, 30));
            document.documentElement.style.setProperty('--brand-dark', adjustColor(c.brand_color, -30));
            document.documentElement.style.setProperty('--glow', c.brand_color + '4D');
        }

        // Meta & title
        if (c.page_title) {
            document.getElementById('page-title').textContent = c.page_title;
            const ogTitle = document.getElementById('og-title');
            if (ogTitle) ogTitle.content = c.page_title;
        }
        if (c.headline) document.getElementById('headline').textContent = c.headline;
        if (c.sub_headline) document.getElementById('subHeadline').textContent = c.sub_headline;

        // Banner
        const bannerEl = document.getElementById('heroBanner');
        if (c.banner_image_url) {
            bannerEl.src = c.banner_image_url;
        } else {
            bannerEl.style.background = 'linear-gradient(135deg, var(--brand-dark), var(--brand))';
            bannerEl.style.minHeight = '280px';
        }

        // Bullets
        const bulletsContainer = document.getElementById('bullets');
        bulletsContainer.innerHTML = '';
        for (let i = 1; i <= 6; i++) {
            const text = c['bullet_' + i];
            if (!text) continue;
            const icon = c['bullet_' + i + '_icon'] || '✓';
            const el = document.createElement('div');
            el.className = 'bullet';
            el.innerHTML = '<div class="bullet__icon">' + icon + '</div><div class="bullet__text">' + text + '</div>';
            bulletsContainer.appendChild(el);
        }

        // Speaker
        if (c.speaker_name) document.getElementById('speakerName').textContent = c.speaker_name;
        if (c.speaker_title) document.getElementById('speakerTitle').textContent = c.speaker_title;
        if (c.speaker_bio) document.getElementById('speakerBio').textContent = c.speaker_bio;
        if (c.speaker_image_url) document.getElementById('speakerImg').src = c.speaker_image_url;

        // Social proof
        if (c.social_proof_text) animateCounter(document.getElementById('proofCounter'), c.social_proof_text);
        if (c.social_proof_label) document.getElementById('proofLabel').textContent = c.social_proof_label;

        // Testimonials
        const testContainer = document.getElementById('testimonials');
        testContainer.innerHTML = '';
        for (let i = 1; i <= 4; i++) {
            const text = c['testimonial_' + i + '_text'];
            if (!text) continue;
            const author = c['testimonial_' + i + '_author'] || '';
            const el = document.createElement('div');
            el.className = 'testimonial';
            el.innerHTML = '<p class="testimonial__text">' + text + '</p><div class="testimonial__author">' + author + '</div>';
            testContainer.appendChild(el);
        }

        // FAQ
        const faqContainer = document.getElementById('faqList');
        faqContainer.innerHTML = '';
        for (let i = 1; i <= 8; i++) {
            const q = c['faq_' + i + '_q'];
            if (!q) continue;
            const a = c['faq_' + i + '_a'] || '';
            const el = document.createElement('div');
            el.className = 'faq-item';
            el.innerHTML = '<button class="faq-item__q">' + q + '<span class="arrow">▼</span></button>' +
                '<div class="faq-item__a"><p>' + a + '</p></div>';
            el.querySelector('.faq-item__q').addEventListener('click', () => el.classList.toggle('open'));
            faqContainer.appendChild(el);
        }

        // CTA text
        if (c.cta_button_text) document.getElementById('btnText').textContent = c.cta_button_text;
        if (c.urgency_text) document.getElementById('urgencyNote').textContent = c.urgency_text;
    }

    // ─── Apply Webinar Info ────────────────────────────────
    function applyWebinarInfo(data) {
        if (!data) return;
        webinarTitle = (data.webinar && data.webinar.title) || content.page_title || 'Webinar';
        allBroadcasts = data.broadcasts || [];

        if (allBroadcasts.length === 0) {
            document.getElementById('dateSection').classList.add('hidden');
            document.getElementById('countdownLabel').textContent = 'Event date coming soon';
            return;
        }

        if (allBroadcasts.length === 1) {
            document.getElementById('dateSection').classList.add('hidden');
            selectBroadcast(allBroadcasts[0]);
        } else {
            renderDateCards();
            selectBroadcast(allBroadcasts[0]);
        }
    }

    // ─── Render Date Cards ─────────────────────────────────
    function renderDateCards() {
        const container = document.getElementById('dateCards');
        container.innerHTML = '';

        allBroadcasts.forEach(function (bc, idx) {
            const dt = new Date(bc.date);
            const dateStr = dt.toLocaleDateString(undefined, {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            });
            const timeStr = dt.toLocaleTimeString(undefined, {
                hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
            });

            const card = document.createElement('div');
            card.className = 'date-card' + (idx === 0 ? ' selected' : '');
            card.innerHTML =
                '<div class="date-card__icon">📅</div>' +
                '<div class="date-card__info">' +
                '<div class="date-card__date">' + dateStr + '</div>' +
                '<div class="date-card__time">' + timeStr + ' (your time)</div>' +
                '</div>' +
                '<div class="date-card__check"></div>';
            card.addEventListener('click', function () {
                container.querySelectorAll('.date-card').forEach(function (c) { c.classList.remove('selected'); });
                card.classList.add('selected');
                selectBroadcast(bc);
            });
            container.appendChild(card);
        });
    }

    // ─── Select Broadcast & Start Countdown ────────────────
    function selectBroadcast(bc) {
        selectedBroadcast = bc;
        const dt = new Date(bc.date);
        const dateStr = dt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        const timeStr = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
        document.getElementById('countdownLabel').textContent = '🔴 Live on ' + dateStr + ' at ' + timeStr + ' (your time)';
        startCountdown(dt);
    }

    // ─── Countdown Timer ──────────────────────────────────
    function startCountdown(targetDate) {
        if (countdownInterval) clearInterval(countdownInterval);
        function update() {
            const diff = targetDate - new Date();
            if (diff <= 0) {
                document.getElementById('cd-days').textContent = '00';
                document.getElementById('cd-hours').textContent = '00';
                document.getElementById('cd-mins').textContent = '00';
                document.getElementById('cd-secs').textContent = '00';
                document.getElementById('countdownLabel').textContent = '🔴 LIVE NOW — Join the webinar!';
                clearInterval(countdownInterval);
                return;
            }
            document.getElementById('cd-days').textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
            document.getElementById('cd-hours').textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
            document.getElementById('cd-mins').textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
            document.getElementById('cd-secs').textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
        }
        update();
        countdownInterval = setInterval(update, 1000);
    }

    // ─── Form Submission ──────────────────────────────────
    function setupForm() {
        document.getElementById('regForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const btn = document.getElementById('btnSubmit');
            const errorEl = document.getElementById('formError');
            errorEl.classList.remove('visible');

            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();

            if (!email) return showError('Please enter your email address');
            if (!selectedBroadcast && allBroadcasts.length > 0) return showError('Please select a date');
            if (!SCRIPT_URL) return showError('Registration not configured. Please contact the organizer.');

            btn.classList.add('loading');
            btn.disabled = true;

            try {
                // Use JSONP via GET to bypass CORS
                var regUrl = SCRIPT_URL + '?action=register' +
                    '&email=' + encodeURIComponent(email) +
                    '&name=' + encodeURIComponent(name) +
                    '&broadcast_id=' + encodeURIComponent(selectedBroadcast ? selectedBroadcast.broadcast_id : '') +
                    '&episode_id=' + encodeURIComponent(selectedBroadcast ? selectedBroadcast.episode_id : '') +
                    '&webinar_id=' + encodeURIComponent(selectedBroadcast ? (selectedBroadcast.webinar_id || '') : '');

                var data = await jsonp(regUrl);
                if (data.error) throw new Error(data.error);

                showThankYou(data.confirmation_link, data.already_registered);
            } catch (err) {
                showError(err.message || 'Something went wrong. Please try again.');
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        });
    }

    function showError(msg) {
        const el = document.getElementById('formError');
        el.textContent = msg;
        el.classList.add('visible');
    }

    // ─── Thank You State ──────────────────────────────────
    function showThankYou(confirmationLink, alreadyRegistered) {
        document.getElementById('formState').style.display = 'none';
        const ty = document.getElementById('thankyouState');
        ty.classList.add('active');

        if (alreadyRegistered) {
            ty.querySelector('.thankyou__title').textContent = 'Welcome Back!';
            ty.querySelector('.thankyou__sub').textContent =
                "You were already registered. Here's your join link — see you there!";
        }

        if (confirmationLink) {
            document.getElementById('btnJoin').href = confirmationLink;
        } else {
            document.getElementById('btnJoin').style.display = 'none';
        }

        // Build calendar links
        if (selectedBroadcast) {
            const dt = new Date(selectedBroadcast.date);
            const duration = selectedBroadcast.duration_minutes || 60;
            const endDt = new Date(dt.getTime() + duration * 60000);
            const title = webinarTitle || 'Webinar';

            document.getElementById('calGoogle').href = buildGoogleCalUrl(title, dt, endDt, confirmationLink);
            document.getElementById('calIcs').href = buildIcsUrl(title, dt, endDt, confirmationLink);
        }

        document.getElementById('mobileCta').classList.remove('visible');
        document.getElementById('finalCtaSection').classList.add('hidden');
    }

    // ─── Calendar Helpers ──────────────────────────────────
    function buildGoogleCalUrl(title, start, end, link) {
        var fmt = function (d) { return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; };
        return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
            '&text=' + encodeURIComponent(title) +
            '&dates=' + fmt(start) + '/' + fmt(end) +
            '&details=' + encodeURIComponent(link ? 'Join link: ' + link : '');
    }

    function buildIcsUrl(title, start, end, link) {
        var fmt = function (d) { return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; };
        var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
            'DTSTART:' + fmt(start), 'DTEND:' + fmt(end), 'SUMMARY:' + title,
            link ? 'DESCRIPTION:Join link: ' + link : '', link ? 'URL:' + link : '',
            'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
        return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    }

    // ─── Scroll Reveal ─────────────────────────────────────
    function setupScrollReveal() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });
    }

    // ─── Mobile Sticky CTA ────────────────────────────────
    function setupMobileCta() {
        var mobileCta = document.getElementById('mobileCta');
        var formSection = document.getElementById('formSection');
        var observer = new IntersectionObserver(function (entries) {
            if (!document.getElementById('thankyouState').classList.contains('active')) {
                mobileCta.classList.toggle('visible', !entries[0].isIntersecting);
            }
        }, { threshold: 0.1 });
        observer.observe(formSection);
    }

    // ─── Animated Counter ──────────────────────────────────
    function animateCounter(el, target) {
        var suffix = target.replace(/[0-9,]/g, '');
        var num = parseInt(target.replace(/[^0-9]/g, ''), 10);
        if (isNaN(num)) { el.textContent = target; return; }
        var observer = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                var current = 0, step = Math.max(1, Math.floor(num / 60));
                var interval = setInterval(function () {
                    current += step;
                    if (current >= num) { current = num; clearInterval(interval); }
                    el.textContent = current.toLocaleString() + suffix;
                }, 25);
                observer.unobserve(el);
            }
        }, { threshold: 0.5 });
        observer.observe(el);
    }

    // ─── Color Utility ────────────────────────────────────
    function adjustColor(hex, amount) {
        hex = hex.replace('#', '');
        var r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
        var g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
        var b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
        return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
    }

})();
