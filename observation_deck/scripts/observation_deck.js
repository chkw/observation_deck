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
    var xhr = null;
    xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.onload = function() {
        var status = xhr.status;
        if (status != 200) {
            console.log("xhr error: " + status);
        }
    };
    xhr.send(null);
    var response = xhr.responseText;

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
        "nameFeature" : "sample"
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

    var top = (longestColumnName > 3) ? (9 * longestColumnName) : 30;
    var right = 0;
    var bottom = 0;
    var left = (longestRowName > 1) ? (8 * longestRowName) : 15;

    var margin = {
        "top" : top,
        "right" : right,
        "bottom" : bottom,
        "left" : left
    };

    // document.documentElement.clientWidth
    var fullWidth = document.documentElement.clientWidth;
    // document.documentElement.clientHeight
    var fullHeight = document.documentElement.clientHeight;
    var width = fullWidth - margin.left - margin.right;
    var height = fullHeight - margin.top - margin.bottom;
    var denom = (colNames.length > rowNames.length) ? colNames.length : rowNames.length;
    var gridSize = Math.floor(width / denom);
    var legendElementWidth = gridSize * 2;

    // SVG canvas
    var svg = d3.select("#chart").append("svg").attr({
        "width" : fullWidth,
        "height" : fullHeight
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
    }).style("text-anchor", "end").on("click", function(d) {
        console.log("clicked row name: " + d);
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
    }).style("text-anchor", "start").on("click", function(d) {
        console.log("clicked column name: " + d);
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
    heatMap.on("click", function(d, i) {
        console.log("clicked cell: r" + d.getRow() + " c" + d.getColumn() + " name" + d.getName() + " val" + d.getValue());
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
