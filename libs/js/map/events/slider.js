/// <reference path="../../jquery.js" />

mapPromise.then((map) => {
  let positionSliderTimer;

  let sliderMouseUpTimer;

  const slider = $('.day-slider');
  const popupContainer = $('.popup-container');
  let progress = null;

  function clearDaySlider() {
    clearTimeout(sliderMouseUpTimer);
    clearTimeout(wikipediaTimer);
    clearTimeout(positionSliderTimer);

    $('#day-slider-container-lg').attr('aria-disabled', 'true');
    $('#day-slider-container-sm').attr('aria-disabled', 'true');
    $('#history-container').removeClass('h-20').removeClass('h-30');
    $('#history-container').addClass('h-10');
    $('#history-date').attr('aria-disabled', 'true');
    $('#history-date').addClass('animate-end_absolute');
    $('#history-year').attr('aria-disabled', 'true');
    $('#history-year').addClass('animate-end_absolute');
  }

  $('#slider-button').on('click', async function () {
    if (!historyMode || disableAllButtons) return;

    clearTimeout(positionSliderTimer);

    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    const isDaySliderEnabled =
      $('#day-slider-container-lg').attr('aria-disabled') === 'false' ||
      $('#day-slider-container-sm').attr('aria-disabled') === 'false';

    if (isDaySliderEnabled) {
      clearDaySlider();
    } else {
      if (!progress) {
        progress =
          ((slider.val() - slider[0].min) / (slider[0].max - slider[0].min)) *
          100;
      }

      $('#day-slider-container-lg').attr('aria-disabled', 'false');
      $('#day-slider-container-sm').attr('aria-disabled', 'false');
      $('#history-container').removeClass('h-10');

      if (selectedHistoricalEvent) {
        $('#history-container').addClass('h-30');
        $('#history-year').text(`${selectedHistoricalEvent.event_year}`);
        $('#history-year').attr('aria-disabled', 'false');
        $('#history-year').removeClass('animate-end_absolute');
      } else {
        $('#history-container').removeClass('h-30');
        $('#history-container').addClass('h-20');
        $('#history-year').attr('aria-disabled', 'true');
        $('#history-year').addClass('animate-end_absolute');
      }

      $('#history-date').attr('aria-disabled', 'false');
      $('#history-date').removeClass('animate-end_absolute');
      $('#country-select-list').attr('aria-disabled', 'true');

      slider.css(
        '--track-color',
        `linear-gradient(to right, #4D9CFF ${progress}%, #d1d6e1 ${progress}%)`
      );

      const date = new Date(2024, 0);

      date.setDate(slider.val());

      const dateString = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
      });

      $('#history-date').text(dateString);

      positionSliderTimer = setTimeout(
        () => positionSliderPopup(slider, popupContainer),
        400
      );
    }
  });

  slider.on('input', function (e) {
    e.stopPropagation();

    if (!historyMode || disableAllButtons) return;

    const dayOfYear = $(this).val();
    const textBox = $('.popup-text');
    progress = ((dayOfYear - this.min) / (this.max - this.min)) * 100;

    let popup = $('.popup-container');

    if (window.innerWidth >= 640) {
      popup = $(popup[1]);
    } else {
      popup = $(popup[0]);
    }

    slider.css(
      '--track-color',
      `linear-gradient(to right, #4D9CFF ${progress}%, #d1d6e1 ${progress}%)`
    );

    const date = new Date(2024, 0);

    date.setDate(dayOfYear);

    const dateString = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
    });

    positionSliderPopup(popup);

    textBox.text(dateString);
  });

  slider.on('pointerdown', function (e) {
    e.stopPropagation();

    if (!historyMode || disableAllButtons) return;

    clearTimeout(sliderMouseUpTimer);
    clearTimeout(wikipediaTimer);

    let popup = $('.popup-container');

    if (window.innerWidth >= 640) {
      popup = $(popup[1]);
    } else {
      popup = $(popup[0]);
    }

    const dayOfYear = $(this).val();
    const textBox = $('.popup-text');

    const date = new Date(2024, 0);

    date.setDate(dayOfYear);

    const dateString = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
    });

    positionSliderPopup(popup);

    textBox.text(dateString);

    sliderMouseUpTimer = applySliderStyles(true);
  });

  let preventClick = false;

  slider.on('pointerup', async function (e) {
    e.stopPropagation();

    preventClick = true;

    setTimeout(() => {
      preventClick = false;
    }, 50);

    const date = new Date(2024, 0);

    date.setDate(this.value);

    const dateString = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
    });

    clearTimeout(sliderMouseUpTimer);

    if (
      !historyMode ||
      disableAllButtons ||
      (dateString === currentDate && historicalEvents.length)
    ) {
      sliderMouseUpTimer = applySliderStyles(false);
      return;
    }

    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');

    sliderMouseUpTimer = applySliderStyles(false);

    const dayOfYear = $(this).val();

    progress = ((dayOfYear - this.min) / (this.max - this.min)) * 100;

    slider.css(
      '--track-color',
      `linear-gradient(to right, #4D9CFF ${progress}%, #d1d6e1 ${progress}%)`
    );

    wikipediaTimer = setTimeout(async () => {
      if (window.innerWidth <= 640) {
        $('#day-slider-container-lg').attr('aria-disabled', 'true');
        $('#day-slider-container-sm').attr('aria-disabled', 'true');
        $('#history-container').removeClass('h-20');
        $('#history-container').removeClass('h-30');
        $('#history-container').addClass('h-10');
        $('#history-date').attr('aria-disabled', 'true');
        $('#history-date').addClass('animate-end_absolute');
        $('#history-year').attr('aria-disabled', 'true');
        $('#history-year').addClass('animate-end_absolute');
      }

      if (selectedHistoricalEvent) {
        await returnToDefaultHistoryMap();
      }

      await getWikipediaEvents(day, month);

      currentDate = dateString;

      $('#history-date').text(dateString);
    }, 1500);
  });

  $('#day-slider-container-lg').on('click', function () {
    if (preventClick) return;

    if (window.innerWidth <= 640 && $(this).attr('aria-disabled') === 'false') {
      clearDaySlider();
    }
  });

  $('#exit-day-slider').on('click', () => {
    if (
      window.innerWidth <= 640 &&
      $('#day-slider-container-lg').attr('aria-disabled') === 'false'
    ) {
      clearDaySlider();
    }
  });
});

function positionSliderPopup(popup) {
  let slider = $('.day-slider');

  if (window.innerWidth >= 640) {
    slider = slider[1];
  } else {
    slider = slider[0];
  }

  const dayOfYear = $(slider).val();

  const sliderRect = slider.getBoundingClientRect();

  const thumbWidth = 20;
  const thumbOffset =
    ((dayOfYear - slider.min) / (slider.max - slider.min)) *
    (sliderRect.width - thumbWidth);

  const popupLeft =
    sliderRect.left + thumbOffset + thumbWidth / 2 - popup.outerWidth() / 2;

  popup.css(
    '--left-popup',
    `${window.innerWidth >= 640 ? popupLeft - 160 : popupLeft}px`
  );
}

function applySliderStyles(mouseDown) {
  let slider = $('.day-slider');
  let popup = $('.popup-container');
  let top;

  if (window.innerWidth >= 640) {
    top = mouseDown ? 85 : 50;

    slider = $(slider[1]);
    popup = $(popup[1]);
    const sliderRect = slider[0].getBoundingClientRect();

    top = sliderRect.top - top;
  } else {
    top = mouseDown ? -35 : 0;

    slider = $(slider[0]);
    popup = $(popup[0]);
  }

  slider.css('--active-height', mouseDown ? '6px' : '8px');
  slider.css('--scale-thumb', mouseDown ? '1.2' : 1);
  slider.css('--color-thumb', mouseDown ? '#80b8ff' : '#4d9cff');
  slider.css('--scale-track', mouseDown ? '.98' : 1);

  popup.css('--opacity-popup', mouseDown ? '100' : '0');
  popup.css('--top-popup', `${top}px`);
  popup.css('--popup-scale', mouseDown ? '1' : 0.8);

  if (map.getZoom() >= 2) {
    $($('.day-slider-bg')[1]).css('--scale-track', mouseDown ? '.98' : '1');
  }

  return setTimeout(
    () => {
      popup.css('visibility', mouseDown ? 'visible' : 'hidden');
    },
    mouseDown ? 0 : 500
  );
}

function appendHistoricalEventsSpinner(message) {
  $('#content-subtitle-container').removeClass('invisible');

  $(/*html*/ `<div id="historical-spinner"
    aria-disabled='true' class='flex gap-1 aria-disabled:opacity-0 opacity-100 aria-disabled:translate-x-2 translate-x-0 items-center transition-all duration-150 ease-in'>
      <div
      class=" flex justify-end bg-black/50 w-fit rounded-md p-1 "
    >
      <div
        class="border-4 rounded-full border-slate-400 border-t-white-300 w-5 h-5 animate-spin"
      ></div>
    </div>
    <div class='text-xs font-title w-[75px] text-white-50'>${message}</div>
  </div>`).appendTo('#content-subtitle-extra');

  $('#historical-spinner').attr('aria-disabled', 'false');
}

async function createMarkersFromHistoricalEvents(data) {
  removeMarkers();

  const loadImageManually = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(url);
      img.onerror = () => resolve('libs/css/assets/history-fallback.jpg');
      img.src = url;
    });
  };

  for (const event of data) {
    const imageSource = event.thumbnail
      ? await loadImageManually(event.thumbnail)
      : 'libs/css/assets/history-fallback.jpg';

    const markerElement = document.createElement('div');

    markerElement.innerHTML = /*html*/ `
    <div data-event-id='${event.id}' id='history-marker' class='group relative cursor-pointer  pointer-events-auto' aria-expanded='false'>
      <div class='absolute h-24 w-20 sm:w-32 flex items-center justify-center origin-left left-0 group-aria-expanded:delay-300 duration-300 group-aria-expanded:left-36 inset-y-1/2 opacity-0 group-aria-expanded:opacity-100 font-abel text-white-50 -translate-y-1/2 bg-black text-white border border-white/50 rounded-md p-2 transition-all ease-out delay-0'>
        <p class='line-clamp-3 text-sm sm:text-lg'>
          ${event.title}
       </p>
      </div>
      <div class='sm:w-9 w-7 p-1 transition-all delay-200 group-aria-expanded:delay-0 scale-100 group-aria-expanded:scale-[3.5] ease-out opacity-90 duration-300 group-aria-expanded:shadow-[0px_0px_4px_0px_rgba(255,255,255,1),_3px_3px_6px_0px_rgba(87,148,254,1)] shadow-[0px_0px_2px_rgba(87,148,254,0),_0px_0px_60px_0px_rgba(87,148,254,0)] group-aria-expanded:opacity-100 sm:group-aria-expanded:w-14 group-aria-expanded:w-9 bg-black items-start rounded-md'>
        <img class='object-contain transition-all shadow-[10px_1px_40px_10px_rgba(0,0,0,.5)_inset,_-10px_-10px_40px_5px_rgba(255,255,255,1)_inset] ease-out delay-75 h-full' src='${imageSource}' alt='Event thumbnail' /> 
      </div>
  </div>

    `;

    const $markerElement = $(markerElement.firstElementChild);

    $markerElement.on('click', function (e) {
      e.stopPropagation();
    });

    const marker = new mapboxgl.Marker({
      element: markerElement.firstElementChild,
    })
      .setLngLat([event.longitude, event.latitude])
      .addTo(map);

    historyMarkerGroup.push(marker);
  }
}

async function getWikipediaEvents(day, month) {
  if (!historyMode) return;

  disableAllButtons = true;

  clearSidebarContent();
  selectedHistoricalEvent = null;
  updateChosenCountryState();
  disableMapInteraction(true);
  expandSidebar(true);
  changePanelSpinners(true);
  appendHistoricalEventsSpinner('Gathering events...');

  $('.day-slider').prop('disabled', true);

  let zoom = 2;

  if (map.getZoom() <= 2) zoom = map.getZoom() - 0.5;

  try {
    const { data, complete } = await $.ajax({
      url: `/api/wikipedia/events?action=fetch&day=${day}&month=${month}`,
      method: 'GET',
      dataType: 'json',
    });

    addHistoricalEventsToSidebar(data);
    changeExitButton(false, `Exit events from ${month}/${day}`);

    historicalEvents = data;

    if (complete) {
      await new Promise((resolve) => setTimeout(() => resolve(), 500));

      await flyToPromise({
        speed: 0.5,
        zoom,
        duration: 2000,
      });

      await createMarkersFromHistoricalEvents(data);

      map.setLayoutProperty('hovered-country-fill', 'visibility', 'none');
      map.setLayoutProperty('hovered-country-line', 'visibility', 'none');
      map.setLayoutProperty('chosen-country-fill', 'visibility', 'none');
      map.setLayoutProperty('chosen-country-line', 'visibility', 'none');
    }

    if (complete === false) {
      appendHistoricalEventsSpinner('Gathering coordinates...');

      try {
        const { data } = await $.ajax({
          url: `/api/wikipedia/events?action=update&day=${day}&month=${month}`,
          method: 'GET',
          dataType: 'json',
        });

        addHistoricalEventsToSidebar(data);

        historicalEvents = data;

        await new Promise((resolve) => setTimeout(() => resolve(), 500));

        await flyToPromise({
          speed: 0.5,
          zoom,
          duration: 2000,
        });

        await createMarkersFromHistoricalEvents(data);

        map.setLayoutProperty('hovered-country-fill', 'visibility', 'none');
        map.setLayoutProperty('hovered-country-line', 'visibility', 'none');
        map.setLayoutProperty('chosen-country-fill', 'visibility', 'none');
        map.setLayoutProperty('chosen-country-line', 'visibility', 'none');

        console.log(data);
      } catch (err) {
        throw err;
      }
    }
  } catch (err) {
    console.log(err);
    changeExitButton(true);
    expandSidebar(false);
    clearSidebarContent();
  } finally {
    changePanelSpinners(false);
    disableAllButtons = false;
    disableMapInteraction(false);

    $('#content-subtitle-extra').empty();
    $('.day-slider').prop('disabled', false);

    $('#content-subtitle-container').removeClass('invisible');

    $('#content-subtitle').text(`${historicalEvents.length} results`);
  }
}
