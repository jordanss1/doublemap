mapPromise.then((map) => {
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
  });

  map.on('zoom', () => {
    const zoom = map.getZoom();
    const disabled = map.getMinZoom() === map.getZoom() ? 'true' : 'false';

    console.log(zoom);

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

    if (zoom > 11.5) {
      map.setLayoutProperty();
    }
  });

  let timeout;

  map.on('move', () => {
    const zoom = map.getZoom();
    const bounds = map.getBounds();

    clearTimeout(timeout);

    timeout = setTimeout(() => {
      if (zoom > 10) {
        getOverpassPois(bounds);
      }
    }, 500);
  });

  map.on('sourcedata', async (e) => {
    if (e.isSourceLoaded && e.source.type === 'raster-dem') {
      await getToken();
    }
  });

  map.on('style.load', async () => {
    await getToken();

    const currentStyle = map.getStyle();
    console.log('Current style name:', currentStyle.name);
    console.log('Full style object:', JSON.stringify(currentStyle, null, 2));

    if (currentStyle.name === 'Mapbox Navigation Night') {
      nightNavStyles(map);
    }
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

    if (!map.getLayer('chosen-country-fill')) {
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
    }

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

    if (!map.getLayer('chosen-country-line')) {
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
            5, 
            5,
            8, 
          ],
        },
      });
    }
  });
});

function getOverpassPois(bounds) {
  $.ajax({
    url: `/api/overpass/pois`,
    method: 'POST',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify(bounds),
    success: (res) => console.log(res),
  });
}
