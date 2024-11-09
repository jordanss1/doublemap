/// <reference path="./jquery.js" />

jQuery(() => {
  if ($('#preloader').length) {
    $('#preloader')
      .delay(300)
      .fadeOut('slow', function () {
        $(this).remove();
      });
  }
});

$.ajax({
  url: '/api/ipinfo',
  method: 'GET',
  data: 'json',
  success: ({ data }) => {
    console.log(data);
  },
  error: (xhr) => {
    const res = JSON.parse(xhr.responseText);
    console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  },
});

let allCountriesGeoJSON = null;

const addAllCountriesToMap = (features) => {
  allCountriesLayer.clearLayers();

  features.forEach(({ geometry }) =>
    L.geoJSON(geometry).addTo(allCountriesLayer)
  );

  if (!map.hasLayer(allCountriesLayer)) {
    if (map.hasLayer(selectedCountriesLayer)) {
      map.removeLayer(selectedCountriesLayer);
      map.fire('layergroupremove', {
        selectedCountriesLayer,
        id: 'select-country',
      });
    }

    allCountriesLayer.addTo(map);
    map.fire('layergroupadd', { allCountriesLayer, id: 'all-countries' });
  }
};

const loadAllGeoJSON = () => {
  if (allCountriesGeoJSON) {
    addAllCountriesToMap(allCountriesGeoJSON);
  } else {
    $.ajax({
      url: '/api/countries?country=all',
      method: 'GET',
      dataType: 'json',

      success: (results) => {
        const features = [];

        const sortedCountries = results.data
          .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
          .map(({ properties, geometry }) => {
            const { name, iso_a2 } = properties;

            features.push({ iso_a2, geometry });

            return { name, iso_a2 };
          });

        sortedCountries.forEach(({ name, iso_a2 }) => {
          $('#country-select').append(
            `<option id="country-option" class="text-lg" value="${iso_a2}">${name}</option>`
          );
        });

        allCountriesGeoJSON = features;

        addAllCountriesToMap(features);
      },
      error: (xhr) => {
        const res = JSON.parse(xhr.responseText);
        console.log(
          `Error Status: ${xhr.status} - Error Message: ${res.error}`
        );
        console.log(`Response Text: ${res.details}`);
      },
    });
  }
};

let selectedCountry = null;

const addSingleCountryToMap = (country) => {
  selectedCountriesLayer.clearLayers();

  L.geoJSON(country.geometry).addTo(selectedCountriesLayer);

  if (!map.hasLayer(selectedCountriesLayer)) {
    if (map.hasLayer(allCountriesLayer)) {
      map.removeLayer(allCountriesLayer);
      map.fire('layergroupremove', { allCountriesLayer, id: 'all-countries' });
    }

    selectedCountriesLayer.addTo(map);
    map.fire('layergroupadd', { selectedCountriesLayer, id: 'select-country' });
  }
};

$('#country-select').on('click', '#country-option', ({ target }) => {
  if (
    map.hasLayer(selectedCountriesLayer) &&
    selectedCountry.iso_a2 === target.value
  ) {
    return;
  }

  $.ajax({
    url: `/api/countries?country=${target.value}`,
    method: 'GET',
    dataType: 'json',

    success: ({ data }) => {
      addSingleCountryToMap(data[0].propertiesAndPolygons);
    },
    error: (xhr) => {
      const res = JSON.parse(xhr.responseText);
      console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
      console.log(`Response Text: ${res.details}`);
    },
  });
});

loadAllGeoJSON();
