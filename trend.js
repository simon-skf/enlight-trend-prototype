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
  // let spectrumResponse = await fetch(
  //   //"https://measurement-api.sandbox.iot.enlight.skf.com/nodes/7423d282-05cc-4d25-8e66-d91594b38d62/node-data/recent?from=2019-02-06T00%3A00%3A00.000Z&to=2019-02-20T00%3A00%3A00.000Z&offset=0&limit=100&content_type=SPECTRUM&exclude_coordinates=false"
  //   "spectrums.json"
  // );
  // let spectrums = await spectrumResponse.json();
  // console.log(spectrums);

  // let spectrumTrend = spectrums.data.map((dataPoint) => {
  //   let allValues = dataPoint.spectrum.coordinates.map(({ x, y }) => y);
  //   let overallValue =
  //     (allValues.reduce((sum, val) => sum + val, 0) /
  //       dataPoint.spectrum.coordinates.length) *
  //     4; //calculateHanning(allValues);
  //   return [new Date(dataPoint.createdAt).getTime(), overallValue];
  // });

  //"https://measurement-api.sandbox.iot.enlight.skf.com/nodes/7423d282-05cc-4d25-8e66-d91594b38d62/node-data/recent?content_type=DATA_POINT&limit=1000&offset=1000&resurrectable=false"
  let dataPointsSources = [
    "data_points_0.json",
    "data_points_1000.json",
    "data_points_2000.json",
    "data_points_3000.json",
    "data_points_4000.json",
    "data_points_5000.json",
  ];
  let overallTrend = [];
  for (var i = 0; i < dataPointsSources.length; i++) {
    let dataPointsResponse = await fetch(
      //"https://measurement-api.sandbox.iot.enlight.skf.com/nodes/7423d282-05cc-4d25-8e66-d91594b38d62/node-data/recent?content_type=DATA_POINT&limit=1000&offset=1000&resurrectable=false"
      dataPointsSources[i]
    );
    let dataPoints = await dataPointsResponse.json();

    let trendPart = dataPoints.data.map((point) => [
      point.dataPoint.coordinate.x,
      point.dataPoint.coordinate.y,
    ]);
    overallTrend.push(...trendPart);
  }
  overallTrend.sort((a, b) => a[0] - b[0]);

  let bandOverallsResponse = await fetch(
    //"https://measurement-api.sandbox.iot.enlight.skf.com/nodes/7423d282-05cc-4d25-8e66-d91594b38d62/band/overall?startFrequency=0&stopFrequency=1300&windowFunction=hanning&frequencyType=0"
    "band-overalls.json"
  );
  let bandOveralls = await bandOverallsResponse.json();

  let spectrumTrend = bandOveralls.trends
    .map((point) => {
      return [new Date(point.createdAt).getTime(), point.overallBand / 10];
    })
    .filter(
      (val) =>
        val[0] > overallTrend[0][0] &&
        val[0] < overallTrend[overallTrend.length - 1][0]
    );

  spectrumTrend.sort((a, b) => a[0] - b[0]);

  console.log(spectrumTrend.length);

  Highcharts.chart("container", {
    chart: {
      zoomType: "x",
    },
    xAxis: {
      type: "datetime",
    },
    yAxis: [
      {
        title: {
          text: "g",
        },
        top: "15%",
        height: "85%",
      },
      {
        height: "15%",
      },
    ],
    legend: {
      enabled: true,
    },
    tooltip: {
      enabled: true,
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
        },
      },
    },
    // plotOptions: {
    //   area: {
    //     fillColor: {
    //       linearGradient: {
    //         x1: 0,
    //         y1: 0,
    //         x2: 0,
    //         y2: 1,
    //       },
    //       stops: [
    //         [0, Highcharts.getOptions().colors[0]],
    //         [
    //           1,
    //           Highcharts.color(Highcharts.getOptions().colors[0])
    //             .setOpacity(0)
    //             .get("rgba"),
    //         ],
    //       ],
    //     },
    //     marker: {
    //       radius: 2,
    //     },
    //     lineWidth: 1,
    //     states: {
    //       hover: {
    //         lineWidth: 1,
    //       },
    //     },
    //     threshold: null,
    //   },
    // },

    series: [
      {
        type: "line",
        name: "vibration",
        data: overallTrend,
      },
      {
        type: "scatter",
        name: "spectrum",
        data: spectrumTrend,
      },
      {
        type: "flags",
        //yAxis: 1,
        shape: "squarepin",
        onSeries: "spectrum",
        align: "right",
        point: {
          events: {
            //drop: snapFlag
          },
        },
        dragDrop: {
          draggableX: true,
          draggableY: false,
        },
        data: [
          {
            x: spectrumTrend[spectrumTrend.length - 1][0],
            y: spectrumTrend[spectrumTrend.length - 1][1],
            title: "Selected spectrum",
            text: "1: test",
            snapto: "closest",
          },
        ],
      },
      createSingleCursorSerie(
        spectrumTrend,
        [],
        {
          id: 1,
          color: "blue",
          x: spectrumTrend[spectrumTrend.length - 1][0],
          y: spectrumTrend[spectrumTrend.length - 1][1],
        },
        {
          xMin: spectrumTrend[0][0],
          xMax: spectrumTrend[spectrumTrend.length - 1][0],
          yMin: 0,
          yMax: 0.5,
        },
        { min: 0, max: 0.8 },
        () => "Hello"
      ),
    ],
  });
}

init();

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

          // series.data[2].update({ x: xyValues.x, y: xyValues.y }, false, true);
          
          // updateContextMarkerOnDrag(CursorType.SingleCursor, e, currentX);
          // updatePositionsDebounced(currentX, xyValues.y, xyValues.y2);
        },
        drop: (e) => {
          const series = e.target.series;
          const currentX = Object.values(e.newPoints)[0].newValues.x;
          const xyValues = getClosestPointBy(currentX, data, compareData);
          console.log("Closest point:", xyValues);
          // console.log(series.data[2]);
          setTimeout(() => {
            series.data[0].update({ x: xyValues.x }, true, false);
            series.data[1].update({ x: xyValues.x }, true, false);
            series.data[2].update({ x: xyValues.x }, true, false);
            series.data[3].update({ x: xyValues.x }, true, false);
          }, 100);
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
      // Compare marker
      {
        x: cursor.x,
        y: cursor.y2 || cursorYPositions.min,
        groupId: "singleCursor",
        marker: {
          symbol: "circle",
          fillColor: "#fff",
          lineColor: cursor.color,
          lineWidth: 1,
          enabled: !!cursor.y2,
          radius: 4,
        },
      },
      // Main marker
      {
        x: cursor.x,
        y: cursor.y,
        groupId: "singleCursor",
        dragDrop: {
          draggableX: undefined
        },
        marker: {
          symbol: "circle",
          enabled: true,
          radius: 4,
        },
      },
      {
        x: cursor.x,
        y: cursorYPositions.max,
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
          backgroundColor: "#fff",
          borderWidth: 1,
          borderRadius: 2,
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
