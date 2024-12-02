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
    userGeo = data;

    const latLong = userGeo.loc.split(',');
    map.setCenter([latLong[1], latLong[0]]);
  },
  error: (xhr) => {
    const res = JSON.parse(xhr.responseText);
    console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  },
});

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
  error: (xhr) => {
    const res = JSON.parse(xhr.responseText);
    console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  },
});

$.ajax({
  url: '/api/mapboxgljs/category?list=true',
  method: 'GET',
  dataType: 'json',
  success: (res) => {
    categories = res.data;
  },
  error: (xhr) => {
    const res = JSON.parse(xhr.responseText);
    console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  },
});

function getSearchResults(value) {
  const latLong = userGeo.loc.split(',');
  const proximity =
    latLong.length === 2 ? `${latLong[1].trim()},${latLong[0].trim()}` : 'ip';

  if (value.length) {
    $.ajax({
      url: `/api/mapboxgljs/search?q=${value}&proximity=${proximity}`,
      method: 'GET',
      dataType: 'json',
      success: ({ data }) => {
        $('#search-normal').children().remove();

        if (data.length) {
          data.forEach(({ properties }, i) => {
            searchResults.push(properties);
            const name = createFeatureName(properties);
            $('#search-normal').append(
              `<div id='search-normal-item' data-value=${i}>${name}</div>`
            );
          });
        }
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
}

function createFeatureName(feature) {
  console.log(feature);
  const { name, feature_type, full_address } = feature;

  if (feature_type === 'poi') {
    return `${name}, ${full_address}`;
    // ${address ? `, ${address.name}` : ''}${locality ? `, ${locality.name}` : ''}${locality ? `, ${locality.name}` : ''}${
    //   place ? `, ${place.name}` : ''
    // }`
  } else {
    return `${feature.place_formatted || feature.name_preferred}`;
  }
}

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
