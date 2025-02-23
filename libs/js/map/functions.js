/// <reference path="../jquery.js" />
const historyFog = {
  range: [0.8, 8],
  color: '#e0d8c0',
  'horizon-blend': 0.3,
  'high-color': '#a0a0c0',
  'space-color': '#1a1a2a',
  'star-intensity': 0.1,
};

const selectedEventFog = {
  range: [0.5, 10],
  color: '#e0f0ff',
  'horizon-blend': 0.2,
  'high-color': '#4682b4',
  'space-color': '#191970',
  'star-intensity': 0.4,
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

    if (historyMode) {
      await returnToDefaultHistoryMap();
    }

    $('#left-panel').attr('aria-expanded', 'false');

    if (window.innerWidth <= 424) {
      $('#left-panel').attr('aria-hidden', 'true');
    }

    historicalEvents = [];
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
    $('#day-slider-container-lg').attr('aria-disabled') === 'false' ||
    $('#day-slider-container-sm').attr('aria-disabled') === 'false';

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
    $(
      '#history-date-container, #slider-button, #history-date, #history-year'
    ).removeClass('animate-end_absolute');
    $('#category-container').addClass('animate-end_absolute');
    $('#category-container').attr('aria-expanded', 'false');
    $('#continue-container, #continue-container-sm').addClass(
      'invisible absolute'
    );
    $('#continue-container-sm, #continue-container').attr(
      'aria-disabled',
      'true'
    );
    $('#history-category').removeClass('hidden');

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
    $('#continue-container, #continue-container-sm').removeClass(
      'invisible absolute'
    );
    $(
      '#slider-button, #history-date, #history-date-container, #history-year'
    ).addClass('animate-end_absolute');
    $('#history-date-container').attr('aria-disabled', 'true');
    $('#history-year').attr('aria-disabled', 'true');
    $('#country-select-list').attr('aria-disabled', 'true');
    $('#category-container').removeClass('animate-end_absolute');
    $(
      '#category-container, #continue-container, #continue-container-sm'
    ).removeClass('invisible');
    $('#history-category').addClass('hidden');

    if (window.innerWidth <= 768) {
      $('#search-container').attr('aria-expanded', 'false');
    }

    if ($('#category-panel').attr('aria-disabled') === 'true') {
      $('#category-panel > *').addClass('invisible');
    }

    if (isDaySliderEnabled) {
      $('#day-slider-container-lg').attr('aria-disabled', 'true');
      $('#day-slider-container-sm').attr('aria-disabled', 'true');
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

    console.log(currentMarker);

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
  $('#history-category').text('');
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

function formatEventDate(event) {
  const { event_day, event_month } = event;

  let date = new Date(2024, event_month - 1, event_day);

  let day = event_day;
  let suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
      ? 'nd'
      : day % 10 === 3 && day !== 13
      ? 'rd'
      : 'th';

  let month = date.toLocaleString('en-GB', { month: 'long' });

  return `${day}${suffix} ${month}`;
}

function renderHistoricalEventItem(event) {
  const { event_year, thumbnail, title, latitude, longitude, id } = event;

  const currentlySelected =
    selectedHistoricalEvent && selectedHistoricalEvent.id === id;

  const noCoords = latitude === null || longitude === null;

  let formattedYear =
    event_year < 0 ? `${Math.abs(event_year)} BC` : `${event_year}`;

  return /*html*/ `
  <div class='flex items-center justify-between'>
    <div class='flex sm items-center  w-fit p-2 rounded-md gap-2 m-0 xs:mr-2 xs:ml-0 xs:my-2'>
      <div class='flex items-center justify-center'><i class="fa-solid fa-calendar-days text-white-300"></i></div>
      <div class='font-title text-2xl text-white-300'>
        ${formattedYear}
      </div>
    </div>
    <div>
      <div id='event-select-button'
      data-event-id="${id}"
      aria-disabled="${
        noCoords ? 'true' : 'false'
      }" role='button' aria-label='Highlight event and change time' title='Highlight event and change time' class='relative ${
    currentlySelected ? 'hidden' : 'block'
  } bg-gradient-to-r p-1 aria-disabled:cursor-default group/button from-blue-300 font-abel via-purple-500 to-pink-500 aria-disabled:group-hover/whole:text-white-50 text-white-300 z-[25] border-white-300 border rounded-md'>
        <span >Time travel</span>
        <div class='absolute inset-0  group-hover/event:group-aria-disabled/button:bg-slate-700/60 group-aria-disabled/button:hover:bg-slate-700/40 w-full h-full rounded-md bg-slate-700/0 z-30'></div>
      </div>
    </div>
  </div>
  <div class="rounded-md p-2">
    <div class='float-left  mt-2 ml-2 mr-2 mb-1 w-24 xs:w-28 items-start rounded-md '>
      <img class='object-contain w-full h-full rounded-md' src='${
        thumbnail ?? 'libs/css/assets/history-fallback.jpg'
      }' />
    </div>
    <div class='font-abel text-lg xs:text-xl text-white-300'>${title}</div>
  </div>
  `;
}

function addHistoricalEventsToSidebar(events) {
  if ($('#history-category').text() !== 'Historical Events') {
    $('#history-category').text('Historical Events');
  }

  $('#content-container').animate({ scrollTop: 0 }, 500);

  $('#content-chosen').empty();

  $('#content-chosen').attr('aria-disabled', 'true');

  const sortedHtmlEvents = events.map((event) => {
    const html = renderHistoricalEventItem(event);

    const noCoords = event.latitude === null || event.longitude === null;

    return /*html*/ `
      <div aria-disabled="${
        noCoords ? 'true' : 'false'
      }" class='relative group/whole'>
        <div class='absolute font-title max-w-28 border bg-black/80 border-white-300 rounded-md top-0 right-0 transition-all duration-150 ease-out translate-y-0 group-aria-disabled/whole:group-hover/whole:opacity-100 opacity-0 group-aria-disabled/whole:group-hover/whole:-translate-y-14 p-2 uppercase text-xs text-white-300 font-light'>Coordinates unknown</div>
        <div id='event-content-item' data-event-id="${event.id}"
        aria-disabled='true' class='flex flex-col group/event rounded-md p-2 aria-disabled:opacity-0 bg-black/40 aria-disabled:-translate-x-2 shadow-[20px_20px_30px_0px_rgba(100,_100,_100,_.3)] mb-4 translate-x-0 opacity-100 transition-all duration-300 ease-in border-[.5px] border-[#663399]'>
          <div class='absolute flex justify-center items-center bg-white-800/30 rounded-md inset-0 w-full h-full transition-all group-aria-disabled/whole:group-hover/whole:scale-100 scale-110 duration-150 ease-out group-aria-disabled/whole:group-hover/whole:opacity-100 opacity-0 z-20'>
            <img class='w-28 opacity-30' src='libs/css/assets/error_icon.svg'/>
          </div>
          ${html}
        </div>
      </div>`;
  });

  console.log(events[0]);

  const eventDateFormatted = formatEventDate(events[0]);

  if ($('#content-title').text() !== `${eventDateFormatted}`) {
    $('#content-title').text(`${eventDateFormatted}`);
  }

  $('#content-results').empty();
  $('#content-results').append(sortedHtmlEvents);

  setTimeout(() => {
    $('[id="event-content-item"]').attr('aria-disabled', 'false');
  }, 50);
}

async function createChosenEventPopup() {
  eventPopup = new mapboxgl.Popup({
    offset: popupOffsets,
    anchor: 'center',
    closeButton: false,
    closeOnClick: false,
    className: `country_popup  lg:!max-w-3xl md:!max-w-2xl sm:!max-w-lg xs:!max-w-[23rem] !max-w-sm !w-full`,
  });

  const {
    title,
    event_year,
    event_day,
    event_month,
    latitude,
    longitude,
    thumbnail,
  } = selectedHistoricalEvent;

  let formattedYear =
    event_year < 0 ? `${Math.abs(event_year)} BC` : `${event_year}`;

  const month = String(event_month).padStart(2, '0');

  const url = await loadImageManually(thumbnail);

  eventPopup.setHTML(/*html*/ `
    <div class='grid grid-cols-[repeat(auto-fit,_minmax(250px,_1fr))] transition-all duration-300 gap-3 items-center'>
      <div class='flex  md:border-b-0 border-b p-2 aspect-[2/1] h-full overflow-hidden w-full self-start relative border-white-50'>
        <img src="${url}" class=' w-full object-contain relative rounded-md ease-in-out' >
      </div>      
      <div class='flex flex-col gap-3'>
        <div class='font-abel font-semibold text-xl'>${title}</div>
        <table class='border-0 w-full overflow-x-auto table-fixed'>
          <tbody>
            <tr class='group'>
              <th class='group-odd:bg-purple-800/60 group-even:bg-black/60 font-title font-bold text-sm xs:text-lg sm:text-xl rounded-l-md'>Day</th>
              <td class='font-sans font-medium text-xs xs:text-sm sm:text-lg text-center rounded-r-md'>${event_day}
              </td>
            </tr>
            <tr class='group'>
              <th class='group-odd:bg-purple-800/60 group-even:bg-black/60 font-title font-bold text-sm xs:text-lg sm:text-xl rounded-l-md'>Month</th>
              <td class='font-sans font-medium text-xs xs:text-sm sm:text-lg text-center rounded-r-md'>${month}</td>
            </tr>
            <tr class='group'>
              <th class='group-odd:bg-purple-800/60 group-even:bg-black/60 font-title font-bold text-sm xs:text-lg sm:text-xl rounded-l-md'>Year</th>
              <td class='font-sans font-medium text-xs xs:text-sm sm:text-lg text-center rounded-r-md'>${formattedYear}</td>
            </tr>
            <tr class='group'>
              <th class='group-odd:bg-purple-800/60 group-even:bg-black/60 font-title font-bold text-sm xs:text-lg sm:text-xl rounded-l-md'>Latitude</th>
              <td class='font-sans font-medium text-xs xs:text-sm sm:text-lg text-center rounded-r-md'>${latitude}</td>
            </tr>
            <tr class='group'>
              <th class='group-odd:bg-purple-800/60 group-even:bg-black/60 font-title font-bold text-sm xs:text-lg sm:text-xl rounded-l-md'>Longitude</th>
              <td class='font-sans font-medium text-xs xs:text-sm sm:text-lg text-center rounded-r-md'>${longitude}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    `);

  map.once('moveend', () => {
    const { lng, lat } = map.getCenter();

    eventPopup.setLngLat([lng, lat]).addTo(map);

    disableMapInteraction(false);
    disableAllButtons = false;
  });
}

async function changeYearAndMapEvent(event) {
  disableAllButtons = true;
  disableMapInteraction(true);
  changePanelSpinners(true);
  expandSidebar(false);
  removeAllButtons(true);

  const { event_year, longitude, latitude, event_date, id } = event;

  let zoom = 2;

  if (map.getZoom() <= 2) zoom = map.getZoom() - 0.5;

  await new Promise((resolve) => setTimeout(() => resolve()), 500);

  await flyToPromise({
    speed: 0.5,
    zoom,
    duration: 1500,
  });

  await animateFog(map.getFog(), selectedEventFog, 1500);

  try {
    map.filterByDate(event_date);

    changeExitButton(false, `Exit selected event from ${event_date}`);

    removeMarkers();

    const selectedMarker = new mapboxgl.Marker()
      .setLngLat([longitude, latitude])
      .addTo(map);

    let formattedYear =
      event_year < 0 ? `${Math.abs(event_year)} BC` : `${event_year}`;

    $('#history-year').text(formattedYear);

    await createChosenEventPopup();

    if (window.innerWidth >= 640) {
      $('#history-container').removeClass('h-20');
      $('#history-container').removeClass('h-10');
      $('#history-container').addClass('h-30');

      $('#history-year').attr('aria-disabled', 'false');
      $('#history-year').removeClass('animate-end_absolute');
    }

    addHistoricalEventsToSidebar([selectedHistoricalEvent]);

    $('#content-subtitle').text(`Year ${event_year}`);
    $('#content-subtitle-container').removeClass(`invisible`);

    selectedMarker.getElement().addEventListener('mouseenter', () => {
      selectedMarker.getElement().style.cursor = 'pointer';
    });

    selectedMarker.getElement().addEventListener('mouseleave', () => {
      selectedMarker.getElement().style.cursor = '';
    });

    $(selectedMarker.getElement()).on('click', async () => {
      if (disableAllButtons) return;

      changePanelSpinners(true);
      disableAllButtons = true;
      disableMapInteraction(true);

      if (!eventPopup) {
        try {
          await createChosenEventPopup();

          await flyToPromise({
            center: [longitude, latitude],
            speed: 0.5,
            zoom: 3.5,
            duration: 2000,
          });
        } catch (err) {
        } finally {
          disableAllButtons = false;
          disableMapInteraction(false);
          changePanelSpinners(false);
        }
      }
    });

    setTimeout(async () => {
      await flyToPromise({
        center: [longitude, latitude],
        speed: 0.5,
        zoom: 3.5,
        duration: 2000,
      });

      changePanelSpinners(false);

      removeAllButtons(false);
    }, 1000);
  } catch (err) {
    console.log(err);
    selectedHistoricalEvent = null;
    addErrorToMap('Problem changing map date - try again');
    disableMapInteraction(false);
    disableAllButtons = false;
    removeAllButtons(false);
    changePanelSpinners(false);

    await animateFog(map.getFog(), historyFog, 1500);

    await createMarkersFromHistoricalEvents(historicalEvents);
    addHistoricalEventsToSidebar(historicalEvents);
    expandSidebar(true);
  }
}

function removeMarkers() {
  $('.mapboxgl-marker').each(function () {
    $(this).remove();
  });

  historyMarkerGroup = [];
}

function toggleMarkers(id) {
  historyMarkerGroup.forEach((marker) => {
    if (+$(marker._element).attr('data-event-id') !== id) {
      marker.getElement().style.display = 'none';
    } else {
      marker.getElement().style.display = 'block';
    }
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
        'symbol-sort-key': 1,
        'icon-allow-overlap': true,
        'text-allow-overlap': true,
        'icon-image': 'custom-marker',
        'icon-size': 1,
        'symbol-z-order': 'source',
      },
      paint: {
        'icon-color': 'rgb(168, 85, 247)',
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

async function returnToDefaultHistoryMap() {
  expandSidebar(false);

  if (selectedHistoricalEvent) {
    try {
      map.filterByDate('2013-01-01');

      eventPopup.remove();
      eventPopup = null;

      await animateFog(map.getFog(), historyFog, 1500);

      const isDaySliderEnabled =
        $('#day-slider-container-lg').attr('aria-disabled') === 'false' ||
        $('#day-slider-container-sm').attr('aria-disabled') === 'false';

      $('#history-year').attr('aria-disabled', 'true');
      $('#history-year').addClass('animate-end_absolute');

      if (isDaySliderEnabled) {
        $('#history-container').removeClass('h-30');
        $('#history-container').addClass('h-20');
      }

      selectedHistoricalEvent = null;
    } catch (err) {
      addErrorToMap('Problem loading map - try again');
      console.log(err);
      return;
    }
  }

  removeMarkers();

  historicalEvents = [];

  clearSidebarContent();

  map.setLayoutProperty('hovered-country-fill', 'visibility', 'visible');
  map.setLayoutProperty('hovered-country-line', 'visibility', 'visible');
  map.setLayoutProperty('chosen-country-fill', 'visibility', 'visible');
  map.setLayoutProperty('chosen-country-line', 'visibility', 'visible');
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

  erroring = true;

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
