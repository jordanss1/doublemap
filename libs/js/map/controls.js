/// <reference path="../jquery.js" />

// let zoomControl = L.control
//   .zoom({
//     collapsed: false,
//     position: 'topright',
//   })
//   .addTo(map);

// let baseControl = L.control
//   .layers(baseLayers, null, {
//     collapsed: false,
//     position: 'topright',
//   })
//   .addTo(map);

// let allCountriesControl = L.control
//   .layers({ 'All countries': allCountriesLayer }, null, {
//     position: 'topright',
//   })
//   .addTo(map);

// // Get the control container
// let baseControlContainer = baseControl.getContainer();
// let zoomControlContainer = zoomControl.getContainer();
// let allCountriesContainerControl = allCountriesControl.getContainer();

// const iconDisabledClass =
//   'text-sm group-aria-disabled:text-white-500 text-slate-800';

// const buttonDisabledClass =
//   'aria-disabled:bg-white-200 group aria-disabled:cursor-default *:transition-colors transition-colors *:duration-300 duration-300 bg-white-50';

// $(baseControlContainer).closest('.leaflet-control-layers')
//   .replaceWith(/*html*/ `
//     <div id="base-layer-control" 
//       title='Change map type'
//       role="button"
//       aria-label="Change map type"
//       aria-disabled="false"
//       class="w-8 h-8 cursor-pointer flex bg-white-50 rounded-md pointer-events-auto relative z-[9999]">
//       <i class="fa-solid fa-layer-group text-slate-800 text-sm m-auto"></i>
//     </div>
//   `);

// $(zoomControlContainer).closest('.leaflet-control-zoom').replaceWith(/*html*/ `
//     <div class="flex flex-col relative pointer-events-auto z-[9999]">
//       <a
//         id="zoom-in"
//         class="w-8 h-8 flex items-center rounded-t-md border-b-2 border-white-300 justify-center bg-white-50 m-auto"
//         title="Zoom in"
//         role="button"
//         aria-label="Zoom in"
//         aria-disabled="false"
//       >
//         <i class="fa-solid fa-plus text-sm text-slate-800"></i>
//       </a>
//       <a
//         id="zoom-out"
//         disabled=${currentZoom === minZoom}
//         class="w-8 h-8 flex items-center rounded-b-md justify-center ${buttonDisabledClass}"
//         title="Zoom out"
//         role="button"
//         aria-label="Zoom out"
//         aria-disabled="true"
//       >
//       <i class="fa-solid fa-minus ${iconDisabledClass}"></i>
//       </a>
//     </div>
//   `);

// $(allCountriesContainerControl).closest('.leaflet-control-layers')
//   .replaceWith(/*html*/ `
//     <div
//       id="all-countries-control"
//       title="Activate country mode"
//       role="button"
//       aria-label="Activate country mode"
//       aria-disabled=""
//       disabled=""
//       class="w-8 h-8 cursor-pointer items-center justify-center flex rounded-md ${buttonDisabledClass} pointer-events-auto relative z-[9999]"
//     >
//       <i class="fa-solid fa-globe ${iconDisabledClass}"></i>
//     </div>
//   `);
