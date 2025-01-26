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

  $(document).on('click', (e) => {
    const searchContainer = $('#search-container');

    if (
      !searchContainer.is(e.target) &&
      searchContainer.has(e.target).length === 0
    ) {
      $('#search-popout').attr('aria-disabled', 'true');
      $('#search-container-inside')
        .removeClass('outline-3')
        .addClass('outline-0');
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

    const currentPoiLayer =
      currentPoiCategory === 'default' ? 'default-pois' : 'chosen-pois';

    clearTimeout(timeout);

    if (
      (currentPoiLayer === 'default-pois' && zoom >= 9) ||
      currentPoiLayer === 'chosen-pois'
    ) {
      timeout = setTimeout(async () => {
        const bounds = map.getBounds();

        await appendLocationToCategoryOption();

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
      const pois = currentPois.length ? currentPois : [];

      await retrieveAndApplyIcons(token);
      addMarkersLayer();
      addPoiSourceAndLayer(pois, currentPoiLayer);

      if (currentBaseLayer === 'Dark') {
        nightNavStyles(map);
      } else {
        map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
        map.setFog({
          color: 'rgb(11, 11, 25)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6,
        });
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
    [
      'hovered-country-fill',
      'chosen-pois',
      'default-pois',
      'modern-markers-layer',
    ],
    () => {
      map.getCanvas().style.cursor = 'pointer';
    }
  );

  map.on(
    'mouseleave',
    [
      'hovered-country-fill',
      'chosen-pois',
      'default-pois',
      'modern-markers-layer',
    ],
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
      const currentPoiLayer =
        currentPoiCategory === 'default' ? 'default-pois' : 'chosen-pois';

      if (chosenCountryISO) {
        setTimeout(() => {
          map.setFeatureState(
            {
              source: 'country-borders',
              sourceLayer: 'country_bordersgeo',
              id: chosenCountryISO,
            },
            { chosen: true }
          );
        }, 500);
      }

      if (zoom >= 9 && currentPois) {
        addPoiSourceAndLayer(currentPois, currentPoiLayer);
      }
    });
  });

  $('#exit-button').on('click', async () => {
    if (chosenCountryISO) {
      currentPoiCategory = 'default';

      updateChosenCountryState();

      await flyToPromise({
        speed: 0.5,
        zoom: map.getZoom() - 0.5,
        duration: 1000,
      });

      return;
    }

    if (currentPoiCategory !== 'default') {
      currentPoiCategory = 'default';

      await flyToPromise({
        speed: 0.5,
        zoom: map.getZoom() - 0.5,
        duration: 1000,
      });

      addPoiSourceAndLayer([], 'default-pois');
      return;
    }

    if (currentMarker) {
      currentMarker = null;

      if (map.getSource('markers-source')) {
        map.getSource('markers-source').setData({
          type: 'FeatureCollection',
          features: [],
        });
      }

      changeExitButton(true);

      await flyToPromise({
        speed: 0.5,
        zoom: map.getZoom() - 0.5,
        duration: 1000,
      });

      return;
    }
  });

  $(document).on('click', (event) => {
    if (
      !$(event.target).closest('#country-select-button').length &&
      !$(event.target).closest('#country-select-list').length
    ) {
      $('#country-select-list').attr('aria-disabled', 'true');
    }
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

      if (historyMode) {
        await getHistoryOfCountry(target.textContent);
      }

      updateChosenCountryState(target.getAttribute('value'));

      await getCountryDataAndFitBounds(target.getAttribute('value'));
    }
  );

  $('#country-select').on('click', '#country-option', async ({ target }) => {
    updateChosenCountryState(target.value);

    const [restCountryData, geonames] = await getCountryDataAndFitBounds(
      target.value
    );

    if (geonames) {
    }

    // if (restCountryData) {
    // }
  });

  $('#country-select').on('keydown', '#country-option', async (e) => {
    let value = e.target.value;

    if (e.key === 'Enter' && value.length) {
      updateChosenCountryState(value);

      const [restCountryData, geonames] = await getCountryDataAndFitBounds(
        value
      );

      if (geonames) {
      }

      // if (restCountryData) {
      // }
    }
  });

  let categoryButtonTimeout;

  $('#category-button').on('click', () => {
    if (historyMode) return;

    const isDisabled = $('#category-button').attr('aria-disabled') === 'true';
    clearTimeout(categoryButtonTimeout);

    if (isDisabled) {
      activateCategoryButton();

      $('#category-button').attr('aria-disabled', 'false');
      $('#category-panel').attr('aria-disabled', 'false');

      $('#category-panel > *').removeClass('invisible');
      $('#category-panel > *').addClass('visible');
      $('#category-panel > *').addClass('duration-300');

      categoryButtonTimeout = setTimeout(() => {
        $('#category-panel > *').removeClass('duration-300');
        $('#category-panel > *').addClass('duration-75');
      }, 300);
    } else {
      $('#category-button').attr('aria-disabled', 'true');
      $('#category-panel').attr('aria-disabled', 'true');
      $('#category-panel > *').removeClass('duration-75');
      $('#category-panel > *').addClass('duration-300');

      categoryButtonTimeout = setTimeout(() => {
        $('#category-panel > *').removeClass('visible');
        $('#category-panel > *').addClass('invisible');
      }, 300);
    }
  });

  categoryPanelButtons.forEach((buttonId) => {
    $(buttonId).on('click', async () => {
      const category = buttonId.replace('#', '').split('-')[0];

      if (historyMode || category === currentPoiCategory) return;

      $('#category-panel > *').attr('aria-checked', 'false');

      $(buttonId).attr('aria-checked', 'true');

      const zoom = map.getZoom();
      await appendLocationToCategoryOption();

      const { longitude, latitude } = mostRecentLocation;

      if (category === currentPoiCategory && zoom < 9) {
        map.fitBounds(
          [
            [longitude - 0.1, latitude - 0.1],
            [longitude + 0.1, latitude + 0.1],
          ],
          { speed: 0.5, curve: 2, padding: 50, zoom: 9, duration: 2500 }
        );
        return;
      }

      const bounds = {
        _sw: {
          lng: longitude - 0.1,
          lat: latitude - 0.1,
        },
        _ne: {
          lng: longitude + 0.1,
          lat: latitude + 0.1,
        },
      };

      currentPoiCategory = category;

      const pois = await getOverpassPois(bounds, category);

      currentPois = pois;

      map.fitBounds(
        [
          [longitude - 0.1, latitude - 0.1],
          [longitude + 0.1, latitude + 0.1],
        ],
        { speed: 0.5, curve: 2, padding: 50, zoom: 9.5, duration: 2500 }
      );

      addPoiSourceAndLayer(pois, 'chosen-pois');
    });
  });
});

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

let previousFog;

async function changeHistoryMode(map, enabled) {
  clearTimeout(timeout);

  const zoom = map.getZoom();
  const { lng, lat } = map.getCenter();
  const centeredIncorrect = lng !== -15.81099973 && lat !== 41.8295758;

  let styleJson;

  if (enabled) {
    disableMapInteraction(true);
    removeAllButtons(true);
    const previousFog = map.getFog();

    if (zoom !== 2.5 && centeredIncorrect) {
      await flyToPromise({
        center: [-15.81099973, 41.8295758],
        speed: 0.5,
        zoom: 2.5,
        duration: 1000,
      });
    }

    try {
      styleJson = await fetchStyleBeforeApply(styles[2].url);
    } catch (err) {
      console.log(err);
      disableMapInteraction(false);
      removeAllButtons(false);
      return;
    }

    map.flyTo({
      center: [-15.81099973, 41.8295758],
      speed: 0.5,
      zoom: 1.5,
      duration: 2000,
    });

    await animateFog(previousFog, historyFog, 1500);

    map.setStyle(styleJson);

    map.once('style.load', async () => {
      historyMode = true;
      localStorage.setItem('historyMode', JSON.stringify(true));

      $('#category-panel > *').attr('aria-checked', 'false');

      map.setLayoutProperty('chosen-pois', 'visibility', 'none');

      map.setLayoutProperty('default-pois', 'visibility', 'none');

      updateChosenCountryState();
      removeAllButtons(false);
      currentPois = [];
      currentMarker = null;

      if (map.getSource('markers-source')) {
        map.getSource('markers-source').setData({
          type: 'FeatureCollection',
          features: [],
        });
      }

      map.filterByDate('2013-01-01');
      await applyCountryLayers();
      applyHistoryStyles();

      timeout = setTimeout(() => {
        applyHistoryHtml(enabled);
        disableMapInteraction(false);
      }, 2000);
    });
  } else {
    disableMapInteraction(true);
    removeAllButtons(true);

    if (zoom !== 1.5 || centeredIncorrect) {
      await flyToPromise({
        center: [-15.81099973, 41.8295758],
        speed: 0.5,
        zoom: 1.5,
        duration: 2000,
      });
    }

    let { url } = styles.find(({ name }) => name === currentBaseLayer);

    await animateFog(historyFog, previousFog);

    map.setStyle(url, {
      diff: true,
    });

    map.once('style.load', async () => {
      historyMode = false;
      localStorage.setItem('historyMode', JSON.stringify(false));

      removeAllButtons(false);
      updateChosenCountryState();

      timeout = setTimeout(() => {
        applyHistoryHtml(enabled);
        disableMapInteraction(false);
      }, 1500);

      map.setLayoutProperty('default-pois', 'visibility', 'visible');
      currentPoiCategory = 'default';
    });
  }
}

async function fetchStyleBeforeApply(url) {
  return await $.ajax({
    url: url,
    method: 'GET',
    dataType: 'json',
  });
}
