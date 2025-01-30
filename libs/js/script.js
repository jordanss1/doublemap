/// <reference path="./jquery.js" />

mapPromise.then((map) => {
  $.ajax({
    url: '/api/ipinfo',
    method: 'GET',
    data: 'json',
    success: ({ data }) => {
      const isPanelExpanded = $('#left-panel').attr('aria-expanded') === 'true';

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
          `<option role='option' id='country-list-option' class='text-lg font-light cursor-pointer hover:bg-blue-300 hover:text-white-100 hover:font-normal w-full rounded-md truncate' value='${iso_a2}'>${name}</option>`
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
      addMarkersSourceAndLayer([]);
      addPoiSourceAndLayer([], 'default-pois');
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

    const bangladesh = iso_a2 === 'BD';
    const russia = iso_a2 === 'RU';
    let bbox;

    if (geonames && !russia && !bangladesh) {
      bbox = [
        [geonames.west, geonames.south],
        [geonames.east, geonames.north],
      ];
    }

    if (russia) {
      bbox = [
        [-3.1324472430562764, 16.75653385697838],
        [193.5290454579531, 81.78892590568162],
      ];
    }

    if (bangladesh) {
      bbox = [
        [86.58999500917906, 21.739773759938373],
        [93.47829389750098, 26.659078300978848],
      ];
    }

    map.fitBounds(bbox, {
      speed: 0.5,
      curve: 2,
      padding: {
        right: 50,
        top: 50,
        bottom: 50,
        left: 80,
      },
      maxZoom: 8,
      duration: 2500,
    });

    return [restCountries, geonames];
  } catch (err) {
    console.log(err);
  } finally {
    changeButtonSpinners(false);
  }
}
