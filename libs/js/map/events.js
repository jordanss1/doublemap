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
  });

  let timeout;

  map.on('move', async () => {
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    const currentPoiLayer =
      currentPoiCategory === 'default' ? 'default-pois' : 'chosen-pois';

    clearTimeout(timeout);

    if (
      (currentPoiLayer === 'default-pois' && zoom >= 9) ||
      currentPoiLayer === 'chosen-pois'
    ) {
      timeout = setTimeout(async () => {
        currentPois = await getOverpassPois(bounds, currentPoiCategory);

        addPoiSourceAndLayer(currentPois, currentPoiLayer);
      }, 800);
    }
  });

  map.on('style.load', async () => {
    const currentPoiLayer =
      currentPoiCategory === 'default' ? 'default-pois' : 'chosen-pois';

    const token = await getToken();

    await applyLayers(token);
    await retrieveAndApplyIcons(token);

    if (currentPois) {
      addPoiSourceAndLayer(currentPois, currentPoiLayer);
    }
  });

  map.on('sourcedata', async (e) => {
    if (e.isSourceLoaded && e.source.type === 'raster-dem') {
      await getToken();
    }
  });

  map.on('mouseenter', ['country-fill', 'chosen-pois', 'default-pois'], () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', ['country-fill', 'chosen-pois', 'default-pois'], () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('mousemove', 'country-fill', (e) => {
    if (e.features.length > 0) {
      if (hoveredCountryId !== null) {
        map.setFeatureState(
          {
            source: 'country-borders',
            sourceLayer: 'country_bordersgeo',
            id: hoveredCountryId,
          },
          { hover: false }
        );
      }

      hoveredCountryId = e.features[0].properties.iso_a2;
      map.setFeatureState(
        {
          source: 'country-borders',
          sourceLayer: 'country_bordersgeo',
          id: hoveredCountryId,
        },
        { hover: true }
      );
    }
  });

  map.on('mouseleave', 'country-fill', () => {
    if (hoveredCountryId !== null) {
      map.setFeatureState(
        {
          source: 'country-borders',
          sourceLayer: 'country_bordersgeo',
          id: hoveredCountryId,
        },
        { hover: false }
      );
    }

    hoveredCountryId = null;
  });
});

async function getOverpassPois(bounds, category) {
  try {
    const { data } = await $.ajax({
      url: `/api/overpass_pois?category=${category}`,
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
