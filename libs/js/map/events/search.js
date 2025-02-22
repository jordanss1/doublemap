let locToCategoryTimer, appendTimer;
async function markAndPanToSearchResult(e) {
  clearTimeout(locToCategoryTimer),
    window.innerWidth > 640 && expandSidebar(!0),
    (currentMarker = null),
    (selectedPoi = null),
    (currentPoiCategory = 'default'),
    addPoiSourceAndLayer([], 'default-pois'),
    (locToCategoryTimer = setTimeout(() => {
      appendLocationToCategoryOption(!0);
    }, 3e3));
  const {
    coordinates: t,
    feature_type: a,
    bbox: r,
    context: n,
    mapbox_id: o,
  } = e.properties;
  selectedSearch = o;
  const i = [t.longitude, t.latitude];
  if (
    (appendSearchResults(searchResults),
    'country' === a
      ? await updateChosenCountryState(n.country.country_code)
      : (chosenCountryISO && (await updateChosenCountryState()),
        addMarkersSourceAndLayer([e]),
        (currentMarker = e),
        map.setLayoutProperty('modern-markers-layer', 'visibility', 'visible'),
        changeExitButton(!1, 'Exit chosen result'),
        map.moveLayer('modern-markers-layer')),
    r && r.length)
  )
    fitBoundsDelayed(r, { maxZoom: 8, speed: 0.5, curve: 2, duration: 2500 });
  else {
    const e = zoomForFeatureType(a);
    flyToDelayed({
      center: i,
      speed: 0.5,
      curve: 2,
      zoom: e,
      essential: !0,
      duration: 2500,
    });
  }
  $('#search-popout').attr('aria-disabled', 'true');
}
async function appendLocationToCategoryOption(e = null) {
  clearTimeout(appendTimer),
    (appendTimer = setTimeout(async () => {
      const t = await reverseLookupFromLatLng(e);
      if (!t) return;
      const { district: a, neighborhood: r, region: n, place: o } = t;
      (mostRecentLocation.context = {
        neighborhood: r,
        district: a,
        region: n,
        place: o,
      }),
        $('#search-category-item-appended').text(''),
        $('#search-category-item-default-area').text(
          `${r ? `${r}, ` : ''}${o ? `${o}` : ''}${
            a && a !== o ? `, ${a}` : ''
          }${n ? `, ${t.region}` : ''}`
        );
    }, 500));
}
function categorySearchOption(e) {
  return categoryList.reduce((t, a) => {
    if ('default' === a.name) return t;
    const r = e
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''),
      n = a.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    return (n.includes(r) || r.includes(n)) &&
      (null === t || n.length > t.name.length)
      ? a
      : t;
  }, null);
}
async function reverseLookupFromLatLng(e = null) {
  const t = map.getZoom(),
    { lng: a, lat: r } = map.getCenter(),
    { latitude: n, longitude: o } = mostRecentLocation;
  if (
    t >= (e ? 0 : 'default' === currentPoiCategory ? 9 : 7) &&
    (Math.abs(a - o) > 0.02 || Math.abs(r - n) > 0.02)
  ) {
    (mostRecentLocation.latitude = r), (mostRecentLocation.longitude = a);
    try {
      const { data: e } = await $.ajax({
        url: `/api/mapboxgljs/search?latitude=${r}&longitude=${a}&limit=6&endpoint=reverse`,
        method: 'GET',
        dataType: 'json',
      });
      return e;
    } catch (e) {
      throw err;
    }
  }
  return null;
}
mapPromise.then(async (e) => {
  const t = async (e) => {
    e.length &&
      !searchLoading &&
      (chosenCountryISO && (await updateChosenCountryState()),
      $('#search-container-inside').removeClass('outline-3'),
      $('#search-container-inside').addClass('outline-0'),
      await markAndPanToSearchResult(searchResults[0]));
  };
  let a, r, n;
  $('#search').on('keydown', async (e) => {
    if (disableAllButtons) return;
    let a = e.target.value;
    if (('Enter' === e.key && t(a), 'Backspace' === e.key)) {
      const t = e.target.value
        .slice(0, -1)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      searchTerm === t &&
        ($('#search-button-spinner').attr('aria-disabled', 'true'),
        changePanelSpinners(!1));
    }
  }),
    $('#search-button').on('click', async (a) => {
      if (disableAllButtons) return;
      clearTimeout(locToCategoryTimer);
      const r = $('#search').val(),
        n = 'true' === $('#search-container').attr('aria-expanded');
      window.innerWidth <= 768
        ? n
          ? t(r)
          : ($('#search-container').attr('aria-expanded', 'true'),
            window.innerWidth <= 424 &&
              (chosenCountryISO &&
                (clearSidebarContent(),
                (currentPoiCategory = 'default'),
                updateChosenCountryState(),
                await flyToPromise({
                  speed: 0.5,
                  zoom: e.getZoom() - 0.5,
                  duration: 1e3,
                })),
              expandSidebar(!0)))
        : t(r);
    }),
    $('#search').on('focus', ({ target: e }) => {
      if (disableAllButtons) return;
      $('#search-container-inside').removeClass('outline-0'),
        $('#search-container-inside').addClass('outline-3');
      'true' === $('#search-popout').attr('aria-disabled') &&
        e.value.length &&
        $('#search-popout').attr('aria-disabled', 'false');
    }),
    $('#search').on('input', async (e) => {
      if (disableAllButtons) return;
      let t = e.target.value.trim();
      clearTimeout(a), clearTimeout(r), clearTimeout(locToCategoryTimer);
      const n = 'true' === $('#search-popout').attr('aria-disabled');
      if (t.length) {
        n && $('#search-popout').attr('aria-disabled', 'false');
        const e = t
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        if (searchTerm === e) return;
        $('#search-button-spinner').attr('aria-disabled', 'false'),
          $('#content-results').find('#poi-content-item').length ||
            (changePanelSpinners(!0), expandSidebar(!0)),
          (r = setTimeout(async () => {
            try {
              await getSearchResults(e);
            } catch (e) {
            } finally {
              $('#search-button-spinner').attr('aria-disabled', 'true'),
                changePanelSpinners(!1);
            }
          }, 1500));
        const o = categorySearchOption(t);
        if (o) {
          const {
              neighborhood: t,
              place: r,
              region: n,
              district: i,
            } = mostRecentLocation.context,
            s = o.name.toLowerCase();
          $('#search-category').children().remove(),
            $('#search-category').append(
              `\n            <div id='search-category-item' class='flex items-baseline gap-1' data-value='${o.canonical_id}'>\n            <i\n            class="fa-solid fa-magnifying-glass text-[10px] text-slate-700"\n            ></i>\n            <div>\n             <span class='text-sm'>${o.name}</span><span> - <span id='search-category-item-default-area' class='text-white-900 text-[13px]'></span><span id='search-category-item-appended' class='text-white-900 text-[13px]'></span>\n            </div>\n          </div>`
            );
          const c = new RegExp(`^${s}(\\s)`, 'i'),
            l = e.slice(s.length).split(/\s+/).filter(Boolean);
          if (
            (l[0] ||
              $('#search-category-item-default-area').text(
                `${t ? `${t}, ` : ''}${r ? `${r}` : ''}${
                  i && i !== r ? `, ${i}` : ''
                }${n ? `, ${n}` : ''}`
              ),
            (a = await appendLocationToCategoryOption()),
            e.length > 0 && l[0])
          ) {
            clearTimeout(a);
            const t = ['near', 'around', 'in'];
            c.test(e)
              ? t.includes(l[0])
                ? $('#search-category-item-appended').append(
                    ` ${l.slice(1).join(' ')}`
                  )
                : ($('#search-category-item-default-area').text(''),
                  $('#search-category-item-appended').append(` ${l.join(' ')}`))
              : $('#search-category').children().remove();
          }
        } else $('#search-category').children().remove();
      } else
        $('#search-button-spinner').attr('aria-disabled', 'true'),
          changePanelSpinners(!1),
          $('#search-category').children().remove(),
          $('#search-normal').children().remove(),
          (searchResults = []),
          (searchTerm = ''),
          $('#content-results').find('#search-content-item').length &&
            (clearSidebarContent(),
            $('#content-chosen').empty(),
            $('#content-chosen').attr('aria-disabled', 'true')),
          n || $('#search-popout').attr('aria-disabled', 'true');
    }),
    $('#search-category').on(
      'click',
      '#search-category-item',
      async function (e) {
        if (disableAllButtons) return;
        $('#search-container-inside').removeClass('outline-3'),
          $('#search-container-inside').addClass('outline-0'),
          clearTimeout(a),
          clearTimeout(r),
          clearTimeout(n),
          clearTimeout(locToCategoryTimer),
          changePanelSpinners(!0);
        const t = $(this).data('value');
        let o = $('#search-category-item-appended').text();
        if (!o) {
          const { longitude: e, latitude: a } = mostRecentLocation,
            r = {
              _sw: { lng: e - 0.1, lat: a - 0.1 },
              _ne: { lng: e + 0.1, lat: a + 0.1 },
            };
          return (
            (currentPoiCategory = t),
            activateCategoryButton(),
            window.innerWidth > 640 && expandSidebar(!0),
            void (n = setTimeout(async () => {
              await flyToPromise({
                center: [e, a],
                speed: 0.5,
                curve: 2,
                zoom: 10.5,
                duration: 2500,
              });
              try {
                const e = await getOverpassPois(r, t);
                (previousPois = [...currentPois]),
                  (currentPois = e),
                  addPoiSourceAndLayer(e, 'chosen-pois');
              } finally {
                changePanelSpinners(!1),
                  $('#search-popout').attr('aria-disabled', 'true'),
                  window.innerWidth <= 768 &&
                    $('#search-container').attr('aria-expanded', 'false');
              }
            }, 50))
          );
        }
        o = encodeURIComponent(o).trim();
        try {
          const { data: e } = await $.ajax({
            url: `/api/mapboxgljs/search?q=${o}&limit=1&endpoint=forward`,
            method: 'GET',
            dataType: 'json',
          });
          if ((window.innerWidth > 640 && expandSidebar(!0), e.length)) {
            const { latitude: a, longitude: r } = e[0].properties.coordinates,
              o = {
                _sw: { lng: r - 0.1, lat: a - 0.1 },
                _ne: { lng: r + 0.1, lat: a + 0.1 },
              };
            (currentPoiCategory = t),
              activateCategoryButton(),
              (n = setTimeout(async () => {
                await flyToPromise({
                  center: [r, a],
                  speed: 0.5,
                  curve: 2,
                  zoom: 10.5,
                  duration: 2500,
                });
                const e = await getOverpassPois(o, t);
                (previousPois = [...currentPois]),
                  (currentPois = e),
                  addPoiSourceAndLayer(e, 'chosen-pois');
              }, 50));
          }
        } catch (e) {
        } finally {
          changePanelSpinners(),
            $('#search-popout').attr('aria-disabled', 'true'),
            window.innerWidth <= 768 &&
              $('#search-container').attr('aria-expanded', 'false');
        }
      }
    ),
    $('#search-normal').on(
      'click',
      '#search-normal-item',
      async function async(e) {
        if (disableAllButtons) return;
        const t = searchResults[$(this).data('value')];
        $('#search-container-inside').removeClass('outline-3'),
          $('#search-container-inside').addClass('outline-0'),
          await markAndPanToSearchResult(t);
      }
    );
});
