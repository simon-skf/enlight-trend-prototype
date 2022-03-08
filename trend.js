const colorBlue = "#0F58D6";
const colorGrey = "#676F7C";

let trendHighcharts = undefined;
let overallTrendRaw = undefined;
let spectrumTrendRaw = undefined;

let variant = {
  dataset: 0,
  spectrumsOnTrend: false,
};
const dataSources = {
  //https://measurement-api.sandbox.iot.enlight.skf.com/nodes/7423d282-05cc-4d25-8e66-d91594b38d62/node-data/recent?content_type=DATA_POINT&limit=1000&offset=0&resurrectable=false
  0: [
    `dataset_0/data_points_0.json`,
    `dataset_0/data_points_1000.json`,
    `dataset_0/data_points_2000.json`,
    `dataset_0/data_points_3000.json`,
    `dataset_0/data_points_4000.json`,
  ],
  //https://measurement-api.sandbox.iot.enlight.skf.com/nodes/f1f344bd-3d82-4eea-95bc-3c59d951a685/node-data/recent?offset=0&limit=1000&content_type=DATA_POINT&exclude_coordinates=false&resurrectable=false
  1: [
    //   `dataset_1/data_points_0.json`,
    `dataset_1/data_points_1000.json`,
    `dataset_1/data_points_2000.json`,
    `dataset_1/data_points_3000.json`,
    `dataset_1/data_points_4000.json`,
  ],
};

const bandOverallsSource = {
  //https://measurement-api.sandbox.iot.enlight.skf.com/nodes/7423d282-05cc-4d25-8e66-d91594b38d62/band/overall?startFrequency=0&stopFrequency=1300&windowFunction=hanning&frequencyType=0
  0: `dataset_0/band_overalls.json`,
  //https://measurement-api.sandbox.iot.enlight.skf.com/nodes/f1f344bd-3d82-4eea-95bc-3c59d951a685/band/overall?startFrequency=0&stopFrequency=30&windowFunction=hanning&frequencyType=0
  1: `dataset_1/band_overalls.json`,
};

const magicSpectrumOverallRatio = {
  0: 1 / 10,
  1: 1 / 5,
};

const dataMaxValues = {
  0: {
    y: 0.5,
  },
  1: {
    y: 0.07,
  },
};

const spectrumSeriesIndex = 1;

async function init() {
  let dataPointsSources = dataSources[variant.dataset];
  let overallTrend = [];
  for (var i = 0; i < dataPointsSources.length; i++) {
    let dataPointsResponse = await fetch(dataPointsSources[i]);
    let dataPoints = await dataPointsResponse.json();

    let trendPart = dataPoints.data.map((point) => [
      point.dataPoint.coordinate.x,
      point.dataPoint.coordinate.y,
    ]);
    overallTrend.push(...trendPart);
  }
  overallTrend.sort((a, b) => a[0] - b[0]);

  overallTrendRaw = overallTrend;

  let bandOverallsResponse = await fetch(bandOverallsSource[variant.dataset]);
  let bandOveralls = await bandOverallsResponse.json();

  let spectrumTrend = bandOveralls.trends
    .map((point) => {
      if (variant.spectrumsOnTrend) {
        return {
          x: new Date(point.createdAt).getTime(),
          y: point.overallBand * magicSpectrumOverallRatio[variant.dataset],
          marker: {},
        };
      } else {
        return {
          x: new Date(point.createdAt).getTime(),
          y: 0,
          marker: {},
        };
      }
    })
    .filter(
      (val) =>
        val.x > overallTrend[0][0] &&
        val.x < overallTrend[overallTrend.length - 1][0]
    );

  spectrumTrend.sort((a, b) => a.x - b.x);

  spectrumTrend[spectrumTrend.length - 1].marker.enabled = true;
  spectrumTrend[spectrumTrend.length - 1].marker.radius = 6;
  for (var i = 1; i < 6; i++) {
    spectrumTrend[spectrumTrend.length - 1 - i].marker.enabled = true;
    spectrumTrend[spectrumTrend.length - 1 - i].marker.radius = 6;
    spectrumTrend[spectrumTrend.length - 1 - i].marker.lineWidth = 1;
    spectrumTrend[spectrumTrend.length - 1 - i].marker.fillColor = "#fff";
    spectrumTrend[spectrumTrend.length - 1 - i].marker.lineColor = colorBlue;
  }

  spectrumTrendRaw = spectrumTrend.map((val) => [val.x, val.y]);

  trendHighcharts = Highcharts.chart("container", {
    title: {
      text: "Trend",
    },
    chart: {
      zoomType: "x",
      events: {
        click: (e) => {
          const currentX = e.xAxis[0].value;
          let fromResetZoomButton = !e.isTrusted; // Should be changed to something else.
          if (!fromResetZoomButton) {
            selectSpectrumCloseTo(currentX);
          }
        },
      },
    },
    xAxis: {
      type: "datetime",
      crosshair: {
        color: "gray",
      },
    },
    yAxis: [
      {
        title: {
          text: "g",
        },
        top: "15%",
        height: "85%",
        min: 0,
        max: dataMaxValues[variant.dataset].y,
      },
      {
        height: "15%",
      },
    ],
    legend: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      shadow: false,
      animation: false,
      crosshairs: true,
      borderRadius: 3,
      backgroundColor: "#fff",
      borderColor: colorGrey,
      borderWidth: 0,
      headerFormat: "",
      shape: "rect",
      useHTML: true,
      padding: 6,
      style: {
        fontSize: "11px",
      },
      //   pointFormat: undefined,
      pointFormatter: function () {
        const dateFormatOptions = {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        };
        if (this.series.name == "vibration") {
          let xyPoint = getClosestPointBy(this.x, spectrumTrendRaw, []);
          //   if (this.x == xyPoint.x) {
          //     return ""; //We will also display the spectrum tooltip as below
          //   }
          return `<b>${new Date(this.x).toLocaleString(
            "sv-SE",
            dateFormatOptions
          )}</b><br/>${this.y.toPrecision(5)} g<br/>`;
        }
        if (this.series.name == "spectrum") {
          let xyPoint = getClosestPointBy(this.x, overallTrend, []);
          if (this.x == xyPoint.x) {
            return `<b>${new Date(this.x).toLocaleString(
              "sv-SE",
              dateFormatOptions
            )}</b><br/>${xyPoint.y.toPrecision(5)} g<br/>`;
          } else {
            return `<b>${new Date(this.x).toLocaleString(
              "sv-SE",
              dateFormatOptions
            )}</b><br/>${xyPoint.y.toPrecision(5)} g<br/>(${new Date(
              xyPoint.x
            ).toLocaleString("sv-SE", dateFormatOptions)})<br/>`;
          }
        }
        if (this.series.name == "Single cursors") {
          let closestOverallPoint = getClosestPointBy(this.x, overallTrend, []);
          let closestSpectrumPoint = getClosestPointBy(
            this.x,
            spectrumTrendRaw,
            []
          );
          //   if (
          //     !(closestOverallPoint.x == this.x || closestSpectrumPoint == this.x)
          //   ) {
          //     return `<b>${new Date(this.x).toLocaleString(
          //       "sv-SE",
          //       dateFormatOptions
          //     )}</b><br/>${closestOverallPoint.y.toPrecision(
          //       5
          //     )} g<br/>(${new Date(closestOverallPoint.x).toLocaleString(
          //       "sv-SE",
          //       dateFormatOptions
          //     )})<br/>`;
          //   }
          if (this.x == closestOverallPoint.x) {
            return `<b>${new Date(this.x).toLocaleString(
              "sv-SE",
              dateFormatOptions
            )}</b><br/>${closestOverallPoint.y.toPrecision(5)} g<br/>`;
          } else {
            return `<b>${new Date(this.x).toLocaleString(
              "sv-SE",
              dateFormatOptions
            )}</b><br/>${closestOverallPoint.y.toPrecision(5)} g<br/>(${new Date(
                closestOverallPoint.x
            ).toLocaleString("sv-SE", dateFormatOptions)})<br/>`;
          }
        }
      },
      positioner: (labelWidth, labelHeight, point) => {
        // console.log(labelWidth, labelHeight, point);
        return { x: point.plotX + 36, y: 20 };
      },
      shared: false,
    },
    plotOptions: {
      line: {
        lineWidth: 1,
        marker: {
          radius: 2,
        },
        states: {
          hover: {
            lineWidth: 1,
          },
          inactive: {
            opacity: 1,
          },
        },
      },
      scatter: {
        states: {
          inactive: {
            opacity: 1,
          },
        },
      },
      series: {
        point: {
          events: {
            click: (e) => {
              const currentX = e.point.x;
              selectSpectrumCloseTo(currentX);
            },
          },
        },
      },
    },
    series: [
      {
        type: "line",
        name: "vibration",
        color: colorGrey,
        data: overallTrend,
        enableMouseTracking: !variant.spectrumsOnTrend,
      },
      {
        type: "line",
        name: "spectrum",
        color: colorBlue,
        lineWidth: 0,
        data: spectrumTrend,
        color: "transparent",
        states: {
          hover: {
            lineWidth: 0,
          },
        },
        marker: {
          fillColor: colorBlue,
          radius: 3,
        },
        zIndex: 10,
      },
      createSingleCursorSerie(
        spectrumTrendRaw,
        [],
        {
          id: 1,
          color: colorBlue,
          x: spectrumTrend[spectrumTrend.length - 1].x,
          y: spectrumTrend[spectrumTrend.length - 1].y,
        },
        {
          xMin: overallTrend[0][0],
          xMax: overallTrend[overallTrend.length - 1][0],
          yMin: 0,
          yMax: dataMaxValues[variant.dataset].y,
        },
        { min: 0, max: dataMaxValues[variant.dataset].y * 0.9 },
        () =>
          `<svg width="23" height="17" xmlns="http://www.w3.org/2000/svg"><path d="m10.28 16.2 1.944-5.082 1.549 2.177 2.167-5.361 1.435 3.928L20 7.811l-1.375-.758-.842 1.3-1.767-4.836-2.64 6.529-1.587-2.232-1.386 3.626-3.14-9.64L4 10.777l1.519.47 1.66-4.57 3.102 9.523Z" fill="#0F58D6" fill-rule="evenodd"/></svg>`,
        "spectrum"
      ),
      createSingleCursorSerie(
        spectrumTrendRaw,
        [],
        {
          id: 1,
          color: colorBlue,
          x: spectrumTrend[spectrumTrend.length - 1].x,
          y: spectrumTrend[spectrumTrend.length - 1].y,
        },
        {
          xMin: overallTrend[0][0],
          xMax: overallTrend[overallTrend.length - 1][0],
          yMin: 0,
          yMax: dataMaxValues[variant.dataset].y,
        },
        { min: 0, max: dataMaxValues[variant.dataset].y },
        () =>
          `<svg width="24" height="17" xmlns="http://www.w3.org/2000/svg"><path d="m17.597 4.157.035-.01a.46.46 0 0 1 .056-.007l.038-.002.037.002a.52.52 0 0 1 .056.008l.035.009.032.01h.003l.019.01.012.004-.013-.005.016.007.029.015a.471.471 0 0 1 .212.25l.001.003.503 1.4.063.001c.259 0 .468.212.468.475 0 .262-.21.474-.468.474h-.352a.467.467 0 0 1-.449-.245l-.029-.065-.176-.49-.175.49h-.001l-.002.006-.009.023-.01.02.005-.01-.019.038a.394.394 0 0 1-.042.061l-.016.018a.371.371 0 0 1-.03.032l-.015.012a.36.36 0 0 1-.041.032l-.007.004a.344.344 0 0 1-.047.028c-.006.001-.01.003-.015.006a.324.324 0 0 1-.051.02h-.007a.436.436 0 0 1-.17.02h-1.619l-.021-.001-.006-.002h-.015l.002-.001-.036-.005a.58.58 0 0 1-.024-.005l-.04-.013a.617.617 0 0 1-.087-.041.46.46 0 0 1-.08-.061l-.019-.02a.598.598 0 0 1-.062-.085l-.016-.03-.004-.007-.004-.01.003.006-.012-.03.007.02-.008-.019-.002-.005v-.003l-.594-1.654-.594 1.654a.475.475 0 0 1-.084.146l-.006.006a.338.338 0 0 1-.04.041l-.008.006a.344.344 0 0 1-.042.033l-.013.008a.34.34 0 0 1-.064.034.36.36 0 0 1-.066.023l-.028.006a.52.52 0 0 1-.074.009H11.53a.47.47 0 0 1-.452-.35l-.994-2.772-.972 2.706 1.387 3.862h1.219l1.07-2.978a.469.469 0 0 1 .415-.311H13.257c.16.008.307.1.386.245l.03.066 1.068 2.978h1.102l.605-1.684a.474.474 0 0 1 .234-.315l.063-.028a.464.464 0 0 1 .109-.026l.02-.002a.02.02 0 0 1 .005 0h.062l.017.002a.472.472 0 0 1 .408.37l.605 1.683h.76c.26 0 .469.213.469.475s-.21.475-.468.475h-1.056a.467.467 0 0 1-.443-.246l-.029-.065-.297-.827-.277.775a.475.475 0 0 1-.226.302l-.011.006a.335.335 0 0 1-.046.022l-.018.006a.436.436 0 0 1-.083.022h-.003a.408.408 0 0 1-.104.005h-1.68a.462.462 0 0 1-.238-.04l-.014-.008a.308.308 0 0 1-.04-.02c-.006-.006-.013-.01-.02-.015a.383.383 0 0 1-.059-.048l-.012-.013a.385.385 0 0 1-.038-.044v-.002a.45.45 0 0 1-.078-.16l-.73-2.036-.726 2.023a.475.475 0 0 1-.172.266l-.012.009a.29.29 0 0 1-.035.023l-.023.013-.014.007-.015.007a.382.382 0 0 1-.042.017h-.006a.452.452 0 0 1-.183.022l-1.825-.001a.462.462 0 0 1-.272-.089.47.47 0 0 1-.145-.16l-.031-.07-1.115-3.103-.948 2.642L9.4 15.248h.848l1.291-3.596a.474.474 0 0 1 .282-.286.465.465 0 0 1 .571.22l.029.064 1.292 3.598h1.071l.8-2.225a.469.469 0 0 1 .421-.312h.052a.466.466 0 0 1 .392.245l.03.067.798 2.225 1.455.001c.258 0 .468.213.468.475s-.21.474-.468.474h-1.799l-.02-.001-.01-.002a.319.319 0 0 1-.05-.006l-.014-.004a.47.47 0 0 1-.347-.345l-.461-1.289-.48 1.335a.47.47 0 0 1-.238.266l-.01.004a.333.333 0 0 1-.05.02l-.014.004a.368.368 0 0 1-.051.012l-.015.002a.395.395 0 0 1-.053.004H13.365v-.001l-.01-.001H13.365l.009.001h-.011l-.009-.001h.003-.008l-.038-.003a.471.471 0 0 1-.382-.35l-.948-2.645-.965 2.69a.468.468 0 0 1-.477.31H9.077a.468.468 0 0 1-.413-.243l-.03-.07L7.17 11.81l-1.462 4.076a.466.466 0 0 1-.6.283.476.476 0 0 1-.28-.608l1.776-4.95a.484.484 0 0 1 .017-.057L8.173 6.23l.009-.022a.485.485 0 0 1 .014-.05l1.416-3.947a.473.473 0 0 1 .438-.412h.066a.473.473 0 0 1 .438.412l1.304 3.64h1.217l.91-2.537a.473.473 0 0 1 .226-.287l.063-.03a.463.463 0 0 1 .121-.026h.002a.38.38 0 0 1 .077 0h.005a.471.471 0 0 1 .406.336l.911 2.544h.987l.503-1.401a.476.476 0 0 1 .213-.253l.029-.016.015-.006-.012.005.012-.005.019-.008h.003a.47.47 0 0 1 .032-.011Z" fill="#0F58D6" fill-rule="nonzero"/></svg>`,
        "waterfall"
      ),
      //   createSingleCursorSerie(
      //     spectrumTrendRaw,
      //     [],
      //     {
      //       id: 1,
      //       color: colorBlue,
      //       x: spectrumTrend[100].x,
      //       y: spectrumTrend[100].y,
      //     },
      //     {
      //       xMin: overallTrend[0][0],
      //       xMax: overallTrend[overallTrend.length - 1][0],
      //       yMin: 0,
      //       yMax: dataMaxValues[variant.dataset].y,
      //     },
      //     { min: 0, max: dataMaxValues[variant.dataset].y * 0.9 },
      //     () =>
      //       `<svg width="23" height="17" xmlns="http://www.w3.org/2000/svg"><path d="m10.28 16.2 1.944-5.082 1.549 2.177 2.167-5.361 1.435 3.928L20 7.811l-1.375-.758-.842 1.3-1.767-4.836-2.64 6.529-1.587-2.232-1.386 3.626-3.14-9.64L4 10.777l1.519.47 1.66-4.57 3.102 9.523Z" fill="#0F58D6" fill-rule="evenodd"/></svg>`,
      //     "compare"
      //   ),
    ],
  });
}

init();

const selectSpectrumCloseTo = (xVal) => {
  const xyValues = getClosestPointBy(xVal, spectrumTrendRaw, []);
  setTimeout(() => {
    trendHighcharts.series[2].data[0].update({ x: xyValues.x }, true, false);
    trendHighcharts.series[2].data[1].update({ x: xyValues.x }, true, false);
  }, 1);
  let selectedPoints = trendHighcharts.series[spectrumSeriesIndex].data.filter(
    (point) => {
      let isSelected = point.marker.enabled;
      return isSelected;
    }
  );
  selectedPoints.forEach((selectedPoint) => {
    let isWaterfallSelected = selectedPoint.marker.lineWidth == 1;
    if (isWaterfallSelected) {
      selectedPoint.update(
        {
          marker: {
            lineWidth: 1,
            fillColor: "#fff",
            lineColor: colorBlue,
            enabled: true,
            radius: 5,
          },
        },
        false,
        true
      );
    } else {
      selectedPoint.update(
        {
          marker: {
            enabled: undefined,
            radius: undefined,
          },
        },
        false,
        true
      );
    }
  });
  let newSelectedPoint = trendHighcharts.series[spectrumSeriesIndex].data.find(
    (point) => point.x == xyValues.x
  );
  newSelectedPoint.update(
    {
      marker: {
        fillColor: undefined,
        lineWidth: newSelectedPoint.marker.lineWidth,
        lineColor: colorBlue,
        enabled: true,
        radius: 5,
      },
    },
    false,
    true
  );
};

const createSingleCursorSerie = (
  data, //: ChartXYData,
  compareData, //: ChartXYData,
  cursor, //: SingleCursor,
  extremes, //: { xMin: number; xMax: number; yMin: number; yMax: number },
  cursorYPositions, //: { min: number; max: number },
  labelFormatter, //: DataLabelsFormatterCallbackFunction,
  cursorType = "spectrum",
  dispatch = () => {} //: Dispatch<any>,
) => {
  return {
    type: "line",
    id: cursor.id,
    animation: false,
    name: "Single cursors",
    className: cursor.id,
    color: cursor.color,
    lineWidth: 1,
    cursor: "move",

    // yAxis: 1,
    // xAxis: 1,
    dragDrop: {
      draggableX: true,
      draggableY: false,
      dragMinX: extremes.xMin,
      dragMaxX: extremes.xMax,
      groupBy: "groupId",
    },
    point: {
      events: {
        click: () => {},
        dragStart: () => {},
        drag: (e) => {
          const series = e.target.series;
          const currentX = Object.values(e.newPoints)[0].newValues.x;
          const xyValues = getClosestPointBy(currentX, data, compareData);
          let compare = {};
          if (xyValues.y2) {
            compare = {
              y: xyValues.y2,
            };
          }

          if (cursorType == "spectrum") {
            let selectedPoints = trendHighcharts.series[
              spectrumSeriesIndex
            ].data.filter((point) => {
              let isSelected = point.marker.enabled;
              return isSelected;
            });
            selectedPoints.forEach((selectedPoint) => {
              let isWaterfallSelected = selectedPoint.marker.lineWidth == 1;
              if (isWaterfallSelected) {
                selectedPoint.update(
                  {
                    marker: {
                      lineWidth: 1,
                      fillColor: "#fff",
                      lineColor: colorBlue,
                      enabled: true,
                      radius: 5,
                    },
                  },
                  false,
                  true
                );
              } else {
                selectedPoint.update(
                  {
                    marker: {
                      enabled: undefined,
                      radius: undefined,
                    },
                  },
                  false,
                  true
                );
              }
            });

            let newSelectedPoint = trendHighcharts.series[
              spectrumSeriesIndex
            ].data.find((point) => point.x == xyValues.x);

            newSelectedPoint.update(
              {
                marker: {
                  fillColor: undefined,
                  lineWidth: newSelectedPoint.marker.lineWidth,
                  lineColor: colorBlue,
                  enabled: true,
                  radius: 5,
                },
              },
              false,
              true
            );
          } else if (cursorType == "waterfall") {
            let enabledPoints = trendHighcharts.series[
              spectrumSeriesIndex
            ].data.filter((point) => {
              let isSelected = point.marker.enabled;
              let isWaterfallSelected = point.marker.lineWidth == 1;
              return isSelected && isWaterfallSelected;
            });
            enabledPoints.forEach((enabledPoint) => {
              enabledPoint.update(
                {
                  marker: {
                    lineWidth: undefined,
                    fillColor: undefined,
                    lineColor: undefined,
                    enabled: undefined,
                    radius: undefined,
                  },
                },
                false,
                true
              );
            });
            let indexOfClosestPoint = trendHighcharts.series[
              spectrumSeriesIndex
            ].data.findIndex((point) => point.x == xyValues.x);
            for (var i = 0; i < 6; i++) {
              let point =
                trendHighcharts.series[spectrumSeriesIndex].data[
                  indexOfClosestPoint - i
                ];
              let isSelected = point.marker.enabled;
              if (isSelected) {
                point.update(
                  {
                    marker: {
                      fillColor: undefined,
                      lineWidth: point.marker.lineWidth,
                      lineColor: colorBlue,
                      enabled: true,
                      radius: 5,
                    },
                  },
                  false,
                  true
                );
              } else {
                point.update(
                  {
                    marker: {
                      lineWidth: 1,
                      fillColor: "#fff",
                      lineColor: colorBlue,
                      enabled: true,
                      radius: 5,
                    },
                  },
                  false,
                  true
                );
              }
            }
          }
        },
        drop: (e) => {
          const series = e.target.series;
          const currentX = Object.values(e.newPoints)[0].newValues.x;
          if (cursorType == "spectrum") {
            selectSpectrumCloseTo(currentX);
          }
        },
      },
    },
    events: {
      mouseOver: (e) => {},
    },
    stickyTracking: false,
    zIndex: 4,
    tooltip: {
      headerFormat: undefined,
      pointFormat: undefined,
      labelFormatter: undefined,
      enabled: false,
    },
    dataLabels: {
      zIndex: 3,
    },
    data: [
      {
        x: cursor.x,
        y: cursorYPositions.min,
        groupId: "singleCursor",
        marker: {
          radius: 0,
          states: {
            hover: {
              enabled: false,
            },
          },
        },
      },
      //   // Compare marker
      //   {
      //     x: cursor.x,
      //     y: cursor.y2 || cursorYPositions.min,
      //     groupId: "singleCursor",
      //     marker: {
      //       symbol: "circle",
      //       fillColor: "#fff",
      //       lineColor: cursor.color,
      //       lineWidth: 1,
      //       enabled: !!cursor.y2,
      //       radius: 0,
      //     },
      //   },
      //   // Main marker
      //   {
      //     x: cursor.x,
      //     y: cursor.y,
      //     groupId: "singleCursor",
      //     // dragDrop: {
      //     //     draggableX: false,
      //     // },
      //     marker: {
      //       symbol: "circle",
      //       enabled: false,
      //       radius: 0,
      //     },
      //     // states: {
      //     //   hover: {
      //     //     enabled: false,
      //     //   },
      //     // },
      //   },
      {
        x: cursor.x,
        y: cursorYPositions.max * 0.97,
        groupId: "singleCursor",
        // Invisible drag handle
        marker: {
          enabled: true,
          symbol: "square",
          radius: 36,
          states: {
            hover: {
              enabled: false,
            },
          },
        },
        color: "rgba(0,0,0,0)",
        dataLabels: {
          allowOverlap: true,
          useHTML: true,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderRadius: 2,
          padding: 1,
          borderColor: cursor.color,
          style: {
            pointerEvents: "none",
          },
          overflow: "allow",
          crop: false,
          enabled: true,
          formatter: labelFormatter,
          className: `${cursor.id}-data-label`,
        },
      },
    ],
  };
};

const getClosestPointBy = (
  xValue, //: number,
  data, //: ChartXYData,
  compareData, //: ChartXYData,
  offset //?: number,
) => {
  if (!data || !data.length) return { x: 0, y: 0 };
  const xIsGreaterThanMax = xValue > data[data.length - 1][0];
  const xIsLessThanZero = xValue < 0;
  let dataIndex = 0;
  if (xIsGreaterThanMax) dataIndex = data.length - 1;
  else if (xIsLessThanZero) dataIndex = 0;
  else
    dataIndex = getOffsetIndex(
      findClosestIndexBy(data, xValue, ([x]) => x),
      offset,
      data.length
    );

  if (compareData.length > 0) {
    const outOfBoundsCompareData =
      compareData.length > 0
        ? xValue > compareData[compareData.length - 1][0] || xValue < 0
        : false;
    const compareIndex = outOfBoundsCompareData
      ? 0
      : getOffsetIndex(
          findClosestIndexBy(compareData, xValue, ([x]) => x),
          offset,
          compareData.length
        );
    return {
      x: data[dataIndex][0],
      y: data[dataIndex][1],
      x2: compareData[compareIndex][0],
      y2: outOfBoundsCompareData ? 0 : compareData[compareIndex][1],
    };
  }
  return {
    x: data[dataIndex][0],
    y: data[dataIndex][1],
  };
};

/**
 * Helper function that returns an offset index.
 * @param index Current index
 * @param offset Offset
 * @param maxIndex Max allowed index
 * @returns The offseted index or the supplied index if out of range
 */
const getOffsetIndex = (
  index, //: number,
  offset, //: number | undefined,
  maxIndex //: number,
) => {
  const offsetIndex = (offset || 0) + index;
  if (offset !== undefined && offsetIndex >= 0 && offsetIndex < maxIndex) {
    return offsetIndex;
  }
  return index;
};

/**
 * Finds the closest index in a array by iterating the values
 * and comparing against a target value.
 * @param array Array of data to iterate over
 * @param target The target value in the data
 * @param callback Function that defines the value to compare against
 * @returns The index in the array that is closest to the target
 */
const findClosestIndexBy = (
  array, //: any[],
  target, //: number,
  callback //: (...args: any) => number = (x: number) => x,
) => {
  let startIndex = 0;
  let endIndex = array.length - 1;
  if (target <= callback(array[startIndex])) {
    return startIndex;
  } else if (target >= callback(array[endIndex])) {
    return endIndex;
  }
  while (startIndex <= endIndex) {
    const middleIndex = Math.floor((startIndex + endIndex) / 2);
    const middleValue = callback(array[middleIndex]);
    if (middleValue === target) {
      return middleIndex;
    } else if (middleValue < target) {
      if (
        middleIndex < array.length - 1 &&
        target < callback(array[middleIndex + 1])
      ) {
        return target - middleValue >= callback(array[middleIndex + 1]) - target
          ? middleIndex + 1
          : middleIndex;
      }

      startIndex = middleIndex + 1;
    } else if (middleValue > target) {
      if (middleIndex > 0 && target > callback(array[middleIndex - 1])) {
        return target - callback(array[middleIndex - 1]) >= middleValue - target
          ? middleIndex
          : middleIndex - 1;
      }

      endIndex = middleIndex - 1;
    }
  }

  return startIndex;
};
