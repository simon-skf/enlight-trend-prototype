import apiData from "./apiData.js";

console.log(apiData);

function calculateHanning(values) {
  let length = values.length;
  let out = [];
  values.forEach((value, index) => {
    let multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * index) / (length - 1)));
    out[index] = multiplier * values[index];
  });
  return out.reduce((sum, val) => sum + val, 0) / length;
}

async function init() {
  let spectrumResponse = await fetch(
    //"https://measurement-api.sandbox.iot.enlight.skf.com/nodes/7423d282-05cc-4d25-8e66-d91594b38d62/node-data/recent?from=2019-02-06T00%3A00%3A00.000Z&to=2019-02-20T00%3A00%3A00.000Z&offset=0&limit=100&content_type=SPECTRUM&exclude_coordinates=false"
    "spectrums.json"
  );
  let spectrums = await spectrumResponse.json();
  console.log(spectrums);

  let spectrumTrend = spectrums.data.map((dataPoint) => {
    let allValues = dataPoint.spectrum.coordinates.map(({ x, y }) => y);
    let overallValue = allValues.reduce((sum, val) => sum + val, 0) / dataPoint.spectrum.coordinates.length* 4;//calculateHanning(allValues);
    return [(new Date(dataPoint.createdAt)).getTime(), overallValue];
  });

  console.log(spectrumTrend);

  let dataPointsResponse = await fetch(
    //"https://measurement-api.sandbox.iot.enlight.skf.com/nodes/7423d282-05cc-4d25-8e66-d91594b38d62/node-data/recent?content_type=DATA_POINT&limit=1000&offset=1000&resurrectable=false"
    "data_points.json"
  );
  let dataPoints = await dataPointsResponse.json();
  console.log(dataPoints);

  let highchartsPoints = dataPoints.data.map((point) => [
    point.dataPoint.coordinate.x,
    point.dataPoint.coordinate.y,
  ]);

  console.log(highchartsPoints);

  Highcharts.chart("container", {
    chart: {
      zoomType: "x",
    },
    title: {
      text: "USD to EUR exchange rate over time",
    },
    subtitle: {
      text:
        document.ontouchstart === undefined
          ? "Click and drag in the plot area to zoom in"
          : "Pinch the chart to zoom in",
    },
    xAxis: {
      type: "datetime",
    },
    yAxis: {
      title: {
        text: "g",
      },
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      area: {
        fillColor: {
          linearGradient: {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 1,
          },
          stops: [
            [0, Highcharts.getOptions().colors[0]],
            [
              1,
              Highcharts.color(Highcharts.getOptions().colors[0])
                .setOpacity(0)
                .get("rgba"),
            ],
          ],
        },
        marker: {
          radius: 2,
        },
        lineWidth: 1,
        states: {
          hover: {
            lineWidth: 1,
          },
        },
        threshold: null,
      },
    },

    series: [
      {
        type: "area",
        name: "USD to EUR",
        data: highchartsPoints,
      },
      {
        type: "line",
        name: "spectrum",
        data: spectrumTrend,
      },
    ],
  });
}

init();
