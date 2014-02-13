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

    // map column names to column numbers
    var colNames = dataObj.getColumnNames();
    // var colNames = dataObj.sortColumns("TP53", "mutation").reverse();

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
            return "rowLabel mono axis axis-row";
        }
    }).style("text-anchor", "end").on("click", dataObj.getRowClickback()).on("contextmenu", dataObj.getRowRightClickback());

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
            return "colLabel mono axis axis-col";
        }
    }).style("text-anchor", "start").on("click", dataObj.getColumnClickback()).on("contextmenu", dataObj.getColumnRightClickback());

    // heatmap SVG elements
    var heatMap = svg.selectAll(".cell").data(dataObj.getData()).enter().append("g").append(function(d) {
        var type = d.getDatatype();
        if (type == null) {
            var x = (colNameMapping[d.getColumn() + "QQ"] * gridSize);
            var y = (rowNameMapping[d.getRow() + "QQ"] * gridSize);
            var rx = 4;
            var ry = 4;
            var width = gridSize;
            var height = gridSize;
            var style = "cursor: pointer; stroke: #E6E6E6; stroke-width: 2px";
            var e = createSvgRectElement(x, y, rx, ry, width, height, style);
            return e;
        } else if (type.toLowerCase() == "dot") {
            var cx = ((colNameMapping[d.getColumn() + "QQ"]) * gridSize) + (gridSize / 2);
            var cy = ((rowNameMapping[d.getRow() + "QQ"]) * gridSize) + (gridSize / 2);
            var r = gridSize / 4;
            var e = createSvgCircleElement(cx, cy, r, style);
            return e;
        } else if (type.toLowerCase() == "mutation") {
            var cx = ((colNameMapping[d.getColumn() + "QQ"]) * gridSize) + (gridSize / 2);
            var cy = ((rowNameMapping[d.getRow() + "QQ"]) * gridSize) + (gridSize / 2);
            var r = gridSize / 4;
            var e = createSvgCircleElement(cx, cy, r, style);
            return e;
        } else {
            var url = "observation_deck/images/favicon.ico";
            var x = colNameMapping[d.getColumn() + "QQ"] * gridSize;
            var y = rowNameMapping[d.getRow() + "QQ"] * gridSize;
            var width = gridSize;
            var height = gridSize;
            var e = createImageElement(url, x, y, width, height);
            return e;
        }
    }).style("fill", "#ffffd9");
    // initial cell color

    // TODO heatmap click event
    heatMap.on("click", dataObj.getCellClickback()).on("contextmenu", dataObj.getCellRightClickback());

    // heatmap transition/animation
    heatMap.transition().duration(1000).style("fill", function(d) {
        if (d.getValue() == null) {
            return "lightgrey";
        } else {
            var datatype = d.getDatatype();
            var colorMapper = dataObj.getColorMapper(datatype);
            return colorMapper(d.getValue());
        }
    });

    // heatmap titles
    heatMap.append("title").text(function(d) {
        return d.getName();
    });

    return svg;
}

function createSvgCircleElement(cx, cy, r, style) {
    var e = document.createElementNS(svgNamespaceUri, "circle");
    e.setAttributeNS(null, "cx", cx);
    e.setAttributeNS(null, "cy", cy);
    e.setAttributeNS(null, 'r', r);
    if (style != null) {
        e.setAttributeNS(null, "style", style);
    }
    return e;
}

function createSvgRectElement(x, y, rx, ry, width, height, style) {
    var e = document.createElementNS(svgNamespaceUri, "rect");
    e.setAttributeNS(null, "x", x);
    e.setAttributeNS(null, "y", y);
    e.setAttributeNS(null, "rx", rx);
    e.setAttributeNS(null, "ry", ry);
    e.setAttributeNS(null, "width", width);
    e.setAttributeNS(null, "height", height);
    if (style != null) {
        e.setAttributeNS(null, "style", style);
    }
    return e;
}

function createImageElement(imageUrl, x, y, width, height, style) {
    var e = document.createElementNS(svgNamespaceUri, "image");
    e.setAttributeNS(xlinkUri, "href", imageUrl);
    e.setAttributeNS(null, "x", x);
    e.setAttributeNS(null, "y", y);
    e.setAttributeNS(null, "width", width);
    e.setAttributeNS(null, "height", height);
    if (style != null) {
        e.setAttributeNS(null, "style", style);
    }
    return e;
}

// TODO onload
window.onload = function() {
    console.log("Page loaded. Start onload.");

    // GET DATA

    var dataObj = setObservationData(countsUrl);

    var settings = {
        "eventList" : getEventList(panelUrl),
        // "eventList" : ["TP53", "aaa", "EGFR"],
    };

    // DRAWING

    var heatmapSvg = drawMatrix(dataObj, settings);
    console.log(heatmapSvg);
};
