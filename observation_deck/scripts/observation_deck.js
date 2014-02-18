/**
 * chrisw@soe.ucsc.edu
 * 23JAN14
 * observation_deck.js
 */

var svgNamespaceUri = 'http://www.w3.org/2000/svg';

// use with "xlink:href" for images in svg as in <http://www.w3.org/Graphics/SVG/WG/wiki/Href>
var xlinkUri = "http://www.w3.org/1999/xlink";

var countsUrl = "observation_deck/data/gene_count.tab";
var panelUrl = "observation_deck/data/gene.tab";

/*
 * Synchronous GET
 */
function getResponse(url) {
    var status = null;
    var xhr = null;
    xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.onload = function() {
        status = xhr.status;
        if (status != 200) {
            console.log("xhr status: " + status + " for " + url);
        }
    };
    xhr.send(null);
    var response = null;
    if (status == 200) {
        response = xhr.responseText;
    }
    return response;
}

/**
 * Get a pretty JSON.
 */
function prettyJson(object) {
    return JSON.stringify(object, null, '\t');
}

function getEventList(url) {
    var response = getResponse(url);
    var rows = response.trim().split("\n");
    return rows;
}

/**
 * get the JSON data to create a heatmapData object.
 */
function setObservationData(url) {
    var response = getResponse(url);
    var parsedResponse = d3.tsv.parse(response, function(d) {
        var event = d["#GENE"].trim();
        var rowData = new Array();
        for (var sample in d) {
            if (sample != "#GENE") {
                var value = d[sample].trim();
                var data = {
                    "sample" : sample.trim(),
                    "event" : event,
                    "value" : +value
                };
                rowData.push(data);
            }
        }
        return rowData;
    });

    var matrixData = new Array();
    for (var i in parsedResponse) {
        matrixData.push.apply(matrixData, parsedResponse[i]);
    }

    var settings = {
        "datatype" : "mutation",
        "rowFeature" : "event",
        "columnFeature" : "sample",
        "valueFeature" : "value",
        "nameFeature" : "sample",
        // "colorMapper" : function(d, i) {
        // color = "darkgrey";
        // if (d.toLowerCase() == "error") {
        // color = "red";
        // } else if (d.toLowerCase() == "pending") {
        // color = "goldenrod";
        // } else if (d.toLowerCase() == "ready") {
        // color = "green";
        // }
        // return color;
        // },
        "rowClickback" : function(d, i) {
            console.log("rowClickback: " + d);
        },
        "columnClickback" : function(d, i) {
            console.log("columnClickback: " + d);
        },
        "cellClickback" : function(d, i) {
            console.log("cellClickback: r" + d.getRow() + " c" + d.getColumn() + " name" + d.getName() + " val" + d.getValue());
        },
        "rowRightClickback" : function(d, i) {
            console.log("rowRightClickback: " + d);
            d3.event.preventDefault();
        },
        "columnRightClickback" : function(d, i) {
            console.log("columnRightClickback: " + d);
            d3.event.preventDefault();
        },
        "cellRightClickback" : function(d, i) {
            console.log("cellRightClickback: r" + d.getRow() + " c" + d.getColumn() + " name" + d.getName() + " val" + d.getValue());
            d3.event.preventDefault();
        }
    };

    var dataObj = new observationData();
    dataObj.addData(matrixData, settings);

    return dataObj;
}

/**
 * Settings = {"eventList":Array}
 * @param {Object} dataObj
 * @param {Object} settings
 */
function drawMatrix(dataObj, settings) {
    var eventList = null;
    if (("eventList" in settings) && (settings["eventList"] != null)) {
        eventList = settings["eventList"];
    } else {
        eventList = dataObj.getRowNames().sort();
    }
    dataObj.setRows(eventList);

    var queryObj = settings["querySettings"];

    // map column names to column numbers
    var colNames = null;
    if ("colSort" in queryObj) {
        colNames = dataObj.sortColumns(queryObj["colSort"], "mutation");
    } else {
        colNames = dataObj.getColumnNames();
    }

    if (("colSortReverse" in queryObj) && (queryObj["colSortReverse"] == true)) {
        colNames.reverse();
    }

    var colNameMapping = new Object();
    for (var i in colNames) {
        var name = colNames[i] + "QQ";
        colNameMapping[name] = i;
    }

    // map row names to row numbers
    var rowNames = eventList;

    var rowNameMapping = new Object();
    for (var i in rowNames) {
        var name = rowNames[i] + "QQ";
        rowNameMapping[name] = i;
    }

    var longestColumnName = lengthOfLongestString(dataObj.getColumnNames());
    var longestRowName = lengthOfLongestString(dataObj.getRowNames());

    var margin = {
        "top" : ((longestColumnName > 3) ? (9 * longestColumnName) : 30),
        "right" : 0,
        "bottom" : 0,
        "left" : ((longestRowName > 1) ? (8 * longestRowName) : 15)
    };

    // document.documentElement.clientWidth
    var fullWidth = document.documentElement.clientWidth;
    var width = fullWidth - margin.left - margin.right;
    var denom = (colNames.length > rowNames.length) ? colNames.length : rowNames.length;
    var gridSize = Math.floor(width / denom);

    // document.documentElement.clientHeight
    var fullHeight = (margin.top + margin.bottom) + (gridSize * rowNames.length);
    var height = fullHeight - margin.top - margin.bottom;

    var legendElementWidth = gridSize * 2;

    // SVG canvas
    var svg = d3.select("#chart").append("svg").attr({
        "width" : fullWidth,
        "height" : fullHeight,
        "viewBox" : "0 0 " + fullWidth + " " + fullHeight,
        "perserveAspectRatio" : "xMinYMin meet"
    }).append("g").attr({
        "transform" : "translate(" + margin.left + "," + margin.top + ")"
    });

    // row labels
    var translateX = -6;
    var translateY = gridSize / 1.5;
    var rowLabels = svg.selectAll(".rowLabel").data(rowNames).enter().append("text").text(function(d) {
        return d;
    }).attr({
        "x" : 0,
        "y" : function(d, i) {
            return i * gridSize;
        },
        "transform" : "translate(" + translateX + ", " + translateY + ")",
        "class" : function(d, i) {
            return "rowLabel mono axis unselectable";
        }
    }).style("text-anchor", "end");
    rowLabels.on("click", dataObj.getRowClickback());
    // rowLabels.on("contextmenu", dataObj.getRowRightClickback());

    // col labels
    var rotationDegrees = -90;
    translateX = Math.floor(gridSize / 5);
    translateY = -1 * Math.floor(gridSize / 3);
    var colLabels = svg.selectAll(".colLabel").data(colNames).enter().append("text").text(function(d) {
        return d;
    }).attr({
        "y" : function(d, i) {
            return (i + 1) * gridSize;
        },
        "x" : 0,
        "transform" : "rotate(" + rotationDegrees + ") translate(" + translateX + ", " + translateY + ")",
        "class" : function(d, i) {
            return "colLabel mono axis unselectable";
        }
    }).style("text-anchor", "start");
    colLabels.on("click", dataObj.getColumnClickback());
    colLabels.on("contextmenu", dataObj.getColumnRightClickback());

    // TODO SVG elements for heatmap cells
    var heatMap = svg.selectAll(".cell").data(dataObj.getData()).enter().append(function(d) {
        var group = document.createElementNS(svgNamespaceUri, "g");
        group.setAttributeNS(null, "class", "cell");

        var x = (colNameMapping[d.getColumn() + "QQ"] * gridSize);
        var y = (rowNameMapping[d.getRow() + "QQ"] * gridSize);
        var rx = 4;
        var ry = 4;
        var width = gridSize;
        var height = gridSize;
        var attributes = {
            // "fill" : "lightgrey",
            "class" : "bordered"
        };
        var type = d.getDatatype();
        if ((type == null) || (d.getValue() == null)) {
            // final rectangle for null values
            attributes["fill"] = "lightgrey";
        } else {
            // background for icons
            attributes["fill"] = "white";
        }
        group.appendChild(createSvgRectElement(x, y, rx, ry, width, height, attributes));

        // draw icons .. possibly multiple ones
        if ((type == null) || (d.getValue() == null)) {
            return group;
        }

        if ((type.toLowerCase() == "ring") || (type.toLowerCase() == "mutation")) {
            var cx = ((colNameMapping[d.getColumn() + "QQ"]) * gridSize) + (gridSize / 2);
            var cy = ((rowNameMapping[d.getRow() + "QQ"]) * gridSize) + (gridSize / 2);
            var r = gridSize / 4;

            var datatype = d.getDatatype();
            var colorMapper = dataObj.getColorMapper(datatype);

            var attributes = {
                "fill" : "none",
                "stroke" : colorMapper(d.getValue()),
                "stroke-width" : "2"
            };
            group.appendChild(createSvgRingElement(cx, cy, r, attributes));
        }

        if (type.toLowerCase() == "rectangle") {
            var x = (colNameMapping[d.getColumn() + "QQ"] * gridSize);
            var y = (rowNameMapping[d.getRow() + "QQ"] * gridSize);
            var rx = 4;
            var ry = 4;
            var width = gridSize;
            var height = gridSize;
            var attributes = {
                "stroke" : "#E6E6E6",
                "stroke-width" : "2px"
            };
            group.appendChild(createSvgRectElement(x, y, rx, ry, width, height, attributes));
        }

        if (type.toLowerCase() == "dot") {
            var cx = ((colNameMapping[d.getColumn() + "QQ"]) * gridSize) + (gridSize / 2);
            var cy = ((rowNameMapping[d.getRow() + "QQ"]) * gridSize) + (gridSize / 2);
            var r = gridSize / 4;
            group.appendChild(createSvgCircleElement(cx, cy, r));
        }

        if (type.toLowerCase() == "mutation") {
            var cx = ((colNameMapping[d.getColumn() + "QQ"]) * gridSize) + (gridSize / 2);
            var cy = ((rowNameMapping[d.getRow() + "QQ"]) * gridSize) + (gridSize / 2);
            var r = gridSize / 8;

            var datatype = d.getDatatype();
            var colorMapper = dataObj.getColorMapper(datatype);

            var attributes = {
                "fill" : colorMapper(d.getValue())
            };

            group.appendChild(createSvgCircleElement(cx, cy, r, attributes));
        }

        if (type.toLowerCase() == "image") {
            var url = "observation_deck/images/favicon.ico";
            var x = colNameMapping[d.getColumn() + "QQ"] * gridSize;
            var y = rowNameMapping[d.getRow() + "QQ"] * gridSize;
            var width = gridSize;
            var height = gridSize;
            group.appendChild(createSvgImageElement(url, x, y, width, height));
        }

        return group;
    });
    // heatMap.style("fill", "#ffffd9");
    // initial cell color

    // TODO heatmap click event
    heatMap.on("click", dataObj.getCellClickback()).on("contextmenu", dataObj.getCellRightClickback());

    // heatmap transition/animation
    // heatMap.transition().duration(1000).style("fill", function(d) {
    // if (d.getValue() == null) {
    // return "lightgrey";
    // } else {
    // var datatype = d.getDatatype();
    // var colorMapper = dataObj.getColorMapper(datatype);
    // return colorMapper(d.getValue());
    // }
    // });

    // heatmap titles
    heatMap.append("title").text(function(d) {
        return d.getName();
    });

    return svg;
}

function createSvgRingElement(cx, cy, r, attributes) {
    // https://stackoverflow.com/questions/5736398/how-to-calculate-the-svg-path-for-an-arc-of-a-circle
    // (rx ry x-axis-rotation large-arc-flag sweep-flag x y)+

    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x : centerX + (radius * Math.cos(angleInRadians)),
            y : centerY + (radius * Math.sin(angleInRadians))
        };
    }

    function describeArc(x, y, radius, startAngle, endAngle) {
        var start = polarToCartesian(x, y, radius, endAngle);
        var end = polarToCartesian(x, y, radius, startAngle);
        var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
        var d = ["M", start.x, start.y, "A", radius, radius, 0, arcSweep, 0, end.x, end.y].join(" ");
        return d;
    }

    // TODO somehow the circle becomes invisible if using 0 to 360 degrees
    var arcPath = describeArc(cx, cy, r, 0, 359.9);

    var e = document.createElementNS(svgNamespaceUri, "path");
    e.setAttributeNS(null, "d", arcPath);
    if (attributes != null) {
        for (var attribute in attributes) {
            e.setAttributeNS(null, attribute, attributes[attribute]);
        }
    }
    return e;
}

function createSvgCircleElement(cx, cy, r, attributes) {
    var e = document.createElementNS(svgNamespaceUri, "circle");
    e.setAttributeNS(null, "cx", cx);
    e.setAttributeNS(null, "cy", cy);
    e.setAttributeNS(null, 'r', r);
    if (attributes != null) {
        for (var attribute in attributes) {
            e.setAttributeNS(null, attribute, attributes[attribute]);
        }
    }
    return e;
}

function createSvgRectElement(x, y, rx, ry, width, height, attributes) {
    var e = document.createElementNS(svgNamespaceUri, "rect");
    e.setAttributeNS(null, "x", x);
    e.setAttributeNS(null, "y", y);
    e.setAttributeNS(null, "rx", rx);
    e.setAttributeNS(null, "ry", ry);
    e.setAttributeNS(null, "width", width);
    e.setAttributeNS(null, "height", height);
    if (attributes != null) {
        for (var attribute in attributes) {
            e.setAttributeNS(null, attribute, attributes[attribute]);
        }
    }
    return e;
}

function createSvgImageElement(imageUrl, x, y, width, height, attributes) {
    var e = document.createElementNS(svgNamespaceUri, "image");
    e.setAttributeNS(xlinkUri, "href", imageUrl);
    e.setAttributeNS(null, "x", x);
    e.setAttributeNS(null, "y", y);
    e.setAttributeNS(null, "width", width);
    e.setAttributeNS(null, "height", height);
    if (attributes != null) {
        for (var attribute in attributes) {
            e.setAttributeNS(null, attribute, attributes[attribute]);
        }
    }
    return e;
}

/**
 * Get an object with UrlQueryString data.
 */
function getQueryObj() {
    var result = {};
    var keyValuePairs = location.search.slice(1).split('&');

    keyValuePairs.forEach(function(keyValuePair) {
        keyValuePair = keyValuePair.split('=');
        result[keyValuePair[0]] = decodeURIComponent(keyValuePair[1]) || '';
    });

    return result;
}

var dataObj = null;

// TODO onload
window.onload = function() {
    console.log("Page loaded. Start onload.");

    var queryObj = getQueryObj();
    var querySettings = {};
    if ("query" in queryObj) {
        querySettings = JSON && JSON.parse(queryObj["query"]) || $.parseJSON(queryObj["query"]);
    }

    // TODO context menu uses http://medialize.github.io/jQuery-contextMenu
    $(function() {
        $.contextMenu({
            selector : ".rowLabel",
            callback : function(key, options) {
                // default callback
                var textContent = this[0].textContent;
                var axis = this[0].getAttribute("class").indexOf("axis") >= 0 ? true : false;
                if (axis) {
                    axis = this[0].getAttribute("class").indexOf("rowLabel") >= 0 ? "row" : "column";
                }
                console.log(key, textContent, axis);
            },
            items : {
                "test" : {
                    name : "test",
                    icon : null,
                    disabled : false,
                    callback : function(key, opt) {
                        var textContent = this[0].textContent;
                        console.log(key, textContent);
                        console.log("href", window.location.href);
                        console.log("host", window.location.host);
                        console.log("pathname", window.location.pathname);
                        console.log("search", window.location.search);
                    }
                },
                "sort" : {
                    name : "sort",
                    icon : null,
                    disabled : false,
                    callback : function(key, opt) {
                        var textContent = this[0].textContent;
                        if (("colSort" in querySettings) && (querySettings["colSort"] == textContent)) {
                            // same row got clicked
                            console.log(textContent + " got clicked again");
                            if (!"colSortReverse" in querySettings) {
                                querySettings["colSortReverse"] = true;
                            } else {
                                querySettings["colSortReverse"] = !querySettings["colSortReverse"];
                            }
                        } else {
                            // different row got clicked
                            delete querySettings["colSortReverse"];
                        }
                        querySettings["colSort"] = textContent;
                        var url = window.location.pathname + "?query=" + JSON.stringify(querySettings);
                        window.open(url, "_self");
                    }
                },
                "sep1" : "---------",
                "expand" : {
                    name : "expand",
                    icon : null,
                    disabled : true
                },
                "collapse" : {
                    name : "collapse",
                    icon : null,
                    disabled : true
                },
                "reset" : {
                    name : "reset",
                    icon : null,
                    disabled : false,
                    callback : function(key, opt) {
                        var url = window.location.pathname;
                        window.open(url, "_self");
                    }
                }
            }
        });
    });

    // GET DATA

    dataObj = setObservationData(countsUrl);

    var settings = {
        "eventList" : getEventList(panelUrl),
        // "eventList" : ["TP53", "aaa", "EGFR"],
    };

    settings["querySettings"] = querySettings;

    // DRAWING

    var heatmapSvg = drawMatrix(dataObj, settings);
};
