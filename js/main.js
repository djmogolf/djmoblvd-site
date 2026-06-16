/* ════════════════════════════════════════════
   DJ MO BLVD — scroll cinema engine
   ════════════════════════════════════════════ */
gsap.registerPlugin(ScrollTrigger);

const DEFAULT_SEQS = {
  hero: { dir: 'assets/frames/hero', count: 120 },
};

const pad = n => String(n).padStart(3, '0');

/* ── frame sequence loader/renderer ── */
class FrameSeq {
  constructor({ dir, count, canvas, v }) {
    this.dir = dir;
    this.count = count;
    this.v = v || '';
    this.canvas = document.getElementById(canvas);
    this.ctx = this.canvas.getContext('2d');
    this.images = new Array(count);
    this.loaded = 0;
    this.frame = 0;
    this.ready = false;
    this.resize();
    window.addEventListener('resize', () => { this.resize(); this.draw(); });
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
  }
  load(onProgress, onDone) {
    for (let i = 0; i < this.count; i++) {
      const img = new Image();
      img.src = `${this.dir}/f_${pad(i + 1)}.jpg${this.v ? `?v=${this.v}` : ''}`;
      img.onload = img.onerror = () => {
        this.loaded++;
        if (i === 0) { this.ready = true; this.draw(); }
        onProgress && onProgress(this.loaded / this.count);
        if (this.loaded === this.count) { this.ready = true; this.draw(); onDone && onDone(); }
      };
      this.images[i] = img;
    }
  }
  setProgress(p) {
    const f = Math.max(0, Math.min(this.count - 1, Math.round(p * (this.count - 1))));
    if (f !== this.frame) { this.frame = f; this.draw(); }
  }
  draw() {
    let img = this.images[this.frame];
    // fall back to nearest loaded frame
    if (!img || !img.complete || !img.naturalWidth) {
      for (let d = 1; d < this.count; d++) {
        const a = this.images[this.frame - d], b = this.images[this.frame + d];
        if (a && a.complete && a.naturalWidth) { img = a; break; }
        if (b && b.complete && b.naturalWidth) { img = b; break; }
      }
    }
    if (!img || !img.naturalWidth) return;
    const cw = this.canvas.width, ch = this.canvas.height;
    const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    let dw, dh, dx, dy;
    if (cr > ir) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
    else { dh = ch; dw = ch * ir; dy = 0; dx = (cw - dw) / 2; }
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, dx, dy, dw, dh);
  }
}

let hero = null;

/* ── loader: preload hero frames, then unveil ── */
const loaderEl = document.getElementById('loader');
const fillEl = document.getElementById('loaderFill');
const pctEl = document.getElementById('loaderPct');
let siteStarted = false;

(async () => {
  // sequences are editable in admin.html (cfg.sequences)
  let seqs = DEFAULT_SEQS;
  try {
    const cfg = await window.SITE_CONFIG_READY;
    if (cfg && cfg.sequences) seqs = { ...DEFAULT_SEQS, ...cfg.sequences };
  } catch (e) { /* fall back to defaults */ }
  hero = new FrameSeq({ ...seqs.hero, canvas: 'heroCanvas' });
  hero.load(
    p => {
      const pct = Math.round(p * 100);
      fillEl.style.width = pct + '%';
      pctEl.textContent = pct + '%';
      if (p >= 0.4 && !siteStarted) startSite();   // enough buffered to begin
    },
    () => { if (!siteStarted) startSite(); }
  );
  // safety: never trap the user on the loader
  setTimeout(() => { if (!siteStarted) startSite(); }, 9000);
})();

function startSite() {
  siteStarted = true;
  fillEl.style.width = '100%';
  pctEl.textContent = '100%';
  setTimeout(() => {
    loaderEl.classList.add('done');
    introAnimation();
  }, 350);
}

/* ── smooth scroll (Lenis + GSAP ticker) ── */
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
window.lenis = lenis;
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

/* ── intro ── */
function introAnimation() {
  gsap.timeline()
    .to('.hero-line span', { y: 0, duration: 1.1, ease: 'power4.out', stagger: 0.12 }, 0.1)
    .to('.hero-tag', { opacity: 1, duration: 1.2, ease: 'power2.out' }, 0.9)
    .from('.hero-eyebrow', { opacity: 0, y: 14, duration: .9, ease: 'power2.out' }, 0.4)
    .from('.nav', { y: -30, opacity: 0, duration: .8, ease: 'power2.out' }, 0.7);
}

/* ── HERO scrub: frames + 3D title flight ── */
ScrollTrigger.create({
  trigger: '#hero',
  start: 'top top',
  end: 'bottom bottom',
  scrub: true,
  onUpdate: self => {
    const p = self.progress;
    if (hero) hero.setProgress(Math.min(1, p / 0.82));
    // title flies toward camera & dissolves
    const c = document.getElementById('heroContent');
    const t = Math.min(1, p / 0.38);
    c.style.transform = `translateZ(${t * 480}px) translateY(${t * -6}vh)`;
    c.style.opacity = String(1 - t);
    c.style.pointerEvents = t > .5 ? 'none' : '';
    // closing line
    const e = document.getElementById('heroEnd');
    const u = gsap.utils.clamp(0, 1, (p - 0.6) / 0.25);
    e.style.opacity = String(u);
    e.style.transform = `scale(${0.92 + u * 0.08})`;
    // scroll cue fades fast
    document.getElementById('scrollCue').style.opacity = String(1 - Math.min(1, p / 0.08));
  }
});

/* ── canvases resize with sticky sections ── */
ScrollTrigger.addEventListener('refreshInit', () => { if (hero) { hero.resize(); hero.draw(); } });

/* ── nav behavior ── */
let lastY = 0;
const nav = document.getElementById('nav');
lenis.on('scroll', ({ scroll }) => {
  // nav keeps its solid band at all times (matches packages/client pages)
  nav.classList.toggle('hide', scroll > 500 && scroll > lastY + 4);
  if (scroll < lastY - 4 || scroll <= 500) nav.classList.remove('hide');
  lastY = scroll;
});
// anchor links through Lenis (delegated — works for config-rendered nav too)
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = document.querySelector(a.getAttribute('href'));
  if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: 0, duration: 1.4 }); }
});

(async () => {
if (window.SITE_CONFIG_READY) { try { await window.SITE_CONFIG_READY; } catch(e){} }
/* ── section title reveals ── */
gsap.utils.toArray('.section-title').forEach(t => {
  gsap.from(t.querySelectorAll('.st-line'), {
    yPercent: 60, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: t, start: 'top 85%' }
  });
});

/* ── about portrait inner parallax ── */
gsap.utils.toArray('.parallax-img').forEach(img => {
  gsap.fromTo(img, { yPercent: -8 }, {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: img.closest('.about-media'), start: 'top bottom', end: 'bottom top', scrub: true }
  });
});

/* ── card reveals ── */
gsap.utils.toArray('.service-card, .pkg, .review').forEach((el, i) => {
  gsap.from(el, {
    y: 50, opacity: 0, duration: .9, ease: 'power3.out', delay: (i % 4) * 0.07,
    scrollTrigger: { trigger: el, start: 'top 92%' }
  });
});

/* ── 3D mouse tilt ── */
const fine = window.matchMedia('(pointer:fine)').matches;
if (fine) {
  document.querySelectorAll('.tilt').forEach(el => {
    const max = parseFloat(el.dataset.tiltMax || 8);
    let raf = null;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateY(${x * max}deg) rotateX(${ -y * max}deg) translateZ(6px)`;
      });
    });
    el.addEventListener('mouseleave', () => {
      if (raf) cancelAnimationFrame(raf);
      el.style.transition = 'transform .6s cubic-bezier(.2,.7,.2,1)';
      el.style.transform = 'perspective(900px) rotateY(0) rotateX(0) translateZ(0)';
      setTimeout(() => el.style.transition = '', 600);
    });
  });
}

/* ── reel player ── */
const reelVideo = document.getElementById('reelVideo');
const reelPlay = document.getElementById('reelPlay');
if (reelVideo && reelPlay) {
  reelPlay.addEventListener('click', () => {
    reelPlay.classList.add('hidden');
    reelVideo.setAttribute('controls', '');
    reelVideo.muted = false;
    reelVideo.play();
  });
  reelVideo.addEventListener('pause', () => { if (reelVideo.currentTime > 0 && !reelVideo.ended) return; });
  reelVideo.addEventListener('ended', () => {
    reelPlay.classList.remove('hidden');
    reelVideo.removeAttribute('controls');
  });
  // pause when the reel scrolls out of view
  new IntersectionObserver(entries => {
    entries.forEach(en => { if (!en.isIntersecting && !reelVideo.paused) reelVideo.pause(); });
  }, { threshold: 0.2 }).observe(reelVideo);
}

/* ── step + faq reveals ── */
gsap.utils.toArray('.step, .faq-item').forEach((el, i) => {
  gsap.from(el, {
    y: 36, opacity: 0, duration: .8, ease: 'power3.out', delay: (i % 4) * 0.06,
    scrollTrigger: { trigger: el, start: 'top 94%' }
  });
});

/* ── insta + vibe reveals ── */
gsap.utils.toArray('.insta-item, .vibe, .avail-cal').forEach((el, i) => {
  gsap.from(el, {
    y: 36, opacity: 0, duration: .8, ease: 'power3.out', delay: (i % 3) * 0.07,
    scrollTrigger: { trigger: el, start: 'top 94%' }
  });
});

/* ── misc ── */
const yearEl = document.getElementById('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
