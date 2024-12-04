map.on('error', async (e) => {
  if (
    e.error &&
    (e.error.status === 401 || e.error.message.includes('access token'))
  ) {
    await getToken();
    if (e.source) {
      map.removeSource(e.source.id);
      map.addSource(e.source.id, e.source);
    }
    map.triggerRepaint();
  }

  if (e.error.url) {
    let url;

    if (!e.error.url.startsWith('http')) {
      url = new URL(e.error.url, 'http://error.com');
    } else {
      url = new URL(e.error.url);
    }

    pathSegments = url.pathname
      .split('/')
      .filter((seg) => seg !== '' && seg !== 'api');
    let queryString = url.search;

    if (pathSegments.find((path) => path === 'mapbox')) {
      let params = new URLSearchParams(queryString);
      let style = params.get('style');
      let initial = params.get('initial');

      if (style === 'standard' && initial) {
      }
    }
  }
});

map.on('zoom', () => {
  const zoom = map.getZoom();
  const disabled = map.getMinZoom() === map.getZoom() ? 'true' : 'false';

  $('#zoom-out').attr('disabled', disabled).attr('aria-disabled', disabled);

  if (disabled === 'true') {
    map.stop();
  }

  if (zoom >= 5) {
    map.setLayoutProperty('modern-countries', 'visibility', 'none');
  }

  if (zoom < 5) {
    map.setLayoutProperty('modern-countries', 'visibility', 'visible');
  }
});

let timeout;

map.on('move', () => {
  const zoom = map.getZoom();
  const bounds = map.getBounds();

  clearTimeout(timeout);

  timeout = setTimeout(() => {
    if (zoom > 10) {
      getMuseumsOverpass(bounds);
    }
  }, 200);
});

map.on('sourcedata', async (e) => {
  if (e.isSourceLoaded && e.source.type === 'raster-dem') {
    await getToken();
  }
});

mapPromise.then((map) => {
  map.on('style.load', async () => {
    await getToken();

    map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);

    const currentStyle = map.getStyle();

    console.log(currentStyle);

    if (currentStyle.name === 'Mapbox Navigation Night') {
      console.log('i');
      map.setFog({
        color: 'rgb(11, 11, 25)', // Dark blue color for night sky
        'high-color': 'rgb(36, 92, 223)', // Lighter blue for the upper atmosphere
        'horizon-blend': 0.02, // Reduced atmosphere thickness
        'space-color': 'rgb(11, 11, 25)', // Dark blue for space
        'star-intensity': 0.6, // Increased star brightness
      });

      map.setPaintProperty('water', 'fill-color', [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        'rgb(10, 20, 40)', // Dark blue at low zoom levels
        8,
        'rgb(20, 40, 80)', // Slightly lighter blue at higher zoom levels
      ]);

      // Add a subtle water sheen effect
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
  });
});

map.on('styledata', async () => {
  await getToken();

  if (!map.getSource('modern-countries')) {
    map.addSource('modern-countries', {
      type: 'vector',
      tiles: ['http://localhost:3000/data/countries/{z}/{x}/{y}.pbf'],
      minzoom: 1,
      maxzoom: 5,
    });
  }

  map.addLayer({
    id: 'chosen-country-fill',
    type: 'fill',
    source: 'modern-countries',
    'source-layer': 'country_bordersgeo',
    filter: ['==', 'iso_a2', ''], // Use dynamic country selection
    paint: {
      'fill-color': 'rgba(0, 255, 255, 0.4)', // Semi-transparent cyan for the fill
      'fill-opacity': 0.4, // Light opacity for the fill to simulate a glow
    },
  });

  // map.addLayer({
  //   id: 'chosen-country-extrusion',
  //   type: 'fill-extrusion',
  //   source: 'modern-countries', // The vector tile source
  //   'source-layer': 'country_bordersgeo', // The layer within the vector tiles
  //   filter: ['==', 'iso_a2', ''], // Use dynamic country selection
  //   paint: {
  //     'fill-extrusion-color': '#ff0000', // Color of the extrusion
  //     'fill-extrusion-height': 3, // Height based on a field in the data
  //     'fill-extrusion-base': 0, // Base height
  //     'fill-extrusion-opacity': 0.8, // Transparency level
  //     'fill-extrusion-cast-shadows': true, // Enable shadows
  //   },
  // });

  map.addLayer({
    id: 'chosen-country-line',
    type: 'line',
    source: 'modern-countries',
    'source-layer': 'country_bordersgeo',
    filter: ['==', 'iso_a2', ''],
    paint: {
      'line-color': [
        'step',
        ['zoom'],
        'rgba(0, 255, 255, 0.8)', // Cyan with moderate opacity at zoom level 0
        0,
        'rgba(0, 255, 255, 1)', // Bright cyan at zoom level 5
        2,
        'rgba(0, 255, 255, 1)', // Cyan remains at zoom level 10
        5,
        'rgba(255, 105, 180, 0.8)', // Light pink as the glow effect at zoom level 15
      ],
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        1,
        1, // Thicker line at zoom level 5
        5,
        10, // Even thicker line at zoom level 10
      ],
      'line-blur': [
        'interpolate',
        ['linear'],
        ['zoom'],
        1,
        5, // Slight blur at zoom level 5
        5,
        8, // Higher blur at zoom level 10
      ],
    },
  });
});

function getMuseumsOverpass(bounds) {
  $.ajax({
    url: `/api/overpass/pois?type=museum`,
    method: 'POST',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify(bounds),
    success: (res) => console.log(res),
  });
}
