/// <reference path="../../jquery.js" />

let moveTimer;

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
      } else if (window.innerWidth >= 424) {
        map.setPadding({ left: 420 });
      } else if (window.innerWidth <= 424) {
        map.setPadding({ left: 0 });
      }
    }

    if (window.innerWidth <= 424) {
      if ($('#left-panel').attr('aria-hidden') === 'true') {
        map.setPadding({ left: 0 });
      } else {
        map.setPadding({ left: 80 });
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
    const countrySelect = $('#country-select-button');
    let searchInput = $('#search');

    if (
      !searchContainer.is(e.target) &&
      !searchContainer.has(e.target).length &&
      !searchInput.is(e.target)
    ) {
      $('#search-popout').attr('aria-disabled', 'true');
      $('#search-container-inside')
        .removeClass('outline-3')
        .addClass('outline-0');

      // if (window.innerWidth <= 768) {
      //   $('#search-container').attr('aria-expanded', 'false');
      // }
    }

    if (
      !countrySelect.is(e.target) &&
      countrySelect.has(e.target).length === 0
    ) {
      $('#country-select-list').attr('aria-disabled', 'true');
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
      $('.day-slider-bg').css('--bg-range', 'rgb(0,0,0,.2)');
    }
    if (zoom < 1.7 && historyMode) {
      $('.day-slider-bg').css('--bg-range', 'rgb(0,0,0,0)');
    }
  });

  map.on('move', async () => {
    if (historyMode || pausePoiSearch) return;

    const zoom = map.getZoom();

    const currentPoiLayer =
      currentPoiCategory === 'default' ? 'default-pois' : 'chosen-pois';

    clearTimeout(moveTimer);

    if (
      (currentPoiLayer === 'default-pois' && zoom >= 9) ||
      currentPoiLayer === 'chosen-pois'
    ) {
      moveTimer = setTimeout(async () => {
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
    if (disableAllButtons && map.getZoom() >= 7) return;

    clearTimeout(wikipediaTimer);

    disableAllButtons = true;
    changePanelSpinners(true);
    disableMapInteraction(true);
    expandSidebar(false);

    if (chosenCountryISO) {
      await updateChosenCountryState();
    }

    const iso_a2 = e.features[0].properties.iso_a2;
    let historyInfo;

    if (historyMode) {
      try {
        historyInfo = await getHistoryOfCountry(e.features[0].properties.name);
      } catch (err) {
        addErrorToMap('Problem fetching country history');
      }
    }

    try {
      await updateChosenCountryState(iso_a2);

      const countryInfo = await getCountryDataAndFitBounds(iso_a2);

      if (historyMode) {
        await createHistoryCountryPopup(
          historyInfo,
          countryInfo.restCountries.flag
        );
      } else {
        await createModernCountryPopup(countryInfo);
      }
    } catch (err) {
      await updateChosenCountryState();
      disableMapInteraction(false);
      addErrorToMap('Error retrieving country details');
    } finally {
      disableAllButtons = false;
      changePanelSpinners(false);
    }
  });

  map.on('click', ['chosen-pois', 'default-pois'], (e) => {
    if (disableAllButtons) return;

    flyToDelayed({
      center: [e.lngLat.lng, e.lngLat.lat],
      speed: 0.5,
      curve: 2,
      zoom: 14,
      duration: 2000,
    });

    let newId = e.features[0].properties.id;

    if (selectedPoi === newId) return;

    $('#content-chosen').attr('aria-hidden', 'true');

    clearTimeout(timeout);

    expandSidebar(true);

    const exitEnabled = $('#exit-container').attr('aria-disabled') === 'false';

    pausingPoiSearch(true);

    selectedPoi = e.features[0].properties.id;
    selectedSearch = null;

    const poi = currentPois.find((poi) => poi.properties.id === newId);

    addMarkersSourceAndLayer([poi]);

    map.setLayoutProperty('modern-markers-layer', 'visibility', 'visible');

    map.moveLayer('modern-markers-layer');

    currentMarker = poi;

    let poiType = categoryList
      .find((cate) => poi.properties.canonical_id === cate.canonical_id)
      .name.toLowerCase();

    changeSelectedSidebarItem(true, 'poi', poi);

    if (currentPoiCategory === 'default') {
      poiType = 'points of interest';

      const initial = $('#content-title').text() !== 'Points of Interest';

      addPoisToSidebar(initial);
    }

    if (currentPoiCategory !== 'default') {
      addPoisToSidebar(false);
    }

    let title = `Exit selected ${poiType}`;

    if (exitEnabled) {
      $('#exit-button').attr('title', title);
      $('#exit-button').attr('aria-label', title);
    } else {
      changeExitButton(false, title);
    }
  });

  ['mouseenter', 'touchstart'].forEach((eventType) => {
    map.on(eventType, ['hovered-country-fill'], () => {
      if (map.getZoom() >= 7) {
        map.getCanvas().style.cursor = '';
      } else {
        map.getCanvas().style.cursor = 'pointer';
      }
    });
  });

  ['mouseenter', 'touchstart'].forEach((eventType) => {
    map.on(
      eventType,
      ['chosen-pois', 'default-pois', 'modern-markers-layer'],
      () => {
        map.getCanvas().style.cursor = 'pointer';
      }
    );
  });

  ['mouseleave', 'touchend'].forEach((eventType) => {
    map.on(
      eventType,
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
  });

  ['mousemove', 'touchmove'].forEach((eventType) => {
    map.on(eventType, ['hovered-country-fill'], (e) => {
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
  });

  ['mouseleave', 'touchend'].forEach((eventType) => {
    map.on(eventType, ['hovered-country-fill'], (e) => {
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

  $(document).on('pointermove', '#history-marker', function (e) {
    e.stopPropagation();

    if (disableAllButtons) {
      $(this).attr('aria-expanded', 'false');
      $(this).closest('.mapboxgl-marker').css('z-index', '');
      return;
    }

    $(this).attr('aria-expanded', 'true');
    $(this).closest('.mapboxgl-marker').css('z-index', 1000);

    if (hoveredCountryId !== null) {
      map.setFeatureState(
        {
          source: 'country-borders',
          sourceLayer: 'country_bordersgeo',
          id: hoveredCountryId,
        },
        { hover: false }
      );
      hoveredCountryId = null;
    }
  });

  $(document).on('pointerleave', '#history-marker', function () {
    $(this).attr('aria-expanded', 'false');
    $(this).closest('.mapboxgl-marker').css('z-index', '');
  });

  $(document).on('click', '#history-marker', function () {});

  $('#zoom-in').on('click', async () => {
    if (disableAllButtons) return;

    if (chosenCountryISO) {
      await updateChosenCountryState();
    }

    let currentZoom = map.getZoom();
    map.easeTo({ zoom: currentZoom + 0.3 });
  });

  $('#zoom-out').on('click', async () => {
    if (disableAllButtons) return;

    if (chosenCountryISO) {
      await updateChosenCountryState();
    }

    let currentZoom = map.getZoom();

    map.easeTo({ zoom: currentZoom - 0.3 });
  });

  $('#history-control').on('click', async () => {
    if (disableAllButtons) return;

    clearTimeout(wikipediaTimer);

    disableAllButtons = true;

    if (chosenCountryISO) {
      await updateChosenCountryState();
    }

    changePanelSpinners(true);

    if (historyMode) {
      try {
        await getToken();
      } catch (err) {
        addErrorToMap('Problem fetching map styles');
        disableAllButtons = false;
        changePanelSpinners(false);
        return;
      }
    }

    await changeHistoryMode(map, !historyMode);
  });

  $('#style-control').on('click', async () => {
    if (disableAllButtons) return;

    clearTimeout(wikipediaTimer);

    disableAllButtons = true;
    changePanelSpinners(true);
    disableMapInteraction(true);

    try {
      await getToken();
    } catch {
      addErrorToMap('Problem fetching map styles');
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
      addErrorToMap('Problem fetching map styles');
    } finally {
      disableAllButtons = false;
      disableMapInteraction(false);
      changePanelSpinners(false);
    }
  });

  $('#exit-button').on('click', async () => {
    if (disableAllButtons) return;

    if (chosenCountryISO) {
      clearSidebarContent();
      currentPoiCategory = 'default';

      await updateChosenCountryState();

      await flyToPromise({
        speed: 0.5,
        zoom: map.getZoom() - 0.5,
        duration: 1000,
      });

      return;
    }

    if (historyMode) {
      if (eventPopup) {
        disableAllButtons = true;
        changePanelSpinners(true);

        eventPopup.remove();
        eventPopup = null;

        await flyToPromise({
          speed: 0.5,
          zoom: map.getZoom() - 0.5,
          duration: 1500,
        });

        disableAllButtons = false;
        changePanelSpinners(false);

        return;
      }
      if (selectedHistoricalEvent) {
        disableAllButtons = true;
        disableMapInteraction(true);
        changePanelSpinners(true);

        let zoom = 2;

        if (map.getZoom() <= 2) zoom = map.getZoom() - 0.5;

        await flyToPromise({
          speed: 0.5,
          zoom,
          duration: 1500,
        });

        try {
          map.filterByDate('2013-01-01');

          if (eventPopup) {
            eventPopup.remove();
            eventPopup = null;
          }

          await animateFog(map.getFog(), historyFog, 1500);

          const isDaySliderEnabled =
            $('#day-slider-container-lg').attr('aria-disabled') === 'false' ||
            $('#day-slider-container-sm').attr('aria-disabled') === 'false';

          $('#history-year').attr('aria-disabled', 'true');
          $('#history-year').addClass('animate-end_absolute');

          if (isDaySliderEnabled) {
            $('#history-container').removeClass('h-30');
            $('#history-container').addClass('h-20');
          }

          disableAllButtons = false;
          disableMapInteraction(false);
          selectedHistoricalEvent = null;
          clearSidebarContent();

          await createMarkersFromHistoricalEvents(historicalEvents);

          addHistoricalEventsToSidebar(historicalEvents);

          $('#content-subtitle-container').removeClass('invisible');

          $('#content-subtitle').text(`${historicalEvents.length} results`);

          expandSidebar(true);

          changeExitButton(false, `Exit events from ${currentDate}`);
        } catch (err) {
          addErrorToMap('Problem loading map date - try again');
        } finally {
          changePanelSpinners(false);
          disableAllButtons = false;
          disableMapInteraction(false);
        }

        return;
      }

      if (historicalEvents.length) {
        disableAllButtons = true;
        disableMapInteraction(true);
        changePanelSpinners(true);

        try {
          let zoom = 2;

          if (map.getZoom() <= 2) zoom = map.getZoom() - 0.5;

          await flyToPromise({
            speed: 0.5,
            zoom,
            duration: 1500,
          });

          await returnToDefaultHistoryMap();

          changeExitButton(true);
        } catch {
          if (historicalEvents.length) {
            addHistoricalEventsToSidebar(historicalEvents);

            await createMarkersFromHistoricalEvents(historicalEvents);

            addHistoricalEventsToSidebar(historicalEvents);

            $('#content-subtitle-container').removeClass('invisible');

            $('#content-subtitle').text(`${historicalEvents.length} results`);

            expandSidebar(true);

            changeExitButton(false, `Exit events from ${currentDate}`);
          }
        } finally {
          changePanelSpinners(false);
          disableAllButtons = false;
          disableMapInteraction(false);
        }

        return;
      }
    } else {
      if (currentMarker) {
        currentMarker = null;
        addMarkersSourceAndLayer([]);
        changeSelectedSidebarItem(false);
        selectedPoi = null;
        selectedSearch = null;

        if (
          currentPoiCategory === 'default' &&
          $('#content-results').find('#search-content-item').length !== 0
        ) {
          clearSidebarContent();
          pausingPoiSearch(false);

          if (searchResults.length) {
            appendSearchResults(searchResults);
          }

          changeExitButton(true);
        }

        await flyToPromise({
          speed: 0.5,
          zoom: map.getZoom() - 0.5,
          duration: 1000,
        });

        return;
      }

      if (
        currentPoiCategory === 'default' &&
        $('#content-results').find('#poi-content-item').length !== 0
      ) {
        clearSidebarContent();
        pausingPoiSearch(false);

        if (searchResults.length) {
          appendSearchResults(searchResults);
        }

        changeExitButton(true);

        await flyToPromise({
          speed: 0.5,
          zoom: map.getZoom() - 0.5,
          duration: 1000,
        });

        return;
      }

      if (currentPoiCategory !== 'default') {
        currentPoiCategory = 'default';
        changeExitButton(true);

        map.flyTo({
          speed: 0.5,
          zoom: map.getZoom() - 0.5,
          duration: 1000,
        });

        clearSidebarContent();

        addPoiSourceAndLayer([], 'default-pois');

        if (searchResults.length) {
          appendSearchResults(searchResults);
        }

        return;
      }
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

      disableAllButtons = true;
      changePanelSpinners(true);
      disableMapInteraction(true);
      expandSidebar(false);

      if (chosenCountryISO) {
        updateChosenCountryState();
      }

      $('#country-select-list').attr('aria-disabled', 'true');

      let historyInfo;

      if (historyMode) {
        clearTimeout(wikipediaTimer);
        await returnToDefaultHistoryMap();

        try {
          historyInfo = await getHistoryOfCountry(target.textContent);
        } catch (err) {
          console.log(err);
        }
      }

      try {
        updateChosenCountryState(target.getAttribute('value'));

        const countryInfo = await getCountryDataAndFitBounds(
          target.getAttribute('value')
        );

        if (historyMode) {
          await createHistoryCountryPopup(historyInfo);
        } else {
          await createModernCountryPopup(countryInfo);
        }
      } catch (err) {
        console.log(err);
        updateChosenCountryState();
        disableMapInteraction(false);
      } finally {
        disableAllButtons = false;
        changePanelSpinners(false);
      }
    }
  );

  $('#country-select').on('change', async function ({ target }) {
    if (disableAllButtons || historyMode) return;

    disableAllButtons = true;
    changePanelSpinners(true);
    disableMapInteraction(true);
    expandSidebar(false);

    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    try {
      updateChosenCountryState(target.value);

      const countryInfo = await getCountryDataAndFitBounds(target.value);

      await createModernCountryPopup(countryInfo);
    } catch (err) {
      console.log(err);
      updateChosenCountryState();
      disableMapInteraction(false);
    } finally {
      disableAllButtons = false;
      changePanelSpinners(false);
    }
  });
});

$('#error-map').on('pointerenter', () => {
  if ($('#error-map').attr('aria-disabled') === 'true') return;

  clearTimeout(errorMapTimer);
});

$('#error-map').on('pointerleave', () => {
  if ($('#error-map').attr('aria-disabled') === 'true') return;

  errorMapTimer = removeErrorFromMap();
});

$('#continue-search-map').on('click', async () => {
  if (disableAllButtons || historyMode) return;

  const zoom = map.getZoom();

  if (pausePoiSearch) {
    pausingPoiSearch(false);

    await flyToPromise({
      speed: 0.5,
      zoom: zoom - 0.5,
      duration: 1000,
    });
  } else {
    pausingPoiSearch(true);

    await flyToPromise({
      speed: 0.5,
      zoom: zoom + 0.5,
      duration: 1000,
    });
  }
});

$('#continue-search-map-sm').on('click', async () => {
  if (disableAllButtons || historyMode) return;

  const zoom = map.getZoom();

  if (pausePoiSearch) {
    pausingPoiSearch(false);

    await flyToPromise({
      speed: 0.5,
      zoom: zoom - 0.5,
      duration: 1000,
    });
  } else {
    pausingPoiSearch(true);

    await flyToPromise({
      speed: 0.5,
      zoom: zoom + 0.5,
      duration: 1000,
    });
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
  clearTimeout(moveTimer);

  const zoom = map.getZoom();
  const { lng, lat } = map.getCenter();
  const centeredIncorrect = lng !== -15.81099973 && lat !== 41.8295758;

  let styleJson;

  if (enabled) {
    expandSidebar(false);
    disableMapInteraction(true);
    $('#content-chosen').empty();
    $('#content-chosen').attr('aria-disabled', 'true');
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
        map.setLayoutProperty('modern-markers-layer', 'visibility', 'none');

        if (map.getSource('markers-source')) {
          map.getSource('markers-source').setData({
            type: 'FeatureCollection',
            features: [],
          });
        }

        map.loadImage(
          'https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png',
          (error, image) => {
            if (error) throw error;

            map.addImage('custom-marker', image);
          }
        );

        clearSidebarContent();
        changeSelectedSidebarItem(false);

        pausingPoiSearch(true);

        map.filterByDate('2013-01-01');
        await applyCountryLayers();
        applyHistoryStyles();

        setTimeout(() => {
          applyHistoryHtml(enabled);
          disableMapInteraction(false);
        }, 2000);
      });
    } catch (err) {
      addErrorToMap('Problem fetching historical map');
      disableMapInteraction(false);
    } finally {
      disableAllButtons = false;
      removeAllButtons(false);
      currentPois = [];
      currentMarker = null;
      selectedPoi = null;
      selectedSearch = null;

      updateChosenCountryState();
    }
  } else {
    expandSidebar(false);
    $('#content-chosen').empty();
    $('#content-chosen').attr('aria-disabled', 'true');
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

    await returnToDefaultHistoryMap();

    let { url } = styles.find(({ name }) => name === currentBaseLayer);

    await animateFog(historyFog, previousFog);

    try {
      map.setStyle(url, {
        diff: true,
      });

      map.once('style.load', async () => {
        historyMode = false;
        localStorage.setItem('historyMode', JSON.stringify(false));

        setTimeout(() => {
          applyHistoryHtml(enabled);
          disableMapInteraction(false);
        }, 1500);

        map.setLayoutProperty('modern-markers-layer', 'visibility', 'visible');

        if (map.getSource('markers-source')) {
          map.getSource('markers-source').setData({
            type: 'FeatureCollection',
            features: [],
          });
        }

        clearSidebarContent();
        changeSelectedSidebarItem(false);

        map.setLayoutProperty('default-pois', 'visibility', 'visible');
        currentPoiCategory = 'default';
        pausingPoiSearch(false);
      });
    } catch (err) {
      addErrorToMap('Problem fetching map styles');
      disableMapInteraction(false);
    } finally {
      removeAllButtons(false);
      disableAllButtons = false;

      map.once('style.load', async () => {
        await updateChosenCountryState();
      });
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
