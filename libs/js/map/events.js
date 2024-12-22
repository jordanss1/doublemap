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

  map.on('move', async () => {
    const zoom = map.getZoom();
    const bounds = map.getBounds();

    clearTimeout(timeout);

    timeout = setTimeout(async () => {
      if (zoom > 11) {
        currentPois = await getOverpassPois(bounds, currentPoiCategory);

        addPoiSourceAndLayer(currentPois, 'default-pois');
      }
    }, 800);
  });

  map.on('style.load', () => {});

  map.on('sourcedata', async (e) => {
    if (e.isSourceLoaded && e.source.type === 'raster-dem') {
      await getToken();
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
          'line-blur': ['interpolate', ['linear'], ['zoom'], 1, 5, 5, 8],
        },
      });
    }
  });
});

async function getOverpassPois(bounds, category) {
  try {
    const { data } = await $.ajax({
      url: `/api/overpass/pois?category=${category}`,
      method: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(bounds),
    });

    return data;
  } catch (err) {
    console.log(err);
  }
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
    const haloWidth = currentBaseLayer === 'Dark' ? 1 : 2;

    if (layerId === 'default-pois' && map.getLayer('chosen-pois'))
      map.removeLayer('chosen-pois');

    if (layerId === 'chosen-pois' && map.getLayer('default-pois'))
      map.removeLayer('default-pois');

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'symbol',
        source: 'poi-source',
        minzoom: layerId === 'default-pois' ? 11 : 0,
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
          'text-halo-blur': 0.5,
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

      map.addImage(iconName, iconImage, {
        sdf: icon.sdf || false,
      });
    } catch (error) {
      console.error(`Error adding icon ${iconName}:`, error);
    }
  });
}
