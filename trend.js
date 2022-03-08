let trendHighcharts = undefined;
let overallTrendRaw = undefined;
let spectrumTrendRaw = undefined;

let variant = {
  dataset: 1,
  spectrumsOnTrend: true,
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
          let fromResetZoomButton = e.isTrusted; // Should be changed to something else.
          if (fromResetZoomButton) {
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
      max: dataMaxValues[variant.dataset].y
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
      borderColor: "#676F7C",
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
        // if (this.series.name == spectrum) {
        // console.log(this);
        let dateFormatOptions = {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        };
        let xyPoint = getClosestPointBy(this.x, overallTrend, []);
        return `<b>${new Date(this.x).toLocaleString(
          "sv-SE",
          dateFormatOptions
        )}</b><br/>${xyPoint.y.toPrecision(5)} g<br/>`;
      },
      positioner: (labelWidth, labelHeight, point) => {
        // console.log(labelWidth, labelHeight, point);
        return { x: point.plotX + labelWidth-20, y: 40 };
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
        color: "#676F7C",
        data: overallTrend,
        enableMouseTracking: !variant.spectrumsOnTrend,
      },
      {
        type: "line",
        name: "spectrum",
        color: "#0F58D6",
        lineWidth: 0,
        data: spectrumTrend,
        color: "transparent",
        states: {
          hover: {
            lineWidth: 0,
          },
        },
        marker: {
          fillColor: "#0F58D6",
          radius: 3,
        },
      },
      createSingleCursorSerie(
        spectrumTrendRaw,
        [],
        {
          id: 1,
          color: "#0F58D6",
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
        () => `<svg width="23" height="17" xmlns="http://www.w3.org/2000/svg"><path d="m10.28 16.2 1.944-5.082 1.549 2.177 2.167-5.361 1.435 3.928L20 7.811l-1.375-.758-.842 1.3-1.767-4.836-2.64 6.529-1.587-2.232-1.386 3.626-3.14-9.64L4 10.777l1.519.47 1.66-4.57 3.102 9.523Z" fill="#0F58D6" fill-rule="evenodd"/></svg>`
      ),
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
  let enabledPoint = trendHighcharts.series[1].data.find(
    (point) => point.marker.enabled
  );

  enabledPoint
    ? enabledPoint.update(
        {
          marker: {
            enabled: undefined,
            radius: undefined,
          },
        },
        false,
        true
      )
    : undefined;
  trendHighcharts.series[1].data
    .find((point) => point.x == xyValues.x)
    .update(
      {
        marker: {
          enabled: true,
          radius: 6,
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
  dispatch = () => {} //: Dispatch<any>,
) => {
  const updatePositionsDebounced = () => {};
  const setActiveCursorDebounced = () => {};
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
        click: () => {
          // setActiveCursorDebounced();
          // dispatch(setAnyCursorDragged(false));
        },
        dragStart: () => {
          // dispatch(setAnyCursorDragged(true));
        },
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
          //   series.setData([{}, compare, { y: xyValues.y }, {}], false);

          let enabledPoint = trendHighcharts.series[1].data.find(
            (point) => point.marker.enabled
          );

          enabledPoint
            ? enabledPoint.update(
                {
                  marker: {
                    enabled: undefined,
                    radius: undefined,
                  },
                },
                false,
                true
              )
            : undefined;
          trendHighcharts.series[1].data
            .find((point) => point.x == xyValues.x)
            .update(
              {
                marker: {
                  enabled: true,
                  radius: 6,
                },
              },
              false,
              true
            );
          // series.data[2].update({ x: xyValues.x, y: xyValues.y }, false, true);

          // updateContextMarkerOnDrag(CursorType.SingleCursor, e, currentX);
          // updatePositionsDebounced(currentX, xyValues.y, xyValues.y2);
        },
        drop: (e) => {
          const series = e.target.series;
          const currentX = Object.values(e.newPoints)[0].newValues.x;
          selectSpectrumCloseTo(currentX);
          //   const xyValues = getClosestPointBy(currentX, data, compareData);
          //   console.log("Closest point:", xyValues);
          //   // console.log(series.data[2]);
          //   setTimeout(() => {
          //     series.data[0].update({ x: xyValues.x }, true, false);
          //     series.data[1].update({ x: xyValues.x }, true, false);
          //     // series.data[2].update({ x: xyValues.x }, true, false);
          //     // series.data[3].update({ x: xyValues.x }, true, false);
          //   }, 1);

          // console.log(series.data[2]);
          // series.setData([{}, {}, series.data[2], {}], false);
          // console.log(series.data[2]);
          // setTimeout(() => {
          //   console.log(series.data[2]);
          //   series.setData(
          //     [{}, {}, { ...series.data[2] }, {}],
          //     false
          //   );
          //   console.log(series.data[2]);
          // }, 100);
          //Object.values(e.newPoints)[0].newValues.x = xyValues.x;
          // setActiveCursorDebounced();
          // dispatch(setAnyCursorDragged(false));
        },
      },
    },
    events: {
      mouseOver: (e) => {
        // const { chartState } = getState();
        // const { anyCursorDragged } = chartState;
        // const series = e.target;
        // if (anyCursorDragged || series.options.dataLabels.zIndex === 4) return;
        // series.update({ dataLabels: { zIndex: 4 } }, true);
        // const lastSeries = series.chart.series.find(
        //   (serie) =>
        //     serie.name === SINGLE_CURSORS_NAME &&
        //     serie.options.dataLabels.zIndex === 4,
        // );
        // if (lastSeries) lastSeries.update({ dataLabels: { zIndex: 3 } }, false);
      },
    },
    stickyTracking: false,
    zIndex: 4,
    tooltip: {
      headerFormat: undefined,
      pointFormat: undefined,
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
        y: cursorYPositions.max*0.97,
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
  const outOfBoundsData = xValue > data[data.length - 1][0] || xValue < 0;
  const dataIndex = outOfBoundsData
    ? 0
    : getOffsetIndex(
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
      y: outOfBoundsData ? 0 : data[dataIndex][1],
      x2: compareData[compareIndex][0],
      y2: outOfBoundsCompareData ? 0 : compareData[compareIndex][1],
    };
  }
  return {
    x: data[dataIndex][0],
    y: outOfBoundsData ? 0 : data[dataIndex][1],
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
