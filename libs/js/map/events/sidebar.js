/// <reference path="../../jquery.js" />

$('#content-results').on('click', '#content-expand', function () {
  const parentItem = $(this).closest('#poi-content-item');
  const isExpanded = parentItem.attr('aria-hidden') === 'false';

  if (isExpanded) {
    $(this).find('i').removeClass('fa-caret-down').addClass('fa-caret-right');
    parentItem.attr('aria-hidden', 'true');
  } else {
    $(this).find('i').removeClass('fa-caret-right').addClass('fa-caret-down');
    parentItem.attr('aria-hidden', 'false');
  }
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
    if (disableAllButtons || historyMode) return;

    clearTimeout(flyToTimer2);

    disableAllButtons = true;
    changePanelSpinners(true);

    const category = buttonId.replace('#', '').split('-')[0];

    $('#category-panel > *').attr('aria-checked', 'false');

    if (window.innerWidth > 640) {
      expandSidebar(true);
    }

    $(buttonId).attr('aria-checked', 'true');

    const zoom = map.getZoom();

    appendLocationToCategoryOption();

    const { longitude, latitude } = mostRecentLocation;

    if (category === currentPoiCategory && zoom < 9.5) {
      flyToTimer2 = flyToDelayed({
        center: [longitude, latitude],
        speed: 0.5,
        curve: 2,
        zoom: 10.5,
        duration: 2500,
      });

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
    pausingPoiSearch(false);

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
        // make notification
      } finally {
        disableAllButtons = false;
        changePanelSpinners(false);
      }
    }, 50);
  });
});

$('#content-subtitle-extra').on('click', '#continue-search', ({ target }) => {
  if (disableAllButtons || historyMode) return;

  if (pausePoiSearch) {
    pausingPoiSearch(false);
  } else {
    pausingPoiSearch(true);
  }
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
        } else {
          map.setPadding({ left: 420 });
        }
      } else {
        map.setPadding({ left: 80 });
      }
    }
  });
});

observer.observe(sidebarContainer[0], {
  attributes: true,
  attributeFilter: ['aria-expanded'],
});
