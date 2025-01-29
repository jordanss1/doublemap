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

    disableMapInteraction(false);
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

    currentPoiCategory = 'default';
    currentMarker = null;

    addPoiSourceAndLayer([], 'default-pois');

    changeExitButton(false, 'Exit country information');

    disableMapInteraction(true);

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
    $('#top-panel').removeClass('auto-cols-[auto_1fr_1fr]');
    $('#top-panel').addClass('grid-cols-[150px_1fr_auto]');
    $('#history-container').addClass('animate-start_absolute');
    $('#country-select-button').addClass('animate-start_absolute');
    $('#search-container').children().removeClass('animate-start_absolute');
    $('#select-container').removeClass('animate-start_absolute');
    $('#select-container').addClass('animate-end_absolute');
    $('#history-date').removeClass('animate-end_absolute');
    $('#slider-button').removeClass('animate-end_absolute');
    $('#category-container').addClass('animate-end_absolute');
    $('#category-container').attr('aria-expanded', 'false');

    timeout = setTimeout(
      () => $('#category-container').addClass('invisible'),
      300
    );
  } else {
    $('#search-container-inside').removeClass('outline-3');
    $('#search-container-inside').addClass('outline-0');
    $('#top-panel').removeClass('grid-cols-[150px_1fr_auto]');
    $('#top-panel').addClass('auto-cols-[auto_1fr_1fr]');
    $('#search-container').children().addClass('animate-start_absolute');
    $('#select-container').addClass('animate-start_absolute');
    $('#select-container').removeClass('animate-end_absolute');
    $('#history-container').removeClass('animate-start_absolute');
    $('#country-select-button').removeClass('animate-start_absolute');
    $('#slider-button').addClass('animate-end_absolute');
    $('#history-date').addClass('animate-end_absolute');
    $('#history-date').attr('aria-disabled', 'true');
    $('#country-select-list').attr('aria-disabled', 'true');
    $('#category-container').removeClass('animate-end_absolute');
    $('#category-container').removeClass('invisible');

    if (window.innerWidth <= 768) {
      $('#search-container').attr('aria-expanded', 'false');
    }

    if ($('#category-panel').attr('aria-disabled') === 'true') {
      console.log('inside');
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

function addPoiSourceAndLayer(pois, layerId) {
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

    $('#content-results').empty();

    $('#content-title').text('');

    selectedPoi = null;
    pausePoiSearch = false;

    changeExitButton(true);

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

    selectedPoi = null;
    pausePoiSearch = true;

    currentMarker = null;

    chosenCountryISO = null;

    disableMapInteraction(false);
    addPoisToSidebar();
    $('#left-panel').attr('aria-expanded', 'true');

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

function clearSidebarContent() {
  $('#content-results').empty();
  $('#content-title').text('');
}

function addPoisToSidebar() {
  clearSidebarContent();

  if (!currentPois.length) {
  } else {
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

    let poiElements = currentPois
      .map(({ properties }) => {
        const name = properties.name ?? properties.name_preferred ?? 'Unknown';
        const email = properties.email ?? null;
        const openingHours = properties.opening_hours ?? null;
        const place = properties.place_formatted ?? null;
        const rating = properties.rating ?? null;
        const phone = properties.phone ?? null;
        const website = properties.website ?? null;

        return {
          html: /*html*/ `<div
      id="poi-content-item"
      aria-hidden="true"
      class="bg-black/70 p-4 mb-4 w-full shadow-[rgba(209,_214,_225,.3)_0px_5px_15px] rounded-md flex group transition-all duration-300 ease-in flex-col gap-2 *:text-white-400"
    >
      <span
      id="content-expand"

        class="group-aria-hidden:truncate cursor-pointer gap-1 flex items-baseline"
      >
        <div
          class="w-6 h-6 flex-shrink-0 relative right-2 justify-center items-center inline-flex text-white-300"
          role="button"
        >
          <i class="fa-solid fa-caret-right relative text-lg"></i>
        </div>
        <h3
          class="font-title text-lg font-medium inline -ml-3"
          title="${name}"
          aria-labelledby="${name}"
        >
          ${name}
        </h3>
      </span>
      <div class="ml-4 flex max-w-full flex-col gap-2">
        ${
          place
            ? `<div
              title="${place}"
              aria-labelledby="${place}"
              class="font-sans group-aria-hidden:truncate flex items-baseline gap-2"
            >
              <i class="fa-solid fa-location-dot text-xs"></i>
              <p class="[word-break:break-word]">${place}</p>
            </div>`
            : ``
        }
        ${
          rating
            ? `<div
              title="Rating: ${rating} stars"
              aria-labelledby="Rating ${rating} stars"
              class="font-sans flex items-baseline gap-2"
            >
              <i class="fa-solid fa-star text-[#ffd700] text-xs"></i>${rating}
              <p class="[word-break:break-word]">${rating}</p>
              
            </div>`
            : ``
        }
        ${
          openingHours
            ? `<div
              title="${openingHours}"
              aria-labelledby="${openingHours}"
              class="font-sans group-aria-hidden:truncate flex items-baseline gap-2"
            >
              <i class="fa-solid fa-clock text-xs"></i>
              <p class="[word-break:break-word]">${openingHours}</p>
            </div>`
            : ``
        }
        ${
          phone
            ? `<div
              title="Phone number: ${phone}"
              aria-labelledby="Phone number: ${phone}"
              class="font-sans flex items-baseline gap-2"
            >
              <i class="fa-solid fa-phone text-xs"></i>
              <p class="[word-break:break-word]">${phone}</p>
            </div>`
            : ``
        }
        ${
          email
            ? `<div
              title="Email address: ${email}"
              aria-labelledby="Email address: ${email}"
              class="font-sans flex items-baseline gap-2"
            >
              <i class="fa-solid fa-envelope text-xs"></i>
              <p class="[word-break:break-word]">${email}</p>
            </div>`
            : ``
        }
        ${
          website
            ? `<div
              title="${website}"
              aria-labelledby="${website}"
              class="font-sans group-aria-hidden:truncate flex items-baseline gap-2"
            >
              <i class="fa-solid fa-wifi text-xs"></i>
              <p class="[word-break:break-word]">${website}</p>
            </div>`
            : ``
        }
      </div>
    </div>
  </div>`,
          count: [email, openingHours, place, rating, phone, website].filter(
            (val) => val !== null
          ).length,
        };
      })
      .sort((a, b) => b.count - a.count)
      .map((item) => item.html);

    $('#content-results').append(poiElements);
  }
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
    return 16;
  }

  return 10;
}

async function getSearchResults(value, loading) {
  loading = true;

  let proximity = 'ip';

  if (
    mostRecentLocation &&
    mostRecentLocation.latitude &&
    mostRecentLocation.longitude
  ) {
    proximity = `${mostRecentLocation.latitude},${mostRecentLocation.longitude}`;
  }

  try {
    const { data } = await $.ajax({
      url: `/api/mapboxgljs/search?q=${value}&proximity=${proximity}&endpoint=forward`,
      method: 'GET',
      dataType: 'json',
    });

    searchTerm = value;

    $('#search-normal').children().remove();

    if (data.length) {
      searchResults = [];

      data.forEach((results, i) => {
        searchResults.push(results);
        const name = createFeatureNameForSearch(results.properties);

        $('#search-normal').append(
          /*html*/
          `<div id='search-normal-item' class='flex items-baseline gap-1' data-value=${i}>
          <i class="fa-solid fa-location-dot text-[10px] text-slate-400"></i>
          <span class='text-sm truncate'>${name}</span>
          </div>`
        );
      });
    }
  } catch (err) {
    const res = JSON.parse(err.responseText);
    console.log(`Error Status: ${err.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  } finally {
    loading = false;
  }
}

function createFeatureNameForSearch(feature) {
  const { name, feature_type, full_address, place_formatted, name_preferred } =
    feature;

  if (feature_type === 'poi') {
    return /*html*/ `<span class='text-sm'>${name}, </span><span class='text-white-900 text-[13px]'>${full_address}</span>`;
  } else if (feature_type === 'address') {
    return full_address;
  } else if (
    feature_type === 'street' ||
    feature_type === 'place' ||
    feature_type === 'locality'
  ) {
    return /*html*/ `<span class='text-sm'>${
      name_preferred || name
    }, </span><span class='text-white-900 text-[13px]'>${place_formatted}</span>`;
  } else if (feature_type === 'country') {
    return name;
  } else if (feature_type === 'region' || feature_type === 'district') {
    return /*html*/ `<span class='text-sm'>${name}, </span><span class='text-white-900 text-[13px]'>${
      place_formatted || name_preferred
    }</span>`;
  } else {
    return /*html*/ `${place_formatted || name_preferred}`;
  }
}

async function getHistoryOfCountry(country) {
  try {
    const { data } = await $.ajax({
      url: `/api/wikipedia/country_history?country=${country}`,
      dataType: 'json',
      method: 'GET',
    });

    console.log(data);
  } catch (err) {
    const res = JSON.parse(err.responseText);
    console.log(`Error Status: ${err.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  }
}

function flyToPromise(options) {
  return new Promise((resolve) => {
    map.once('moveend', () => {
      resolve();
    });

    map.flyTo(options);
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
