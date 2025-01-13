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
    const disabled = zoom <= map.getMinZoom() + 0.0001 ? 'true' : 'false';

    $('#zoom-out').attr('disabled', disabled).attr('aria-disabled', disabled);

    if (disabled === 'true') {
      map.stop();
    }

    if (zoom >= 1.7 && historyMode) {
      $('#day-slider-bg').css('--bg-range', 'rgb(0,0,0,.2)');
    }
    if (zoom < 1.7 && historyMode) {
      $('#day-slider-bg').css('--bg-range', 'rgb(0,0,0,0)');
    }
  });

  let timeout;

  map.on('move', async () => {
    if (historyMode) return;

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
    const token = await getToken();

    const currentPoiLayer =
      currentPoiCategory === 'default' ? 'default-pois' : 'chosen-pois';

    await applyCountryLayers();

    if (!historyMode) {
      await retrieveAndApplyIcons(token);

      if (currentPois && currentBaseLayer) {
        addPoiSourceAndLayer(currentPois, currentPoiLayer);
      }
    }
  });

  map.on('sourcedata', async (e) => {
    if (e.isSourceLoaded && e.source.type === 'raster-dem') {
      await getToken();
    }
  });

  map.on(
    'mouseenter',
    ['hovered-country-fill', 'chosen-pois', 'default-pois'],
    () => {
      map.getCanvas().style.cursor = 'pointer';
    }
  );

  map.on(
    'mouseleave',
    ['hovered-country-fill', 'chosen-pois', 'default-pois'],
    () => {
      map.getCanvas().style.cursor = '';
    }
  );

  map.on('mousemove', ['hovered-country-fill'], (e) => {
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

  map.on('mouseleave', ['hovered-country-fill'], (e) => {
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
  } catch (xhr) {
    const res = JSON.parse(xhr.responseText);
    console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  }
}
