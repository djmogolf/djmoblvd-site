/* ════════════════════════════════════════════
   DJ MO BLVD — site config loader v2
   Renders the entire site from assets/data/site-config.json
   (plus admin.html preview in localStorage), and powers the
   day/night mode toggle.
   ════════════════════════════════════════════ */
window.SITE_CONFIG_READY = (async () => {
  let cfg = {};
  try {
    cfg = await (await fetch('assets/data/site-config.json', { cache: 'no-cache' })).json();
  } catch (e) { console.warn('site-config.json not loaded; static fallback HTML stays'); }

  // admin preview override
  try {
    const ov = JSON.parse(localStorage.getItem('djmo-config-preview') || 'null');
    if (ov) { cfg = deepMerge(cfg, ov); console.info('djmo: admin preview active'); }
  } catch (e) {}
  function deepMerge(a, b) {
    if (Array.isArray(b) || typeof b !== 'object' || b === null) return b;
    const out = { ...a };
    for (const k of Object.keys(b)) out[k] = deepMerge(a?.[k], b[k]);
    return out;
  }

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── theme + day/night mode ── */
  function applyTheme(t) {
    const root = document.documentElement.style;
    const vars = { bg: '--bg', bg2: '--bg-2', ink: '--ink', inkDim: '--ink-dim', accent: '--accent', accent2: '--accent-2', line: '--line', onAccent: '--on-accent' };
    Object.entries(vars).forEach(([k, v]) => { if (t && t[k]) root.setProperty(v, t[k]); });
  }
  const presets = cfg.themePresets || {};
  const modes = cfg.modes || {};
  const savedMode = localStorage.getItem('djmo-mode'); // 'day' | 'night' | null
  function themeForMode(mode) { return presets[modes[mode]] || null; }
  let currentMode = savedMode || (modes.night && cfg.theme?.preset === modes.day ? 'day' : 'night');
  applyTheme(savedMode ? (themeForMode(savedMode) || cfg.theme) : cfg.theme);

  // mode toggle button(s)
  const SUN = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>';
  document.querySelectorAll('.mode-toggle').forEach(btn => {
    const paint = () => { btn.innerHTML = currentMode === 'night' ? SUN : MOON; btn.title = currentMode === 'night' ? 'Day mode' : 'Night mode'; };
    paint();
    btn.addEventListener('click', () => {
      currentMode = currentMode === 'night' ? 'day' : 'night';
      localStorage.setItem('djmo-mode', currentMode);
      const t = themeForMode(currentMode);
      if (t) applyTheme(t);
      document.querySelectorAll('.mode-toggle').forEach(b => { b.innerHTML = currentMode === 'night' ? SUN : MOON; b.title = currentMode === 'night' ? 'Day mode' : 'Night mode'; });
    });
  });

  /* ── section spacing (one number drives the whole vertical rhythm) ── */
  const sy = parseFloat(cfg.spacing?.section);
  if (sy > 0) {
    document.documentElement.style.setProperty('--section-y',
      `clamp(${(sy * 0.6).toFixed(2)}rem, ${(sy * 1.35).toFixed(1)}vh, ${sy}rem)`);
  }

  /* ── header size & position, per page (editable in admin) ── */
  const pageKey = /packages\.html$/.test(location.pathname) ? 'packages'
                : /clients\.html$/.test(location.pathname) ? 'clients' : 'index';
  Object.entries(cfg.header || {}).forEach(([page, h]) => {
    const root = document.documentElement.style;
    if (h.height > 0) root.setProperty(`--hd-h-${page}`, h.height + 'vh');
    if (h.width > 0) root.setProperty(`--hd-w-${page}`, h.width + '%');
    root.setProperty(`--hd-shift-${page}`, (parseFloat(h.shift) || 0) + 'px');
  });
  // tab bar offset for THIS page (slides the whole nav band's content down)
  document.documentElement.style.setProperty('--nav-down', (parseFloat(cfg.header?.[pageKey]?.navDown) || 0) + 'px');

  /* ── fonts (editable in admin: Inter / Roboto / Arial / Helvetica / Fraunces) ── */
  const FONT_STACKS = {
    'Inter': "'Inter','Roboto','Helvetica Neue',Arial,sans-serif",
    'Roboto': "'Roboto','Inter','Helvetica Neue',Arial,sans-serif",
    'Arial': "Arial,'Helvetica Neue',Helvetica,sans-serif",
    'Helvetica': "'Helvetica Neue',Helvetica,Arial,sans-serif",
    'Fraunces': "'Fraunces',serif",
  };
  const fonts = cfg.fonts || {};
  const dispName = FONT_STACKS[fonts.display] ? fonts.display : 'Fraunces';
  const bodyName = FONT_STACKS[fonts.body] ? fonts.body : 'Inter';
  if (dispName === 'Roboto' || bodyName === 'Roboto') {
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;0,800;1,400;1,800&display=swap';
    document.head.appendChild(l);
  }
  document.documentElement.style.setProperty('--font-d', FONT_STACKS[dispName]);
  document.documentElement.style.setProperty('--font-b', FONT_STACKS[bodyName]);
  document.documentElement.style.setProperty('--font-i', dispName === 'Fraunces' ? "'Fraunces',serif" : FONT_STACKS[dispName]);
  document.documentElement.classList.toggle('sans-display', dispName !== 'Fraunces');

  /* ── simple text + html slots ── */
  const yr = String(new Date().getFullYear());
  Object.entries(cfg.text || {}).forEach(([k, raw]) => {
    const v = String(raw ?? '').replaceAll('{year}', yr);
    document.querySelectorAll(`[data-cfg="${k}"]`).forEach(el => { el.textContent = v; });
    document.querySelectorAll(`[data-cfg-html="${k}"]`).forEach(el => { el.innerHTML = v; });
    document.querySelectorAll(`[data-cfg-val="${k}"]`).forEach(el => { el.value = v; });
  });

  /* ── portal guest feature list (one per line) ── */
  const pgf = document.querySelector('.portal-list');
  if (pgf && cfg.text?.portalGuestFeatures) {
    pgf.innerHTML = cfg.text.portalGuestFeatures.split('\n').filter(Boolean).map(li => `<li>${esc(li)}</li>`).join('');
  }

  /* ── section titles (two-part) ── */
  Object.entries(cfg.sectionTitles || {}).forEach(([k, parts]) => {
    const el = document.querySelector(`[data-cfg-title="${k}"]`);
    if (el && Array.isArray(parts)) {
      el.innerHTML = `<span class="st-line">${esc(parts[0])}</span> <span class="st-line st-em">${esc(parts[1] || '')}</span>`;
    }
  });

  /* ── images ── */
  const imgs = cfg.images || {};
  document.querySelectorAll('[data-cfg-img]').forEach(el => {
    const key = el.dataset.cfgImg;
    let src = key.includes('.') ? (imgs[key.split('.')[0]] || [])[+key.split('.')[1]] : imgs[key];
    if (src && el.getAttribute('src') !== src) el.src = src;
  });

  /* ── about stats ── */
  const statsWrap = document.querySelector('.about-stats');
  if (statsWrap && Array.isArray(cfg.stats)) {
    statsWrap.innerHTML = cfg.stats.map(s => `<div class="stat"><strong>${esc(s.big)}</strong><span>${esc(s.small)}</span></div>`).join('');
  }

  /* ── services ── */
  // Default click targets by title — guarantees the cards stay clickable even
  // if an editor save drops the per-service link from the config.
  const SERVICE_LINKS = { 'Weddings': 'packages.html', 'Private Events': 'packages.html', 'Corporate': '#inquire' };
  const svcGrid = document.querySelector('.services-grid');
  if (svcGrid && Array.isArray(cfg.services)) {
    svcGrid.innerHTML = cfg.services.map(s => {
      const link = s.link || SERVICE_LINKS[s.title] || '';
      const inner = `
        <div class="service-img"><img src="${esc(imgs[s.img] || s.img)}" data-cfg-img="${esc(s.img)}" alt="${esc(s.title)}"></div>
        <div class="service-body">
          <span class="service-no">${esc(s.no)}</span>
          <h3>${esc(s.title)} ${link ? '<span class="service-arrow" aria-hidden="true">→</span>' : ''}</h3>
          <p>${esc(s.desc)}</p>
          <ul>${(s.features || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
        </div>`;
      return link
        ? `<a class="service-card tilt" data-tilt-max="8" href="${esc(link)}">${inner}</a>`
        : `<article class="service-card tilt" data-tilt-max="8">${inner}</article>`;
    }).join('');
  }

  /* ── marquee ── */
  if (cfg.text?.marquee) {
    document.querySelectorAll('.marquee-track span').forEach(s => { s.textContent = cfg.text.marquee.repeat(2); });
  }

  /* ── venues ── */
  const v = cfg.venues || {};
  [['rowA', '.venue-row-a .venue-track'], ['rowB', '.venue-row-b .venue-track']].forEach(([key, sel]) => {
    const el = document.querySelector(sel);
    if (el && Array.isArray(v[key])) {
      const names = [...v[key], ...v[key]];
      el.innerHTML = names.map(n => `<span>${esc(n)}</span>`).join('');
    }
  });

  /* ── main reel video ── */
  const mr = cfg.mainReel || {};
  const reelVideoEl = document.getElementById('reelVideo');
  if (reelVideoEl && mr.src) {
    if (mr.poster) reelVideoEl.poster = mr.poster;
    const srcEl = reelVideoEl.querySelector('source');
    if (srcEl && srcEl.getAttribute('src') !== mr.src) { srcEl.src = mr.src; reelVideoEl.load(); }
  }

  /* ── drop the needle: clean self-hosted reel videos ── */
  // normalize: a plain Instagram URL (e.g. pasted in the admin) becomes {link} and is skipped as a video
  if (Array.isArray(cfg.reels)) {
    cfg.reels = cfg.reels.map(r => typeof r === 'string' ? { src: '', link: r, label: '' } : r).filter(r => r && r.src);
  }
  if (cfg.mainReel && (typeof cfg.mainReel === 'string' || !String(cfg.mainReel.src || '').match(/\.(mp4|webm|mov)(\?|$)/i))) {
    cfg.mainReel = null; // keep the HTML default instead of a broken source
  }
  const grid = document.getElementById('reelsGrid');
  if (grid && Array.isArray(cfg.reels) && cfg.reels.length) {
    grid.innerHTML = cfg.reels.map((r, i) => `
      <figure class="reel-card" data-reel="${i}">
        <video src="${esc(r.src)}" ${r.poster ? `poster="${esc(r.poster)}"` : ''} muted loop playsinline preload="metadata"></video>
        <div class="reel-card-ui">
          <span class="reel-card-label">${esc(r.label || '')}</span>
          <span class="reel-card-sound">🔇 ${esc(cfg.text?.tapForSound || 'tap for sound')}</span>
        </div>
        ${r.link ? `<a class="reel-card-ig" href="${esc(r.link)}" target="_blank" rel="noopener" title="Open on Instagram" onclick="event.stopPropagation()">↗</a>` : ''}
      </figure>`).join('');

    const cards = [...grid.querySelectorAll('.reel-card')];
    // autoplay muted in view, pause out of view
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      const vid = en.target.querySelector('video');
      if (en.isIntersecting) vid.play().catch(() => {});
      else { vid.pause(); vid.muted = true; en.target.classList.remove('sound-on'); }
    }), { threshold: 0.35 });
    cards.forEach(c => {
      io.observe(c);
      const vid = c.querySelector('video');
      c.addEventListener('click', () => {
        if (vid.muted) {
          cards.forEach(o => { const ov = o.querySelector('video'); ov.muted = true; o.classList.remove('sound-on'); });
          vid.muted = false; vid.play().catch(() => {});
          c.classList.add('sound-on');
        } else { vid.muted = true; c.classList.remove('sound-on'); }
      });
    });
  }

  /* ── process steps ── */
  const procGrid = document.querySelector('.process-grid');
  if (procGrid && Array.isArray(cfg.process)) {
    procGrid.innerHTML = cfg.process.map((p, i) => `
      <li class="step"><span class="step-no">${String(i + 1).padStart(2, '0')}</span><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p></li>`).join('');
  }

  /* ── reviews ── */
  const revTrack = document.querySelector('.reviews-track');
  if (revTrack && Array.isArray(cfg.reviews)) {
    const items = [...cfg.reviews, ...cfg.reviews];
    revTrack.innerHTML = items.map(r => `
      <article class="review"><div class="review-stars">★★★★★</div><p>&ldquo;${esc(r.quote)}&rdquo;</p><span>— ${esc(r.name)}</span></article>`).join('');
  }
  const trust = document.querySelector('.reviews-trust');
  if (trust && cfg.text?.reviewsTrust) {
    const knot = trust.querySelector('a')?.outerHTML || '';
    trust.innerHTML = esc(cfg.text.reviewsTrust).replace(/·.*$/, '· ') + knot;
  }

  /* ── faq ── */
  const faqList = document.querySelector('#faq .faq-list');
  if (faqList && Array.isArray(cfg.faq)) {
    faqList.innerHTML = cfg.faq.map(f => `
      <details class="faq-item"><summary>${esc(f.q)}<span class="faq-x">+</span></summary><p>${f.a}</p></details>`).join('');
  }

  /* ── socials ── */
  document.querySelectorAll('.inquire-socials, .footer-socials').forEach(wrap => {
    if (Array.isArray(cfg.socials)) {
      wrap.innerHTML = cfg.socials.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('');
    }
  });

  /* ── every "Inquire" button leads to the inquiry form section ── */
  const onIndexPage = /(^|\/)(index\.html)?$/.test(location.pathname);
  const inquireHref = onIndexPage ? '#inquire' : 'index.html#inquire';
  document.querySelectorAll('a.pkg-btn, a[href*="request_information"]').forEach(a => {
    if (a.closest('.djep') || a.closest('.portal-card') || a.closest('.portal-fine')) return; // embedded forms + portal links stay
    a.href = inquireHref;
    a.removeAttribute('target');
  });

  /* ── hero title ── */
  const h1a = document.querySelector('.hero-line:not(.hero-line-2) span');
  const h1b = document.querySelector('.hero-line-2 span');
  if (h1a && cfg.text?.heroTitle1) h1a.textContent = cfg.text.heroTitle1;
  if (h1b && cfg.text?.heroTitle2) h1b.textContent = cfg.text.heroTitle2;

  /* ── packages page ── */
  const pp = cfg.packagesPage || {};
  const pkgGrid = document.querySelector('.packages-page .packages-grid');
  if (pkgGrid && Array.isArray(pp.packages)) {
    pkgGrid.innerHTML = pp.packages.map(p => `
      <article class="pkg ${p.flag ? 'pkg-featured' : ''} tilt" data-tilt-max="5">
        ${p.flag ? `<span class="pkg-flag">${esc(p.flag)}</span>` : ''}
        <h3>${esc(p.name)}</h3>
        <p class="pkg-price"><span>from</span> ${esc(p.price)}</p>
        <ul>${(p.features || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
        <a class="pkg-btn" href="index.html#inquire">${esc(cfg.text?.navInquire || 'Inquire')}</a>
      </article>`).join('');
  }
  const alaWrap = document.querySelector('.alacarte-grid');
  if (alaWrap && Array.isArray(pp.alacarte)) {
    const half = Math.ceil(pp.alacarte.length / 2);
    const col = items => `<ul class="menu-list">${items.map(i => `<li><span class="menu-name"><em>${esc(i.name)}</em>${i.tag ? `<span class="menu-tag">${esc(i.tag)}</span>` : ''}</span><span class="menu-dots"></span><span class="menu-price">${esc(i.price)}</span></li>`).join('')}</ul>`;
    alaWrap.innerHTML = col(pp.alacarte.slice(0, half)) + col(pp.alacarte.slice(half));
  }
  const pkgFaqList = document.querySelector('.pkg-faq .faq-list');
  if (pkgFaqList && Array.isArray(pp.pkgFaq)) {
    pkgFaqList.innerHTML = pp.pkgFaq.map(f => `
      <details class="faq-item"><summary>${esc(f.q)}<span class="faq-x">+</span></summary><p>${f.a}</p></details>`).join('');
  }
  const pkgHero = document.querySelector('.pkg-hero');
  if (pkgHero && pp.heroTitle) {
    pkgHero.querySelector('h1').innerHTML = `${esc(pp.heroTitle[0])} <em>${esc(pp.heroTitle[1] || '')}</em>`;
    if (pp.heroBody) pkgHero.querySelector('p').textContent = pp.heroBody;
  }

  /* ── footer ── */
  const fl = document.querySelector('.footer > p:not(.footer-fine)');
  if (fl && cfg.text?.footerLine) fl.textContent = cfg.text.footerLine;

  /* ── nav tabs (editable in admin: cfg.nav) ── */
  if (Array.isArray(cfg.nav) && cfg.nav.length) {
    const onIndex = /(^|\/)(index\.html)?$/.test(location.pathname);
    const fix = h => onIndex ? h.replace(/^index\.html(#|$)/, (m, a) => a ? '#' : '#top').replace(/^#$/, '#top') : h;
    const links = cfg.nav.map(n => `<a href="${esc(fix(n.href))}">${esc(n.label)}</a>`).join('');
    document.querySelectorAll('.nav-links').forEach(el => { el.innerHTML = links; });
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.innerHTML = links + `<a href="${onIndex ? '#inquire' : 'index.html#inquire'}">Inquire</a>`;
  }

  /* ── SEO: structured data, auto-generated from this config ──
     Editing reviews, packages, FAQ, or socials in the admin keeps
     Google's rich data in sync automatically. */
  try {
    const seo = cfg.seo || {};
    const base = (seo.siteUrl || 'https://djmoblvd.com').replace(/\/$/, '');
    // keep the browser tab + meta description in sync with the editable config
    if (pageKey === 'index') {
      if (seo.title) document.title = seo.title;
      if (seo.description) document.querySelector('meta[name="description"]')?.setAttribute('content', seo.description);
    }
    const graphs = [];
    const biz = {
      '@type': 'EntertainmentBusiness',
      '@id': base + '/#business',
      name: seo.businessName || 'DJ Mo Blvd',
      url: base + '/',
      image: base + '/assets/og-image.jpg',
      logo: base + '/' + (cfg.images?.logo || 'assets/img/djmologo.png'),
      description: seo.description || '',
      priceRange: seo.priceRange || '$2,000 - $4,000',
      address: { '@type': 'PostalAddress', addressLocality: seo.city || 'Las Vegas', addressRegion: seo.state || 'NV', addressCountry: 'US' },
      areaServed: { '@type': 'City', name: seo.city || 'Las Vegas' },
      sameAs: (cfg.socials || []).map(s => s.url).filter(u => !u.includes('google.com/search')),
    };
    if (seo.ratingValue && seo.reviewCount) {
      biz.aggregateRating = { '@type': 'AggregateRating', ratingValue: seo.ratingValue, reviewCount: seo.reviewCount, bestRating: '5' };
    }
    if (Array.isArray(cfg.reviews) && cfg.reviews.length) {
      biz.review = cfg.reviews.map(r => ({
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        author: { '@type': 'Person', name: r.name },
        reviewBody: r.quote,
      }));
    }
    if (Array.isArray(cfg.packagesPage?.packages) && cfg.packagesPage.packages.length) {
      biz.makesOffer = cfg.packagesPage.packages.map(p => ({
        '@type': 'Offer',
        name: p.name + ' — DJ package',
        price: String(p.price || '').replace(/[^0-9.]/g, ''),
        priceCurrency: 'USD',
        url: base + '/packages.html',
      }));
    }
    graphs.push(biz);
    if (pageKey === 'index' && Array.isArray(cfg.faq) && cfg.faq.length) {
      graphs.push({
        '@type': 'FAQPage',
        mainEntity: cfg.faq.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: String(f.a).replace(/<[^>]+>/g, '') },
        })),
      });
    }
    if (pageKey !== 'index') {
      graphs.push({
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: base + '/' },
          { '@type': 'ListItem', position: 2, name: pageKey === 'packages' ? 'Packages & Pricing' : 'Client Portal', item: base + '/' + pageKey + '.html' },
        ],
      });
    }
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graphs });
    document.head.appendChild(ld);
  } catch (e) { console.warn('SEO schema skipped:', e); }

  /* ── mobile burger menu (all pages) ── */
  const burger = document.querySelector('.nav-burger');
  const menu = document.getElementById('mobileMenu');
  if (burger && menu) {
    const close = () => { burger.classList.remove('open'); menu.classList.remove('open'); document.body.style.overflow = ''; };
    burger.addEventListener('click', () => {
      const open = !menu.classList.contains('open');
      burger.classList.toggle('open', open);
      menu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      close();
      const href = a.getAttribute('href');
      if (href.startsWith('#') && window.lenis) {
        const target = document.querySelector(href);
        if (target) window.lenis.scrollTo(target, { duration: 1.2 });
      }
    }));
  }

  return cfg;
})();
