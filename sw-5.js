const CACHE_NAME = 'calchub-v6'; // bump on every deploy that changes content
const BASE = '/calchub/';

const CORE = [
  BASE,
  BASE + 'index.html',
  BASE + 'app.js',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
];

// Add ALL your calculator page file names here, e.g. 'bmi.html'
const PAGES = [
  'age.html', 'area.html', 'bmi.html', 'bodyfat.html', 'breakeven.html',
  'brick.html', 'cagr.html', 'calorie.html', 'clock.html', 'compound.html',
  'concrete.html', 'countdown.html', 'cryptopl.html', 'currency.html',
  'date.html', 'dca.html', 'derivative.html', 'dilution.html', 'discount.html',
  'emi.html', 'flooring.html', 'fraction.html', 'gpa.html', 'gravity.html',
  'ideal_gas.html', 'idealweight.html', 'inflation.html', 'insurance.html',
  'integral.html', 'invoice.html', 'kinetic.html', 'lcmhcf.html',
  'length.html', 'limit.html', 'loan.html', 'markupmargin.html',
  'matrix.html', 'menstrual.html', 'miningprofit.html', 'molarity.html',
  'molarmass.html', 'mortgage.html', 'ohmslaw.html', 'ovulation.html',
  'paintcoverage.html', 'percent_comp.html', 'percentage.html', 'ph.html',
  'potential.html', 'power.html', 'pregnancy.html', 'pressure.html',
  'prime.html', 'profit.html', 'profitloss.html', 'pythagoras.html',
  'quadratic.html', 'retirement.html', 'roofarea.html', 'salary.html',
  'scientific.html', 'speed.html', 'staking.html', 'statistics.html',
  'stopwatch.html', 'tax.html', 'temperature.html', 'vat.html',
  'velocity.html', 'water.html', 'wave.html', 'weight.html', 'worldclock.html',
].map(p => BASE + p);

const NETWORK_TIMEOUT = 4000; // ms before falling back to cache on bad data

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // allSettled: one missing file will not break the whole install
      Promise.allSettled([...CORE, ...PAGES].map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function offlineFallback(req) {
  const cached = await caches.match(req, { ignoreSearch: true });
  if (cached) return cached;
  const home = await caches.match(BASE + 'index.html');
  if (home) return home;
  return new Response('Offline. Open CalcHub once with data to enable offline use.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave ads/analytics alone

  const isPage =
    req.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('app.js') ||
    (req.headers.get('accept') || '').includes('text/html');

  // Network-first with timeout, so weak data never hangs the calculator
  if (isPage) {
    e.respondWith(
      Promise.race([
        fetch(req).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        }),
        timeout(NETWORK_TIMEOUT),
      ]).catch(() => offlineFallback(req))
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => offlineFallback(req));
    })
  );
});
