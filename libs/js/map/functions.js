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

async function applyCountryLayers() {
  if (!map.getSource('country-borders')) {
    map.addSource('country-borders', {
      type: 'vector',
      tiles: ['http://localhost:3000/data/countries/{z}/{x}/{y}.pbf'],
      promoteId: 'iso_a2',
    });
  }

  if (!map.getLayer('country-fill')) {
    map.addLayer({
      id: 'country-fill',
      type: 'fill',
      source: 'country-borders',
      'source-layer': 'country_bordersgeo',
      maxzoom: 5.5,
      paint: {
        'fill-color': 'rgb(0, 255, 255)',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          currentBaseLayer === 'Dark' ? 0.4 : 0.6,
          0,
        ],
        'fill-emissive-strength': 10,
        'fill-outline-color': 'red',
      },
    });
  }

  // map.addLayer({
  //   id: 'country-extrusion',
  //   type: 'fill-extrusion',
  //   source: 'country-borders', // The vector tile source
  //   'source-layer': 'country_bordersgeo', // The layer within the vector tiles
  //   // filter: ['==', 'iso_a2', ''], // Use dynamic country selection
  //   paint: {
  //     'fill-extrusion-color': '#ff0000', // Color of the extrusion
  //     'fill-extrusion-height': 3, // Height based on a field in the data
  //     'fill-extrusion-base': 0, // Base height
  //     'fill-extrusion-opacity': 0.8, // Transparency level
  //     'fill-extrusion-cast-shadows': true, // Enable shadows
  //   },
  // });

  if (!map.getLayer('country-line')) {
    map.addLayer({
      id: 'country-line',
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

async function changeHistoryMode(map, enabled) {
  if (enabled) {
    historyMode = true;
    localStorage.setItem('historyMode', JSON.stringify(true));

    if (map.getLayer('chosen-pois')) map.removeLayer('chosen-pois');

    if (map.getLayer('default-pois')) map.removeLayer('default-pois');

    map.setStyle(styles[2].url);

    map.once('style.load', async () => {
      map.filterByDate('2013-01-01');
      applyHistoryHtml(enabled);
      await applyCountryLayers();
      applyHistoryStyles();
    });
  } else {
    historyMode = false;
    localStorage.setItem('historyMode', JSON.stringify(false));

    let { url } = styles.find(({ name }) => name === currentBaseLayer);

    map.setStyle(url, {
      diff: true,
    });

    map.once('style.load', async () => {
      applyHistoryHtml(enabled);

      if (currentBaseLayer === 'Dark') {
        nightNavStyles(map);
      } else {
        map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
      }

      const currentPoiLayer =
        currentPoiCategory === 'default' ? 'default-pois' : 'chosen-pois';

      if (zoom > 11 && currentPois) {
        addPoiSourceAndLayer(currentPois, currentPoiLayer);
      }
    });
  }
}

function applyHistoryHtml(enabled) {
  const searchContainer = enabled ? 'true' : 'false';
  const historyContainer = enabled ? 'false' : 'true';

  $('#history-container')
    .attr('disabled', historyContainer)
    .attr('aria-disabled', historyContainer);
  $('#search-container')
    .attr('disabled', searchContainer)
    .attr('aria-disabled', searchContainer);
}

function applyHistoryStyles() {
  map.setFog({
    range: [0.8, 8],
    color: '#e0d8c0',
    'horizon-blend': 0.3,
    'high-color': '#a0a0c0',
    'space-color': '#1a1a2a',
    'star-intensity': 0.6,
  });

  map.setPaintProperty('water', 'fill-color', '#3a5e63');
  map.setPaintProperty('water', 'fill-opacity', 0.8);

  map.addLayer({
    id: 'water-texture',
    type: 'fill',
    source: 'composite',
    'source-layer': 'water',
    paint: {
      'fill-pattern': 'wave-pattern',
      'fill-opacity': 0.1,
    },
  });
  map.setLayoutProperty('country-label', 'text-font', [
    'Old Standard TT Italic',
    'Arial Unicode MS Regular',
  ]);
  map.setPaintProperty('country-label', 'text-color', '#4a4a4a');

  map.addLayer({
    id: 'paper-texture',
    type: 'background',
    paint: {
      'background-pattern': 'paper-texture',
      'background-opacity': 0.1,
    },
  });

  map.addLayer({
    id: 'coastline-glow',
    type: 'line',
    source: 'composite',
    'source-layer': 'coastline',
    paint: {
      'line-color': '#c9b77d',
      'line-width': 2,
      'line-blur': 3,
    },
  });
}

async function addPoiSourceAndLayer(pois, layerId) {
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

    if (layerId === 'default-pois' && map.getLayer('chosen-pois'))
      map.removeLayer('chosen-pois');

    if (layerId === 'chosen-pois' && map.getLayer('default-pois'))
      map.removeLayer('default-pois');

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
  if (feature_type === 'region' || feature_type === 'country') {
    return 3;
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

function getSearchResults(value) {
  const proximity =
    mostRecentLocation.latitude && mostRecentLocation.longitude
      ? `${mostRecentLocation.latitude},${mostRecentLocation.longitude}`
      : 'ip';

  if (value.length) {
    $.ajax({
      url: `/api/mapboxgljs/search?q=${value}&proximity=${proximity}&endpoint=forward`,
      method: 'GET',
      dataType: 'json',
      success: ({ data }) => {
        $('#search-normal').children().remove();

        if (data.length) {
          data.forEach(({ properties }, i) => {
            searchResults.push(properties);
            const name = createFeatureName(properties);

            $('#search-normal').append(
              `<div id='search-normal-item' data-value=${i}>${name}</div>`
            );
          });
        }
      },
      error: (xhr) => {
        const res = JSON.parse(xhr.responseText);
        console.log(
          `Error Status: ${xhr.status} - Error Message: ${res.error}`
        );
        console.log(`Response Text: ${res.details}`);
      },
    });
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
  } else {
    return `${place_formatted || name_preferred}`;
  }
}
