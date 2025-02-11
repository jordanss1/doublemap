/// <reference path="../jquery.js" />
const historyFog = {
  range: [0.8, 8],
  color: '#e0d8c0',
  'horizon-blend': 0.3,
  'high-color': '#a0a0c0',
  'space-color': '#1a1a2a',
  'star-intensity': 0.1,
};

function nightNavStyles(map) {
  map.setFog({
    color: 'rgb(11, 11, 25)',
    'high-color': 'rgb(36, 92, 223)',
    'horizon-blend': 0.02,
    'space-color': 'rgb(11, 11, 25)',
    'star-intensity': 0.6,
  });

  map.setPaintProperty('water', 'fill-color', [
    'interpolate',
    ['linear'],
    ['zoom'],
    0,
    'rgb(10, 20, 40)',
    8,
    'rgb(20, 40, 80)',
  ]);

  map.setPaintProperty('water', 'fill-antialias', true);
  map.setPaintProperty('water', 'fill-opacity', 0.9);

  map.addLayer(
    {
      id: 'water-sheen',
      type: 'fill',
      source: 'composite',
      'source-layer': 'water',
      layout: {},
      paint: {
        'fill-color': 'rgb(100, 100, 255)',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.02, 8, 0.1],
      },
    },
    'water'
  );
}

async function applyCountryLayers() {
  if (!map.getSource('country-borders')) {
    map.addSource('country-borders', {
      type: 'vector',
      tiles: ['http://localhost:3000/data/countries/{z}/{x}/{y}.pbf'],
      promoteId: 'iso_a2',
    });
  }

  const lineColor =
    historyMode || currentBaseLayer === 'Standard'
      ? ['rgba(70, 130, 180, .8)', 'rgba(70, 130, 180, .3)']
      : ['rgba(248, 113, 113, 0.8)', 'rgba(248, 113, 113,.3)'];

  const fillColor =
    historyMode || currentBaseLayer === 'Dark'
      ? 'rgba(79, 70, 229, .6)'
      : 'rgba(94, 234, 212, .6)';

  if (!map.getLayer('chosen-country-fill')) {
    map.addLayer({
      id: 'chosen-country-fill',
      type: 'fill',
      source: 'country-borders',
      'source-layer': 'country_bordersgeo',
      maxzoom: 9,
      paint: {
        'fill-color': fillColor,
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'chosen'], false],
          1,
          0,
        ],
        'fill-emissive-strength': 10,
      },
    });
  }

  if (!map.getLayer('chosen-country-line')) {
    map.addLayer({
      id: 'chosen-country-line',
      type: 'line',
      source: 'country-borders',
      'source-layer': 'country_bordersgeo',
      maxzoom: 9,
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'chosen'], false],
          ...lineColor,
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'chosen'], false],
          4,
          0,
        ],
        'line-blur': [
          'case',
          ['boolean', ['feature-state', 'chosen'], false],
          1,
          0,
        ],
        'line-emissive-strength': 10,
      },
    });

    if (!map.getLayer('hovered-country-fill')) {
      map.addLayer({
        id: 'hovered-country-fill',
        type: 'fill',
        source: 'country-borders',
        'source-layer': 'country_bordersgeo',
        maxzoom: 6,
        paint: {
          'fill-color': fillColor,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1,
            0,
          ],
          'fill-emissive-strength': 10,
        },
      });
    }

    if (!map.getLayer('hovered-country-line')) {
      map.addLayer({
        id: 'hovered-country-line',
        type: 'line',
        source: 'country-borders',
        'source-layer': 'country_bordersgeo',
        maxzoom: 6,
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            ...lineColor,
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            8,
            2,
          ],
          'line-blur': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            6,
            1,
          ],
        },
      });
    }
  }
}

async function updateChosenCountryState(iso_a2) {
  if (chosenCountryISO) {
    map.setFeatureState(
      {
        source: 'country-borders',
        sourceLayer: 'country_bordersgeo',
        id: chosenCountryISO,
      },
      { chosen: false }
    );
  }

  if (!iso_a2) {
    map.setLayoutProperty('hovered-country-fill', 'visibility', 'visible');
    map.setLayoutProperty('hovered-country-line', 'visibility', 'visible');

    changeExitButton(true);

    if (window.innerWidth <= 424) {
      $('#left-panel').attr('aria-hidden', 'false');
    }

    if (countryPopup) {
      countryPopup.remove();
      countryPopup = null;
    }

    chosenCountryISO = null;
    return;
  } else {
    map.setLayoutProperty('hovered-country-fill', 'visibility', 'none');
    map.setLayoutProperty('hovered-country-line', 'visibility', 'none');

    if (map.getSource('markers-source')) {
      map.getSource('markers-source').setData({
        type: 'FeatureCollection',
        features: [],
      });
    }

    if (window.innerWidth <= 424) {
      $('#left-panel').attr('aria-expanded', 'false');
      $('#left-panel').attr('aria-hidden', 'true');
    }

    currentPoiCategory = 'default';
    currentMarker = null;

    addPoiSourceAndLayer([], 'default-pois');

    changeExitButton(false, 'Exit country information');

    map.setFeatureState(
      {
        source: 'country-borders',
        sourceLayer: 'country_bordersgeo',
        id: iso_a2,
      },
      { chosen: true }
    );

    chosenCountryISO = iso_a2;
  }
}

let timeout;

function applyHistoryHtml(enabled) {
  const disabledDuringHistoryMode = enabled ? 'true' : 'false';
  const enabledDuringHistoryMode = enabled ? 'false' : 'true';
  const isDaySliderEnabled =
    $('#day-slider-container').attr('aria-disabled') === 'false';

  if (enabled) {
    $('#top-panel')
      .removeClass('auto-cols-[auto_1fr_1fr]')
      .addClass('grid-cols-[150px_1fr_auto]');

    $('#history-container, #country-select-button').addClass(
      'animate-start_absolute'
    );
    $('#search-container').children().removeClass('animate-start_absolute');
    $('#select-container').removeClass('animate-start_absolute');
    $('#select-container').addClass('animate-end_absolute');
    $('#history-date, #slider-button').removeClass('animate-end_absolute');
    $('#category-container').addClass('animate-end_absolute');
    $('#category-container').attr('aria-expanded', 'false');
    $('#continue-container').attr('aria-disabled', 'true');
    $('#continue-container, #continue-container-sm').addClass(
      'invisible absolute'
    );
    $('#continue-container-sm, #continue-container').attr(
      'aria-disabled',
      'true'
    );

    timeout = setTimeout(
      () => $('#category-container').addClass('invisible'),
      300
    );
  } else {
    $('#search-container-inside')
      .removeClass('outline-3')
      .addClass('outline-0');

    $('#top-panel')
      .removeClass('grid-cols-[150px_1fr_auto]')
      .addClass('auto-cols-[auto_1fr_1fr]');

    $('#search-container').children().addClass('animate-start_absolute');
    $('#select-container').addClass('animate-start_absolute');
    $('#select-container').removeClass('animate-end_absolute');
    $('#history-container, #country-select-button').removeClass(
      'animate-start_absolute'
    );
    $('#slider-button, #history-date').addClass('animate-end_absolute');
    $('#history-date').attr('aria-disabled', 'true');
    $('#country-select-list').attr('aria-disabled', 'true');
    $('#category-container').removeClass('animate-end_absolute');
    $(
      '#category-container, #continue-container, #continue-container-sm'
    ).removeClass('invisible');

    if (window.innerWidth <= 768) {
      $('#search-container').attr('aria-expanded', 'false');
    }

    if ($('#category-panel').attr('aria-disabled') === 'true') {
      $('#category-panel > *').addClass('invisible');
    }

    if (isDaySliderEnabled) {
      $('#day-slider-container').attr('aria-disabled', 'true');
      $('#history-container').removeClass('h-20');
      $('#history-container').addClass('h-10');
    }
  }

  changeExitButton(true);

  $('#category-container').attr('aria-disabled', disabledDuringHistoryMode);
  $('#history-container')
    .attr('disabled', enabledDuringHistoryMode)
    .attr('aria-disabled', enabledDuringHistoryMode);
  $('#search-container')
    .attr('disabled', disabledDuringHistoryMode)
    .attr('aria-disabled', disabledDuringHistoryMode);
  $('#country-select-button')
    .attr('disabled', enabledDuringHistoryMode)
    .attr('aria-disabled', enabledDuringHistoryMode);
  $('#select-container')
    .attr('disabled', disabledDuringHistoryMode)
    .attr('aria-disabled', disabledDuringHistoryMode);
}

function applyHistoryStyles() {
  map.setFog(historyFog);
}
let pausingTimer;

function addPoiSourceAndLayer(pois, layerId, overridePause = false) {
  clearTimeout(pausingTimer);

  if (!map.getSource('poi-source')) {
    map.addSource('poi-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: pois },
    });
  } else {
    map
      .getSource('poi-source')
      .setData({ type: 'FeatureCollection', features: pois });
  }

  let colorArray = [];

  const iconArray = categoryList.flatMap(({ icon, canonical_id, color }) => {
    colorArray.push([canonical_id, color]);

    return [canonical_id, icon];
  });

  const textColor =
    currentBaseLayer === 'Dark'
      ? '#eef0f0'
      : ['match', ['get', 'canonical_id'], ...colorArray.flat(), '#9ea8be'];

  const haloColor = currentBaseLayer === 'Dark' ? '#000000' : '#ffffff';
  const haloWidth = currentBaseLayer === 'Dark' ? 1 : 2.5;

  if (layerId === 'default-pois' && map.getLayer('chosen-pois')) {
    map.setLayoutProperty('chosen-pois', 'visibility', 'none');
    map.setLayoutProperty('default-pois', 'visibility', 'visible');

    map.setLayoutProperty('hovered-country-fill', 'visibility', 'visible');
    map.setLayoutProperty('chosen-country-fill', 'visibility', 'visible');

    selectedPoi = null;
    pausingTimer = setTimeout(() => pausingPoiSearch(false), 750);

    $('#continue-container').attr('aria-disabled', 'true');
    $('#continue-container-sm').attr('aria-disabled', 'true');

    $('#category-panel > *').attr('aria-checked', 'false');
  }

  if (layerId === 'chosen-pois' && map.getLayer('default-pois')) {
    map.setLayoutProperty('default-pois', 'visibility', 'none');
    map.setLayoutProperty('chosen-pois', 'visibility', 'visible');

    if (chosenCountryISO) {
      map.setFeatureState(
        {
          source: 'country-borders',
          sourceLayer: 'country_bordersgeo',
          id: chosenCountryISO,
        },
        { chosen: false }
      );
    }

    if (map.getSource('markers-source')) {
      map.getSource('markers-source').setData({
        type: 'FeatureCollection',
        features: [],
      });
    }

    selectedSearch = null;
    selectedPoi = null;
    pausingPoiSearch(overridePause ? pausePoiSearch : true);

    if (
      $('#continue-container').attr('aria-disabled') === 'true' ||
      $('#continue-container-sm').attr('aria-disabled') === 'true'
    ) {
      $('#continue-container').attr('aria-disabled', 'false');
      $('#continue-container-sm').attr('aria-disabled', 'false');
    }

    currentMarker = null;

    chosenCountryISO = null;

    $('#content-container').animate({ scrollTop: 0 }, 500);

    disableMapInteraction(false);
    changeSelectedSidebarItem(false);
    addPoisToSidebar();

    if (window.innerWidth > 640) {
      expandSidebar(true);
    }

    map.setLayoutProperty('hovered-country-fill', 'visibility', 'none');
    map.setLayoutProperty('chosen-country-fill', 'visibility', 'none');

    changeExitButton(false, 'Exit selected points of interest');
  }

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: 'symbol',
      source: 'poi-source',
      slot: 'middle',
      promoteId: 'index',
      minzoom: layerId === 'default-pois' ? 9 : 0,
      layout: {
        'icon-image': [
          'match',
          ['get', 'canonical_id'],
          ...iconArray,
          'marker-15',
        ],
        'icon-size': 0.5,
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-size': 13,
        'text-field': ['get', 'name'],
        'text-offset': [0, 0.5],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': textColor,
        'text-halo-color': haloColor,
        'text-halo-width': haloWidth,
        'text-halo-blur': 1,
      },
    });
  }
}

function expandSidebar(enabled) {
  const isPanelExpanded = $('#left-panel').attr('aria-expanded') === 'true';

  if (enabled) {
    if (!isPanelExpanded) {
      $('#left-panel').attr('aria-expanded', 'true');
      $('#menu-icon').removeClass('fa-bars').addClass('fa-minimize');
    }
  } else {
    if (isPanelExpanded) {
      $('#menu-icon').removeClass('fa-minimize').addClass('fa-bars');
      $('#left-panel').attr('aria-expanded', 'false');
    }
  }
}

let clearSidebarTimeout;

function renderSpinner(bgClass, containerClass = '', size = 7) {
  return /*html*/ `<div id='spinner' aria-disabled="true"
    class="aria-disabled:opacity-0 opacity-100 aria-disabled:translate-x-2 translate-x-0 transition-all duration-150 ease-in ${containerClass}">
      <div class='${bgClass}'>
        <div
          class="border-4 rounded-full border-slate-400 border-t-white-300 w-${size} h-${size} animate-spin"
        ></div>
      </div>
  </div>`;
}

function changePanelSpinners(enabled) {
  if (enabled) {
    $('#spinner-panel').attr('aria-disabled', 'false');
    $('#spinner-panel-expanded').attr('aria-disabled', 'false');
  } else {
    $('#spinner-panel-expanded').attr('aria-disabled', 'true');
    $('#spinner-panel').attr('aria-disabled', 'true');
  }
}

function clearSidebarContent() {
  $('#content-results').empty();
  $('#content-title').text('');
  $('#content-subtitle-container').addClass('invisible');
  $('#content-subtitle').text('');
  $('#content-subtitle-extra').empty();
}

function arePoisEqual(pois1, pois2) {
  if (pois1.length !== pois2.length) return false;

  return pois1.every((poi, index) => {
    const prevPoi = pois2[index];

    return (
      poi.properties.name === prevPoi.properties.name &&
      poi.properties.email === prevPoi.properties.email &&
      poi.properties.place_formatted === prevPoi.properties.place_formatted &&
      poi.properties.rating === prevPoi.properties.rating &&
      poi.properties.phone === prevPoi.properties.phone &&
      poi.properties.website === prevPoi.properties.website
    );
  });
}

function addPoisToSidebar(initial = true) {
  if (
    arePoisEqual(currentPois, previousPois) &&
    !$('#content-results').find('#search-content-item').length
  ) {
    return;
  }

  clearSidebarContent();

  if (currentPoiCategory === 'default') {
    $('#content-title').text('Points of Interest');
  } else {
    const category = categoryList.find(
      (cate) => cate.canonical_id === currentPoiCategory
    );

    $('#content-title').text(
      `${category.name}${category.name.slice(-1) === 's' ? '' : 's'}`
    );
  }

  if (currentPoiCategory !== 'default') {
    $('#content-subtitle-extra')
      .append(/*html*/ `<div id='continue-search' title="Continue search when map moves"
          role="button"
          aria-label="Continue search when map moves"
          aria-disabled="${
            pausingPoiSearch ? 'true' : 'false'
          }" class='flex items-center h-7 w-7 justify-center border-2 rounded-md border-red-600/60 bg-gradient-to-r from-blue-300 aria-disabled:border-white-600 border-white-600 via-purple-500 to-pink-500 group'>
          <i
          class="fa-solid fa-expand group-aria-disabled/button:text-slate-800 text-white-300"
        ></i>
        </div>
      `);
  }

  if (!currentPois.length) {
    $('#content-subtitle-container').removeClass('invisible');

    $('#content-subtitle').text(`0 results`);
  } else {
    let poiElements = currentPois
      .map(({ properties }) => {
        if (selectedPoi && selectedPoi === properties.id) return null;

        const { html, count } = renderPoiSidebarItem(properties);

        return {
          html: /*html*/ `<div
            id="poi-content-item"
            data-poi-id="${properties.id}"
            aria-hidden="true"
            aria-disabled=${initial ? 'true' : 'false'}
            class="bg-black/70 p-4 aria-disabled:scale-75 aria-disabled:opacity-0 scale-100 opacity-100 mb-4 w-full  rounded-md flex group transition-all duration-300  ease-in flex-col gap-2  even:border odd:border-2 odd:border-purple-500 even:border-white-50 odd:bg-black/50"
          >
            ${html}
        </div>`,
          count,
        };
      })
      .filter((poi) => poi)
      .sort((a, b) => b.count - a.count)
      .map((item) => item.html);

    $('#content-results').append(poiElements);

    $('#content-subtitle-container').removeClass('invisible');

    $('#content-subtitle').text(`${currentPois.length} results`);

    if (initial) {
      setTimeout(() => {
        $('[id="poi-content-item"]').attr('aria-disabled', 'false');
      }, 50);
    }
  }
}

let selectedTimer;

function changeSelectedContainerCSS(type) {
  if (type === 'poi') {
    $('#content-chosen')
      .removeClass('outline-[20px]')
      .removeClass('mt-8')
      .removeClass('mb-12')
      .addClass('outline-[40px]')
      .addClass('mt-12')
      .addClass('mb-[4rem]');
  } else {
    $('#content-chosen')
      .removeClass('outline-[40px]')
      .removeClass('mt-12')
      .removeClass('mb-[4rem]')
      .addClass('outline-[20px]')
      .addClass('mt-8')
      .addClass('mb-12');
  }
}

function changeSelectedSidebarItem(enabled, type, item) {
  clearTimeout(selectedTimer);

  let id;

  if (item) {
    id = type === 'poi' ? item.properties.id : item.properties.mapbox_id;
  }

  if (type) {
    changeSelectedContainerCSS(type);
  }

  $('#content-container').animate({ scrollTop: 0 }, 500);

  const alreadyExists =
    $('#content-chosen').find(`[data-poi-id="${id}"]`).length > 0;

  if (enabled && !alreadyExists) {
    $('#content-chosen').empty();
    $('#content-chosen').attr('aria-disabled', 'false');

    if (type === 'poi') {
      const { html } = renderPoiSidebarItem(item.properties);

      $('#content-chosen').append(/*html*/ `<div
            id="poi-chosen"
            data-poi-id="${id}"
            aria-hidden="true"
            aria-disabled="true"
            class="bg-black/70 p-4 aria-disabled:opacity-0 aria-disabled:-translate-x-2 translate-x-0 opacity-100 w-full shadow-[0px_0px_20px_1px_white,_-0px_-0px_0px_1px_white] rounded-md flex group transition-all border-4 border-blue-500 duration-300 ease-in flex-col gap-2 *:text-white-400"
          >
            ${html} 
        </div>`);

      selectedTimer = setTimeout(() => {
        $('#poi-chosen').attr('aria-disabled', 'false');
        $('#content-chosen').attr('aria-hidden', 'false');
      }, 50);
    } else {
      const html = renderSearchSidebarItem(item.properties);

      $('#content-chosen').append(/*html*/ `<div
        role="button"
        aria-hidden="true" 
        aria-disabled="true" 
        id="search-chosen" 
        data-poi-id="${id}"
        title="Mark result on map"
        aria-label="Mark result on map"
        class="flex gap-4 aria-disabled:opacity-0 shadow-[0px_0px_20px_1px_white,_-0px_-0px_0px_1px_white] aria-disabled:-translate-x-2 translate-x-0 opacity-100 transition-all duration-300 ease-in items-center group p-2 rounded-md border-4 border-blue-500  bg-black/50"
      >${html}</div>`);

      selectedTimer = setTimeout(() => {
        $('#search-chosen').attr('aria-disabled', 'false');
        $('#content-chosen').attr('aria-hidden', 'false');
      }, 50);
    }
  }

  if (!enabled) {
    $('#content-chosen').empty();
    $('#content-chosen').attr('aria-disabled', 'true');
  }
}

function renderPoiSidebarItem(properties) {
  const name = properties.name ?? properties.name_preferred ?? 'Unknown';
  const email = properties.email ?? null;
  const openingHours = properties.opening_hours ?? null;
  const place = properties.place_formatted ?? null;
  const rating = properties.rating ?? null;
  const phone = properties.phone ?? null;
  const website = properties.website ?? null;

  return {
    html: /*html*/ `<span
    id="content-expand"
    class="cursor-pointer gap-1 flex relative items-baseline"
  >
    <div id='pin-poi' title='Mark on map'
    aria-label='Mark on map'
    role='button' class='absolute z-50 w-7 rounded-md -right-1 text-center border-white-600 border-[1.5px]'>
      <i class="fa-solid fa-thumbtack text-green-700"></i>
    </div>
    <div
      class="w-6 h-6 flex-shrink-0 relative right-2 justify-center items-center inline-flex text-white-300"
      role="button"
    >
      <i class="fa-solid fa-caret-right relative text-lg"></i>
    </div>
    <h3
      class="font-title text-lg max-w-52 lg:group-aria-hidden:max-w-[265px] group-aria-hidden:truncate text-white-50 transition-all duration-1000 font-medium inline -ml-3"
      title="${name}"
      aria-label="${name}"
    >
      ${name}
    </h3>
  </span>
  <div class="ml-4 flex max-w-full *:text-white-50 flex-col gap-2">
    ${
      place
        ? `<div
          title="${place}"
          aria-label="${place}"
          class="font-sans group-aria-hidden:truncate flex items-baseline gap-2"
        >
          <i class="fa-solid fa-location-dot text-xs"></i>
          <p class="[word-break:break-word] group-aria-hidden:truncate">${place}</p>
        </div>`
        : ``
    }
    ${
      rating
        ? `<div
          title="Rating: ${rating} stars"
          aria-label="Rating ${rating} stars"
          class="font-sans flex items-baseline gap-2"
        >
          <i class="fa-solid fa-star text-[#ffd700] text-xs"></i>${rating}
          <p class="[word-break:break-word] group-aria-hidden:truncate">${rating}</p>
          
        </div>`
        : ``
    }
    ${
      openingHours
        ? `<div
          title="${openingHours}"
          aria-label="${openingHours}"
          class="font-sans group-aria-hidden:truncate flex items-baseline gap-2"
        >
          <i class="fa-solid fa-clock text-xs"></i>
          <p class="[word-break:break-word] group-aria-hidden:truncate">${openingHours}</p>
        </div>`
        : ``
    }
    ${
      phone
        ? `<div
          title="Phone number: ${phone}"
          aria-label="Phone number: ${phone}"
          class="font-sans flex items-baseline gap-2"
        >
          <i class="fa-solid fa-phone text-xs"></i>
          <p class="[word-break:break-word] group-aria-hidden:truncate">${phone}</p>
        </div>`
        : ``
    }
    ${
      email
        ? `<div
          title="Email address: ${email}"
          aria-label="Email address: ${email}"
          class="font-sans flex items-baseline gap-2"
        >
          <i class="fa-solid fa-envelope text-xs"></i>
          <p class="[word-break:break-word] group-aria-hidden:truncate">${email}</p>
        </div>`
        : ``
    }
    ${
      website
        ? `<div
          title="${website}"
          aria-label="${website}"
          class="font-sans group-aria-hidden:truncate flex items-baseline gap-2"
        >
          <i class="fa-solid fa-wifi text-xs"></i>
          <p class="[word-break:break-word] group-aria-hidden:truncate">${website}</p>
        </div>`
        : ``
    }
  </div>
</div>`,
    count: [email, openingHours, place, rating, phone, website].filter(
      (val) => val !== null
    ).length,
  };
}

const historicalData = [
  {
    id: 322,
    title:
      'A Cessna Citation I/SP crashes into Percy Priest Lake in Tennessee, killing all six people on board, including actor Joe Lara and his wife Gwen Shamblin Lara.',
    event_date: '2021-05-29',
    event_day: 29,
    event_month: 5,
    event_year: 2021,
    latitude: 36.1627,
    longitude: -86.7816,
    thumbnail:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/CN_Air_Cessna_501_Citation_I_SP.jpg/320px-CN_Air_Cessna_501_Citation_I_SP.jpg',
    thumbnail_width: 320,
    thumbnail_height: 213,
    gpt_retries: null,
  },
  {
    id: 323,
    title: 'One World Observatory at One World Trade Center opens.',
    event_date: '2015-05-29',
    event_day: 29,
    event_month: 5,
    event_year: 2015,
    latitude: 40.7128,
    longitude: -74.0135,
    thumbnail:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/One_WTC_logo.svg/320px-One_WTC_logo.svg.png',
    thumbnail_width: 320,
    thumbnail_height: 147,
    gpt_retries: 1,
  },
  {
    id: 324,
    title:
      'A 5.8-magnitude earthquake hits northern Italy near Bologna, killing at least 24 people.',
    event_date: '2012-05-29',
    event_day: 29,
    event_month: 5,
    event_year: 2012,
    latitude: 44.4949,
    longitude: 11.3426,
    thumbnail:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/2012_Modena_intensity.jpg/320px-2012_Modena_intensity.jpg',
    thumbnail_width: 320,
    thumbnail_height: 404,
    gpt_retries: 1,
  },
  {
    id: 325,
    title:
      'A doublet earthquake, of combined magnitude 6.1, strikes Iceland near the town of Selfoss, injuring 30 people.',
    event_date: '2008-05-29',
    event_day: 29,
    event_month: 5,
    event_year: 2008,
    latitude: 63.9336,
    longitude: -20.9976,
    thumbnail:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/2008_Iceland_earthquake.jpg/320px-2008_Iceland_earthquake.jpg',
    thumbnail_width: 320,
    thumbnail_height: 368,
    gpt_retries: 1,
  },
  {
    id: 326,
    title:
      'France rejects the Constitution of the European Union in a national referendum.',
    event_date: '2005-05-29',
    event_day: 29,
    event_month: 5,
    event_year: 2005,
    latitude: 46.6034,
    longitude: 1.8883,
    thumbnail:
      'https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Flag_of_France.svg/320px-Flag_of_France.svg.png',
    thumbnail_width: 320,
    thumbnail_height: 213,
    gpt_retries: 1,
  },
  {
    id: 327,
    title:
      'The National World War II Memorial is dedicated in Washington, D.C.',
    event_date: '2004-05-29',
    event_day: 29,
    event_month: 5,
    event_year: 2004,
    latitude: 38.8895,
    longitude: -77.0353,
    thumbnail:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lincoln_and_WWII_memorials.jpg/320px-Lincoln_and_WWII_memorials.jpg',
    thumbnail_width: 320,
    thumbnail_height: 342,
    gpt_retries: null,
  },
  {
    id: 328,
    title:
      'The U.S. Supreme Court rules that the disabled golfer Casey Martin can use a cart to ride in tournaments.',
    event_date: '2001-05-29',
    event_day: 29,
    event_month: 5,
    event_year: 2001,
    latitude: 38.9072,
    longitude: -77.0369,
    thumbnail:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Seal_of_the_United_States_Supreme_Court.svg/320px-Seal_of_the_United_States_Supreme_Court.svg.png',
    thumbnail_width: 320,
    thumbnail_height: 320,
    gpt_retries: 1,
  },
  {
    id: 329,
    title:
      'Olusegun Obasanjo takes office as President of Nigeria, the first elected and civilian head of state in Nigeria after 16 years of military rule.',
    event_date: '1999-05-29',
    event_day: 29,
    event_month: 5,
    event_year: 1999,
    latitude: 9.082,
    longitude: 8.6753,
    thumbnail:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Olusegun_Obasanjo_DD-SC-07-14396-cropped.jpg/320px-Olusegun_Obasanjo_DD-SC-07-14396-cropped.jpg',
    thumbnail_width: 320,
    thumbnail_height: 437,
    gpt_retries: 1,
  },
];

function renderHistoricalEventItem(event) {
  const { event_year, thumbnail, title } = event;

  return /*html*/ `<div class='font-title text-xl font-semibold'>
    ${event_year}
  </div>
  <div class='grid grid-cols-[auto_max-content] gap-2'>
    <div>
      <img class='' src='${thumbnail}' />
    </div>
    <div class='font-abel text-lg'>${title}</div>
  </div>
  `;
}

function addHistoricalEventsToSidebar(events) {
  const sortedHtmlEvents = events
    .map((event) => {
      const html = renderHistoricalEventItem(event);

      return /*html*/ `<div id='event-content-item' class='flex flex-col gap-2'>
        ${html}
      </div>`;
    })
    .sort((a, b) => {
      const hasLocationA = a.latitude && a.longitude;
      const hasLocationB = b.latitude && b.longitude;

      return hasLocationB - hasLocationA;
    });

    
}

function pausingPoiSearch(paused) {
  if (paused) {
    pausePoiSearch = true;

    $('#continue-search').attr('aria-disabled', 'true');
    $('#continue-search-map').attr('aria-disabled', 'true');
    $('#continue-search-map-sm').attr('aria-disabled', 'true');
  } else {
    pausePoiSearch = false;

    $('#continue-search').attr('aria-disabled', 'false');
    $('#continue-search-map').attr('aria-disabled', 'false');
    $('#continue-search-map-sm').attr('aria-disabled', 'false');
  }
}

function renderSearchSidebarItem(properties) {
  const name = createFeatureNameForResults(properties, false);

  return /*html*/ `
      <i
        class="fa-solid fa-location-dot text-lg pl-2 group-odd:text-purple-500 group-even:text-white-50"
      ></i>
      <div class="max-w-56 w-full">
        ${name}
      </div>
    `;
}

function addMarkersSourceAndLayer(features) {
  if (!map.getSource('markers-source')) {
    map.addSource('markers-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features,
      },
    });
  } else {
    map.getSource('markers-source').setData({
      type: 'FeatureCollection',
      features: features,
    });
  }

  if (!map.getLayer('modern-markers-layer')) {
    map.addLayer({
      id: 'modern-markers-layer',
      type: 'symbol',
      slot: 'top',
      source: 'markers-source',
      layout: {
        'icon-image': 'custom-marker',
        'icon-size': 1,
      },
      paint: {
        'icon-color': 'rgb(168, 85, 247)',
      },
    });
  }

  if (!map.getLayer('history-markers-layer')) {
    map.addLayer({
      id: 'history-markers-layer',
      type: 'symbol',
      source: 'markers-source',
      layout: {
        'icon-image': 'custom-marker',
        'icon-size': 1,
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 1.25],
        'text-anchor': 'top',
      },
      paint: {
        'icon-color': '#FF0000', // Red color
      },
    });
  }
}

let flyToTimer;
let fitBoundsTimer;

function flyToDelayed(options) {
  clearTimeout(flyToTimer);
  clearTimeout(fitBoundsTimer);

  flyToTimer = setTimeout(() => {
    map.flyTo(options);
  }, 50);
}

function fitBoundsDelayed(options) {
  clearTimeout(flyToTimer);
  clearTimeout(fitBoundsTimer);

  fitBoundsTimer = setTimeout(() => {
    map.fitBounds(options);
  }, 50);
}

function activateCategoryButton() {
  let matchingCategory = categoryPanelButtons.find((button) => {
    const category = button.replace('#', '').split('-')[0];
    return category === currentPoiCategory;
  });

  $('#category-panel > *').attr('aria-checked', 'false');

  if (matchingCategory) {
    $(matchingCategory).attr('aria-checked', 'true');
  }
}

async function retrieveAndApplyIcons(token) {
  const spriteUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/sprite${
    window.devicePixelRatio > 1 ? '@2x' : ''
  }`;

  map.loadImage(
    'https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png',
    (error, image) => {
      if (error) throw error;
      map.addImage('custom-marker', image, { sdf: true });
    }
  );

  const [spriteJson, spriteImage] = await Promise.all([
    $.ajax({
      url: `${spriteUrl}.json?access_token=${token}`,
      method: 'GET',
      dataType: 'json',
    }),
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `${spriteUrl}.png?access_token=${token}`;
    }),
  ]);

  Object.keys(spriteJson).forEach((iconName) => {
    const icon = spriteJson[iconName];
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = icon.width;
      canvas.height = icon.height;

      ctx.drawImage(
        spriteImage,
        icon.x,
        icon.y,
        icon.width,
        icon.height,
        0,
        0,
        icon.width,
        icon.height
      );

      const iconImage = ctx.getImageData(0, 0, icon.width, icon.height);

      if (!map.hasImage(iconName)) {
        map.addImage(iconName, iconImage, {
          sdf: icon.sdf || false,
        });
      }
    } catch (error) {
      console.error(`Error adding icon ${iconName}:`, error);
    }
  });
}

function zoomForFeatureType(feature_type) {
  if (feature_type === 'country') {
    return 5;
  }

  if (feature_type === 'region') {
    return 7;
  }

  if (
    feature_type === 'poi' ||
    feature_type === 'street' ||
    feature_type === 'place'
  ) {
    return 12;
  }

  return 10;
}

async function getSearchResults(value) {
  let proximity = 'ip';

  if (
    mostRecentLocation &&
    mostRecentLocation.latitude &&
    mostRecentLocation.longitude
  ) {
    proximity = `${mostRecentLocation.longitude},${mostRecentLocation.latitude}`;
  }

  try {
    const { data } = await $.ajax({
      url: `/api/mapboxgljs/search?q=${value}&proximity=${proximity}&endpoint=forward`,
      method: 'GET',
      dataType: 'json',
    });

    console.log(data);

    searchTerm = value;

    $('#search-normal').children().remove();

    if (data.length) {
      searchResults = [];

      data.forEach((results, i) => {
        searchResults.push(results);

        const popoutName = createFeatureNameForResults(
          results.properties,
          true
        );

        $('#search-normal').append(
          /*html*/
          `<div  id='search-normal-item' class='flex group hover:bg-sky-400
           px-1 items-baseline gap-1 odd:bg-transparent even:bg-white-200' data-value=${i}>
          <i class="fa-solid fa-location-dot  group-hover:text-purple-500 text-[10px] text-slate-400"></i>
          <span class='text-sm truncate group-hover:*:text-white-50'>${popoutName}</span>
          </div>`
        );
      });

      if (!selectedPoi && currentPoiCategory === 'default') {
        appendSearchResults(data);
      }
    } else {
      // show notification no search results
      if (!selectedPoi && currentPoiCategory === 'default') {
        appendSearchResults(data);
      }
    }
  } catch (err) {
    throw err;
  }
}

function appendSearchResults(results) {
  clearSidebarContent();

  $('#content-chosen').empty();

  const title = `'${searchTerm}'`;

  $('#content-title').text(title);

  $('#content-subtitle-container').removeClass('invisible');

  if (results.length) {
    if (selectedSearch) {
      const result = results.find(
        (res) => res.properties.mapbox_id === selectedSearch
      );

      changeSelectedSidebarItem(true, 'search', result);
    }

    const searchElements = results
      .map((res) => {
        if (selectedSearch && selectedSearch === res.properties.mapbox_id) {
          return null;
        }

        console.log(res);

        const html = renderSearchSidebarItem(res.properties);

        return /*html*/ `<div
            role="button"
            aria-disabled='true'
            id="search-content-item"
            data-poi-id="${res.properties.mapbox_id}"
            title="Mark result on map"
            aria-label="Mark result on map"
            class="flex gap-4 transition-all duration-300  ease-in aria-disabled:scale-75 aria-disabled:opacity-0 scale-100 opacity-100 items-center group mb-3 p-2 rounded-md border-2 odd:border-purple-500 even:border-white-50 bg-black/50"
          >
          ${html}
          </div>`;
      })
      .filter((item) => item);

    $('#content-results').append(searchElements);

    $('#content-subtitle').text(`${searchResults.length} results`);

    setTimeout(() => {
      $('[id="search-content-item"]').attr('aria-disabled', 'false');
    }, 50);
  } else {
    $('#content-subtitle').text(`0 results`);
  }
}

function createFeatureNameForResults(feature, popout) {
  const { name, feature_type, full_address, place_formatted, name_preferred } =
    feature;

  let title;
  let subtitle;

  if (popout) {
    title = 'text-sm';
    subtitle = 'text-white-900 text-[13px]';
  } else {
    title = 'text-xl mr-1 font-title font-bold text-white-50';
    subtitle = 'font-sans font-semibold text-white-300 text-lg';
  }

  if (feature_type === 'poi') {
    return /*html*/ `<span class='${title}'>${name}, </span><span class='${subtitle}'>${full_address}</span>`;
  } else if (feature_type === 'address') {
    if (popout) {
      return full_address;
    } else {
      return /*html*/ `<span class='${subtitle}'>
      ${full_address}
    </span>`;
    }
  } else if (
    feature_type === 'street' ||
    feature_type === 'place' ||
    feature_type === 'locality'
  ) {
    return /*html*/ `<span class='${title}'>${
      name_preferred || name
    }, </span><span class='${subtitle}'>${place_formatted}</span>`;
  } else if (feature_type === 'country') {
    if (popout) {
      return name;
    } else {
      return /*html*/ `<span class='${subtitle}'>
      ${name}
    </span>`;
    }
  } else if (feature_type === 'region' || feature_type === 'district') {
    return /*html*/ `<span class='${title}'>${name}, </span><span class='${subtitle}'>${
      place_formatted || name_preferred
    }</span>`;
  } else {
    if (popout) {
      return `${place_formatted || name_preferred}`;
    } else {
      return /*html*/ `<span class='${subtitle}'>
      ${place_formatted || name_preferred}
    </span>`;
    }
  }
}

async function getHistoryOfCountry(country) {
  try {
    const { data } = await $.ajax({
      url: `/api/wikipedia/country_history?country=${country}`,
      dataType: 'json',
      method: 'GET',
    });

    return data;
  } catch (err) {
    throw err;
  }
}

async function flyToPromise(options) {
  return new Promise((resolve) => {
    map.once('moveend', () => {
      resolve();
    });

    map.flyTo(options);
  });
}
async function fitBoundsPromise(options) {
  return new Promise((resolve) => {
    map.once('moveend', () => {
      resolve();
    });

    map.fitBounds(options);
  });
}

function disableMapInteraction(disable) {
  if (disable) {
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.boxZoom.disable();
    map.dragRotate.disable();
    map.keyboard.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
  } else {
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.boxZoom.enable();
    map.dragRotate.enable();
    map.keyboard.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();
  }
}

let exitButtonTimer;

function changeExitButton(disabled, title = '') {
  clearTimeout(exitButtonTimer);

  if (disabled) {
    $('#exit-container').attr('aria-disabled', 'true');
    $('#exit-button').attr('title', title);
    $('#exit-button').attr('aria-label', title);

    exitButtonTimer = setTimeout(() => {
      $('#exit-container').addClass('invisible');
      $('#exit-button').addClass('invisible');
    }, 300);
  } else {
    $('#exit-container').removeClass('invisible');
    $('#exit-button').removeClass('invisible');

    $('#exit-container').attr('aria-disabled', 'false');
    $('#exit-button').attr('title', title);
    $('#exit-button').attr('aria-label', title);
  }
}

let erroring = false;

function addErrorToMap(errorMessage) {
  if (erroring) return;

  $('#error-map').attr('aria-disabled', 'false').addClass('animate-wiggle');
  $('#error-map').text(errorMessage);

  setTimeout(() => {
    $('#error-map').removeClass('animate-wiggle');

    errorMapTimer = removeErrorFromMap();
  }, 1000);
}

function removeErrorFromMap(withTimeout = true) {
  return setTimeout(
    () => {
      erroring = false;

      $('#error-map').attr('aria-disabled', 'true');
    },
    withTimeout ? 3000 : 0
  );
}

function removeAllButtons(disable) {
  $('#left-panel').attr('aria-disabled', `${disable}`);
  $('#right-panel').attr('aria-disabled', `${disable}`);
  $('#top-panel').attr('aria-disabled', `${disable}`);
}

async function animateFog(startProps, endProps, duration) {
  return new Promise((resolve) => {
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      const currentProps = {};
      for (const key in endProps) {
        if (Array.isArray(endProps[key])) {
          currentProps[key] = endProps[key].map((endValue, index) => {
            const startValue = startProps[key][index];
            return startValue + (endValue - startValue) * progress;
          });
        } else if (typeof endProps[key] === 'number') {
          const startValue = startProps[key];
          currentProps[key] =
            startValue + (endProps[key] - startValue) * progress;
        } else {
          currentProps[key] = endProps[key];
        }
      }

      map.setFog(currentProps);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}
