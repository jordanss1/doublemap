const historyFog = {
    range: [0.8, 8],
    color: '#e0d8c0',
    'horizon-blend': 0.3,
    'high-color': '#a0a0c0',
    'space-color': '#1a1a2a',
    'star-intensity': 0.1,
  },
  selectedEventFog = {
    range: [0.5, 10],
    color: '#e0f0ff',
    'horizon-blend': 0.2,
    'high-color': '#4682b4',
    'space-color': '#191970',
    'star-intensity': 0.4,
  };
function nightNavStyles(e) {
  e.setFog({
    color: 'rgb(11, 11, 25)',
    'high-color': 'rgb(36, 92, 223)',
    'horizon-blend': 0.02,
    'space-color': 'rgb(11, 11, 25)',
    'star-intensity': 0.6,
  }),
    e.setPaintProperty('water', 'fill-color', [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      'rgb(10, 20, 40)',
      8,
      'rgb(20, 40, 80)',
    ]),
    e.setPaintProperty('water', 'fill-antialias', !0),
    e.setPaintProperty('water', 'fill-opacity', 0.9),
    e.addLayer(
      {
        id: 'water-sheen',
        type: 'fill',
        source: 'composite',
        'source-layer': 'water',
        layout: {},
        paint: {
          'fill-color': 'rgb(100, 100, 255)',
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0,
            0.02,
            8,
            0.1,
          ],
        },
      },
      'water'
    );
}
async function applyCountryLayers() {
  map.getSource('country-borders') ||
    map.addSource('country-borders', {
      type: 'vector',
      tiles: ['https://www.double-map.online/data/countries/{z}/{x}/{y}.pbf'],
      promoteId: 'iso_a2',
    });
  const e =
      historyMode || 'Standard' === currentBaseLayer
        ? ['rgba(70, 130, 180, .8)', 'rgba(70, 130, 180, .3)']
        : ['rgba(248, 113, 113, 0.8)', 'rgba(248, 113, 113,.3)'],
    t =
      historyMode || 'Dark' === currentBaseLayer
        ? 'rgba(79, 70, 229, .6)'
        : 'rgba(94, 234, 212, .6)';
  map.getLayer('chosen-country-fill') ||
    map.addLayer({
      id: 'chosen-country-fill',
      type: 'fill',
      source: 'country-borders',
      'source-layer': 'country_bordersgeo',
      maxzoom: 9,
      paint: {
        'fill-color': t,
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'chosen'], !1],
          1,
          0,
        ],
        'fill-emissive-strength': 10,
      },
    }),
    map.getLayer('chosen-country-line') ||
      (map.addLayer({
        id: 'chosen-country-line',
        type: 'line',
        source: 'country-borders',
        'source-layer': 'country_bordersgeo',
        maxzoom: 9,
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'chosen'], !1],
            ...e,
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'chosen'], !1],
            4,
            0,
          ],
          'line-blur': [
            'case',
            ['boolean', ['feature-state', 'chosen'], !1],
            1,
            0,
          ],
          'line-emissive-strength': 10,
        },
      }),
      map.getLayer('hovered-country-fill') ||
        map.addLayer({
          id: 'hovered-country-fill',
          type: 'fill',
          source: 'country-borders',
          'source-layer': 'country_bordersgeo',
          maxzoom: 6,
          paint: {
            'fill-color': t,
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], !1],
              1,
              0,
            ],
            'fill-emissive-strength': 10,
          },
        }),
      map.getLayer('hovered-country-line') ||
        map.addLayer({
          id: 'hovered-country-line',
          type: 'line',
          source: 'country-borders',
          'source-layer': 'country_bordersgeo',
          maxzoom: 6,
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], !1],
              ...e,
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], !1],
              8,
              2,
            ],
            'line-blur': [
              'case',
              ['boolean', ['feature-state', 'hover'], !1],
              6,
              1,
            ],
          },
        }));
}
async function updateChosenCountryState(e) {
  if (
    (chosenCountryISO &&
      map.setFeatureState(
        {
          source: 'country-borders',
          sourceLayer: 'country_bordersgeo',
          id: chosenCountryISO,
        },
        { chosen: !1 }
      ),
    !e)
  )
    return (
      map.setLayoutProperty('hovered-country-fill', 'visibility', 'visible'),
      map.setLayoutProperty('hovered-country-line', 'visibility', 'visible'),
      changeExitButton(!0),
      window.innerWidth <= 424 && $('#left-panel').attr('aria-hidden', 'false'),
      countryPopup && (countryPopup.remove(), (countryPopup = null)),
      void (chosenCountryISO = null)
    );
  map.setLayoutProperty('hovered-country-fill', 'visibility', 'none'),
    map.setLayoutProperty('hovered-country-line', 'visibility', 'none'),
    map.getSource('markers-source') &&
      map
        .getSource('markers-source')
        .setData({ type: 'FeatureCollection', features: [] }),
    historyMode && (await returnToDefaultHistoryMap()),
    $('#left-panel').attr('aria-expanded', 'false'),
    window.innerWidth <= 424 && $('#left-panel').attr('aria-hidden', 'true'),
    (historicalEvents = []),
    (currentPoiCategory = 'default'),
    (currentMarker = null),
    addPoiSourceAndLayer([], 'default-pois'),
    changeExitButton(!1, 'Exit country information'),
    map.setFeatureState(
      { source: 'country-borders', sourceLayer: 'country_bordersgeo', id: e },
      { chosen: !0 }
    ),
    (chosenCountryISO = e);
}
let timeout,
  pausingTimer,
  clearSidebarTimeout,
  selectedTimer,
  flyToTimer,
  fitBoundsTimer,
  exitButtonTimer;
function applyHistoryHtml(e) {
  const t = e ? 'true' : 'false',
    a = e ? 'false' : 'true',
    n =
      'false' === $('#day-slider-container-lg').attr('aria-disabled') ||
      'false' === $('#day-slider-container-sm').attr('aria-disabled');
  e
    ? ($('#top-panel')
        .removeClass('auto-cols-[auto_1fr_1fr]')
        .addClass('grid-cols-[150px_1fr_auto]'),
      $('#history-container, #country-select-button').addClass(
        'animate-start_absolute'
      ),
      $('#search-container').children().removeClass('animate-start_absolute'),
      $('#select-container').removeClass('animate-start_absolute'),
      $('#select-container').addClass('animate-end_absolute'),
      $('#history-date-container, #slider-button, #history-year').removeClass(
        'animate-end_absolute'
      ),
      $('#category-container').addClass('animate-end_absolute'),
      $('#category-container').attr('aria-expanded', 'false'),
      $('#continue-container, #continue-container-sm').addClass(
        'invisible absolute'
      ),
      $('#continue-container-sm, #continue-container').attr(
        'aria-disabled',
        'true'
      ),
      $('#history-category').removeClass('hidden'),
      (timeout = setTimeout(
        () => $('#category-container').addClass('invisible'),
        300
      )))
    : ($('#search-container-inside')
        .removeClass('outline-3')
        .addClass('outline-0'),
      $('#top-panel')
        .removeClass('grid-cols-[150px_1fr_auto]')
        .addClass('auto-cols-[auto_1fr_1fr]'),
      $('#search-container').children().addClass('animate-start_absolute'),
      $('#select-container').addClass('animate-start_absolute'),
      $('#select-container').removeClass('animate-end_absolute'),
      $('#history-container, #country-select-button').removeClass(
        'animate-start_absolute'
      ),
      $('#continue-container, #continue-container-sm').removeClass(
        'invisible absolute'
      ),
      $('#slider-button, #history-date, #history-year').addClass(
        'animate-end_absolute'
      ),
      $('#history-date-container').attr('aria-disabled', 'true'),
      $('#history-year').attr('aria-disabled', 'true'),
      $('#country-select-list').attr('aria-disabled', 'true'),
      $('#category-container').removeClass('animate-end_absolute'),
      $(
        '#category-container, #continue-container, #continue-container-sm'
      ).removeClass('invisible'),
      $('#history-category').addClass('hidden'),
      window.innerWidth <= 768 &&
        $('#search-container').attr('aria-expanded', 'false'),
      'true' === $('#category-panel').attr('aria-disabled') &&
        $('#category-panel > *').addClass('invisible'),
      n &&
        ($('#day-slider-container-lg').attr('aria-disabled', 'true'),
        $('#day-slider-container-sm').attr('aria-disabled', 'true'),
        $('#history-container').removeClass('h-20'),
        $('#history-container').addClass('h-10'))),
    changeExitButton(!0),
    $('#category-container').attr('aria-disabled', t),
    $('#history-container').attr('disabled', a).attr('aria-disabled', a),
    $('#search-container').attr('disabled', t).attr('aria-disabled', t),
    $('#country-select-button').attr('disabled', a).attr('aria-disabled', a),
    $('#select-container').attr('disabled', t).attr('aria-disabled', t);
}
function applyHistoryStyles() {
  map.setFog(historyFog);
}
function addPoiSourceAndLayer(e, t, a = !1) {
  clearTimeout(pausingTimer),
    map.getSource('poi-source')
      ? map
          .getSource('poi-source')
          .setData({ type: 'FeatureCollection', features: e })
      : map.addSource('poi-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: e },
        });
  let n = [];
  const r = categoryList.flatMap(
      ({ icon: e, canonical_id: t, color: a }) => (n.push([t, a]), [t, e])
    ),
    o =
      'Dark' === currentBaseLayer
        ? '#eef0f0'
        : ['match', ['get', 'canonical_id'], ...n.flat(), '#9ea8be'],
    i = 'Dark' === currentBaseLayer ? '#000000' : '#ffffff',
    s = 'Dark' === currentBaseLayer ? 1 : 2.5;
  'default-pois' === t &&
    map.getLayer('chosen-pois') &&
    (map.setLayoutProperty('chosen-pois', 'visibility', 'none'),
    map.setLayoutProperty('default-pois', 'visibility', 'visible'),
    map.setLayoutProperty('hovered-country-fill', 'visibility', 'visible'),
    map.setLayoutProperty('chosen-country-fill', 'visibility', 'visible'),
    (selectedPoi = null),
    (pausingTimer = setTimeout(() => pausingPoiSearch(!1), 750)),
    $('#continue-container').attr('aria-disabled', 'true'),
    $('#continue-container-sm').attr('aria-disabled', 'true'),
    $('#category-panel > *').attr('aria-checked', 'false')),
    'chosen-pois' === t &&
      map.getLayer('default-pois') &&
      (map.setLayoutProperty('default-pois', 'visibility', 'none'),
      map.setLayoutProperty('chosen-pois', 'visibility', 'visible'),
      chosenCountryISO &&
        map.setFeatureState(
          {
            source: 'country-borders',
            sourceLayer: 'country_bordersgeo',
            id: chosenCountryISO,
          },
          { chosen: !1 }
        ),
      map.getSource('markers-source') &&
        map
          .getSource('markers-source')
          .setData({ type: 'FeatureCollection', features: [] }),
      (selectedSearch = null),
      (selectedPoi = null),
      pausingPoiSearch(!a || pausePoiSearch),
      ('true' !== $('#continue-container').attr('aria-disabled') &&
        'true' !== $('#continue-container-sm').attr('aria-disabled')) ||
        ($('#continue-container').attr('aria-disabled', 'false'),
        $('#continue-container-sm').attr('aria-disabled', 'false')),
      (currentMarker = null),
      (chosenCountryISO = null),
      $('#content-container').animate({ scrollTop: 0 }, 500),
      disableMapInteraction(!1),
      changeSelectedSidebarItem(!1),
      addPoisToSidebar(),
      window.innerWidth > 640 && expandSidebar(!0),
      map.setLayoutProperty('hovered-country-fill', 'visibility', 'none'),
      map.setLayoutProperty('chosen-country-fill', 'visibility', 'none'),
      changeExitButton(!1, 'Exit selected points of interest')),
    map.getLayer(t) ||
      map.addLayer({
        id: t,
        type: 'symbol',
        source: 'poi-source',
        slot: 'middle',
        promoteId: 'index',
        minzoom: 'default-pois' === t ? 9 : 0,
        layout: {
          'icon-image': ['match', ['get', 'canonical_id'], ...r, 'marker-15'],
          'icon-size': 0.5,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 13,
          'text-field': ['get', 'name'],
          'text-offset': [0, 0.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': o,
          'text-halo-color': i,
          'text-halo-width': s,
          'text-halo-blur': 1,
        },
      });
}
function expandSidebar(e) {
  const t = 'true' === $('#left-panel').attr('aria-expanded');
  e
    ? t ||
      ($('#left-panel').attr('aria-expanded', 'true'),
      $('#menu-icon').removeClass('fa-bars').addClass('fa-minimize'))
    : t &&
      ($('#menu-icon').removeClass('fa-minimize').addClass('fa-bars'),
      $('#left-panel').attr('aria-expanded', 'false'));
}
function renderSpinner(e, t = '', a = 7) {
  return `<div id='spinner' aria-disabled="true"\n    class="aria-disabled:opacity-0 opacity-100 aria-disabled:translate-x-2 translate-x-0 transition-all duration-150 ease-in ${t}">\n      <div class='${e}'>\n        <div\n          class="border-4 rounded-full border-slate-400 border-t-white-300 w-${a} h-${a} animate-spin"\n        ></div>\n      </div>\n  </div>`;
}
function changePanelSpinners(e) {
  e
    ? ($('#spinner-panel').attr('aria-disabled', 'false'),
      $('#spinner-panel-expanded').attr('aria-disabled', 'false'))
    : ($('#spinner-panel-expanded').attr('aria-disabled', 'true'),
      $('#spinner-panel').attr('aria-disabled', 'true'));
}
function clearSidebarContent() {
  $('#history-category').text(''),
    $('#content-results').empty(),
    $('#content-title').text(''),
    $('#content-subtitle-container').addClass('invisible'),
    $('#content-subtitle').text(''),
    $('#content-subtitle-extra').empty();
}
function arePoisEqual(e, t) {
  return (
    e.length === t.length &&
    e.every((e, a) => {
      const n = t[a];
      return (
        e.properties.name === n.properties.name &&
        e.properties.email === n.properties.email &&
        e.properties.place_formatted === n.properties.place_formatted &&
        e.properties.rating === n.properties.rating &&
        e.properties.phone === n.properties.phone &&
        e.properties.website === n.properties.website
      );
    })
  );
}
function addPoisToSidebar(e = !0) {
  if (
    !arePoisEqual(currentPois, previousPois) ||
    $('#content-results').find('#search-content-item').length
  ) {
    if ((clearSidebarContent(), 'default' === currentPoiCategory))
      $('#content-title').text('Points of Interest');
    else {
      const e = categoryList.find((e) => e.canonical_id === currentPoiCategory);
      $('#content-title').text(
        `${e.name}${'s' === e.name.slice(-1) ? '' : 's'}`
      );
    }
    if (
      ('default' !== currentPoiCategory &&
        $('#content-subtitle-extra').append(
          `<div id='continue-search' title="Continue search when map moves"\n          role="button"\n          aria-label="Continue search when map moves"\n          aria-disabled="${
            pausingPoiSearch ? 'true' : 'false'
          }" class='flex items-center h-7 w-7 justify-center border-2 rounded-md border-red-600/60 bg-gradient-to-r from-blue-300 aria-disabled:border-white-600 border-white-600 via-purple-500 to-pink-500 group'>\n          <i\n          class="fa-solid fa-expand group-aria-disabled/button:text-slate-800 text-white-300"\n        ></i>\n        </div>\n      `
        ),
      currentPois.length)
    ) {
      let t = currentPois
        .map(({ properties: t }) => {
          if (selectedPoi && selectedPoi === t.id) return null;
          const { html: a, count: n } = renderPoiSidebarItem(t);
          return {
            html: `<div\n            id="poi-content-item"\n            data-poi-id="${
              t.id
            }"\n            aria-hidden="true"\n            aria-disabled=${
              e ? 'true' : 'false'
            }\n            class="bg-black/70 p-4 aria-disabled:scale-75 aria-disabled:opacity-0 scale-100 opacity-100 mb-4 w-full  rounded-md flex group transition-all duration-300  ease-in flex-col gap-2  even:border odd:border-2 odd:border-purple-500 even:border-white-50 odd:bg-black/50"\n          >\n            ${a}\n        </div>`,
            count: n,
          };
        })
        .filter((e) => e)
        .sort((e, t) => t.count - e.count)
        .map((e) => e.html);
      $('#content-results').append(t),
        $('#content-subtitle-container').removeClass('invisible'),
        $('#content-subtitle').text(`${currentPois.length} results`),
        e &&
          setTimeout(() => {
            $('[id="poi-content-item"]').attr('aria-disabled', 'false');
          }, 50);
    } else
      $('#content-subtitle-container').removeClass('invisible'),
        $('#content-subtitle').text('0 results');
  }
}
function changeSelectedContainerCSS(e) {
  'poi' === e
    ? $('#content-chosen')
        .removeClass('outline-[20px]')
        .removeClass('mt-8')
        .removeClass('mb-12')
        .addClass('outline-[40px]')
        .addClass('mt-12')
        .addClass('mb-[4rem]')
    : $('#content-chosen')
        .removeClass('outline-[40px]')
        .removeClass('mt-12')
        .removeClass('mb-[4rem]')
        .addClass('outline-[20px]')
        .addClass('mt-8')
        .addClass('mb-12');
}
function changeSelectedSidebarItem(e, t, a) {
  let n;
  clearTimeout(selectedTimer),
    a && (n = 'poi' === t ? a.properties.id : a.properties.mapbox_id),
    t && changeSelectedContainerCSS(t),
    $('#content-container').animate({ scrollTop: 0 }, 500);
  const r = $('#content-chosen').find(`[data-poi-id="${n}"]`).length > 0;
  if (e && !r)
    if (
      ($('#content-chosen').empty(),
      $('#content-chosen').attr('aria-disabled', 'false'),
      'poi' === t)
    ) {
      const { html: e } = renderPoiSidebarItem(a.properties);
      $('#content-chosen').append(
        `<div\n            id="poi-chosen"\n            data-poi-id="${n}"\n            aria-hidden="true"\n            aria-disabled="true"\n            class="bg-black/70 p-4 aria-disabled:opacity-0 aria-disabled:-translate-x-2 translate-x-0 opacity-100 w-full shadow-[0px_0px_20px_1px_white,_-0px_-0px_0px_1px_white] rounded-md flex group transition-all border-4 border-blue-500 duration-300 ease-in flex-col gap-2 *:text-white-400"\n          >\n            ${e} \n        </div>`
      ),
        (selectedTimer = setTimeout(() => {
          $('#poi-chosen').attr('aria-disabled', 'false'),
            $('#content-chosen').attr('aria-hidden', 'false');
        }, 50));
    } else {
      const e = renderSearchSidebarItem(a.properties);
      $('#content-chosen').append(
        `<div\n        role="button"\n        aria-hidden="true" \n        aria-disabled="true" \n        id="search-chosen" \n        data-poi-id="${n}"\n        title="Mark result on map"\n        aria-label="Mark result on map"\n        class="flex gap-4 aria-disabled:opacity-0 shadow-[0px_0px_20px_1px_white,_-0px_-0px_0px_1px_white] aria-disabled:-translate-x-2 translate-x-0 opacity-100 transition-all duration-300 ease-in items-center group p-2 rounded-md border-4 border-blue-500  bg-black/50"\n      >${e}</div>`
      ),
        (selectedTimer = setTimeout(() => {
          $('#search-chosen').attr('aria-disabled', 'false'),
            $('#content-chosen').attr('aria-hidden', 'false');
        }, 50));
    }
  e ||
    ($('#content-chosen').empty(),
    $('#content-chosen').attr('aria-disabled', 'true'));
}
function renderPoiSidebarItem(e) {
  const t = e.name ?? e.name_preferred ?? 'Unknown',
    a = e.email ?? null,
    n = e.opening_hours ?? null,
    r = e.place_formatted ?? null,
    o = e.rating ?? null,
    i = e.phone ?? null,
    s = e.website ?? null;
  return {
    html: `<span\n    id="content-expand"\n    class="cursor-pointer gap-1 flex relative items-baseline"\n  >\n    <div id='pin-poi' title='Mark on map'\n    aria-label='Mark on map'\n    role='button' class='absolute z-50 w-7 rounded-md -right-1 text-center border-white-600 border-[1.5px]'>\n      <i class="fa-solid fa-thumbtack text-green-700"></i>\n    </div>\n    <div\n      class="w-6 h-6 flex-shrink-0 relative right-2 justify-center items-center inline-flex text-white-300"\n      role="button"\n    >\n      <i class="fa-solid fa-caret-right relative text-lg"></i>\n    </div>\n    <h3\n      class="font-title text-lg max-w-52 lg:group-aria-hidden:max-w-[265px] group-aria-hidden:truncate text-white-50 transition-all duration-1000 font-medium inline -ml-3"\n      title="${t}"\n      aria-label="${t}"\n    >\n      ${t}\n    </h3>\n  </span>\n  <div class="ml-4 flex max-w-full *:text-white-50 flex-col gap-2">\n    ${
      r
        ? `<div\n          title="${r}"\n          aria-label="${r}"\n          class="font-sans group-aria-hidden:truncate flex items-baseline gap-2"\n        >\n          <i class="fa-solid fa-location-dot text-xs"></i>\n          <p class="[word-break:break-word] group-aria-hidden:truncate">${r}</p>\n        </div>`
        : ''
    }\n    ${
      o
        ? `<div\n          title="Rating: ${o} stars"\n          aria-label="Rating ${o} stars"\n          class="font-sans flex items-baseline gap-2"\n        >\n          <i class="fa-solid fa-star text-[#ffd700] text-xs"></i>${o}\n          <p class="[word-break:break-word] group-aria-hidden:truncate">${o}</p>\n          \n        </div>`
        : ''
    }\n    ${
      n
        ? `<div\n          title="${n}"\n          aria-label="${n}"\n          class="font-sans group-aria-hidden:truncate flex items-baseline gap-2"\n        >\n          <i class="fa-solid fa-clock text-xs"></i>\n          <p class="[word-break:break-word] group-aria-hidden:truncate">${n}</p>\n        </div>`
        : ''
    }\n    ${
      i
        ? `<div\n          title="Phone number: ${i}"\n          aria-label="Phone number: ${i}"\n          class="font-sans flex items-baseline gap-2"\n        >\n          <i class="fa-solid fa-phone text-xs"></i>\n          <p class="[word-break:break-word] group-aria-hidden:truncate">${i}</p>\n        </div>`
        : ''
    }\n    ${
      a
        ? `<div\n          title="Email address: ${a}"\n          aria-label="Email address: ${a}"\n          class="font-sans flex items-baseline gap-2"\n        >\n          <i class="fa-solid fa-envelope text-xs"></i>\n          <p class="[word-break:break-word] group-aria-hidden:truncate">${a}</p>\n        </div>`
        : ''
    }\n    ${
      s
        ? `<div\n          title="${s}"\n          aria-label="${s}"\n          class="font-sans group-aria-hidden:truncate flex items-baseline gap-2"\n        >\n          <i class="fa-solid fa-wifi text-xs"></i>\n          <p class="[word-break:break-word] group-aria-hidden:truncate">${s}</p>\n        </div>`
        : ''
    }\n  </div>\n</div>`,
    count: [a, n, r, o, i, s].filter((e) => null !== e).length,
  };
}
function formatEventDate(e) {
  const { event_day: t, event_month: a } = e;
  return `${t}${
    t % 10 == 1 && 11 !== t
      ? 'st'
      : t % 10 == 2 && 12 !== t
      ? 'nd'
      : t % 10 == 3 && 13 !== t
      ? 'rd'
      : 'th'
  } ${new Date(2024, a - 1, t).toLocaleString('en-GB', { month: 'long' })}`;
}
function renderHistoricalEventItem(e) {
  const {
      event_year: t,
      thumbnail: a,
      title: n,
      latitude: r,
      longitude: o,
      id: i,
    } = e,
    s = selectedHistoricalEvent && selectedHistoricalEvent.id === i,
    l = null === r || null === o;
  return `\n  <div class='flex items-center justify-between'>\n    <div class='flex sm items-center  w-fit p-2 rounded-md gap-2 m-0 xs:mr-2 xs:ml-0 xs:my-2'>\n      <div class='flex items-center justify-center'><i class="fa-solid fa-calendar-days text-white-300"></i></div>\n      <div class='font-title text-2xl text-white-300'>\n        ${
    t < 0 ? `${Math.abs(t)} BC` : `${t}`
  }\n      </div>\n    </div>\n    <div>\n      <div id='event-select-button'\n      data-event-id="${i}"\n      aria-disabled="${
    l ? 'true' : 'false'
  }" role='button' aria-label='Highlight event and change time' title='Highlight event and change time' class='relative ${
    s ? 'hidden' : 'block'
  } bg-gradient-to-r p-1 aria-disabled:cursor-default group/button from-blue-300 font-abel via-purple-500 to-pink-500 aria-disabled:group-hover/whole:text-white-50 text-white-300 z-[25] border-white-300 border rounded-md'>\n        <span >Time travel</span>\n        <div class='absolute inset-0  group-hover/event:group-aria-disabled/button:bg-slate-700/60 group-aria-disabled/button:hover:bg-slate-700/40 w-full h-full rounded-md bg-slate-700/0 z-30'></div>\n      </div>\n    </div>\n  </div>\n  <div class="rounded-md p-2">\n    <div class='float-left  mt-2 ml-2 mr-2 mb-1 w-24 xs:w-28 items-start rounded-md '>\n      <img class='object-contain w-full h-full rounded-md' src='${
    a ?? 'libs/css/assets/history-fallback.jpg'
  }' />\n    </div>\n    <div class='font-abel text-lg xs:text-xl text-white-300'>${n}</div>\n  </div>\n  `;
}
function addHistoricalEventsToSidebar(e) {
  'Historical Events' !== $('#history-category').text() &&
    $('#history-category').text('Historical Events'),
    $('#content-container').animate({ scrollTop: 0 }, 500),
    $('#content-chosen').empty(),
    $('#content-chosen').attr('aria-disabled', 'true');
  const t = e.map((e) => {
      const t = renderHistoricalEventItem(e);
      return `\n      <div aria-disabled="${
        null === e.latitude || null === e.longitude ? 'true' : 'false'
      }" class='relative group/whole'>\n        <div class='absolute font-title max-w-28 border bg-black/80 border-white-300 rounded-md top-0 right-0 transition-all duration-150 ease-out translate-y-0 group-aria-disabled/whole:group-hover/whole:opacity-100 opacity-0 group-aria-disabled/whole:group-hover/whole:-translate-y-14 p-2 uppercase text-xs text-white-300 font-light'>Coordinates unknown</div>\n        <div id='event-content-item' data-event-id="${
        e.id
      }"\n        aria-disabled='true' class='flex flex-col group/event rounded-md p-2 aria-disabled:opacity-0 bg-black/40 aria-disabled:-translate-x-2 shadow-[20px_20px_30px_0px_rgba(100,_100,_100,_.3)] mb-4 translate-x-0 opacity-100 transition-all duration-300 ease-in border-[.5px] border-[#663399]'>\n          <div class='absolute flex justify-center items-center bg-white-800/30 rounded-md inset-0 w-full h-full transition-all group-aria-disabled/whole:group-hover/whole:scale-100 scale-110 duration-150 ease-out group-aria-disabled/whole:group-hover/whole:opacity-100 opacity-0 z-20'>\n            <img class='w-28 opacity-30' src='libs/css/assets/error_icon.svg'/>\n          </div>\n          ${t}\n        </div>\n      </div>`;
    }),
    a = formatEventDate(e[0]);
  $('#content-title').text() !== `${a}` && $('#content-title').text(`${a}`),
    $('#content-results').empty(),
    $('#content-results').append(t),
    setTimeout(() => {
      $('[id="event-content-item"]').attr('aria-disabled', 'false');
    }, 50);
}
async function createChosenEventPopup() {
  eventPopup = new mapboxgl.Popup({
    offset: popupOffsets,
    anchor: 'center',
    closeButton: !1,
    closeOnClick: !1,
    className:
      'country_popup  lg:!max-w-3xl md:!max-w-2xl sm:!max-w-lg xs:!max-w-[23rem] !max-w-sm !w-full',
  });
  const {
    title: e,
    event_year: t,
    event_day: a,
    event_month: n,
    latitude: r,
    longitude: o,
    thumbnail: i,
  } = selectedHistoricalEvent;
  let s = t < 0 ? `${Math.abs(t)} BC` : `${t}`;
  const l = String(n).padStart(2, '0'),
    d = await loadImageManually(i);
  eventPopup.setHTML(
    `\n    <div class='grid grid-cols-[repeat(auto-fit,_minmax(250px,_1fr))] transition-all duration-300 gap-3 items-center'>\n      <div class='flex  md:border-b-0 border-b p-2 aspect-[2/1] h-full overflow-hidden w-full self-start relative border-white-50'>\n        <img src="${d}" class=' w-full object-contain relative rounded-md ease-in-out' >\n      </div>      \n      <div class='flex flex-col gap-3'>\n        <div class='font-abel font-semibold text-xl'>${e}</div>\n        <table class='border-0 w-full overflow-x-auto table-fixed'>\n          <tbody>\n            <tr class='group'>\n              <th class='group-odd:bg-purple-800/60 group-even:bg-black/60 font-title font-bold text-sm xs:text-lg sm:text-xl rounded-l-md'>Day</th>\n              <td class='font-sans font-medium text-xs xs:text-sm sm:text-lg text-center rounded-r-md'>${a}\n              </td>\n            </tr>\n            <tr class='group'>\n              <th class='group-odd:bg-purple-800/60 group-even:bg-black/60 font-title font-bold text-sm xs:text-lg sm:text-xl rounded-l-md'>Month</th>\n              <td class='font-sans font-medium text-xs xs:text-sm sm:text-lg text-center rounded-r-md'>${l}</td>\n            </tr>\n            <tr class='group'>\n              <th class='group-odd:bg-purple-800/60 group-even:bg-black/60 font-title font-bold text-sm xs:text-lg sm:text-xl rounded-l-md'>Year</th>\n              <td class='font-sans font-medium text-xs xs:text-sm sm:text-lg text-center rounded-r-md'>${s}</td>\n            </tr>\n            <tr class='group'>\n              <th class='group-odd:bg-purple-800/60 group-even:bg-black/60 font-title font-bold text-sm xs:text-lg sm:text-xl rounded-l-md'>Latitude</th>\n              <td class='font-sans font-medium text-xs xs:text-sm sm:text-lg text-center rounded-r-md'>${r}</td>\n            </tr>\n            <tr class='group'>\n              <th class='group-odd:bg-purple-800/60 group-even:bg-black/60 font-title font-bold text-sm xs:text-lg sm:text-xl rounded-l-md'>Longitude</th>\n              <td class='font-sans font-medium text-xs xs:text-sm sm:text-lg text-center rounded-r-md'>${o}</td>\n            </tr>\n          </tbody>\n        </table>\n      </div>\n    </div>\n    `
  ),
    map.once('moveend', () => {
      const { lng: e, lat: t } = map.getCenter();
      eventPopup.setLngLat([e, t]).addTo(map),
        disableMapInteraction(!1),
        (disableAllButtons = !1);
    });
}
async function changeYearAndMapEvent(e) {
  (disableAllButtons = !0),
    disableMapInteraction(!0),
    changePanelSpinners(!0),
    expandSidebar(!1),
    removeAllButtons(!0);
  const { event_year: t, longitude: a, latitude: n, event_date: r, id: o } = e;
  let i = 2;
  map.getZoom() <= 2 && (i = map.getZoom() - 0.5),
    await new Promise((e) => setTimeout(() => e()), 500),
    await flyToPromise({ speed: 0.5, zoom: i, duration: 1500 }),
    await animateFog(map.getFog(), selectedEventFog, 1500);
  try {
    map.filterByDate(r),
      changeExitButton(!1, `Exit selected event from ${r}`),
      removeMarkers();
    const e = new mapboxgl.Marker().setLngLat([a, n]).addTo(map);
    let o = t < 0 ? `${Math.abs(t)} BC` : `${t}`;
    $('#history-year').text(o),
      await createChosenEventPopup(),
      window.innerWidth >= 640 &&
        ($('#history-container').removeClass('h-20'),
        $('#history-container').removeClass('h-10'),
        $('#history-container').addClass('h-30'),
        $('#history-year').attr('aria-disabled', 'false'),
        $('#history-year').removeClass('animate-end_absolute')),
      addHistoricalEventsToSidebar([selectedHistoricalEvent]),
      $('#content-subtitle').text(`Year ${t}`),
      $('#content-subtitle-container').removeClass('invisible'),
      e.getElement().addEventListener('mouseenter', () => {
        e.getElement().style.cursor = 'pointer';
      }),
      e.getElement().addEventListener('mouseleave', () => {
        e.getElement().style.cursor = '';
      }),
      $(e.getElement()).on('click', async () => {
        if (
          !disableAllButtons &&
          (changePanelSpinners(!0),
          (disableAllButtons = !0),
          disableMapInteraction(!0),
          !eventPopup)
        )
          try {
            await createChosenEventPopup(),
              await flyToPromise({
                center: [a, n],
                speed: 0.5,
                zoom: 3.5,
                duration: 2e3,
              });
          } catch (e) {
          } finally {
            (disableAllButtons = !1),
              disableMapInteraction(!1),
              changePanelSpinners(!1);
          }
      }),
      setTimeout(async () => {
        await flyToPromise({
          center: [a, n],
          speed: 0.5,
          zoom: 3.5,
          duration: 2e3,
        }),
          changePanelSpinners(!1),
          removeAllButtons(!1);
      }, 1e3);
  } catch (e) {
    (selectedHistoricalEvent = null),
      addErrorToMap('Problem changing map date - try again'),
      disableMapInteraction(!1),
      (disableAllButtons = !1),
      removeAllButtons(!1),
      changePanelSpinners(!1),
      await animateFog(map.getFog(), historyFog, 1500),
      await createMarkersFromHistoricalEvents(historicalEvents),
      addHistoricalEventsToSidebar(historicalEvents),
      expandSidebar(!0);
  }
}
function removeMarkers() {
  $('.mapboxgl-marker').each(function () {
    $(this).remove();
  }),
    (historyMarkerGroup = []);
}
function toggleMarkers(e) {
  historyMarkerGroup.forEach((t) => {
    +$(t._element).attr('data-event-id') !== e
      ? (t.getElement().style.display = 'none')
      : (t.getElement().style.display = 'block');
  });
}
function pausingPoiSearch(e) {
  e
    ? ((pausePoiSearch = !0),
      $('#continue-search').attr('aria-disabled', 'true'),
      $('#continue-search-map').attr('aria-disabled', 'true'),
      $('#continue-search-map-sm').attr('aria-disabled', 'true'))
    : ((pausePoiSearch = !1),
      $('#continue-search').attr('aria-disabled', 'false'),
      $('#continue-search-map').attr('aria-disabled', 'false'),
      $('#continue-search-map-sm').attr('aria-disabled', 'false'));
}
function renderSearchSidebarItem(e) {
  return `\n      <i\n        class="fa-solid fa-location-dot text-lg pl-2 group-odd:text-purple-500 group-even:text-white-50"\n      ></i>\n      <div class="max-w-56 w-full">\n        ${createFeatureNameForResults(
    e,
    !1
  )}\n      </div>\n    `;
}
function addMarkersSourceAndLayer(e) {
  map.getSource('markers-source')
    ? map
        .getSource('markers-source')
        .setData({ type: 'FeatureCollection', features: e })
    : map.addSource('markers-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: e },
      }),
    map.getLayer('modern-markers-layer') ||
      map.addLayer({
        id: 'modern-markers-layer',
        type: 'symbol',
        slot: 'top',
        source: 'markers-source',
        layout: { 'icon-image': 'custom-marker', 'icon-size': 1 },
        paint: { 'icon-color': 'rgb(168, 85, 247)' },
      });
}
function flyToDelayed(e) {
  clearTimeout(flyToTimer),
    clearTimeout(fitBoundsTimer),
    (flyToTimer = setTimeout(() => {
      map.flyTo(e);
    }, 50));
}
function fitBoundsDelayed(e) {
  clearTimeout(flyToTimer),
    clearTimeout(fitBoundsTimer),
    (fitBoundsTimer = setTimeout(() => {
      map.fitBounds(e);
    }, 50));
}
function activateCategoryButton() {
  let e = categoryPanelButtons.find(
    (e) => e.replace('#', '').split('-')[0] === currentPoiCategory
  );
  $('#category-panel > *').attr('aria-checked', 'false'),
    e && $(e).attr('aria-checked', 'true');
}
async function retrieveAndApplyIcons(e) {
  const t =
    'https://api.mapbox.com/styles/v1/mapbox/streets-v12/sprite' +
    (window.devicePixelRatio > 1 ? '@2x' : '');
  map.loadImage(
    'https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png',
    (e, t) => {
      if (e) throw e;
      map.addImage('custom-marker', t, { sdf: !0 });
    }
  );
  const [a, n] = await Promise.all([
    $.ajax({
      url: `${t}.json?access_token=${e}`,
      method: 'GET',
      dataType: 'json',
    }),
    new Promise((a, n) => {
      const r = new Image();
      (r.crossOrigin = 'Anonymous'),
        (r.onload = () => a(r)),
        (r.onerror = n),
        (r.src = `${t}.png?access_token=${e}`);
    }),
  ]);
  Object.keys(a).forEach((e) => {
    const t = a[e];
    try {
      const a = document.createElement('canvas'),
        r = a.getContext('2d');
      (a.width = t.width),
        (a.height = t.height),
        r.drawImage(n, t.x, t.y, t.width, t.height, 0, 0, t.width, t.height);
      const o = r.getImageData(0, 0, t.width, t.height);
      map.hasImage(e) || map.addImage(e, o, { sdf: t.sdf || !1 });
    } catch {}
  });
}
function zoomForFeatureType(e) {
  return 'country' === e
    ? 5
    : 'region' === e
    ? 7
    : 'poi' === e || 'street' === e || 'place' === e
    ? 12
    : 10;
}
async function getSearchResults(e) {
  let t = 'ip';
  mostRecentLocation &&
    mostRecentLocation.latitude &&
    mostRecentLocation.longitude &&
    (t = `${mostRecentLocation.longitude},${mostRecentLocation.latitude}`);
  try {
    const { data: a } = await $.ajax({
      url: `/api/mapboxgljs/search?q=${e}&proximity=${t}&endpoint=forward`,
      method: 'GET',
      dataType: 'json',
    });
    (searchTerm = e),
      $('#search-normal').children().remove(),
      a.length
        ? ((searchResults = []),
          a.forEach((e, t) => {
            searchResults.push(e);
            const a = createFeatureNameForResults(e.properties, !0);
            $('#search-normal').append(
              `<div  id='search-normal-item' class='flex group hover:bg-sky-400\n           px-1 items-baseline gap-1 odd:bg-transparent even:bg-white-200' data-value=${t}>\n          <i class="fa-solid fa-location-dot  group-hover:text-purple-500 text-[10px] text-slate-400"></i>\n          <span class='text-sm truncate group-hover:*:text-white-50'>${a}</span>\n          </div>`
            );
          }),
          selectedPoi ||
            'default' !== currentPoiCategory ||
            appendSearchResults(a))
        : selectedPoi ||
          'default' !== currentPoiCategory ||
          appendSearchResults(a);
  } catch (e) {
    throw e;
  }
}
function appendSearchResults(e) {
  clearSidebarContent(), $('#content-chosen').empty();
  const t = `'${searchTerm}'`;
  if (
    ($('#content-title').text(t),
    $('#content-subtitle-container').removeClass('invisible'),
    e.length)
  ) {
    if (selectedSearch) {
      changeSelectedSidebarItem(
        !0,
        'search',
        e.find((e) => e.properties.mapbox_id === selectedSearch)
      );
    }
    const t = e
      .map((e) => {
        if (selectedSearch && selectedSearch === e.properties.mapbox_id)
          return null;
        const t = renderSearchSidebarItem(e.properties);
        return `<div\n            role="button"\n            aria-disabled='true'\n            id="search-content-item"\n            data-poi-id="${e.properties.mapbox_id}"\n            title="Mark result on map"\n            aria-label="Mark result on map"\n            class="flex gap-4 transition-all duration-300  ease-in aria-disabled:scale-75 aria-disabled:opacity-0 scale-100 opacity-100 items-center group mb-3 p-2 rounded-md border-2 odd:border-purple-500 even:border-white-50 bg-black/50"\n          >\n          ${t}\n          </div>`;
      })
      .filter((e) => e);
    $('#content-results').append(t),
      $('#content-subtitle').text(`${searchResults.length} results`),
      setTimeout(() => {
        $('[id="search-content-item"]').attr('aria-disabled', 'false');
      }, 50);
  } else $('#content-subtitle').text('0 results');
}
function createFeatureNameForResults(e, t) {
  const {
    name: a,
    feature_type: n,
    full_address: r,
    place_formatted: o,
    name_preferred: i,
  } = e;
  let s, l;
  return (
    t
      ? ((s = 'text-sm'), (l = 'text-white-900 text-[13px]'))
      : ((s = 'text-xl mr-1 font-title font-bold text-white-50'),
        (l = 'font-sans font-semibold text-white-300 text-lg')),
    'poi' === n
      ? `<span class='${s}'>${a}, </span><span class='${l}'>${r}</span>`
      : 'address' === n
      ? t
        ? r
        : `<span class='${l}'>\n      ${r}\n    </span>`
      : 'street' === n || 'place' === n || 'locality' === n
      ? `<span class='${s}'>${i || a}, </span><span class='${l}'>${o}</span>`
      : 'country' === n
      ? t
        ? a
        : `<span class='${l}'>\n      ${a}\n    </span>`
      : 'region' === n || 'district' === n
      ? `<span class='${s}'>${a}, </span><span class='${l}'>${o || i}</span>`
      : t
      ? `${o || i}`
      : `<span class='${l}'>\n      ${o || i}\n    </span>`
  );
}
async function returnToDefaultHistoryMap() {
  if ((expandSidebar(!1), selectedHistoricalEvent))
    try {
      map.filterByDate('2013-01-01'),
        eventPopup.remove(),
        (eventPopup = null),
        await animateFog(map.getFog(), historyFog, 1500);
      const e =
        'false' === $('#day-slider-container-lg').attr('aria-disabled') ||
        'false' === $('#day-slider-container-sm').attr('aria-disabled');
      $('#history-year').attr('aria-disabled', 'true'),
        $('#history-year').addClass('animate-end_absolute'),
        e &&
          ($('#history-container').removeClass('h-30'),
          $('#history-container').addClass('h-20')),
        (selectedHistoricalEvent = null);
    } catch (e) {
      return void addErrorToMap('Problem loading map - try again');
    }
  removeMarkers(),
    (historicalEvents = []),
    clearSidebarContent(),
    map.setLayoutProperty('hovered-country-fill', 'visibility', 'visible'),
    map.setLayoutProperty('hovered-country-line', 'visibility', 'visible'),
    map.setLayoutProperty('chosen-country-fill', 'visibility', 'visible'),
    map.setLayoutProperty('chosen-country-line', 'visibility', 'visible');
}
async function getHistoryOfCountry(e) {
  try {
    const { data: t } = await $.ajax({
      url: `/api/wikipedia/country_history?country=${e}`,
      dataType: 'json',
      method: 'GET',
    });
    return t;
  } catch (e) {
    throw e;
  }
}
async function flyToPromise(e) {
  return new Promise((t) => {
    map.once('moveend', () => {
      t();
    }),
      map.flyTo(e);
  });
}
async function fitBoundsPromise(e) {
  return new Promise((t) => {
    map.once('moveend', () => {
      t();
    }),
      map.fitBounds(e);
  });
}
function disableMapInteraction(e) {
  e
    ? (map.dragPan.disable(),
      map.scrollZoom.disable(),
      map.boxZoom.disable(),
      map.dragRotate.disable(),
      map.keyboard.disable(),
      map.doubleClickZoom.disable(),
      map.touchZoomRotate.disable())
    : (map.dragPan.enable(),
      map.scrollZoom.enable(),
      map.boxZoom.enable(),
      map.dragRotate.enable(),
      map.keyboard.enable(),
      map.doubleClickZoom.enable(),
      map.touchZoomRotate.enable());
}
function changeExitButton(e, t = '') {
  clearTimeout(exitButtonTimer),
    e
      ? ($('#exit-container').attr('aria-disabled', 'true'),
        $('#exit-button').attr('title', t),
        $('#exit-button').attr('aria-label', t),
        (exitButtonTimer = setTimeout(() => {
          $('#exit-container').addClass('invisible'),
            $('#exit-button').addClass('invisible');
        }, 300)))
      : ($('#exit-container').removeClass('invisible'),
        $('#exit-button').removeClass('invisible'),
        $('#exit-container').attr('aria-disabled', 'false'),
        $('#exit-button').attr('title', t),
        $('#exit-button').attr('aria-label', t));
}
let erroring = !1;
function addErrorToMap(e) {
  erroring ||
    ((erroring = !0),
    $('#error-map').attr('aria-disabled', 'false').addClass('animate-wiggle'),
    $('#error-map').text(e),
    setTimeout(() => {
      $('#error-map').removeClass('animate-wiggle'),
        (errorMapTimer = removeErrorFromMap());
    }, 1e3));
}
function removeErrorFromMap(e = !0) {
  return setTimeout(
    () => {
      (erroring = !1), $('#error-map').attr('aria-disabled', 'true');
    },
    e ? 3e3 : 0
  );
}
function removeAllButtons(e) {
  $('#left-panel').attr('aria-disabled', `${e}`),
    $('#right-panel').attr('aria-disabled', `${e}`),
    $('#top-panel').attr('aria-disabled', `${e}`);
}
async function animateFog(e, t, a) {
  return new Promise((n) => {
    const r = performance.now();
    requestAnimationFrame(function o(i) {
      const s = i - r,
        l = Math.min(s / a, 1),
        d = {};
      for (const a in t)
        if (Array.isArray(t[a]))
          d[a] = t[a].map((t, n) => {
            const r = e[a][n];
            return r + (t - r) * l;
          });
        else if ('number' == typeof t[a]) {
          const n = e[a];
          d[a] = n + (t[a] - n) * l;
        } else d[a] = t[a];
      map.setFog(d), l < 1 ? requestAnimationFrame(o) : n();
    });
  });
}
