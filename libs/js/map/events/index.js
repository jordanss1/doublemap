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

  $(window).on('resize', function () {
    if ($('#left-panel').attr('aria-expanded') === 'true') {
      if (window.innerWidth >= 1024) {
        map.setPadding({ left: 464 });
      } else {
        map.setPadding({ left: 420 });
      }
    }

    if (window.innerWidth <= 768) {
      $('#search-container').attr('aria-expanded', 'false');
    } else {
      $('#search-container').attr('aria-expanded', 'true');
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

      if (window.innerWidth <= 768) {
        $('#search-container').attr('aria-expanded', 'false');
      }
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
    if (historyMode || pausePoiSearch) return;

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

        if (
          currentPoiLayer === 'chosen-pois' &&
          $('#spinner-panel').attr('aria-disabled') === 'false'
        ) {
          changePanelSpinners(true);
        }

        try {
          const newPois = await getOverpassPois(bounds, currentPoiCategory);

          previousPois = [...currentPois];
          currentPois = newPois;

          if (currentPoiLayer === 'chosen-pois') {
            changePanelSpinners(false);
            addPoiSourceAndLayer(newPois, currentPoiLayer, true);
            return;
          }

          addPoiSourceAndLayer(newPois, currentPoiLayer);
        } catch (err) {}
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
      addMarkersSourceAndLayer([currentMarker]);
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
    if (disableAllButtons) return;

    disableAllButtons = true;
    changePanelSpinners(true);

    const iso_a2 = e.features[0].properties.iso_a2;

    try {
      if (historyMode) {
        await getHistoryOfCountry(e.features[0].properties.name);
      }
    } catch (err) {
      console.log(err);
    }

    try {
      await getCountryDataAndFitBounds(iso_a2);
    } catch (err) {
      console.log(err);
    } finally {
      disableAllButtons = false;
      updateChosenCountryState(iso_a2);
      // changePanelSpinners(false);
    }
  });

  map.on('click', ['chosen-pois', 'default-pois'], (e) => {
    if (disableAllButtons) return;

    let newId = e.features[0].properties.id;

    expandSidebar(true);

    const exitEnabled = $('#exit-container').attr('aria-disabled') === 'false';

    pausingPoiSearch(true);

    flyToDelayed({
      center: [e.lngLat.lng, e.lngLat.lat],
      speed: 0.5,
      curve: 2,
      zoom: 14,
      duration: 2000,
    });

    if (selectedPoi === newId) return;

    selectedPoi = e.features[0].properties.id;

    const poi = currentPois.find((poi) => poi.properties.id === newId);

    addMarkersSourceAndLayer([poi]);

    map.setLayoutProperty('modern-markers-layer', 'visibility', 'visible');

    map.moveLayer('modern-markers-layer');

    currentMarker = poi;

    let poiType = categoryList
      .find((cate) => poi.properties.canonical_id === cate.canonical_id)
      .name.toLowerCase();

    if (currentPoiCategory === 'default') {
      poiType = 'points of interest';
      addPoisToSidebar();
    }

    let title = `Exit selected ${poiType}`;

    if (exitEnabled) {
      $('#exit-button').attr('title', title);
      $('#exit-button').attr('aria-label', title);
    } else {
      changeExitButton(false, title);
    }
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
    if (disableAllButtons) return;

    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    let currentZoom = map.getZoom();
    map.easeTo({ zoom: currentZoom + 0.3 });
  });

  $('#zoom-out').on('click', () => {
    if (disableAllButtons) return;

    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    let currentZoom = map.getZoom();

    map.easeTo({ zoom: currentZoom - 0.3 });
  });

  $('#history-control').on('click', async () => {
    if (disableAllButtons) return;

    disableAllButtons = true;

    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    changePanelSpinners(true);

    if (historyMode) {
      try {
        await getToken();
      } catch (err) {
        console.log(err);
        disableAllButtons = false;
        changePanelSpinners(false);
        return;
      }
    }

    await changeHistoryMode(map, !historyMode);
  });

  $('#style-control').on('click', async () => {
    if (disableAllButtons) return;

    disableAllButtons = true;
    changePanelSpinners(true);
    disableMapInteraction(true);

    try {
      await getToken();
    } catch {
      // make notification message
      disableAllButtons = false;
      changePanelSpinners(false);
      disableMapInteraction(false);
      return;
    }

    if (historyMode) {
      await changeHistoryMode(map, false);
      return;
    }

    const zoom = map.getZoom();

    const currentIndex = styles.findIndex(
      (style) => currentBaseLayer === style.name
    );

    const nextIndex = currentIndex === 0 ? 1 : 0;

    try {
      map.setStyle(styles[nextIndex].url, {
        diff: true,
      });

      currentBaseLayer = styles[nextIndex].name;

      localStorage.setItem(
        'currentBaseLayer',
        JSON.stringify(currentBaseLayer)
      );

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
    } catch (err) {
      // make notification message
      console.log(err);
    } finally {
      disableAllButtons = false;
      disableMapInteraction(false);
      changePanelSpinners(false);
    }
  });

  $('#exit-button').on('click', async () => {
    if (disableAllButtons) return;

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

    if (currentMarker) {
      currentMarker = null;
      selectedPoi = null;

      addMarkersSourceAndLayer([]);

      if (currentPoiCategory === 'default') {
        clearSidebarContent();
        pausingPoiSearch(false);
        changeExitButton(true);
      }

      await flyToPromise({
        speed: 0.5,
        zoom: map.getZoom() - 0.5,
        duration: 1000,
      });

      return;
    }

    if (currentPoiCategory !== 'default') {
      currentPoiCategory = 'default';

      map.flyTo({
        speed: 0.5,
        zoom: map.getZoom() - 0.5,
        duration: 1000,
      });

      addPoiSourceAndLayer([], 'default-pois');
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
    if (disableAllButtons) return;

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
      if (disableAllButtons) return;

      changePanelSpinners(true);
      disableAllButtons = true;

      $('#country-select-list').attr('aria-disabled', 'true');
      let countryHistory;

      if (historyMode) {
        try {
          countryHistory = await getHistoryOfCountry(target.textContent);
        } catch (err) {
          console.log(err);
        }
      }

      try {
        const { restCountries, geonames } = await getCountryDataAndFitBounds(
          target.getAttribute('value')
        );

        updateChosenCountryState(target.getAttribute('value'));

        if (!historyMode) {
          if (restCountries.error || geonames.error) {
            // notification message
          }

          //pass data to function to process marker
        }
      } catch (err) {
        console.log(err);
      } finally {
        disableAllButtons = false;
        changePanelSpinners(false);

        if (historyMode) {
          if (countryHistory) {
          }
        } else {
        }
      }
    }
  );

  $('#country-select').on('click', '#country-option', async ({ target }) => {
    if (disableAllButtons) return;

    disableAllButtons = true;
    changePanelSpinners(true);

    try {
      const { restCountries, geonames } = await getCountryDataAndFitBounds(
        target.value
      );

      updateChosenCountryState(target.value);

      if (restCountries.error || geonames.error) {
        // notification message
      }

      //pass data to function to process marker
    } catch (err) {
      console.log(err);
    } finally {
      disableAllButtons = false;
      // changePanelSpinners(false);
    }
  });

  $('#country-select').on('keydown', '#country-option', async (e) => {
    if (disableAllButtons) return;

    let value = e.target.value;

    if (e.key === 'Enter' && value.length) {
      changePanelSpinners(true);
      disableAllButtons = true;

      try {
        const { restCountries, geonames } = await getCountryDataAndFitBounds(
          value
        );

        updateChosenCountryState(value);

        if (restCountries.error || geonames.error) {
          // notification message
        }

        //pass data to function to process marker
      } catch (err) {
        console.log(err);
      } finally {
        disableAllButtons = false;
        changePanelSpinners(false);
      }
    }
  });
});

$('#continue-search-map').on('click', () => {
  if (disableAllButtons || historyMode) return;

  if (pausePoiSearch) {
    pausingPoiSearch(false);
  } else {
    pausingPoiSearch(true);
  }
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
  } catch (error) {
    throw error;
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
    expandSidebar(false);
    disableMapInteraction(true);
    changePanelSpinners(false);
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
    } catch (err) {
      console.log(err);
      disableMapInteraction(false);
    } finally {
      disableAllButtons = false;
      updateChosenCountryState();
      removeAllButtons(false);
      currentPois = [];
      currentMarker = null;
      selectedPoi = null;
      pausingPoiSearch(true);
    }
  } else {
    expandSidebar(false);
    disableMapInteraction(true);
    changePanelSpinners(false);
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

    try {
      map.setStyle(url, {
        diff: true,
      });

      map.once('style.load', async () => {
        historyMode = false;
        localStorage.setItem('historyMode', JSON.stringify(false));

        timeout = setTimeout(() => {
          applyHistoryHtml(enabled);
          disableMapInteraction(false);
        }, 1500);

        map.setLayoutProperty('default-pois', 'visibility', 'visible');
        currentPoiCategory = 'default';
      });
    } catch (err) {
      console.log(err);
      disableMapInteraction(false);
    } finally {
      removeAllButtons(false);
      disableAllButtons = false;
      updateChosenCountryState();
    }
  }
}

async function fetchStyleBeforeApply(url) {
  return await $.ajax({
    url: url,
    method: 'GET',
    dataType: 'json',
  });
}
