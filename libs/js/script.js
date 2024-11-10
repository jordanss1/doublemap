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

$.ajax({
  url: '/api/model/map_db/?service=geocoding&api=search-box', //api = search-box or geocoding
  method: 'PUT',
  dataType: 'json',
  success: (results) => console.log(results),
  error: (xhr) => {
    const res = JSON.parse(xhr.responseText);
    console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  },
});

let allCountriesGeoJSON = null;

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

$('#country-select').on('click', '#country-option', ({ target }) => {
  if (selectedCountry && selectedCountry.iso_a2 === target.value) {
    addSingleCountryToMap(selectedCountry);
  } else {
    $.ajax({
      url: `/api/countries?country=${target.value}`,
      method: 'GET',
      dataType: 'json',

      success: ({ data }) => {
        selectedCountry = data;
        addSingleCountryToMap(data[0].propertiesAndPolygons);
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
});

loadAllGeoJSON();
