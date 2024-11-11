// map1.on('layergroupadd', (e) => {
//   const disabled = e.id === 'all-countries' ? 'true' : 'false';

//   $('#all-countries-control')
//     .attr('disabled', disabled)
//     .attr('aria-disabled', disabled);
// });

// map1.once('moveend', () => {
//   map1.setView([47.73307550971585, 0.2293651266492969], 2.5);
// });

// map1.on('zoomend', () => {
//   currentZoom = map1.getZoom();
//   const disabled = currentZoom === 2.5 ? 'true' : 'false';

//   $('#zoom-out').attr('disabled', disabled).attr('aria-disabled', disabled);
// });

// $('#all-countries-control').on('click', ({ currentTarget }) => {
//   const disabled = currentTarget.ariaDisabled;

//   if (disabled === 'false') {
//     loadAllGeoJSON();
//   }
// });

// $('#base-layer-control').on('click', () => {
//   const currentLayerState = baseButtonLayerStates.find(
//     ({ stateName }) => stateName === currentBaseLayer
//   );

//   currentLayerState.changeLayer();
// });

// $('#zoom-in').on('click', () => {
//   map1.zoomIn(0.5, { animate: true });
// });

// $('#zoom-out').on('click', () => {
//   if (currentZoom === minZoom) return;

//   map1.zoomOut(0.5, { animate: true });
// });

// map.on("zoom", () => {
//   zoomLevel = map.getZoom();
//   console.log("Zoom level changed: " + zoomLevel);
// });

// map.on("move", () => {
//   center = map.getCenter();
//   console.log("Center changed" + center);
// });

// map.on("moveend", function (e) {
//   var center = map.getCenter(); // Get the final map center after the move ends
//   var zoom = map.getZoom(); // Get the final zoom level
//   console.log("Map finished moving to:", center, "Zoom level:", zoom);
// });
