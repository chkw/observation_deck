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
            config["rowClickback"] = function(d, i) {
                console.log("rowClickback: " + d);
            };

            config["columnClickback"] = function(d, i) {
                console.log("columnClickback: " + d);
            };

            config["cellClickback"] = function(d, i) {
                console.log("cellClickback: r" + d['eventId'] + " c" + d['id'] + " val:" + d['val']);
            };

            config["rowRightClickback"] = function(d, i) {
                console.log("rowRightClickback: " + d);
                d3.event.preventDefault();
            };

            config["columnRightClickback"] = function(d, i) {
                console.log("columnRightClickback: " + d);
                d3.event.preventDefault();
            };

            config["cellRightClickback"] = function(d, i) {
                console.log("cellRightClickback: r" + d['eventId'] + " c" + d['id'] + " val:" + d['val']);
                d3.event.preventDefault();
            };

            var thisElement = this[0];

            // get eventList
            var eventAlbum = config['eventAlbum'];
            var albumAsList = eventAlbum.getAllDataAsList();
            console.log('albumAsList:' + prettyJson(albumAsList));

            var album = eventAlbum['album'];

            var eventList = getKeys(album).sort();

            // map row names to row numbers
            var rowNames = eventList;

            var rowNameMapping = new Object();
            for (var i in rowNames) {
                var name = rowNames[i];
                rowNameMapping[name] = i;
            }

            // get column names and map to numbers
            var colNames = eventAlbum.getAllSampleIds();

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
            rowLabels.on("click", config["rowClickback"]);
            rowLabels.on("contextmenu", config["rowRightClickback"]);

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
            colLabels.on("click", config["columnClickback"]);
            colLabels.on("contextmenu", config["columnRightClickback"]);

            // TODO SVG elements for heatmap cells
            var dataList = eventAlbum.getAllDataAsList();
            var heatMap = svg.selectAll(".cell").data(dataList).enter().append(function(d) {
                var group = document.createElementNS(svgNamespaceUri, "g");
                group.setAttributeNS(null, "class", "cell");

                var x = (colNameMapping[d['id']] * gridSize);
                var y = (rowNameMapping[d['eventId']] * gridSize);
                var rx = 4;
                var ry = 4;
                var width = gridSize;
                var height = gridSize;
                var attributes = {
                    // "fill" : "lightgrey",
                    "class" : "bordered"
                };
                var type = d['eventId'];
                if ((type == null) || (d['val'] == null)) {
                    // final rectangle for null values
                    attributes["fill"] = "lightgrey";
                } else {
                    // background for icons
                    attributes["fill"] = "white";
                }
                group.appendChild(createSvgRectElement(x, y, rx, ry, width, height, attributes));

                // draw icons .. possibly multiple ones
                if ((type == null) || (d['val'] == null)) {
                    return group;
                }

                var x = (colNameMapping[d['id']] * gridSize);
                var y = (rowNameMapping[d['eventId']] * gridSize);
                var rx = 4;
                var ry = 4;
                var width = gridSize;
                var height = gridSize;
                var attributes = {
                    "stroke" : "#E6E6E6",
                    "stroke-width" : "2px",
                    "fill" : d3.scale.category10(d['val'])
                };
                // TODO colormapper not working
                group.appendChild(createSvgRectElement(x, y, rx, ry, width, height, attributes));

                return group;
            });

            // TODO heatmap click event
            heatMap.on("click", config["cellClickback"]).on("contextmenu", config["cellRightClickback"]);

            // heatmap titles
            heatMap.append("title").text(function(d) {
                var s = "r:" + d['eventId'] + "\n\nc:" + d['id'] + "\n\n" + d['val'];
                return s;
            });

            // TODO end observation_deck
        }
    });
})(jQuery);