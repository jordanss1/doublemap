/// <reference path="../jquery.js" />

$('#zoom-in').on('click', () => {
  let currentZoom = map.getZoom();
  map.easeTo({ zoom: currentZoom + 0.3 });
});

$('#zoom-out').on('click', () => {
  let currentZoom = map.getZoom();

  map.easeTo({ zoom: currentZoom - 0.3 });
});

$('#style-control').on('click', () => {
  const state = baseButtonLayerStates.find(
    (state) => state.name === currentBaseLayer
  );

  state.changeLayer();
});

$('#country-select').on('click', '#country-option', ({ target }) => {
  console.log(target);
  getCountryData(target.value);
});
