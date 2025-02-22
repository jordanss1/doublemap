let moveTimer, previousFog;
async function getOverpassPois(e, t) {
  try {
    const { data: r } = await $.ajax({
      url: `/api/overpass_pois?category=${t}`,
      method: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(e),
    });
    return r;
  } catch (e) {
    throw e;
  }
}
async function changeHistoryMode(e, t) {
  clearTimeout(timeout), clearTimeout(moveTimer);
  const r = e.getZoom(),
    { lng: o, lat: a } = e.getCenter(),
    n = -15.81099973 !== o && 41.8295758 !== a;
  let i;
  if (t) {
    expandSidebar(!1),
      disableMapInteraction(!0),
      $('#content-chosen').empty(),
      $('#content-chosen').attr('aria-disabled', 'true'),
      changePanelSpinners(!1),
      removeAllButtons(!0);
    const o = e.getFog();
    2.5 !== r &&
      n &&
      (await flyToPromise({
        center: [-15.81099973, 41.8295758],
        speed: 0.5,
        zoom: 2.5,
        duration: 1e3,
      }));
    try {
      (i = await fetchStyleBeforeApply(styles[2].url)),
        e.flyTo({
          center: [-15.81099973, 41.8295758],
          speed: 0.5,
          zoom: 1.5,
          duration: 2e3,
        }),
        await animateFog(o, historyFog, 1500),
        e.setStyle(i),
        e.once('style.load', async () => {
          (historyMode = !0),
            localStorage.setItem('historyMode', JSON.stringify(!0)),
            $('#category-panel > *').attr('aria-checked', 'false'),
            e.setLayoutProperty('chosen-pois', 'visibility', 'none'),
            e.setLayoutProperty('default-pois', 'visibility', 'none'),
            e.setLayoutProperty('modern-markers-layer', 'visibility', 'none'),
            e.getSource('markers-source') &&
              e
                .getSource('markers-source')
                .setData({ type: 'FeatureCollection', features: [] }),
            e.loadImage(
              'https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png',
              (t, r) => {
                if (t) throw t;
                e.addImage('custom-marker', r);
              }
            ),
            clearSidebarContent(),
            changeSelectedSidebarItem(!1),
            pausingPoiSearch(!0),
            e.filterByDate('2013-01-01'),
            await applyCountryLayers(),
            applyHistoryStyles(),
            setTimeout(() => {
              applyHistoryHtml(t), disableMapInteraction(!1);
            }, 2e3);
        });
    } catch (e) {
      addErrorToMap('Error fetching history map'), disableMapInteraction(!1);
    } finally {
      (disableAllButtons = !1),
        updateChosenCountryState(),
        removeAllButtons(!1),
        (currentPois = []),
        (currentMarker = null),
        (selectedPoi = null),
        (selectedSearch = null);
    }
  } else {
    expandSidebar(!1),
      $('#content-chosen').empty(),
      $('#content-chosen').attr('aria-disabled', 'true'),
      disableMapInteraction(!0),
      changePanelSpinners(!1),
      removeAllButtons(!0),
      (1.5 !== r || n) &&
        (await flyToPromise({
          center: [-15.81099973, 41.8295758],
          speed: 0.5,
          zoom: 1.5,
          duration: 2e3,
        })),
      await returnToDefaultHistoryMap();
    let { url: o } = styles.find(({ name: e }) => e === currentBaseLayer);
    await animateFog(historyFog, previousFog);
    try {
      e.setStyle(o, { diff: !0 }),
        e.once('style.load', async () => {
          (historyMode = !1),
            localStorage.setItem('historyMode', JSON.stringify(!1)),
            setTimeout(() => {
              applyHistoryHtml(t), disableMapInteraction(!1);
            }, 1500),
            e.setLayoutProperty(
              'modern-markers-layer',
              'visibility',
              'visible'
            ),
            e.getSource('markers-source') &&
              e
                .getSource('markers-source')
                .setData({ type: 'FeatureCollection', features: [] }),
            clearSidebarContent(),
            changeSelectedSidebarItem(!1),
            e.setLayoutProperty('default-pois', 'visibility', 'visible'),
            (currentPoiCategory = 'default'),
            pausingPoiSearch(!1);
        });
    } catch (e) {
      addErrorToMap('Error fetching map styles'), disableMapInteraction(!1);
    } finally {
      removeAllButtons(!1),
        (disableAllButtons = !1),
        updateChosenCountryState();
    }
  }
}
async function fetchStyleBeforeApply(e) {
  return await $.ajax({ url: e, method: 'GET', dataType: 'json' });
}
mapPromise.then((e) => {
  e.on('error', async (t) => {
    t.error &&
      (401 === t.error.status || t.error.message.includes('access token')) &&
      (await getToken(),
      t.source &&
        (e.removeSource(t.source.id), e.addSource(t.source.id, t.source)),
      e.triggerRepaint());
  }),
    $(window).on('resize', function () {
      'true' === $('#left-panel').attr('aria-expanded') &&
        (window.innerWidth >= 1024
          ? e.setPadding({ left: 464 })
          : window.innerWidth >= 424
          ? e.setPadding({ left: 420 })
          : window.innerWidth <= 424 && e.setPadding({ left: 0 })),
        window.innerWidth <= 424 &&
          ('true' === $('#left-panel').attr('aria-hidden')
            ? e.setPadding({ left: 0 })
            : e.setPadding({ left: 80 })),
        window.innerWidth <= 768
          ? $('#search-container').attr('aria-expanded', 'false')
          : $('#search-container').attr('aria-expanded', 'true');
    }),
    $(document).on('click', (e) => {
      const t = $('#search-container'),
        r = $('#country-select-button');
      t.is(e.target) ||
        0 !== t.has(e.target).length ||
        ($('#search-popout').attr('aria-disabled', 'true'),
        $('#search-container-inside')
          .removeClass('outline-3')
          .addClass('outline-0'),
        window.innerWidth <= 768 &&
          $('#search-container').attr('aria-expanded', 'false')),
        r.is(e.target) ||
          0 !== r.has(e.target).length ||
          $('#country-select-list').attr('aria-disabled', 'true');
    }),
    e.on('zoom', () => {
      const t = e.getZoom(),
        r = t <= e.getMinZoom() + 1e-4 ? 'true' : 'false';
      $('#zoom-out').attr('disabled', r).attr('aria-disabled', r),
        'true' === r && e.stop(),
        t >= 1.7 &&
          historyMode &&
          $('.day-slider-bg').css('--bg-range', 'rgb(0,0,0,.2)'),
        t < 1.7 &&
          historyMode &&
          $('.day-slider-bg').css('--bg-range', 'rgb(0,0,0,0)');
    }),
    e.on('move', async () => {
      if (historyMode || pausePoiSearch) return;
      const t = e.getZoom(),
        r = 'default' === currentPoiCategory ? 'default-pois' : 'chosen-pois';
      clearTimeout(moveTimer),
        (('default-pois' === r && t >= 9) || 'chosen-pois' === r) &&
          (moveTimer = setTimeout(async () => {
            const t = e.getBounds();
            await appendLocationToCategoryOption(),
              'chosen-pois' === r &&
                'false' === $('#spinner-panel').attr('aria-disabled') &&
                changePanelSpinners(!0);
            try {
              const e = await getOverpassPois(t, currentPoiCategory);
              if (
                ((previousPois = [...currentPois]),
                (currentPois = e),
                'chosen-pois' === r)
              )
                return (
                  changePanelSpinners(!1), void addPoiSourceAndLayer(e, r, !0)
                );
              addPoiSourceAndLayer(e, r);
            } catch (e) {}
          }, 800));
    }),
    e.on('style.load', async () => {
      const t = await getToken(),
        r = 'default' === currentPoiCategory ? 'default-pois' : 'chosen-pois';
      if ((await applyCountryLayers(), !historyMode)) {
        const o = currentPois.length ? currentPois : [];
        await retrieveAndApplyIcons(t),
          addMarkersSourceAndLayer([currentMarker]),
          addPoiSourceAndLayer(o, r),
          'Dark' === currentBaseLayer
            ? nightNavStyles(e)
            : (e.setConfigProperty('basemap', 'showPointOfInterestLabels', !1),
              e.setFog({
                color: 'rgb(11, 11, 25)',
                'high-color': 'rgb(36, 92, 223)',
                'horizon-blend': 0.02,
                'space-color': 'rgb(11, 11, 25)',
                'star-intensity': 0.6,
              }));
      }
    }),
    e.on('sourcedata', async (e) => {
      e.isSourceLoaded && 'raster-dem' === e.source.type && (await getToken());
    }),
    e.on('click', 'hovered-country-fill', async (e) => {
      if (disableAllButtons) return;
      clearTimeout(wikipediaTimer),
        (disableAllButtons = !0),
        changePanelSpinners(!0),
        disableMapInteraction(!0),
        expandSidebar(!1),
        chosenCountryISO && updateChosenCountryState();
      const t = e.features[0].properties.iso_a2;
      let r;
      if (historyMode)
        try {
          r = await getHistoryOfCountry(e.features[0].properties.name);
        } catch (e) {
          addErrorToMap('Error fetching country history');
        }
      try {
        updateChosenCountryState(t);
        const e = await getCountryDataAndFitBounds(t);
        historyMode
          ? await createHistoryCountryPopup(r, e.restCountries.flag)
          : await createModernCountryPopup(e);
      } catch (e) {
        updateChosenCountryState(),
          disableMapInteraction(!1),
          addErrorToMap('Error retrieving country details');
      } finally {
        (disableAllButtons = !1), changePanelSpinners(!1);
      }
    }),
    e.on('click', ['chosen-pois', 'default-pois'], (t) => {
      if (disableAllButtons) return;
      flyToDelayed({
        center: [t.lngLat.lng, t.lngLat.lat],
        speed: 0.5,
        curve: 2,
        zoom: 14,
        duration: 2e3,
      });
      let r = t.features[0].properties.id;
      if (selectedPoi === r) return;
      $('#content-chosen').attr('aria-hidden', 'true'),
        clearTimeout(timeout),
        expandSidebar(!0);
      const o = 'false' === $('#exit-container').attr('aria-disabled');
      pausingPoiSearch(!0),
        (selectedPoi = t.features[0].properties.id),
        (selectedSearch = null);
      const a = currentPois.find((e) => e.properties.id === r);
      addMarkersSourceAndLayer([a]),
        e.setLayoutProperty('modern-markers-layer', 'visibility', 'visible'),
        e.moveLayer('modern-markers-layer'),
        (currentMarker = a);
      let n = categoryList
        .find((e) => a.properties.canonical_id === e.canonical_id)
        .name.toLowerCase();
      if (
        (changeSelectedSidebarItem(!0, 'poi', a),
        'default' === currentPoiCategory)
      ) {
        n = 'points of interest';
        const e = 'Points of Interest' !== $('#content-title').text();
        addPoisToSidebar(e);
      }
      'default' !== currentPoiCategory && addPoisToSidebar(!1);
      let i = `Exit selected ${n}`;
      o
        ? ($('#exit-button').attr('title', i),
          $('#exit-button').attr('aria-label', i))
        : changeExitButton(!1, i);
    }),
    ['mouseenter', 'touchstart'].forEach((t) => {
      e.on(
        t,
        [
          'hovered-country-fill',
          'chosen-pois',
          'default-pois',
          'modern-markers-layer',
        ],
        () => {
          e.getCanvas().style.cursor = 'pointer';
        }
      );
    }),
    ['mouseleave', 'touchend'].forEach((t) => {
      e.on(
        t,
        [
          'hovered-country-fill',
          'chosen-pois',
          'default-pois',
          'modern-markers-layer',
        ],
        () => {
          e.getCanvas().style.cursor = '';
        }
      );
    }),
    ['mousemove', 'touchmove'].forEach((t) => {
      e.on(t, ['hovered-country-fill'], (t) => {
        t.features.length > 0 &&
          (null !== hoveredCountryId &&
            e.setFeatureState(
              {
                source: 'country-borders',
                sourceLayer: 'country_bordersgeo',
                id: hoveredCountryId,
              },
              { hover: !1 }
            ),
          (hoveredCountryId = t.features[0].properties.iso_a2),
          e.setFeatureState(
            {
              source: 'country-borders',
              sourceLayer: 'country_bordersgeo',
              id: hoveredCountryId,
            },
            { hover: !0 }
          ));
      });
    }),
    ['mouseleave', 'touchend'].forEach((t) => {
      e.on(t, ['hovered-country-fill'], (t) => {
        null !== hoveredCountryId &&
          e.setFeatureState(
            {
              source: 'country-borders',
              sourceLayer: 'country_bordersgeo',
              id: hoveredCountryId,
            },
            { hover: !1 }
          ),
          (hoveredCountryId = null);
      });
    }),
    $(document).on('pointermove', '#history-marker', function (t) {
      t.stopPropagation();
      if (disableAllButtons) {
        $(this).attr('aria-expanded', 'false'),
          $(this).closest('.mapboxgl-marker').css('z-index', '');
        return;
      }
      $(this).attr('aria-expanded', 'true'),
        $(this).closest('.mapboxgl-marker').css('z-index', 1e3),
        null !== hoveredCountryId &&
          (e.setFeatureState(
            {
              source: 'country-borders',
              sourceLayer: 'country_bordersgeo',
              id: hoveredCountryId,
            },
            { hover: !1 }
          ),
          (hoveredCountryId = null));
    }),
    $(document).on('pointerleave', '#history-marker', function () {
      $(this).attr('aria-expanded', 'false'),
        $(this).closest('.mapboxgl-marker').css('z-index', '');
    }),
    $(document).on('click', '#history-marker', function () {}),
    $('#zoom-in').on('click', () => {
      if (disableAllButtons) return;
      chosenCountryISO && updateChosenCountryState();
      let t = e.getZoom();
      e.easeTo({ zoom: t + 0.3 });
    }),
    $('#zoom-out').on('click', () => {
      if (disableAllButtons) return;
      chosenCountryISO && updateChosenCountryState();
      let t = e.getZoom();
      e.easeTo({ zoom: t - 0.3 });
    }),
    $('#history-control').on('click', async () => {
      if (!disableAllButtons) {
        if (
          (clearTimeout(wikipediaTimer),
          (disableAllButtons = !0),
          chosenCountryISO && updateChosenCountryState(),
          changePanelSpinners(!0),
          historyMode)
        )
          try {
            await getToken();
          } catch (e) {
            return (
              addErrorToMap('Error authenticating'),
              (disableAllButtons = !1),
              void changePanelSpinners(!1)
            );
          }
        await changeHistoryMode(e, !historyMode);
      }
    }),
    $('#style-control').on('click', async () => {
      if (disableAllButtons) return;
      clearTimeout(wikipediaTimer),
        (disableAllButtons = !0),
        changePanelSpinners(!0),
        disableMapInteraction(!0);
      try {
        await getToken();
      } catch {
        return (
          (disableAllButtons = !1),
          changePanelSpinners(!1),
          void disableMapInteraction(!1)
        );
      }
      if (historyMode) return void (await changeHistoryMode(e, !1));
      const t = e.getZoom(),
        r = 0 === styles.findIndex((e) => currentBaseLayer === e.name) ? 1 : 0;
      try {
        e.setStyle(styles[r].url, { diff: !0 }),
          (currentBaseLayer = styles[r].name),
          localStorage.setItem(
            'currentBaseLayer',
            JSON.stringify(currentBaseLayer)
          ),
          e.once('style.load', async () => {
            const r =
              'default' === currentPoiCategory ? 'default-pois' : 'chosen-pois';
            chosenCountryISO &&
              setTimeout(() => {
                e.setFeatureState(
                  {
                    source: 'country-borders',
                    sourceLayer: 'country_bordersgeo',
                    id: chosenCountryISO,
                  },
                  { chosen: !0 }
                );
              }, 500),
              t >= 9 && currentPois && addPoiSourceAndLayer(currentPois, r);
          });
      } catch (e) {
        addErrorToMap('Error setting map style');
      } finally {
        (disableAllButtons = !1),
          disableMapInteraction(!1),
          changePanelSpinners(!1);
      }
    }),
    $('#exit-button').on('click', async () => {
      if (!disableAllButtons) {
        if (chosenCountryISO)
          return (
            clearSidebarContent(),
            (currentPoiCategory = 'default'),
            updateChosenCountryState(),
            void (await flyToPromise({
              speed: 0.5,
              zoom: e.getZoom() - 0.5,
              duration: 1e3,
            }))
          );
        if (historyMode) {
          if (eventPopup)
            return (
              (disableAllButtons = !0),
              changePanelSpinners(!0),
              eventPopup.remove(),
              (eventPopup = null),
              await flyToPromise({
                speed: 0.5,
                zoom: e.getZoom() - 0.5,
                duration: 1500,
              }),
              (disableAllButtons = !1),
              void changePanelSpinners(!1)
            );
          if (selectedHistoricalEvent) {
            (disableAllButtons = !0),
              disableMapInteraction(!0),
              changePanelSpinners(!0);
            let t = 2;
            e.getZoom() <= 2 && (t = e.getZoom() - 0.5),
              await flyToPromise({ speed: 0.5, zoom: t, duration: 1500 });
            try {
              e.filterByDate('2013-01-01'),
                eventPopup && (eventPopup.remove(), (eventPopup = null)),
                await animateFog(e.getFog(), historyFog, 1500);
              const t =
                'false' ===
                  $('#day-slider-container-lg').attr('aria-disabled') ||
                'false' === $('#day-slider-container-sm').attr('aria-disabled');
              $('#history-year').attr('aria-disabled', 'true'),
                $('#history-year').addClass('animate-end_absolute'),
                t &&
                  ($('#history-container').removeClass('h-30'),
                  $('#history-container').addClass('h-20')),
                (disableAllButtons = !1),
                disableMapInteraction(!1),
                (selectedHistoricalEvent = null),
                clearSidebarContent(),
                await createMarkersFromHistoricalEvents(historicalEvents),
                addHistoricalEventsToSidebar(historicalEvents),
                $('#content-subtitle-container').removeClass('invisible'),
                $('#content-subtitle').text(
                  `${historicalEvents.length} results`
                ),
                expandSidebar(!0),
                changeExitButton(!1, `Exit events from ${currentDate}`);
            } catch (e) {
              addErrorToMap('Problem loading map date - try again');
            } finally {
              changePanelSpinners(!1),
                (disableAllButtons = !1),
                disableMapInteraction(!1);
            }
            return;
          }
          if (historicalEvents.length) {
            (disableAllButtons = !0),
              disableMapInteraction(!0),
              changePanelSpinners(!0);

            let t = 2;
            map.getZoom() <= 2 && (t = map.getZoom() - 0.5),
              await flyToPromise({ speed: 0.5, zoom: t, duration: 1500 });
            try {
              await returnToDefaultHistoryMap();
            } finally {
              changePanelSpinners(!1),
                (disableAllButtons = !1),
                disableMapInteraction(!1);
              changeExitButton(!0);
            }

            return;
          }
        } else {
          if (currentMarker)
            return (
              (currentMarker = null),
              addMarkersSourceAndLayer([]),
              changeSelectedSidebarItem(!1),
              (selectedPoi = null),
              (selectedSearch = null),
              'default' === currentPoiCategory &&
                0 !==
                  $('#content-results').find('#search-content-item').length &&
                (clearSidebarContent(),
                pausingPoiSearch(!1),
                searchResults.length && appendSearchResults(searchResults),
                changeExitButton(!0)),
              void (await flyToPromise({
                speed: 0.5,
                zoom: e.getZoom() - 0.5,
                duration: 1e3,
              }))
            );
          if ('default' !== currentPoiCategory)
            return (
              (currentPoiCategory = 'default'),
              changeExitButton(!0),
              e.flyTo({ speed: 0.5, zoom: e.getZoom() - 0.5, duration: 1e3 }),
              clearSidebarContent(),
              addPoiSourceAndLayer([], 'default-pois'),
              void (searchResults.length && appendSearchResults(searchResults))
            );
        }
      }
    }),
    $(document).on('click', (e) => {}),
    $('#country-select-button').on('click', async ({ target: e }) => {
      if (disableAllButtons) return;
      const t =
        'false' === $('#country-select-list').attr('aria-disabled')
          ? 'true'
          : 'false';
      $('#country-select-list').attr('aria-disabled', t);
    }),
    $('#country-select-list').on(
      'click',
      '#country-list-option',
      async ({ target: e }) => {
        if (disableAllButtons) return;
        let t;
        if (
          ((disableAllButtons = !0),
          changePanelSpinners(!0),
          disableMapInteraction(!0),
          expandSidebar(!1),
          chosenCountryISO && updateChosenCountryState(),
          $('#country-select-list').attr('aria-disabled', 'true'),
          historyMode)
        ) {
          clearTimeout(wikipediaTimer), await returnToDefaultHistoryMap();
          try {
            t = await getHistoryOfCountry(e.textContent);
          } catch (e) {
            addErrorToMap('Error fetching country history');
          }
        }
        try {
          updateChosenCountryState(e.getAttribute('value'));
          const r = await getCountryDataAndFitBounds(e.getAttribute('value'));
          historyMode
            ? await createHistoryCountryPopup(t)
            : await createModernCountryPopup(r);
        } catch (e) {
          addErrorToMap('Error fetching country info'),
            updateChosenCountryState(),
            disableMapInteraction(!1);
        } finally {
          (disableAllButtons = !1), changePanelSpinners(!1);
        }
      }
    ),
    $('#country-select').on(
      'click',
      '#country-option',
      async ({ target: e }) => {
        if (!disableAllButtons && !historyMode) {
          (disableAllButtons = !0),
            changePanelSpinners(!0),
            disableMapInteraction(!0),
            expandSidebar(!1),
            chosenCountryISO && updateChosenCountryState();
          try {
            updateChosenCountryState(e.value);
            const t = await getCountryDataAndFitBounds(e.value);
            await createModernCountryPopup(t);
          } catch (e) {
            addErrorToMap('Error fetching country info'),
              updateChosenCountryState(),
              disableMapInteraction(!1);
          } finally {
            (disableAllButtons = !1), changePanelSpinners(!1);
          }
        }
      }
    ),
    $('#country-select').on('keydown', '#country-option', async (e) => {
      if (disableAllButtons || historyMode) return;
      let t = e.target.value;
      if ('Enter' === e.key && t.length) {
        (disableAllButtons = !0),
          changePanelSpinners(!0),
          disableMapInteraction(!0),
          expandSidebar(!1),
          chosenCountryISO && updateChosenCountryState();
        try {
          updateChosenCountryState(t);
          const e = await getCountryDataAndFitBounds(t);
          await createModernCountryPopup(e);
        } catch (e) {
          addErrorToMap('Error fetching country info'),
            updateChosenCountryState(),
            disableMapInteraction(!1);
        } finally {
          (disableAllButtons = !1), changePanelSpinners(!1);
        }
      }
    });
}),
  $('#error-map').on('pointerenter', () => {
    'true' !== $('#error-map').attr('aria-disabled') &&
      clearTimeout(errorMapTimer);
  }),
  $('#error-map').on('pointerleave', () => {
    'true' !== $('#error-map').attr('aria-disabled') &&
      (errorMapTimer = removeErrorFromMap());
  }),
  $('#continue-search-map').on('click', async () => {
    if (disableAllButtons || historyMode) return;
    const e = map.getZoom();
    pausePoiSearch
      ? (pausingPoiSearch(!1),
        await flyToPromise({ speed: 0.5, zoom: e - 0.5, duration: 1e3 }))
      : (pausingPoiSearch(!0),
        await flyToPromise({ speed: 0.5, zoom: e + 0.5, duration: 1e3 }));
  }),
  $('#continue-search-map-sm').on('click', async () => {
    if (disableAllButtons || historyMode) return;
    const e = map.getZoom();
    pausePoiSearch
      ? (pausingPoiSearch(!1),
        await flyToPromise({ speed: 0.5, zoom: e - 0.5, duration: 1e3 }))
      : (pausingPoiSearch(!0),
        await flyToPromise({ speed: 0.5, zoom: e + 0.5, duration: 1e3 }));
  });
