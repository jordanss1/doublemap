let zoomControl = L.control
  .zoom({
    collapsed: false,
    position: 'topright',
  })
  .addTo(map);

let baseControl = L.control
  .layers(baseLayers, null, {
    collapsed: false,
    position: 'topright',
  })
  .addTo(map);

// Get the control container
let baseControlContainer = baseControl.getContainer();
let zoomControlContainer = zoomControl.getContainer();

$(baseControlContainer).closest('.leaflet-control-layers')
  .replaceWith(/*html*/ `
    <div class="w-8 h-8 flex bg-white-50 pointer-events-auto relative z-[9999]">
      <i class="fa-solid fa-layer-group text-lg text-center m-auto"></i>
      <div class="w-full hidden">
        <label>
          <input type="checkbox" id="layer1" />
          Base Layer 1
        </label>
        <br />
        <label>
          <input type="checkbox" id="layer2" />
          Base Layer 2
        </label>
        <br />
        <label>
          <input type="checkbox" id="markerLayer" />
          Marker Layer
        </label>
        <br />
      </div>
    </div>
  `);

$(zoomControlContainer).closest('.leaflet-control-zoom').replaceWith(/*html*/ `
    <div class="flex flex-col relative pointer-events-auto z-[9999]">
      <a
        class="w-8 h-8 bg-white-50 m-auto"
        href="#"
        title="Zoom in"
        role="button"
        aria-label="Zoom in"
        aria-disabled="false"
      >
        <i class="fa-solid fa-plus"></i>
      </a>
      <a
        class="w-8 h-8  bg-white-50"
        href="#"
        title="Zoom out"
        role="button"
        aria-label="Zoom out"
        aria-disabled="true"
      >
      <i class="fa-solid fa-minus"></i>
      </a>
    </div>
  `);
