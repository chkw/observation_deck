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

            var colorMappers = {};
            for (var i = 0; i < eventList.length; i++) {
                var eventId = eventList[i];
                var allowedValues = eventAlbum.getEvent(eventId).metadata.allowedValues;
                if (allowedValues == 'categoric') {
                    colorMappers[eventId] = d3.scale.category10();
                } else if (allowedValues == 'numeric') {
                    // 0-centered color mapper
                    colorMappers[eventId] = centeredRgbaColorMapper(true);
                } else {
                    // quantile color mapper
                    var vals = eventAlbum.getEvent(eventId).data.getValues(false);
                    // color scale
                    var colors = ["rgb(255,255,217)", "rgb(237,248,177)", "rgb(199,233,180)", "rgb(127,205,187)", "rgb(65,182,196)", "rgb(29,145,192)", "rgb(34,94,168)", "rgb(37,52,148)", "rgb(8,29,88)"];
                    var buckets = colors.length;
                    // TODO color scale goes from 0 to max
                    var colorScale = d3.scale.quantile().domain([0, buckets - 1, d3.max(vals, function(d) {
                        return parseFloat(d);
                    })]).range(colors);

                    colorMappers[eventId] = colorScale;
                }
            }

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
                var colorMapper = colorMappers[d['eventId']];
                var attributes = {
                    "stroke" : "#E6E6E6",
                    "stroke-width" : "2px",
                    "fill" : colorMapper(d['val'])
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

            window.onload = function() {
                console.log("Page loaded. Start onload.");

                // TODO context menu uses http://medialize.github.io/jQuery-contextMenu
                $(function() {
                    $.contextMenu({
                        // selector : ".axis",
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

                                    var axis = this[0].getAttribute("class").indexOf("axis") >= 0 ? true : false;
                                    if (axis) {
                                        axis = this[0].getAttribute("class").indexOf("rowLabel") >= 0 ? "row" : "column";
                                    } else {
                                        console.log("exit out because not a row or a column");
                                        return;
                                    }

                                    var sortType = "colSort";
                                    if (axis == "row") {
                                        // do nothing, colSort is the default.
                                    } else {
                                        sortType = "rowSort";
                                    }

                                    var sortSteps = null;
                                    if ( sortType in querySettings) {
                                        sortSteps = new sortingSteps(querySettings[sortType]["steps"]);
                                    } else {
                                        sortSteps = new sortingSteps();
                                    }
                                    sortSteps.addStep(textContent);
                                    querySettings[sortType] = sortSteps;

                                    loadNewSettings(querySettings);
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
            };
            // TODO end observation_deck
        }
    });
})(jQuery);
