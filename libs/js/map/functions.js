/// <reference path="../jquery.js" />
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

function updateChosenCountryState(iso_a2) {
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

async function applyCountryLayers() {
  if (!map.getSource('country-borders')) {
    map.addSource('country-borders', {
      type: 'vector',
      tiles: ['http://localhost:3000/data/countries/{z}/{x}/{y}.pbf'],
      promoteId: 'iso_a2',
    });
  }

  const fillOpacity =
    historyMode || currentBaseLayer === 'Standard' ? 0.6 : 0.4;

  if (!map.getLayer('chosen-country-fill')) {
    map.addLayer({
      id: 'chosen-country-fill',
      type: 'fill',
      source: 'country-borders',
      'source-layer': 'country_bordersgeo',
      maxzoom: 8,
      paint: {
        'fill-color': 'rgba(79, 70, 229,.6)',
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
      maxzoom: 8,
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'chosen'], false],
          'rgba(248, 113, 113, 0.8)',
          'rgba(248, 113, 113,.3)',
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'chosen'], false],
          3,
          1,
        ],
        'line-blur': ['interpolate', ['linear'], ['zoom'], 3, 1, 5, 10],
        'line-emissive-strength': 10,
      },
    });

    if (!map.getLayer('hovered-country-fill')) {
      map.addLayer({
        id: 'hovered-country-fill',
        type: 'fill',
        source: 'country-borders',
        'source-layer': 'country_bordersgeo',
        maxzoom: 5.5,
        paint: {
          'fill-color': historyMode ? 'rgb(168, 85, 247)' : 'rgb(0, 255, 255)',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            fillOpacity,
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
        maxzoom: 5.5,
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            'rgba(0, 255, 255, 0.8)',
            'rgba(0, 255, 255, 0.3)',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            3,
            1,
          ],
          'line-blur': ['interpolate', ['linear'], ['zoom'], 3, 1, 5, 10],
          'line-emissive-strength': 10,
        },
      });
    }
  }
}

let timeout;

async function changeHistoryMode(map, enabled) {
  clearTimeout(timeout);

  if (enabled) {
    historyMode = true;
    localStorage.setItem('historyMode', JSON.stringify(true));

    if (map.getLayer('chosen-pois')) map.removeLayer('chosen-pois');

    if (map.getLayer('default-pois')) map.removeLayer('default-pois');

    map.setStyle(styles[2].url);

    map.once('style.load', async () => {
      map.filterByDate('2013-01-01');
      await applyCountryLayers();
      applyHistoryStyles();

      timeout = setTimeout(() => {
        applyHistoryHtml(enabled);
      }, 1000);
    });
  } else {
    historyMode = false;
    localStorage.setItem('historyMode', JSON.stringify(false));

    let { url } = styles.find(({ name }) => name === currentBaseLayer);

    map.setStyle(url, {
      diff: true,
    });

    map.once('style.load', async () => {
      timeout = setTimeout(() => {
        applyHistoryHtml(enabled);
      }, 500);

      if (currentBaseLayer === 'Dark') {
        nightNavStyles(map);
      } else {
        map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
      }

      const currentPoiLayer =
        currentPoiCategory === 'default' ? 'default-pois' : 'chosen-pois';

      if (map.getZoom() > 11 && currentPois) {
        addPoiSourceAndLayer(currentPois, currentPoiLayer);
      }
    });
  }
}

function applyHistoryHtml(enabled) {
  const disabledDuringHistoryMode = enabled ? 'true' : 'false';
  const enabledDuringHistoryMode = enabled ? 'false' : 'true';
  const isDaySliderEnabled =
    $('#day-slider-container').attr('aria-disabled') === 'false';

  if (enabled) {
    $('#top-panel').removeClass('auto-cols-[minmax(0,1fr)]');
    $('#top-panel').addClass('grid-cols-[auto_1fr_auto]');
    $('#history-container').addClass('animate-start_absolute');
    $('#country-select-button').addClass('animate-start_absolute');
    $('#search-container').children().removeClass('animate-start_absolute');
    $('#select-container').removeClass('animate-start_absolute');
    $('#select-container').addClass('animate-end_absolute');
    $('#history-date').removeClass('animate-end_absolute');
    $('#slider-button').removeClass('animate-end_absolute');
  } else {
    $('#top-panel').addClass('auto-cols-[minmax(0,1fr)]');
    $('#top-panel').removeClass('grid-cols-[auto_1fr_auto]');
    $('#search-container').children().addClass('animate-start_absolute');
    $('#select-container').addClass('animate-start_absolute');
    $('#select-container').removeClass('animate-end_absolute');
    $('#history-container').removeClass('animate-start_absolute');
    $('#country-select-button').removeClass('animate-start_absolute');
    $('#slider-button').addClass('animate-end_absolute');
    $('#history-date').addClass('animate-end_absolute');
    $('#history-date').attr('aria-disabled', 'true');

    if (isDaySliderEnabled) {
      $('#day-slider-container').attr('aria-disabled', 'true');
      $('#history-container').removeClass('h-20');
      $('#history-container').addClass('h-10');
    }
  }

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
  map.setFog({
    range: [0.8, 8],
    color: '#e0d8c0',
    'horizon-blend': 0.3,
    'high-color': '#a0a0c0',
    'space-color': '#1a1a2a',
    'star-intensity': 0.1,
  });
}

async function addPoiSourceAndLayer(pois, layerId) {
  console.log(pois);
  if (pois && pois.length) {
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
      map.removeLayer('chosen-pois');
    }

    if (layerId === 'chosen-pois' && map.getLayer('default-pois')) {
      map.removeLayer('default-pois');
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'symbol',
        source: 'poi-source',
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
}

async function retrieveAndApplyIcons(token) {
  const spriteUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/sprite${
    window.devicePixelRatio > 1 ? '@2x' : ''
  }`;

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

async function getSearchResults(value) {
  const proximity =
    mostRecentLocation.latitude && mostRecentLocation.longitude
      ? `${mostRecentLocation.latitude},${mostRecentLocation.longitude}`
      : 'ip';

  try {
    const { data } = await $.ajax({
      url: `/api/mapboxgljs/search?q=${value}&proximity=${proximity}&endpoint=forward`,
      method: 'GET',
      dataType: 'json',
    });

    $('#search-normal').children().remove();

    if (data.length) {
      searchResults = [];

      data.forEach(({ properties }, i) => {
        searchResults.push(properties);
        const name = createFeatureName(properties);

        $('#search-normal').append(
          `<div id='search-normal-item' data-value=${i}>${name}</div>`
        );
      });
    }
  } catch (err) {
    const res = JSON.parse(err.responseText);
    console.log(`Error Status: ${err.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  }
}

function createFeatureName(feature) {
  const { name, feature_type, full_address, place_formatted, name_preferred } =
    feature;

  if (feature_type === 'poi') {
    return `${name}, ${full_address}`;
  } else if (feature_type === 'address') {
    return full_address;
  } else if (
    feature_type === 'street' ||
    feature_type === 'place' ||
    feature_type === 'locality'
  ) {
    return `${name_preferred || name}, ${place_formatted}`;
  } else if (feature_type === 'country') {
    return name;
  } else if (feature_type === 'region') {
    return `${name}, ${place_formatted || name_preferred}`;
  } else {
    return `${place_formatted || name_preferred}`;
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

// function changeMapInteraction(disable) {
//   if (disable) {
//     map.dragPan.disable();
//     map.scrollZoom.disable();
//     map.boxZoom.disable();
//     map.dragRotate.disable();
//     map.keyboard.disable();
//     map.doubleClickZoom.disable();
//     map.touchZoomRotate.disable();
//   } else {
//     map.dragPan.enable();
//     map.scrollZoom.enable();
//     map.boxZoom.enable();
//     map.dragRotate.enable();
//     map.keyboard.enable();
//     map.doubleClickZoom.enable();
//     map.touchZoomRotate.enable();
//   }
// }
