/// <reference path="../../jquery.js" />

$('#content-results').on('click', '#content-expand', function () {
  expandItem(this, '#poi-content-item');
});

$('#content-chosen').on('click', '#content-expand', function () {
  expandItem(this, '#poi-chosen');
});

$('#menu-button').on('click', () => {
  const isPanelExpanded = $('#left-panel').attr('aria-expanded') === 'true';

  if (isPanelExpanded) {
    expandSidebar(false);
  } else {
    expandSidebar(true);
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
    $('#category-container').attr('aria-expanded', 'true');
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
    $('#category-container').attr('aria-expanded', 'false');
    $('#category-panel').attr('aria-disabled', 'true');

    $('#category-panel > *').removeClass('duration-75');
    $('#category-panel > *').addClass('duration-300');

    categoryButtonTimeout = setTimeout(() => {
      $('#category-panel > *').removeClass('visible');
      $('#category-panel > *').addClass('invisible');
    }, 300);
  }
});

let flyToTimer2;

categoryPanelButtons.forEach((buttonId) => {
  $(buttonId).on('click', async () => {
    const category = buttonId.replace('#', '').split('-')[0];

    if (disableAllButtons || historyMode || category === currentPoiCategory)
      return;

    clearTimeout(flyToTimer2);

    disableAllButtons = true;
    changePanelSpinners(true);

    $('#category-panel > *').attr('aria-checked', 'false');

    if (window.innerWidth > 640) {
      expandSidebar(true);
    }

    $(buttonId).attr('aria-checked', 'true');

    const zoom = map.getZoom();

    appendLocationToCategoryOption();

    const { longitude, latitude } = mostRecentLocation;

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
    pausingPoiSearch(true);

    flyToTimer2 = setTimeout(async () => {
      await flyToPromise({
        center: [longitude, latitude],
        speed: 0.5,
        curve: 2,
        zoom: 10.5,
        duration: 2500,
      });

      try {
        const newPois = await getOverpassPois(bounds, category);

        previousPois = [...currentPois];

        currentPois = newPois;

        addPoiSourceAndLayer(newPois, 'chosen-pois');
      } catch (err) {
        console.log(err);
      } finally {
        disableAllButtons = false;
        changePanelSpinners(false);
      }
    }, 50);
  });
});

$('#content-subtitle-extra').on('click', '#continue-search', async () => {
  if (disableAllButtons || historyMode) return;

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

$('#content-results').on('click', '#pin-poi', function (e) {
  e.stopPropagation();

  const id = $(this).closest('#poi-content-item').attr('data-poi-id');

  markPoiFromSidebar(id);
});

$('#content-chosen').on('click', '#pin-poi', function (e) {
  e.stopPropagation();

  const id = $(this).closest('#poi-chosen').attr('data-poi-id');

  markPoiFromSidebar(id);
});

$('#content-results').on('click', '#search-content-item', function (e) {
  const selectedResult = searchResults.find(
    (res) => res.properties.mapbox_id === $(this).attr('data-poi-id')
  );

  markAndPanToSearchResult(selectedResult);
});

$('#content-chosen').on('click', '#search-chosen', function (e) {
  const selectedResult = searchResults.find(
    (res) => res.properties.mapbox_id === $(this).attr('data-poi-id')
  );

  markAndPanToSearchResult(selectedResult);
});

const sidebarContainer = $('#left-panel');

const observer = new MutationObserver((mutationsList, observer) => {
  mutationsList.forEach((mutation) => {
    if (
      mutation.type === 'attributes' &&
      mutation.attributeName === 'aria-expanded'
    ) {
      const ariaExpandedValue = sidebarContainer.attr('aria-expanded');

      if (ariaExpandedValue === 'true') {
        if (window.innerWidth >= 1024) {
          map.setPadding({ left: 464 });
        } else if (window.innerWidth >= 424) {
          map.setPadding({ left: 420 });
        } else if (window.innerWidth <= 424) {
          map.setPadding({ left: 80 });
          $('#right-panel').addClass('-z-[1]');
        }
      } else {
        map.setPadding({ left: 80 });
        $('#right-panel').removeClass('-z-[1]');
      }
    }

    if (
      mutation.type === 'attributes' &&
      mutation.attributeName === 'aria-hidden'
    ) {
      const ariaHiddenValue = sidebarContainer.attr('aria-hidden');

      if (ariaHiddenValue === 'true') {
        map.setPadding({ left: 0 });

        sidebarContainer.attr('aria-expanded', 'false');
        $('#left-grid-filler').removeClass('w-[4.2rem]');
        $('#left-grid-filler').addClass('w-0');
      }

      if (window.innerWidth <= 424) {
        if (ariaHiddenValue === 'false') {
          map.setPadding({ left: 80 });

          $('#left-grid-filler').removeClass('w-0');
          $('#left-grid-filler').addClass('w-[4.2rem]');
        }
      }
    }
  });
});

observer.observe(sidebarContainer[0], {
  attributes: true,
  attributeFilter: ['aria-expanded', 'aria-hidden'],
});

function expandItem(this1, id) {
  const parentItem = $(this1).closest(id);
  const isExpanded = parentItem.attr('aria-hidden') === 'false';

  if (isExpanded) {
    $(this1).find('i').removeClass('fa-caret-down').addClass('fa-caret-right');
    parentItem.attr('aria-hidden', 'true');
  } else {
    $(this1).find('i').removeClass('fa-caret-right').addClass('fa-caret-down');
    parentItem.attr('aria-hidden', 'false');
  }
}

function markPoiFromSidebar(newId) {
  if (disableAllButtons) return;

  const poi = currentPois.find((poi) => poi.properties.id === newId);

  flyToDelayed({
    center: poi.geometry.coordinates,
    speed: 0.5,
    curve: 2,
    zoom: 14,
    duration: 2000,
  });

  if (selectedPoi === newId) return;

  $('#content-chosen').attr('aria-hidden', 'true');

  const exitEnabled = $('#exit-container').attr('aria-disabled') === 'false';

  pausingPoiSearch(true);

  selectedPoi = poi.properties.id;

  addMarkersSourceAndLayer([poi]);

  map.setLayoutProperty('modern-markers-layer', 'visibility', 'visible');

  map.moveLayer('modern-markers-layer');

  currentMarker = poi;

  let poiType = categoryList
    .find((cate) => poi.properties.canonical_id === cate.canonical_id)
    .name.toLowerCase();

  changeSelectedSidebarItem(true, 'poi', poi);

  addPoisToSidebar(false);

  if (currentPoiCategory === 'default') {
    poiType = 'points of interest';
  }

  let title = `Exit selected ${poiType}`;

  if (exitEnabled) {
    $('#exit-button').attr('title', title);
    $('#exit-button').attr('aria-label', title);
  } else {
    changeExitButton(false, title);
  }
}
