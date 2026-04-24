/* ==========================================================================
   TRUE PLAYERS — Colour picker (client preview tool)
   ==========================================================================
   Injects a floating swatch picker that swaps --accent and related variables
   across the site. Choice persists via sessionStorage for the session.
   ========================================================================== */

(function () {
  'use strict';

  var COLOURS = [
    { hex: '#0B72FE', name: 'Original', isDefault: true },
    { hex: '#5AB3FF', name: 'Sky' },
    { hex: '#4FD5E0', name: 'Cyan' },
    { hex: '#6DE8A6', name: 'Mint' },
    { hex: '#B2F042', name: 'Lime' },
    { hex: '#F5CB3C', name: 'Amber' },
    { hex: '#FF9D4F', name: 'Tangerine' },
    { hex: '#FF6B6B', name: 'Coral' },
    { hex: '#FF6B9D', name: 'Rose' },
    { hex: '#E879F9', name: 'Magenta' },
    { hex: '#B286FD', name: 'Lilac' },
    { hex: '#7C6BFF', name: 'Indigo' }
  ];

  var STORAGE_KEY = 'tp-accent-colour';
  var DEFAULT_HEX = '#0B72FE';

  // ---------- colour maths ----------

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  function hexToRgbaString(hex, alpha) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + alpha + ')';
  }

  // Relative luminance per WCAG
  function luminance(hex) {
    var c = hexToRgb(hex);
    var channel = function (v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }

  // Readability: pick near-black text for light accents, white for dark accents
  function pickOnAccent(hex) {
    return luminance(hex) > 0.45 ? '#0A0A0A' : '#FFFFFF';
  }

  // Lighten a hex by mixing towards white
  function lightenHex(hex, amount) {
    var c = hexToRgb(hex);
    var mix = function (v) { return Math.round(v + (255 - v) * amount); };
    var toHex = function (v) { return v.toString(16).padStart(2, '0'); };
    return '#' + toHex(mix(c.r)) + toHex(mix(c.g)) + toHex(mix(c.b));
  }

  // ---------- apply ----------

  function applyAccent(hex) {
    var root = document.documentElement;
    var onAccent = pickOnAccent(hex);
    var hoverHex = lightenHex(hex, 0.12);
    var onAccentSoft = onAccent === '#FFFFFF'
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(10, 10, 10, 0.18)';

    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-hover', hoverHex);
    root.style.setProperty('--accent-glow', hexToRgbaString(hex, 0.08));
    root.style.setProperty('--accent-glow-strong', hexToRgbaString(hex, 0.2));
    root.style.setProperty('--on-accent', onAccent);
    root.style.setProperty('--on-accent-soft', onAccentSoft);
  }

  // ---------- storage ----------

  function readStored() {
    try { return sessionStorage.getItem(STORAGE_KEY); }
    catch (e) { return null; }
  }

  function writeStored(hex) {
    try { sessionStorage.setItem(STORAGE_KEY, hex); }
    catch (e) { /* ignore */ }
  }

  function clearStored() {
    try { sessionStorage.removeItem(STORAGE_KEY); }
    catch (e) { /* ignore */ }
  }

  // Apply stored colour as early as possible to avoid flashes on nav.
  var initialHex = readStored() || DEFAULT_HEX;
  applyAccent(initialHex);

  // ---------- widget ----------

  function build() {
    var wrap = document.createElement('div');
    wrap.className = 'color-picker';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Accent colour preview');

    var toggle = document.createElement('button');
    toggle.className = 'color-picker__toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open accent colour picker');

    var dot = document.createElement('span');
    dot.className = 'color-picker__toggle-dot';
    toggle.appendChild(dot);

    var panel = document.createElement('div');
    panel.className = 'color-picker__panel';
    panel.setAttribute('role', 'group');

    var label = document.createElement('span');
    label.className = 'color-picker__label';
    label.textContent = 'Accent Preview';
    panel.appendChild(label);

    var swatches = document.createElement('div');
    swatches.className = 'color-picker__swatches';

    COLOURS.forEach(function (c) {
      var s = document.createElement('button');
      s.className = 'color-picker__swatch';
      s.type = 'button';
      s.style.background = c.hex;
      s.setAttribute('data-hex', c.hex);
      s.setAttribute('data-name', c.name);
      s.setAttribute('aria-label', c.name + ' — ' + c.hex);
      s.title = c.name + ' · ' + c.hex;
      if (c.isDefault) s.setAttribute('data-default', 'true');
      s.addEventListener('click', function () { select(c.hex); });
      swatches.appendChild(s);
    });

    panel.appendChild(swatches);

    var meta = document.createElement('div');
    meta.className = 'color-picker__meta';

    var current = document.createElement('span');
    current.className = 'color-picker__current';
    meta.appendChild(current);

    var reset = document.createElement('button');
    reset.className = 'color-picker__reset';
    reset.type = 'button';
    reset.textContent = 'Reset';
    reset.addEventListener('click', function () { select(DEFAULT_HEX, true); });
    meta.appendChild(reset);

    panel.appendChild(meta);

    wrap.appendChild(toggle);
    wrap.appendChild(panel);

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      wrap.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', wrap.classList.contains('is-open') ? 'true' : 'false');
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        wrap.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    function refreshUI(hex) {
      var swatchEls = swatches.querySelectorAll('.color-picker__swatch');
      swatchEls.forEach(function (el) {
        if (el.getAttribute('data-hex').toLowerCase() === hex.toLowerCase()) {
          el.classList.add('is-active');
        } else {
          el.classList.remove('is-active');
        }
      });
      current.textContent = hex.toUpperCase();
    }

    function select(hex, clearStorage) {
      applyAccent(hex);
      if (clearStorage) clearStored(); else writeStored(hex);
      refreshUI(hex);
    }

    refreshUI(initialHex);

    document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
