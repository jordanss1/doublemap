(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // index.js
  var require_index = __commonJS({
    "index.js"(exports, module) {
      var variablePrefix = "maplibre_gl_dates";
      function filterByDate(map, date) {
        let dateRange = dateRangeFromDate(date);
        map.getStyle().layers.map(function(layer) {
          if (!("source-layer" in layer)) return;
          let filter = constrainFilterByDateRange(map.getFilter(layer.id), dateRange);
          map.setFilter(layer.id, filter);
        });
      }
      function dateRangeFromDate(date) {
        let dateRange;
        if (typeof date === "string") {
          dateRange = dateRangeFromISODate(date);
        } else if (date instanceof Date && !isNaN(date)) {
          let decimalYear = decimalYearFromDate(date);
          let isoDate = date.toISOString().split("T")[0];
          dateRange = {
            startDate: date,
            startDecimalYear: decimalYear,
            startISODate: isoDate,
            endDate: date,
            endDecimalYear: decimalYear,
            endISODate: isoDate
          };
        }
        return dateRange;
      }
      function dateRangeFromISODate(isoDate) {
        if (!isoDate || !/^-?\d{1,4}(?:-\d\d){0,2}$/.test(isoDate)) return;
        let ymd = isoDate.split("-");
        let isBCE = ymd[0] === "";
        if (isBCE) {
          ymd.shift();
          ymd[0] *= -1;
        }
        let startYear = +ymd[0];
        let endYear = +ymd[0];
        let startMonth, endMonth;
        if (ymd[1]) {
          startMonth = endMonth = +ymd[1] - 1;
        } else {
          endYear++;
          startMonth = endMonth = 0;
        }
        let startDay, endDay;
        if (ymd[2]) {
          startDay = endDay = +ymd[2];
        } else if (ymd[1]) {
          endMonth++;
          startDay = endDay = 1;
        }
        let startDate = dateFromUTC(startYear, startMonth, startDay);
        let endDate = dateFromUTC(endYear, endMonth, endDay);
        return {
          startDate: !isNaN(startDate) && startDate,
          startDecimalYear: !isNaN(startDate) && decimalYearFromDate(startDate),
          startISODate: !isNaN(startDate) && startDate.toISOString().split("T")[0],
          endDate: !isNaN(endDate) && endDate,
          endDecimalYear: !isNaN(endDate) && decimalYearFromDate(endDate),
          endISODate: !isNaN(endDate) && endDate.toISOString().split("T")[0]
        };
      }
      function dateFromUTC(year, month, day) {
        let date = new Date(Date.UTC(year, month, day));
        date.setUTCFullYear(year);
        return date;
      }
      function decimalYearFromDate(date) {
        let year = date.getUTCFullYear();
        let nextNewYear = dateFromUTC(year + 1, 0, 1).getTime();
        let lastNewYear = dateFromUTC(year, 0, 1).getTime();
        if (year < 0) {
          year--;
        }
        return year + (date.getTime() - lastNewYear) / (nextNewYear - lastNewYear);
      }
      function constrainFilterByDateRange(filter, dateRange) {
        if (typeof filter !== "undefined" && isLegacyFilter(filter)) {
          return constrainLegacyFilterByDateRange(filter, dateRange);
        } else {
          return constrainExpressionFilterByDateRange(filter, dateRange);
        }
      }
      function constrainLegacyFilterByDateRange(filter, dateRange) {
        if (filter[0] === "all" && filter[2] && filter[1][0] === "any" && filter[2][0] === "any") {
          if (filter[1][1] && filter[1][1][0] === "all" && filter[1][1][2] && filter[1][1][2][0] === "<" && filter[1][1][2][1] === "start_decdate") {
            filter[1][1][2][2] = dateRange.endDecimalYear;
          }
          if (filter[1][2] && filter[1][2][0] === "all" && filter[1][2][2] && filter[1][2][2][0] === "<" && filter[1][2][2][2] === "start_date") {
            filter[1][2][2][3] = dateRange.endISODate;
          }
          if (filter[2][1] && filter[2][1][0] === "all" && filter[2][1][2] && filter[2][1][2][0] === ">=" && filter[2][1][2][1] === "end_decdate") {
            filter[2][1][2][2] = dateRange.startDecimalYear;
          }
          if (filter[2][2] && filter[2][2][0] === "all" && filter[2][2][2] && filter[2][2][2][0] === ">=" && filter[2][2][2][2] === "end_date") {
            filter[2][2][2][3] = dateRange.startISODate;
          }
          return filter;
        }
        return [
          "all",
          [
            "any",
            [
              "all",
              ["has", "start_decdate"],
              ["<", "start_decdate", dateRange.endDecimalYear]
            ],
            [
              "all",
              ["!has", "start_decdate"],
              ["has", "start_date"],
              ["<", "start_date", dateRange.endISODate]
            ],
            [
              "all",
              ["!has", "start_decdate"],
              ["!has", "start_date"]
            ]
          ],
          [
            "any",
            [
              "all",
              ["has", "end_decdate"],
              [">=", "end_decdate", dateRange.startDecimalYear]
            ],
            [
              "all",
              ["!has", "end_decdate"],
              ["has", "end_date"],
              [">=", "end_date", dateRange.startISODate]
            ],
            [
              "all",
              ["!has", "end_decdate"],
              ["!has", "end_date"]
            ]
          ],
          filter
        ];
      }
      function constrainExpressionFilterByDateRange(filter, dateRange) {
        const startDecimalYearVariable = `${variablePrefix}__startDecimalYear`;
        const startISODateVariable = `${variablePrefix}__startISODate`;
        const endDecimalYearVariable = `${variablePrefix}__endDecimalYear`;
        const endISODateVariable = `${variablePrefix}__endISODate`;
        if (Array.isArray(filter) && filter[0] === "let") {
          updateVariable(filter, startDecimalYearVariable, dateRange.startDecimalYear);
          updateVariable(filter, startISODateVariable, dateRange.startISODate);
          updateVariable(filter, endDecimalYearVariable, dateRange.endDecimalYear);
          updateVariable(filter, endISODateVariable, dateRange.endISODate);
          return filter;
        }
        let allExpression = [
          "all",
          [
            "any",
            [
              "all",
              ["has", "start_decdate"],
              ["<", ["get", "start_decdate"], ["var", endDecimalYearVariable]]
            ],
            [
              "all",
              ["!", ["has", "start_decdate"]],
              ["has", "start_date"],
              ["<", ["get", "start_date"], ["var", endISODateVariable]]
            ],
            [
              "all",
              ["!", ["has", "start_decdate"]],
              ["!", ["has", "start_date"]]
            ]
          ],
          [
            "any",
            [
              "all",
              ["has", "end_decdate"],
              [">=", ["get", "end_decdate"], ["var", startDecimalYearVariable]]
            ],
            [
              "all",
              ["!", ["has", "end_decdate"]],
              ["has", "end_date"],
              [">=", ["get", "end_date"], ["var", startISODateVariable]]
            ],
            [
              "all",
              ["!", ["has", "end_decdate"]],
              ["!", ["has", "end_date"]]
            ]
          ]
        ];
        if (filter) {
          allExpression.push(filter);
        }
        return [
          "let",
          startDecimalYearVariable,
          dateRange.startDecimalYear,
          startISODateVariable,
          dateRange.startISODate,
          endDecimalYearVariable,
          dateRange.endDecimalYear,
          endISODateVariable,
          dateRange.endISODate,
          allExpression
        ];
      }
      function isLegacyFilter(filter) {
        if (!Array.isArray(filter) || filter.length < 2) {
          return false;
        }
        let args = filter.slice(1);
        switch (filter[0]) {
          case "!has":
          case "!in":
          case "none":
            return true;
          case "has":
            return args[0] === "$id" || args[0] === "$type";
          case "in":
            return (
              // The legacy syntax includes all the possible matches inline.
              args.length > 2 || // These are unlikely feature properties but are built-in legacy keys.
              args[0] === "$id" || args[0] === "$type" || // The `in` expression only allows searching within a string or array.
              typeof args[1] === "number" || typeof args[1] === "boolean" || // It would be pointless to search for a string literal inside another string literal.
              typeof args[0] === "string" && typeof args[1] === "string"
            );
          case "==":
          case "!=":
          case ">":
          case ">=":
          case "<":
          case "<=":
            return typeof args[0] === "string" && !Array.isArray(args[1]);
          case "all":
          case "any":
            return args.some(isLegacyFilter);
          default:
            return false;
        }
      }
      function updateVariable(letExpression, name, newValue) {
        if (letExpression[0] !== "let") {
          return;
        }
        let variableIndex = letExpression.indexOf(name);
        if (variableIndex !== -1 && variableIndex % 2 === 1) {
          letExpression[variableIndex + 1] = newValue;
        } else {
          letExpression.splice(-1, 0, name, newValue);
        }
      }
      if (typeof window !== "undefined" && ("maplibregl" in window || "mapboxgl" in window)) {
        if ("maplibregl" in window) {
          maplibregl.Map.prototype.filterByDate = function(date) {
            filterByDate(this, date);
          };
        }
        if ("mapboxgl" in window) {
          mapboxgl.Map.prototype.filterByDate = function(date) {
            filterByDate(this, date);
          };
        }
      } else if (typeof module !== "undefined") {
        module.exports = {
          filterByDate,
          dateRangeFromDate,
          decimalYearFromDate,
          dateRangeFromISODate,
          constrainFilterByDateRange,
          constrainLegacyFilterByDateRange,
          constrainExpressionFilterByDateRange,
          isLegacyFilter,
          updateVariable
        };
      }
    }
  });
  require_index();
})();
