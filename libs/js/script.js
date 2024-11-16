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

// $.ajax({
//   url: '/api/ipinfo',
//   method: 'GET',
//   data: 'json',
//   success: ({ data }) => {
//     console.log(data);
//   },
//   error: (xhr) => {
//     const res = JSON.parse(xhr.responseText);
//     console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
//     console.log(`Response Text: ${res.details}`);
//   },
// });

let allCountriesGeoJSON = null;

$.ajax({
  url: `/api/countries?country=all`,
  method: 'GET',
  dataType: 'json',
  success: ({ data }) => {
    console.log(data);

    const countryList = data
      .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
      .map(({ properties }) => {
        return { name: properties.name, iso_a2: properties.iso_a2 };
      });

    countryList.forEach(({ name, iso_a2 }) => {
      $('#country-select').append(
        `<option id="country-option" class="text-lg" value="${iso_a2}">${name}</option>`
      );
    });
  },
});

function getCountryData(iso_a2) {
  $.ajax({
    url: `/api/countries?country=${iso_a2}`,
    method: 'GET',
    dataType: 'json',

    success: ({ data }) => {
      map.setFilter('chosen-country-line', ['==', 'iso_a2', iso_a2]);
      map.setFilter('chosen-country-fill', ['==', 'iso_a2', iso_a2]);
      // map.setFilter('chosen-country-extrusion', ['==', 'iso_a2', iso_a2]);

      const responses = data.map((countryData) => {
        if (countryData.error) {
          return;
        }
        return countryData;
      });
    },
    error: (xhr) => {
      const res = JSON.parse(xhr.responseText);
      console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
      console.log(`Response Text: ${res.details}`);
    },
  });
}
