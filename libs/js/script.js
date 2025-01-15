/// <reference path="./jquery.js" />

mapPromise.then((map) => {
  $.ajax({
    url: '/api/ipinfo',
    method: 'GET',
    data: 'json',
    success: ({ data }) => {
      userGeo = data;
      const latLong = userGeo.loc.split(',');
      const latitude = parseFloat(latLong[0]);
      const longitude = parseFloat(latLong[1]);

      mostRecentLocation = {
        latitude,
        longitude,
        context: {
          iso_a2: userGeo.country,
          region: userGeo.region,
          place: userGeo.city,
          neighborhood: null,
          district: null,
          name: null,
        },
      };

      map.flyTo({
        center: [longitude, latitude],
        speed: 0.5,
        curve: 2,
        zoom: 4,
        duration: 2000,
      });
    },
    error: (xhr) => {
      const res = JSON.parse(xhr.responseText);
      console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
      console.log(`Response Text: ${res.details}`);
    },
  });

  $.ajax({
    url: `/api/countries?country=all`,
    method: 'GET',
    dataType: 'json',
    success: ({ data }) => {
      countryList = data
        .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
        .map(({ properties }) => {
          return { name: properties.name, iso_a2: properties.iso_a2 };
        });

      countryList.forEach(({ name, iso_a2 }) => {
        $('#country-select').append(
          `<option id="country-option" class="text-lg font-sans" value="${iso_a2}">${name}</option>`
        );

        $('#country-select-list').append(
          `<li id='country-list-option' class='text-lg cursor-pointer hover:bg-blue-300 hover:text-white-100 w-full rounded-md' value='${iso_a2}'>${name}</li>`
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
      categoryList = res.data;
      console.log(res.data);
    },
    error: (xhr) => {
      const res = JSON.parse(xhr.responseText);
      console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
      console.log(`Response Text: ${res.details}`);
    },
  });
});

async function getCountryDataAndFitBounds(iso_a2) {
  try {
    const { data } = await $.ajax({
      url: `/api/countries?country=${iso_a2}`,
      method: 'GET',
      dataType: 'json',
    });

    const [restCountries, geonames] = data.map((countryData) => {
      if (countryData.error) {
        return false;
      }

      return countryData;
    });

    if (geonames) {
      const bbox = [
        [geonames.west, geonames.south],
        [geonames.east, geonames.north],
      ];

      map.fitBounds(bbox, {
        padding: 20,
        maxZoom: 8,
        duration: 2000,
      });

      return [restCountries, geonames];
    }
  } catch (err) {
    console.log(err);
  }
}
