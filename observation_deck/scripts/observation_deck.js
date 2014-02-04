/**
 * chrisw@soe.ucsc.edu
 * 23JAN14
 * observation_deck.js
 */

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
        }
    };

    var dataObj = new heatmapData(matrixData, settings);
    dataObj.setQuantileColorMapper();

    return dataObj;
}

// TODO onload
window.onload = function() {
    console.log("Page loaded. Start onload.");

    var dataObj = setObservationData(countsUrl);

    var colNames = dataObj.getColumnNames().sort();

    var colNameMapping = new Object();
    for (var i in colNames) {
        var name = colNames[i] + "QQ";
        colNameMapping[name] = i;
    }

    var rowNames = dataObj.getRowNames().sort();

    var rowNameMapping = new Object();
    for (var i in rowNames) {
        var name = rowNames[i] + "QQ";
        rowNameMapping[name] = i;
    }

    // dataObj.setQuantileColorMapper();

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
    }).style("text-anchor", "end").on("click", dataObj.getRowClickback()).on("contextmenu", function(d, i) {
        console.log("right-clicked row name: " + d);
        d3.event.preventDefault();
    });

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
    }).style("text-anchor", "start").on("click", dataObj.getColumnClickback()).on("contextmenu", function(d, i) {
        console.log("right-clicked column name: " + d);
        d3.event.preventDefault();
    });

    // heatmap SVG elements
    var heatMap = svg.selectAll(".hour").data(dataObj.getData()).enter().append("rect").attr({
        "x" : function(d) {
            var colName = d.getColumn();
            var colNum = colNameMapping[d.getColumn() + "QQ"];
            var val = colNum * gridSize;
            return val;
        },
        "y" : function(d) {
            return (rowNameMapping[d.getRow() + "QQ"]) * gridSize;
        },
        "rx" : 4,
        "ry" : 4,
        "class" : "hour bordered",
        "width" : gridSize,
        "height" : gridSize
    }).style("fill", "#ffffd9");

    // TODO heatmap click event
    heatMap.on("click", dataObj.getCellClickback()).on("contextmenu", function(d, i) {
        console.log("right-clicked cell: r" + d.getRow() + " c" + d.getColumn() + " name" + d.getName() + " val" + d.getValue());
        d3.event.preventDefault();
    });

    // heatmap transition/animation
    heatMap.transition().duration(1000).style("fill", function(d) {
        return dataObj.getColorMapper()(d.getValue());
    });

    // heatmap titles
    heatMap.append("title").text(function(d) {
        return d.getName();
    });
};
