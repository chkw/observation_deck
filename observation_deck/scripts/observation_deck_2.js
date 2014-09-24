/**
 * chrisw@soe.ucsc.edu
 * SEPT 2014
 * observation_deck_2.js
 */

(function($) {
    // extend the jQuery prototype
    $.fn.extend({
        test : function() {
            return $(this).bind('click', function() {
                alert('Custom plugin click!');
            });
        },
        observation_deck : function(config) {
            // TODO begin observation_deck

            var thisElement = this[0];

            // get eventList
            var eventAlbum = config['eventAlbum'];
            var album = eventAlbum['album'];
            console.log('album:' + prettyJson(album));

            var eventList = getKeys(album).sort();
            console.log('eventList:' + prettyJson(eventList));

            // map row names to row numbers
            var rowNames = eventList;

            var rowNameMapping = new Object();
            for (var i in rowNames) {
                var name = rowNames[i];
                rowNameMapping[name] = i;
            }

            console.log(prettyJson(rowNameMapping));

            // get column names and map to numbers
            var colNames = eventAlbum.getAllSampleIds();
            console.log('colNames:' + prettyJson(colNames));

            var colNameMapping = new Object();
            for (var i in colNames) {
                var name = colNames[i];
                colNameMapping[name] = i;
            }

            // setup margins

            var longestColumnName = lengthOfLongestString(colNames);
            var longestRowName = lengthOfLongestString(rowNames);

            var margin = {
                "top" : ((longestColumnName > 3) ? (9 * longestColumnName) : 30),
                "right" : 0,
                "bottom" : 0,
                "left" : ((longestRowName > 1) ? (8 * longestRowName) : 15)
            };

            console.log('margin:' + prettyJson(margin));

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
            var svg = d3.select(thisElement).append("svg").attr({
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
            // rowLabels.on("click", dataObj.getRowClickback());
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
            // colLabels.on("click", dataObj.getColumnClickback());
            // colLabels.on("contextmenu", dataObj.getColumnRightClickback());

            // TODO end observation_deck
        }
    });
})(jQuery);

/**
 * Settings = {"eventList":Array}
 * @param {Object} dataObj
 * @param {Object} settings
 */
function drawMatrix(dataObj, settings) {

    // testing transpose
    // dataObj.transpose();

    var eventList = null;
    if (("eventList" in settings) && (settings["eventList"] != null)) {
        eventList = settings["eventList"];
    } else {
        eventList = dataObj.getRowNames().sort();
    }
    dataObj.setRows(eventList);

    var queryObj = settings["querySettings"];

    // map row names to row numbers
    var rowNames = eventList;

    rowNames = null;
    if ("rowSort" in queryObj) {
        var sortSteps = new sortingSteps(queryObj["rowSort"]["steps"]);
        rowNames = dataObj.multiSortRows(sortSteps);
    } else {
        rowNames = dataObj.getRowNames();
    }

    var rowNameMapping = new Object();
    for (var i in rowNames) {
        var name = rowNames[i] + "QQ";
        rowNameMapping[name] = i;
    }

    // map column names to column numbers
    var colNames = null;
    if ("colSort" in queryObj) {
        var sortSteps = new sortingSteps(queryObj["colSort"]["steps"]);
        colNames = dataObj.multiSortColumns(sortSteps);
    } else {
        colNames = dataObj.getColumnNames();
    }

    var colNameMapping = new Object();
    for (var i in colNames) {
        var name = colNames[i] + "QQ";
        colNameMapping[name] = i;
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

        if ((type.toLowerCase() == "ring") || (type.toLowerCase() == "signature")) {
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

        if ((type.toLowerCase() == "grouping")) {
            var x = (colNameMapping[d.getColumn() + "QQ"] * gridSize);
            var y = (rowNameMapping[d.getRow() + "QQ"] * gridSize);
            var rx = 4;
            var ry = 4;
            var width = gridSize;
            var height = gridSize;

            var datatype = d.getDatatype();
            var colorMapper = dataObj.getColorMapper(datatype);

            var attributes = {
                "stroke" : "#E6E6E6",
                "fill" : colorMapper(d.getValue()),
                "stroke-width" : "2px"
            };
            group.appendChild(createSvgRectElement(x, y, rx, ry, width, height, attributes));
        }

        if ((type.toLowerCase() == "rectangle") || (type.toLowerCase() == "unspecified")) {
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
        var s = "r:" + d.getRow() + "\n\nc:" + d.getColumn() + "\n\n" + d.getDatatype() + ":" + d.getValue();
        return s;
    });

    return svg;
}