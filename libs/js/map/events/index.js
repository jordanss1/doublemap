/// <reference path="../../jquery.js" />

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

    console.log(zoom);
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

  map.on('click', 'hovered-country-fill', async (e) => {
    const iso_a2 = e.features[0].properties.iso_a2;

    if (historyMode) {
      await getHistoryOfCountry(e.features[0].properties.name);
    }

    await getCountryDataAndFitBounds(iso_a2);

    updateChosenCountryState(iso_a2);
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
    console.log(e.features);

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

  $('#zoom-in').on('click', () => {
    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    let currentZoom = map.getZoom();
    map.easeTo({ zoom: currentZoom + 0.3 });
  });

  $('#zoom-out').on('click', () => {
    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    let currentZoom = map.getZoom();

    map.easeTo({ zoom: currentZoom - 0.3 });
  });

  $('#history-control').on('click', async () => {
    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    if (historyMode) await getToken();

    await changeHistoryMode(map, !historyMode);
  });

  $('#style-control').on('click', async () => {
    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    await getToken();

    if (historyMode) {
      await changeHistoryMode(map, false);
      return;
    }

    const zoom = map.getZoom();

    const currentIndex = styles.findIndex(
      (style) => currentBaseLayer === style.name
    );

    const nextIndex = currentIndex === 0 ? 1 : 0;

    map.setStyle(styles[nextIndex].url, {
      diff: true,
    });

    currentBaseLayer = styles[nextIndex].name;

    localStorage.setItem('currentBaseLayer', JSON.stringify(currentBaseLayer));

    map.once('style.load', async () => {
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
  });

  $('#country-select-button').on('click', async ({ target }) => {
    const selectListStatus =
      $('#country-select-list').attr('aria-disabled') === 'false'
        ? 'true'
        : 'false';

    $('#country-select-list').attr('aria-disabled', selectListStatus);
  });

  $('#country-select-list').on(
    'click',
    '#country-list-option',
    async ({ target }) => {
      $('#country-select-list').attr('aria-disabled', 'true');

      await getHistoryOfCountry(target.textContent);

      await getCountryDataAndFitBounds(target.getAttribute('value'));

      updateChosenCountryState(target.getAttribute('value'));
    }
  );

  $('#country-select').on('click', '#country-option', async ({ target }) => {
    const [restCountryData, geonames] = await getCountryDataAndFitBounds(
      target.value
    );

    updateChosenCountryState(target.value);

    if (geonames) {
      const bbox = [
        [geonames.west, geonames.south],
        [geonames.east, geonames.north],
      ];

      map.fitBounds(bbox, {
        padding: 20,
        maxZoom: 8,
        duration: 2000,
      });
    }

    // if (restCountryData) {
    // }
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
