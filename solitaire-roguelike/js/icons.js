/* ============================================================
   PILE-DRIVER  ::  icons.js
   One coherent line-art icon set. Every glyph lives on a 24x24
   grid, 1.7 stroke, so Curios / mods / rules all read as a family.
   <path class="f"> = soft filled mass, <path class="a"> = accent.
   ============================================================ */

const ICONS = {
  /* --- generic --- */
  mask: '<path class="f" d="M3.6 6.5c2.9-1 5.7-1.5 8.4-1.5s5.5.5 8.4 1.5c.2 3.6-.5 6.9-2.2 9.7A6.5 6.5 0 0 1 12 19a6.5 6.5 0 0 1-6.2-3.3C4.1 13.4 3.4 10.1 3.6 6.5z"/><path d="M3.6 6.5c2.9-1 5.7-1.5 8.4-1.5s5.5.5 8.4 1.5c.2 3.6-.5 6.9-2.2 9.7A6.5 6.5 0 0 1 12 19a6.5 6.5 0 0 1-6.2-3.3C4.1 13.4 3.4 10.1 3.6 6.5z"/><path d="M6.6 9.6c1.2-.9 2.6-.9 3.8 0-1.2 1.1-2.6 1.1-3.8 0zM13.6 9.6c1.2-.9 2.6-.9 3.8 0-1.2 1.1-2.6 1.1-3.8 0z"/><path d="M9.8 14.6c1.5.8 2.9.8 4.4 0"/>',
  skim: '<path d="M4 7.5h16"/><path class="f" d="M5.5 7.5h13l-1.4 10a2 2 0 0 1-2 1.7H8.9a2 2 0 0 1-2-1.7z"/><path d="M9.4 7.5V5.8A1.8 1.8 0 0 1 11.2 4h1.6a1.8 1.8 0 0 1 1.8 1.8v1.7"/><path d="M10 11.5v4M14 11.5v4"/>',
  unknown: '<circle cx="12" cy="12" r="8"/><path d="M12 16v.01M12 8a2.4 2.4 0 0 1 1.6 4.2c-.9.7-1.6 1-1.6 1.8"/>',

  /* --- curios --- */
  duck: '<path class="f" d="M4 15.5c0-2.5 2.3-4.3 5.2-4.3H13v1.3c0 2.8-2.4 5-5.3 5H6a2 2 0 0 1-2-2z"/><circle cx="16" cy="7.6" r="2.9"/><path d="M18.8 6.8h2.7l-2 1.9"/><path d="M13.2 10.6v1.9c0 2.8-2.4 5-5.3 5H6a2 2 0 0 1-2-2c0-2.5 2.3-4.3 5.2-4.3z"/>',
  coin: '<circle cx="12" cy="12" r="8"/><circle class="f" cx="12" cy="12" r="5"/><path d="M12 8.5v7M10.3 10h2.6a1.6 1.6 0 0 1 0 3.2h-1.8a1.6 1.6 0 0 0 0 3.2h2.6"/>',
  thumb: '<path class="f" d="M8 11h2.4l1.6-4.4A1.7 1.7 0 0 1 15.2 7l-.7 4h3.3a1.8 1.8 0 0 1 1.7 2.3l-1.3 4.4A2.4 2.4 0 0 1 15.9 19H8z"/><rect x="4" y="10.6" width="4" height="8.4" rx="1"/>',
  scarf: '<path d="M7 4.5a5.2 5.2 0 0 1 10 0v3a5 5 0 0 1-10 0z"/><path class="f" d="M7 9.5c1.6 1.6 3.1 2.4 5 2.4s3.4-.8 5-2.4l1.6 3.6-3.2 1.3.9 5.1-4.3-2.8-4.3 2.8.9-5.1-3.2-1.3z"/>',
  pick: '<path d="M3.5 20.5 12 12"/><path class="f" d="M4.5 6.2c4.6-2.6 10.2-2.4 15 .7-4.8-.6-8.4.4-11 3.2z"/><path d="M19.5 6.9c-4.8-3.1-10.4-3.3-15-.7 4.6.1 7.7 1.5 9.6 4.1"/>',
  tomb: '<path class="f" d="M6 20V9a6 6 0 0 1 12 0v11z"/><path d="M6 20V9a6 6 0 0 1 12 0v11"/><path d="M12 7.5v6M9.5 10h5"/><path d="M3.5 20.5h17"/>',
  jester: '<path class="f" d="M5 13c0-4.2 3.1-7.5 7-7.5s7 3.3 7 7.5z"/><path d="M5 13c0-4.2 3.1-7.5 7-7.5s7 3.3 7 7.5"/><circle cx="4.4" cy="5.4" r="1.7"/><circle cx="19.6" cy="5.4" r="1.7"/><path d="M5.4 6.8 8 9.4M18.6 6.8 16 9.4"/><path d="M3.5 13h17v2.4h-17z"/>',
  sleeve: '<path class="f" d="M4 8.5 9 6l3 2 3-2 5 2.5-1.6 4-2.4-1v8H8v-8l-2.4 1z"/><path d="M4 8.5 9 6l3 2 3-2 5 2.5-1.6 4-2.4-1v8H8v-8l-2.4 1z"/><path class="a" d="M15.4 12.6h3.4v4.8h-3.4z" transform="rotate(18 17 15)"/>',
  shovel: '<path d="M12 3.5v10"/><path d="M9.5 3.5h5"/><path class="f" d="M8 13.5h8v3.2a4 4 0 0 1-4 4 4 4 0 0 1-4-4z"/>',
  heartbeat: '<path class="f" d="M12 20.2 4.8 13a4.4 4.4 0 0 1 6.2-6.2l1 1 1-1A4.4 4.4 0 0 1 19.2 13z"/><path d="M3.5 13h3l1.6-3 2.2 5.6 2-4.2 1.4 1.6h6.8"/>',
  sandwich: '<path class="f" d="M3.5 8.5 12 4.5l8.5 4-8.5 4z"/><path d="M3.5 8.5 12 4.5l8.5 4-8.5 4z"/><path d="M4 12.4 12 16l8-3.6M4 15.9 12 19.5l8-3.6"/>',
  gemhand: '<path class="f" d="m12 3.5 4.2 4.2L12 14 7.8 7.7z"/><path d="m12 3.5 4.2 4.2L12 14 7.8 7.7zM7.8 7.7h8.4"/><path d="M5 20.5c1.8-2.4 4.1-3.6 7-3.6s5.2 1.2 7 3.6"/>',
  shoe: '<path class="f" d="M3.5 17.5V9h3.2l1.6 2.2 3.4 1.1 3.4 2.1h3.4a2 2 0 0 1 2 2v1.1a1.4 1.4 0 0 1-1.4 1.4H4.9a1.4 1.4 0 0 1-1.4-1.4z"/><path d="M3.5 14.4h4.4"/>',
  sock: '<path class="f" d="M8 3.5h5v7.7l4.6 4.6a3.2 3.2 0 0 1-4.5 4.5l-6.4-6.4a3.4 3.4 0 0 1-1-2.4V3.5z"/><path d="M8 8.5h5"/>',
  shades: '<path d="M2.5 8.5h19"/><path class="f" d="M3.5 8.5h7v3.6a3.5 3.5 0 0 1-7 0zM13.5 8.5h7v3.6a3.5 3.5 0 0 1-7 0z"/><path d="M10.5 10.2c1-.6 2-.6 3 0"/>',
  ladder: '<path d="M7 3.5v17M17 3.5v17"/><path class="a" d="M7 7.5h10M7 11.5h10M7 15.5h10"/>',
  metronome: '<path class="f" d="M9.2 4.5h5.6l3.2 15.5H6z"/><path d="M9.2 4.5h5.6l3.2 15.5H6z"/><path d="M12 17.5 16.5 7"/><circle cx="16.5" cy="7" r="1.4"/>',
  crates: '<path class="f" d="M3.5 12.5h8v8h-8zM12.5 12.5h8v8h-8zM8 4h8v8H8z"/><path d="M3.5 12.5h8v8h-8zM12.5 12.5h8v8h-8zM8 4h8v8H8z"/><path d="M7.5 16.5h.01M16.5 16.5h.01M12 8h.01"/>',
  vacuum: '<path class="f" d="M12 20.5a6 6 0 0 0 6-6V9h-4v5.5a2 2 0 0 1-4 0V9H6v5.5a6 6 0 0 0 6 6z"/><path d="M6 9V6.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9"/><path d="M3.5 20.5h17"/>',
  hourglass: '<path d="M6 3.5h12M6 20.5h12"/><path class="f" d="M7.5 3.5h9c0 4-4.5 6-4.5 8.5S16.5 16.5 16.5 20.5h-9c0-4 4.5-6 4.5-8.5S7.5 7.5 7.5 3.5z"/>',
  notebook: '<path class="f" d="M6 3.5h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z"/><path d="M6 3.5h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z"/><path d="M6 3.5a2 2 0 0 0 0 4h2v-4M10 10h6M10 14h6"/>',
  bomb: '<circle class="f" cx="11" cy="15" r="6"/><circle cx="11" cy="15" r="6"/><path d="M15 10.5 17.5 8"/><path d="M17.5 8c0-2 1-3.2 2.8-3.2"/><path class="a" d="m19.4 2.6.9 1.9 2 .5-1.9 1 .1 2-1.5-1.4-2 .6.8-1.9-1.1-1.7z"/>',
  gear: '<circle class="f" cx="12" cy="12" r="3.4"/><circle cx="12" cy="12" r="3.4"/><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"/>',
  bubbles: '<circle class="f" cx="9" cy="14" r="5"/><circle cx="9" cy="14" r="5"/><circle cx="17" cy="8" r="3.4"/><circle cx="18.5" cy="16.5" r="2.2"/><path d="M7 12.2a2.4 2.4 0 0 1 2-1.6"/>',
  coffee: '<path class="f" d="M4.5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M4.5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 10.5h1.9a2.6 2.6 0 0 1 0 5.2h-1.9"/><path d="M8 3.5c-.8 1.2-.8 2 0 3.2M12 3.5c-.8 1.2-.8 2 0 3.2"/>',
  shell: '<path class="f" d="M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z"/><path d="M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z"/><path d="M12 3.5A8.5 8.5 0 0 0 12 20.5M20.5 12a5 5 0 0 0-10 0 3 3 0 0 0 6 0"/>',
  clock: '<circle class="f" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/>',
  raincloud: '<path class="f" d="M7 13.5a4 4 0 0 1 .4-8A5.2 5.2 0 0 1 17.4 6a3.8 3.8 0 0 1-.4 7.5z"/><path d="M7 13.5a4 4 0 0 1 .4-8A5.2 5.2 0 0 1 17.4 6a3.8 3.8 0 0 1-.4 7.5z"/><path class="a" d="M8.5 16.5 7 20M12 16.5 10.5 20M15.5 16.5 14 20"/>',
  bolt: '<path class="f" d="M13.4 2.5 5.5 13.5h5l-.9 8 7.9-11h-5z"/><path d="M13.4 2.5 5.5 13.5h5l-.9 8 7.9-11h-5z"/>',
  anchor: '<circle cx="12" cy="5.4" r="2.4"/><path d="M12 7.8v12.7M7.5 10.5h9"/><path d="M4.5 14.5c0 3.6 3.4 6 7.5 6s7.5-2.4 7.5-6"/>',
  waves: '<path class="a" d="M3 8.5c2-1.8 4-1.8 6 0s4 1.8 6 0 4-1.8 6 0"/><path d="M3 13c2-1.8 4-1.8 6 0s4 1.8 6 0 4-1.8 6 0M3 17.5c2-1.8 4-1.8 6 0s4 1.8 6 0 4-1.8 6 0"/>',
  trophy: '<path class="f" d="M7 3.5h10v5a5 5 0 0 1-10 0z"/><path d="M7 3.5h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5v1.6A3.4 3.4 0 0 0 7.9 10.5M17 5.5h2.5v1.6a3.4 3.4 0 0 1-3.4 3.4"/><path d="M12 13.5v3.5M8.5 20.5h7"/>',
  disco: '<circle class="f" cx="12" cy="13.5" r="7"/><circle cx="12" cy="13.5" r="7"/><path d="M12 6.5v14M5 13.5h14M7.2 8.6c3 2.2 6.6 2.2 9.6 0M7.2 18.4c3-2.2 6.6-2.2 9.6 0"/><path d="M12 6.5v-3"/>',
  alarm: '<circle class="f" cx="12" cy="13.5" r="6.8"/><circle cx="12" cy="13.5" r="6.8"/><path d="M12 9.5v4.2l2.8 1.8"/><path d="M4.5 5.5 7.8 3M19.5 5.5 16.2 3"/>',
  paw: '<circle class="f" cx="12" cy="15.5" r="4.4"/><circle class="f" cx="6.6" cy="10.4" r="2.2"/><circle class="f" cx="17.4" cy="10.4" r="2.2"/><circle class="f" cx="9.6" cy="6.4" r="2.1"/><circle class="f" cx="14.4" cy="6.4" r="2.1"/>',
  lens: '<circle class="f" cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="7.5"/><path class="a" d="M8.6 8.6a4.8 4.8 0 0 1 6.8 6.8z"/>',
  skull: '<path class="f" d="M5 11a7 7 0 0 1 14 0v3.2l-1.6 1.6v2.4h-1.9v2H8.5v-2H6.6v-2.4L5 14.2z"/><path d="M5 11a7 7 0 0 1 14 0v3.2l-1.6 1.6v2.4h-1.9v2H8.5v-2H6.6v-2.4L5 14.2z"/><circle cx="9.2" cy="11.4" r="1.7"/><circle cx="14.8" cy="11.4" r="1.7"/>',
  shark: '<path class="f" d="M12 3.5c3.4 3.4 5.2 7.4 5.4 12H6.6c.2-4.6 2-8.6 5.4-12z"/><path d="M12 3.5c3.4 3.4 5.2 7.4 5.4 12H6.6c.2-4.6 2-8.6 5.4-12z"/><path d="M3 18.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0"/>',
  candle: '<path class="f" d="M9 10h6v10.5H9z"/><path d="M9 10h6v10.5H9z"/><path class="a" d="M12 2.8c1.9 1.9 2.8 3.3 2.8 4.4a2.8 2.8 0 0 1-5.6 0c0-1.1.9-2.5 2.8-4.4z"/>',
  rainbow: '<path class="a" d="M3.5 19.5a8.5 8.5 0 0 1 17 0"/><path d="M6.6 19.5a5.4 5.4 0 0 1 10.8 0M9.7 19.5a2.3 2.3 0 0 1 4.6 0"/>',
  cardsfan: '<rect class="f" x="9" y="4.5" width="9" height="13" rx="1.4"/><rect x="9" y="4.5" width="9" height="13" rx="1.4"/><path d="M7.4 6.6 4.6 16.7a1.4 1.4 0 0 0 1 1.7l5.6 1.5"/><path d="M13.5 9.5v3.5M11.8 11.2h3.4"/>',
  house: '<path class="f" d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9.5 21v-6h5v6"/>',
  infinity: '<path class="a" d="M8.2 8.2a5.4 5.4 0 1 0 0 7.6L15.8 8.2a5.4 5.4 0 1 1 0 7.6z"/>',
  midas: '<path class="f" d="M7 12h2.4l1.4-4.6A1.7 1.7 0 0 1 14 8l-.6 4h3.1a1.8 1.8 0 0 1 1.7 2.3l-1.2 4.3A2.4 2.4 0 0 1 14.7 20H7z"/><path d="M7 12h2.4l1.4-4.6A1.7 1.7 0 0 1 14 8l-.6 4h3.1a1.8 1.8 0 0 1 1.7 2.3l-1.2 4.3A2.4 2.4 0 0 1 14.7 20H7z"/><rect x="3.5" y="11.6" width="3.5" height="8.4" rx="1"/><path class="a" d="m18.5 2.5.8 1.8 1.9.4-1.8 1 .1 1.9-1.4-1.3-1.9.6.8-1.8-1-1.6z"/>',
  magnet: '<path class="f" d="M5 13V8a7 7 0 0 1 14 0v5h-4V8a3 3 0 0 0-6 0v5z"/><path d="M5 13V8a7 7 0 0 1 14 0v5h-4V8a3 3 0 0 0-6 0v5z"/><path class="a" d="M5 13h4v3.5H5zM15 13h4v3.5h-4z"/>',
  dice: '<rect class="f" x="4" y="4" width="16" height="16" rx="3"/><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.6" cy="8.6" r="1.3"/><circle cx="15.4" cy="15.4" r="1.3"/><circle cx="12" cy="12" r="1.3"/>',

  /* --- card mods --- */
  sparkle: '<path class="a" d="m12 2.5 2.2 5.6 5.6 2.2-5.6 2.2L12 18.1 9.8 12.5 4.2 10.3l5.6-2.2z"/><path d="m19 16 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>',
  glassgem: '<path class="f" d="m12 3 6 4.5-6 13.5L6 7.5z"/><path d="m12 3 6 4.5-6 13.5L6 7.5zM6 7.5h12M12 3v18"/>',
  leaf: '<path class="f" d="M20 4c0 9-4.6 13.6-11.6 13.6A5.4 5.4 0 0 1 4 12.2C4 6.2 9.6 4 20 4z"/><path d="M20 4c0 9-4.6 13.6-11.6 13.6A5.4 5.4 0 0 1 4 12.2C4 6.2 9.6 4 20 4z"/><path d="M4 20c3.4-4.6 7-7.6 11-9"/>',
  ghost: '<path class="f" d="M5 20.5V10a7 7 0 0 1 14 0v10.5l-2.3-1.8-2.3 1.8-2.4-1.8-2.4 1.8-2.3-1.8z"/><path d="M5 20.5V10a7 7 0 0 1 14 0v10.5l-2.3-1.8-2.3 1.8-2.4-1.8-2.4 1.8-2.3-1.8z"/><circle cx="9.4" cy="10" r="1.4"/><circle cx="14.6" cy="10" r="1.4"/>',
  clover: '<path class="f" d="M12 20.5v-6M12 14.5a3.4 3.4 0 1 1 2.4-5.8A3.4 3.4 0 1 1 12 14.5a3.4 3.4 0 1 1-2.4-5.8A3.4 3.4 0 1 1 12 14.5z"/><path d="M12 20.5v-6"/>',
  anvil: '<path class="f" d="M4 8h11.5c1.6 0 2 1.2 3.2 1.2H21c-.6 3-2.8 5-6.4 5.4l1 3.4h-8l1-3.4C5.4 14.2 4 11.8 4 8z"/><path d="M4 8h11.5c1.6 0 2 1.2 3.2 1.2H21c-.6 3-2.8 5-6.4 5.4l1 3.4h-8l1-3.4C5.4 14.2 4 11.8 4 8z"/><path d="M6.5 20.5h11"/>',
  dynamite: '<rect class="f" x="4" y="9.5" width="12" height="10" rx="1.6"/><rect x="4" y="9.5" width="12" height="10" rx="1.6"/><path d="M8 9.5v10M12 9.5v10"/><path d="M16 12c1.6 0 2.6-1 2.6-2.6S17.6 6.5 17.6 5"/><path class="a" d="m18.6 2.4.8 1.8 1.9.4-1.8 1.1.1 1.9-1.4-1.4-1.9.6.8-1.8-1-1.6z"/>',
  ingot: '<path class="f" d="M4.5 16.5 7 10h10l2.5 6.5z"/><path d="M4.5 16.5 7 10h10l2.5 6.5z"/><path d="M8.6 10 10 6h4l1.4 4"/>',
  prism: '<path class="f" d="M12 4 21 19H3z"/><path d="M12 4 21 19H3z"/><path class="a" d="M8 19h8"/><path d="M12 4v15"/>',
  stamp: '<path class="f" d="M5.5 15.5h13v2.6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z"/><path d="M5.5 15.5h13v2.6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z"/><path d="M8.5 15.5V11a3.5 3.5 0 0 1 7 0v4.5"/><circle class="a" cx="12" cy="9.5" r="2.6"/>',
  twincards: '<rect class="f" x="9" y="6" width="9.5" height="13" rx="1.4"/><rect x="9" y="6" width="9.5" height="13" rx="1.4"/><rect x="5.5" y="4" width="9.5" height="13" rx="1.4"/>',
  scissors: '<circle cx="6.4" cy="6.4" r="2.4"/><circle cx="6.4" cy="17.6" r="2.4"/><path d="M8.4 7.8 20 17.2M8.4 16.2 20 6.8"/>',

  /* --- new cards --- */
  newcard: '<rect class="f" x="6" y="3.5" width="12" height="17" rx="2"/><rect x="6" y="3.5" width="12" height="17" rx="2"/><path class="a" d="M12 8v8M8 12h8"/>',
  wanderer: '<rect class="f" x="6" y="3.5" width="12" height="17" rx="2"/><rect x="6" y="3.5" width="12" height="17" rx="2"/><path class="a" d="M12 7.5a3.4 3.4 0 0 1 0 6.8 3.4 3.4 0 0 1 0-6.8z"/><path d="M9.5 17h5"/>',
  keycard: '<rect class="f" x="6" y="3.5" width="12" height="17" rx="2"/><rect x="6" y="3.5" width="12" height="17" rx="2"/><circle cx="12" cy="10" r="2.2"/><path d="M12 12.2V17M10.4 14.4h1.6M10.4 16h1.6"/>',

  /* --- house rules --- */
  table: '<path class="f" d="M3 8.5h18v3H3z"/><path d="M3 8.5h18v3H3zM6 11.5V20M18 11.5V20"/>',
  handshake: '<path class="f" d="m3.5 12 4-4 4.5 2 4.5-2 4 4-3.5 5-2.5-2-2.5 2-2.5-2z"/><path d="M3.5 12 8 7.5M20.5 12 16 7.5M8 16l2.5 2 2.5-2 2.5 2 3.5-5"/>',
  rewind: '<path class="a" d="M4 10.5h9.5a5 5 0 0 1 0 10H9"/><path d="M8 6 4 10.5 8 15"/>',
  purse: '<path class="f" d="M5 9h14l1.5 11H3.5z"/><path d="M5 9h14l1.5 11H3.5z"/><path d="M8.5 9V6.8a3.5 3.5 0 0 1 7 0V9"/>',
  coinstack: '<ellipse class="f" cx="12" cy="7" rx="7" ry="2.8"/><ellipse cx="12" cy="7" rx="7" ry="2.8"/><path d="M5 7v4.4c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V7"/><path d="M5 11.4v4.4c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-4.4"/>',
  tag: '<path class="f" d="M11.5 3.5H20a.5.5 0 0 1 .5.5v8.5L11 22 3 14z"/><path d="M11.5 3.5H20a.5.5 0 0 1 .5.5v8.5L11 22 3 14z"/><circle cx="16.5" cy="7.5" r="1.6"/>',
  magnifier: '<circle class="f" cx="10.5" cy="10.5" r="6"/><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/>',
  flag: '<path d="M6 3.5v17"/><path class="f" d="M6 4.5h11l-2.2 3.6L17 11.7H6z"/><path d="M6 4.5h11l-2.2 3.6L17 11.7H6z"/>',
  expand: '<path class="f" d="M9 7.5h6v9H9z"/><path d="M9 7.5h6v9H9z"/><path class="a" d="M5.5 5v14M18.5 5v14"/><path d="M3 12h2.5M18.5 12H21"/>',
  frame: '<rect class="f" x="3.5" y="4.5" width="17" height="15" rx="1.5"/><rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><rect x="7" y="8" width="10" height="8" rx="1"/>',
  horseshoe: '<path class="f" d="M6.5 20.5V13a5.5 5.5 0 0 1 11 0v7.5h-3.4V13a2.1 2.1 0 0 0-4.2 0v7.5z"/><path d="M6.5 20.5V13a5.5 5.5 0 0 1 11 0v7.5h-3.4V13a2.1 2.1 0 0 0-4.2 0v7.5z"/>',
  fingers: '<path class="f" d="M6 12V6.4a1.7 1.7 0 0 1 3.4 0V11l1-6.6a1.7 1.7 0 0 1 3.4.4l-.3 5.7 1.4-4.6a1.7 1.7 0 0 1 3.3.8L17 17.4A5 5 0 0 1 12.2 21h-1a5 5 0 0 1-4.4-2.6L4.4 14a1.6 1.6 0 0 1 2.6-1.8z"/><path d="M6 12V6.4a1.7 1.7 0 0 1 3.4 0V11"/>',
  /* --- the counter / bandit / whims --- */
  refresh: '<path d="M20 6.5v5h-5"/><path d="M4 17.5v-5h5"/><path class="a" d="M19.2 11.5A7.5 7.5 0 0 0 6.3 7.3M4.8 12.5a7.5 7.5 0 0 0 12.9 4.2"/>',
  seat: '<path class="f" d="M6 12.5h12v4H6z"/><path d="M6 12.5h12v4H6z"/><path d="M7.5 12.5V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v6.5M8 16.5V20M16 16.5V20"/>',
  undo2: '<path class="a" d="M5 11.5h9.5a4.5 4.5 0 0 1 0 9H10"/><path d="M8.5 7 4 11.5 8.5 16"/>',
  lever: '<rect class="f" x="3.5" y="7" width="12" height="11" rx="1.6"/><rect x="3.5" y="7" width="12" height="11" rx="1.6"/><path d="M7 10.5v4M11.8 10.5v4"/><path d="M15.5 11h2.8V6.4"/><circle class="a" cx="18.3" cy="4.6" r="2"/>',
  slot777: '<rect class="f" x="2.5" y="6" width="19" height="12" rx="2"/><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M9 6v12M15 6v12"/><path class="a" d="M4.8 9.5h2.4l-1.3 5M10.8 9.5h2.4l-1.3 5M16.8 9.5h2.4l-1.3 5"/>',
  moon: '<path class="f" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  crown: '<path class="f" d="m3.5 8 3.8 3.2L12 5l4.7 6.2L20.5 8l-1.6 10h-13.8z"/><path d="m3.5 8 3.8 3.2L12 5l4.7 6.2L20.5 8l-1.6 10h-13.8z"/><path d="M6 20.5h12"/>',
  fog: '<path class="a" d="M3.5 9h11M17 9h3.5M3.5 13h5M11 13h9.5M3.5 17h13M19 17h1.5"/>',
  chicken: '<path class="f" d="M7 20c-2.2 0-3.5-1.5-3.5-3.6C3.5 12.6 6.4 9 10.4 9h1.2V8a3.5 3.5 0 1 1 5.2 3l2.7 1.6-2.7 1.1c-.4 3.6-3.4 6.3-7.3 6.3z"/><circle cx="15.6" cy="6.4" r="1"/><path class="a" d="M14.4 3.4c.7-1 1.6-1.4 2.6-1.1"/><path d="M9 20v2M13 19.6V22"/>',
  gremlin: '<path class="f" d="M12 4c4 0 6.5 2.6 6.5 6.2 0 1.3-.4 2.3-.4 3.3 0 1.4 1.4 2 1.4 3.5 0 1.8-1.6 3-4 3h-7c-2.4 0-4-1.2-4-3 0-1.5 1.4-2.1 1.4-3.5 0-1-.4-2-.4-3.3C5.5 6.6 8 4 12 4z"/><path d="M5.5 8 3 5.5M18.5 8 21 5.5"/><circle cx="9.4" cy="11" r="1.3"/><circle cx="14.6" cy="11" r="1.3"/><path d="M9.6 15.4h4.8"/>',
  chaos: '<circle class="f" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><path class="a" d="m8 8 8 8M16 8l-8 8M12 3.5v17M3.5 12h17"/>',
  bossman: '<circle cx="12" cy="7.4" r="3.4"/><path class="f" d="M4.5 20.5c0-4 3.4-6.6 7.5-6.6s7.5 2.6 7.5 6.6z"/><path d="M4.5 20.5c0-4 3.4-6.6 7.5-6.6s7.5 2.6 7.5 6.6"/><path class="a" d="m12 14 1.6 3-1.6 3.5-1.6-3.5z"/>',
  twinflame: '<path class="f" d="M9 21c-2.5 0-4-1.8-4-4 0-3 3-4.4 3-7.5C8 6.6 10 4.5 12 3c-.6 2.6.5 4.4 1.9 5.8C15.6 10.5 17 12.3 17 15c0 3.4-2.5 6-5.5 6z"/><path class="a" d="M12 21c-1.4 0-2.4-1-2.4-2.4 0-1.7 1.9-2.4 1.9-4.4 1.5 1.2 2.9 2.4 2.9 4.4 0 1.4-1 2.4-2.4 2.4z"/>'
};

/* the icon renderer -- everything goes through this so the whole set stays uniform */
function icon(name, cls) {
  const body = ICONS[name] || ICONS.unknown;
  return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
         'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
}
