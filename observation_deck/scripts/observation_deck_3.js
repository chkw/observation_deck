/**
 * chrisw@soe.ucsc.edu
 * OCT 2014
 * observation_deck_3.js
 *
 * This time, avoid using jQuery prototype.
 *
 * requirements:
 * 1) jQuery <https://jquery.com/> ... for jQuery-contextMenu
 * 2) D3.js <http://d3js.org/>
 * 3) jQuery-contextMenu <https://medialize.github.io/jQuery-contextMenu/>
 * 4) jStat
 * 5) static.js
 * 6) OD_eventData.js
 */

/**
 *  Build an observation deck!
 */
buildObservationDeck = function(containerDivElem, config) {
    // console.log('buildObservationDeck');
    config = getConfiguration(config);

    config['containerDivId'] = containerDivElem.id;

    drawMatrix(containerDivElem, config);

    // set up context menu should follow matrix drawing
    setupContextMenus(config);
};

/**
 *
 */
getConfiguration = function(config) {
    // look for od_config in cookies
    var querySettings = parseJson(getCookie('od_config')) || {};
    config['querySettings'] = querySettings;

    var OD_eventAlbum = null;
    if ('eventAlbum' in config) {
        OD_eventAlbum = config['eventAlbum'];
    } else {
        OD_eventAlbum = new OD_eventMetadataAlbum();
        config['eventAlbum'] = OD_eventAlbum;
    }

    if ('clinicalUrl' in config) {
        getClinicalData(config['clinicalUrl'], OD_eventAlbum);
    }

    if ('expressionUrl' in config) {
        getExpressionData(config['expressionUrl'], OD_eventAlbum);
    }

    if ('mutationUrl' in config) {
        getMutationData(config['mutationUrl'], OD_eventAlbum);
    }

    if ('mongoData' in config) {
        var mongoData = config['mongoData'];
        if ('clinical' in mongoData) {
            mongoClinicalData(mongoData['clinical'], OD_eventAlbum);
        }

        if ('expression' in mongoData) {
            mongoExpressionData(mongoData['expression'], OD_eventAlbum);
        }
    }

    return config;
};

/*
 *
 */
setupContextMenus = function(config) {
    // config['querySettings']
    setupColLabelContextMenu(config);
    setupRowLabelContextMenu(config);
    setupCategoricCellContextMenu(config);
    setupExpressionCellContextMenu(config);

};

/**
 * delete cookie and reset config
 */
resetConfig = function(config) {
    deleteCookie('od_config');
    var keys = getKeys(config);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (isObjInArray(['mongoData', 'containerDivId'], key)) {
            continue;
        } else {
            delete config[key];
        }
    }
};

setupColLabelContextMenu = function(config) {
    $.contextMenu({
        // selector : ".axis",
        selector : ".colLabel",
        callback : function(key, options) {
            // default callback
            var eventId = this[0].__data__;
            var axis = this[0].getAttribute("class").indexOf("axis") >= 0 ? true : false;
            if (axis) {
                axis = this[0].getAttribute("class").indexOf("rowLabel") >= 0 ? "row" : "column";
            }
            console.log(key, eventId, axis);
        },
        items : {
            "reset" : {
                name : "reset",
                icon : null,
                disabled : false,
                callback : function(key, opt) {
                    resetConfig(config);
                    // var url = window.location.pathname;
                    // window.open(url, "_self");
                    var containerDivElem = document.getElementById(config['containerDivId']);
                    buildObservationDeck(containerDivElem, config);
                }
            }
        }
    });
};

/**
 *context menu uses http://medialize.github.io/jQuery-contextMenu
 */
setupRowLabelContextMenu = function(config) {
    $.contextMenu({
        // selector : ".axis",
        selector : ".rowLabel",
        callback : function(key, options) {
            // default callback
            var eventId = this[0].__data__;
            var axis = this[0].getAttribute("class").indexOf("axis") >= 0 ? true : false;
            if (axis) {
                axis = this[0].getAttribute("class").indexOf("rowLabel") >= 0 ? "row" : "column";
            }
            console.log(key, eventId, axis);
        },
        items : {
            // "test" : {
            // name : "test",
            // icon : null,
            // disabled : false,
            // callback : function(key, opt) {
            // console.log('key', key);
            // console.log('opt', opt);
            // console.log('this[0].__data__', this[0].__data__);
            // console.log('this[0].textContent', this[0].textContent);
            // console.log("href", window.location.href);
            // console.log("host", window.location.host);
            // console.log("pathname", window.location.pathname);
            // console.log("search", window.location.search);
            // }
            // },

            "sort" : {
                name : "sort",
                icon : null,
                disabled : false,
                callback : function(key, opt) {
                    var eventId = this[0].__data__;

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
                    var querySettings = config['querySettings'];
                    if ( sortType in querySettings) {
                        sortSteps = new sortingSteps(querySettings[sortType]["steps"]);
                    } else {
                        sortSteps = new sortingSteps();
                    }
                    sortSteps.addStep(eventId);
                    querySettings[sortType] = sortSteps;

                    setCookie('od_config', JSON.stringify(querySettings));

                    var containerDivElem = document.getElementById(config['containerDivId']);
                    buildObservationDeck(containerDivElem, config);
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
                    resetConfig(config);

                    var containerDivElem = document.getElementById(config['containerDivId']);
                    buildObservationDeck(containerDivElem, config);
                }
            }
        }
    });
};

/**
 * context menu uses http://medialize.github.io/jQuery-contextMenu
 */
setupExpressionCellContextMenu = function(config) {
    $.contextMenu({
        // selector : ".axis",
        selector : ".mrna_exp",
        callback : function(key, options) {
            // default callback
            var cellElem = this[0];
        },
        items : {
            "eventwise median rescaling" : {
                name : "eventwise median rescaling",
                icon : null,
                disabled : false,
                callback : function(key, opt) {
                    // settings for rescaling
                    var querySettings = config['querySettings'];
                    querySettings['expression rescaling'] = {
                        'method' : 'eventwiseMedianRescaling'
                    };

                    setCookie('od_config', JSON.stringify(querySettings));

                    var containerDivElem = document.getElementById(config['containerDivId']);
                    buildObservationDeck(containerDivElem, config);
                }
            },
            "eventwise z-score rescaling" : {
                name : "eventwise z-score rescaling",
                icon : null,
                disabled : false,
                callback : function(key, opt) {
                    // settings for rescaling
                    var querySettings = config['querySettings'];
                    querySettings['expression rescaling'] = {
                        'method' : 'zScoreExpressionRescaling'
                    };

                    setCookie('od_config', JSON.stringify(querySettings));

                    var containerDivElem = document.getElementById(config['containerDivId']);
                    buildObservationDeck(containerDivElem, config);
                }
            },
            "sep1" : "---------",
            "reset" : {
                name : "reset",
                icon : null,
                disabled : false,
                callback : function(key, opt) {
                    resetConfig(config);

                    var containerDivElem = document.getElementById(config['containerDivId']);
                    buildObservationDeck(containerDivElem, config);
                }
            }
        }
    });
};

/**
 * context menu uses http://medialize.github.io/jQuery-contextMenu
 */
setupCategoricCellContextMenu = function(config) {
    $.contextMenu({
        // selector : ".axis",
        selector : ".categoric",
        callback : function(key, options) {
            // default callback
            var cellElem = this[0];
        },
        items : {
            "yulia expression rescaling" : {
                name : "yulia expression rescaling",
                icon : null,
                disabled : false,
                callback : function(key, opt) {
                    var cellElem = this[0];
                    var childrenElems = cellElem.children;
                    var eventId = cellElem.getAttribute('eventId');
                    var sampleId = cellElem.getAttribute('sampleId');
                    var val = cellElem.getAttribute('val');

                    console.log('key:', key, 'eventId:', eventId, 'val:', val);
                    console.log("href", window.location.href);
                    console.log("host", window.location.host);
                    console.log("pathname", window.location.pathname);
                    console.log("search", window.location.search);

                    // settings for rescaling
                    var querySettings = config['querySettings'];
                    querySettings['expression rescaling'] = {
                        'method' : 'yulia_rescaling',
                        'eventId' : eventId,
                        'val' : val
                    };

                    setCookie('od_config', JSON.stringify(querySettings));

                    var containerDivElem = document.getElementById(config['containerDivId']);
                    buildObservationDeck(containerDivElem, config);
                }
            },
            "sep1" : "---------",
            "reset" : {
                name : "reset",
                icon : null,
                disabled : false,
                callback : function(key, opt) {
                    resetConfig(config);

                    var containerDivElem = document.getElementById(config['containerDivId']);
                    buildObservationDeck(containerDivElem, config);
                }
            }
        }
    });
};

/**
 * Draw the matrix in the containing div.
 * Requires:
 *      D3js
 *      OD_eventData.js
 * @param {Object} containingElem
 * @param {Object} config
 */
drawMatrix = function(containingDiv, config) {
    // TODO begin drawMatrix
    config["rowClickback"] = function(d, i) {
        var datatype = config['eventAlbum'].getEvent(d).metadata.datatype;
        // console.log("rowClickback: " + d);
        // TODO meteor url: /wb/gene/<gene name>
        if (datatype === 'expression data') {
            var gene = d.replace('_mRNA', '');
            var url = '/wb/gene/' + gene;
            window.open(url, "_self");
        } else {
            alert('open page for event: ' + d + ' of datatype: ' + datatype);
        }
    };

    config["columnClickback"] = function(d, i) {
        // alert('open page for sample: ' + d);
        // console.log("columnClickback: " + d);
        // TODO meteor url: /wb/patient/<sample-name>
        var url = '/wb/patient/' + d;
        window.open(url, "_self");
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

    var thisElement = removeChildElems(containingDiv);

    // get eventList
    var eventAlbum = config['eventAlbum'];
    eventAlbum.fillInMissingSamples(null);

    var groupedEvents = eventAlbum.getEventIdsByType();
    var eventList = [];
    for (var datatype in groupedEvents) {
        var datatypeEventList = groupedEvents[datatype];
        console.log('datatype', datatype, 'has', datatypeEventList.length, 'events');
        eventList = eventList.concat(datatypeEventList);
    }

    var querySettings = config['querySettings'];

    // expression rescaling and color mapping
    var rescalingData = null;

    if (hasOwnProperty(groupedEvents, 'expression data') && hasOwnProperty(querySettings, 'expression rescaling')) {
        var rescalingSettings = querySettings['expression rescaling'];
        if (rescalingSettings['method'] === 'yulia_rescaling') {
            rescalingData = eventAlbum.yuliaExpressionRescaling(rescalingSettings['eventId'], rescalingSettings['val']);
        } else if (rescalingSettings['method'] === 'eventwiseMedianRescaling') {
            // rescalingData = eventAlbum.zScoreExpressionRescaling();
            rescalingData = eventAlbum.eventwiseMedianRescaling();
        } else if (rescalingSettings['method'] === 'zScoreExpressionRescaling') {
            rescalingData = eventAlbum.zScoreExpressionRescaling();
        } else {
            // no rescaling
        }
    } else {
        console.log('no expression data rescaling');
    }

    // rescalingData = eventAlbum.betweenMeansExpressionRescaling('Small Cell v Adeno', 'Adeno', 'Small Cell');

    var expressionColorMapper = centeredRgbaColorMapper(false);
    if (rescalingData != null) {
        var minExpVal = rescalingData['minVal'];
        var maxExpVal = rescalingData['maxVal'];
        expressionColorMapper = centeredRgbaColorMapper(false, 0, minExpVal, maxExpVal);
    }

    // assign color mappers
    var colorMappers = {};
    for (var i = 0; i < eventList.length; i++) {
        var eventId = eventList[i];
        var allowedValues = eventAlbum.getEvent(eventId).metadata.allowedValues;
        if (allowedValues == 'categoric') {
            colorMappers[eventId] = d3.scale.category10();
        } else if (allowedValues == 'numeric') {
            // 0-centered color mapper
            var vals = eventAlbum.getEvent(eventId).data.getValues();
            var numbers = [];
            for (var j = 0; j < vals.length; j++) {
                var val = vals[j];
                if (isNumerical(val)) {
                    numbers.push(val);
                }
            }
            var minVal = Math.min.apply(null, numbers);
            var maxVal = Math.max.apply(null, numbers);
            colorMappers[eventId] = centeredRgbaColorMapper(false, 0, minVal, maxVal);
        } else if (allowedValues == 'expression') {
            // shared expression color mapper
            colorMappers[eventId] = expressionColorMapper;
        } else {
            colorMappers[eventId] = d3.scale.category10();
        }
    }

    // get column names and map to numbers
    var colNames = null;
    var sortSteps = null;
    if ("colSort" in querySettings) {
        sortSteps = new sortingSteps(querySettings["colSort"]["steps"]);
        for (var i = sortSteps.getSteps().length - 1; i >= 0; i--) {
            var step = sortSteps.steps[i];
            var name = step['name'];
            if (eventAlbum.getEvent(name)) {
                // event exists
            } else {
                // ignore events that are not found
                console.log(name, 'not found, skip sorting by that event');
                sortSteps.removeStep(name);
            }
        }
    }

    colNames = eventAlbum.multisortSamples(sortSteps);

    var colNameMapping = new Object();
    for (var i in colNames) {
        var name = colNames[i];
        colNameMapping[name] = i;
    }

    // map row names to row numbers
    var rowNames = [];
    if (sortSteps != null) {
        var steps = sortSteps.getSteps();
        for (var b = 0; b < steps.length; b++) {
            var step = steps[b];
            var eventId = step['name'];
            rowNames.push(eventId);
        }
        rowNames.reverse();
    }

    for (var c = 0; c < eventList.length; c++) {
        var eventId = eventList[c];
        if (! isObjInArray(rowNames, eventId)) {
            rowNames.push(eventId);
        }
    }

    var rowNameMapping = new Object();
    for (var i in rowNames) {
        var name = rowNames[i];
        rowNameMapping[name] = i;
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
    rowLabels.append("title").text(function(d) {
        var eventObj = eventAlbum.getEvent(d);
        var datatype = eventObj.metadata.datatype;
        var s = 'event: ' + d + '\ndatatype: ' + datatype;

        if ((datatype === 'expression data') && (rescalingData != null)) {
            s = s + '\nrescalingData: ' + prettyJson(rescalingData['stats'][d]);
        }

        return s;
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
            return "colLabel mono axis unselectable";
        }
    }).style("text-anchor", "start");
    colLabels.on("click", config["columnClickback"]);
    colLabels.on("contextmenu", config["columnRightClickback"]);
    colLabels.append("title").text(function(d) {
        var s = 'sample: ' + d;
        return s;
    });

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

        var val = d['val'];

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
            "fill" : colorMapper(val)
        };
        if (eventAlbum.getEvent(d['eventId']).metadata.allowedValues === 'categoric') {
            attributes['class'] = 'categoric';
            attributes['eventId'] = d['eventId'];
            attributes['sampleId'] = d['id'];
            attributes['val'] = d['val'];
        } else if (eventAlbum.getEvent(d['eventId']).metadata.datatype === 'expression data') {
            attributes['class'] = 'mrna_exp';
            attributes['eventId'] = d['eventId'];
            attributes['sampleId'] = d['id'];
            attributes['val'] = d['val'];
        }
        group.appendChild(createSvgRectElement(x, y, rx, ry, width, height, attributes));

        return group;
    });

    // TODO heatmap click event
    heatMap.on("click", config["cellClickback"]).on("contextmenu", config["cellRightClickback"]);

    // heatmap titles
    heatMap.append("title").text(function(d) {
        // var s = "r:" + d['eventId'] + "\n\nc:" + d['id'] + "\n\nval:" + d['val'] + "\n\nval_orig:" + d['val_orig'];
        var s = "event: " + d['eventId'] + "\nsample: " + d['id'] + "\nvalue: " + d['val'];
        return s;
    });

    return config;
    // TODO end drawMatrix
};
