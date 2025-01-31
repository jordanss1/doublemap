/// <reference path="../../jquery.js" />

mapPromise.then((map) => {
  let positionSliderTimer;
  const slider = $('#day-slider');
  const popupContainer = $('#popup-container');

  $('#slider-button').on('click', async () => {
    if (!historyMode || disableAllButtons) return;

    clearTimeout(positionSliderTimer);

    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    const isDaySliderEnabled =
      $('#day-slider-container').attr('aria-disabled') === 'false';

    if (isDaySliderEnabled) {
      $('#day-slider-container').attr('aria-disabled', 'true');
      $('#history-container').removeClass('h-20');
      $('#history-container').addClass('h-10');
      $('#history-date').attr('aria-disabled', 'true');
      $('#history-date').addClass('animate-end_absolute');
    } else {
      const progress =
        ((slider.val() - slider[0].min) / (slider[0].max - slider[0].min)) *
        100;

      $('#day-slider-container').attr('aria-disabled', 'false');
      $('#history-container').removeClass('h-10');
      $('#history-container').addClass('h-20');
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

  slider.on('input', function () {
    if (!historyMode || disableAllButtons) return;

    const dayOfYear = $(this).val();
    const textBox = $('#popup-text');
    const progress = ((dayOfYear - this.min) / (this.max - this.min)) * 100;

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

    positionSliderPopup(slider, popupContainer);

    textBox.text(dateString);
  });

  let sliderMouseUpTimer;
  let wikipediaTimer;

  slider.on('mousedown', function () {
    if (!historyMode || disableAllButtons) return;

    clearTimeout(sliderMouseUpTimer);
    clearTimeout(wikipediaTimer);

    sliderMouseUpTimer = applySliderStyles(true);
  });

  slider.on('mouseup', async function () {
    if (!historyMode || disableAllButtons) return;

    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    clearTimeout(sliderMouseUpTimer);

    const date = new Date(2024, 0);

    date.setDate(this.value);

    const dateString = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
    });

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');

    sliderMouseUpTimer = applySliderStyles(false);

    wikipediaTimer = setTimeout(async () => {
      await getWikipediaEvents(day, month);

      $('#history-date').text(dateString);
    }, 1500);
  });
});

function positionSliderPopup(slider, popup) {
  const dayOfYear = $(slider).val();

  const sliderRect = slider[0].getBoundingClientRect();
  const thumbWidth = 20;
  const thumbOffset =
    ((dayOfYear - slider[0].min) / (slider[0].max - slider[0].min)) *
    (sliderRect.width - thumbWidth);

  const popupLeft =
    sliderRect.left + thumbOffset + thumbWidth / 2 - popup.outerWidth() / 2;

  popup.css('--left-popup', `${popupLeft - 87}px`);
}

function applySliderStyles(mouseDown) {
  const popup = $('#popup-container');
  const sliderRect = $('#day-slider')[0].getBoundingClientRect();
  const top = mouseDown ? 70 : 55;

  $('#day-slider').css('--active-height', mouseDown ? '6px' : '8px');
  $('#day-slider').css('--scale-thumb', mouseDown ? '1.2' : 1);
  $('#day-slider').css('--color-thumb', mouseDown ? '#80b8ff' : '#4d9cff');
  $('#day-slider').css('--scale-track', mouseDown ? '.98' : 1);

  popup.css('--opacity-popup', mouseDown ? '100' : '0');
  popup.css('--top-popup', `${sliderRect.top - top}px`);
  popup.css('--popup-scale', mouseDown ? '1' : 0.8);

  if (map.getZoom() >= 2) {
    $('#day-slider-bg').css('--scale-track', mouseDown ? '.98' : '1');
  }

  return setTimeout(
    () => {
      popup.css('visibility', mouseDown ? 'visible' : 'hidden');
    },
    mouseDown ? 0 : 500
  );
}

async function getWikipediaEvents(day, month) {
  if (!historyMode) return;

  $('#day-slider').prop('disabled', true);

  try {
    const { data, complete } = await $.ajax({
      url: `/api/wikipedia/events?action=fetch&day=${day}&month=${month}`,
      method: 'GET',
      dataType: 'json',
    });

    console.log(data);

    if (complete === false) {
      try {
        const { data } = await $.ajax({
          url: `/api/wikipedia/events?action=update&day=${day}&month=${month}`,
          method: 'GET',
          dataType: 'json',
        });

        console.log(data);
      } catch (xhr) {
        const res = JSON.parse(xhr.responseText);
        console.log(
          `Error Status: ${xhr.status} - Error Message: ${res.error}`
        );
        console.log(`Response Text: ${res.details}`);
      }
    }
  } catch (xhr) {
    const res = JSON.parse(xhr.responseText);
    console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  } finally {
    $('#day-slider').prop('disabled', false);
  }
}
