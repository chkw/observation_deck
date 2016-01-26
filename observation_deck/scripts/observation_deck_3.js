/**
 * chrisw@soe.ucsc.edu
 * OCT 2014
 * observation_deck_3.js
 *
 * Development of this data visualization began with the example at: <http://bl.ocks.org/tjdecke/5558084> .
 *
 * This time, avoid using jQuery prototype.
 *
 * requirements:
 * 1) jQuery <https://jquery.com/> ... for jQuery-contextMenu
 * 2) D3.js <http://d3js.org/>
 * 3) jQuery-contextMenu <https://medialize.github.io/jQuery-contextMenu/>
 * 4) jStat
 * 5) utils.js
 * 6) OD_eventData.js
 * 7) typeahead <https://github.com/twitter/typeahead.js>
 */

// expose utils to meteor
u = utils;

// expose observation_deck to meteor
observation_deck = ( typeof observation_deck === "undefined") ? {} : observation_deck;
(function(od) {"use strict";

    var cookieName = "od_config";

    /**
     *  Build an observation deck!
     */
    od.buildObservationDeck = function(containerDivElem, config) {
        // console.log('buildObservationDeck');
        config = getConfiguration(config);

        config['containerDivId'] = containerDivElem.id;

        drawMatrix(containerDivElem, config);

        // set up dialog box
        setupDialogBox("hugoSearch", "HUGO symbol", config["geneQueryUrl"], function(selectedString) {
            var settings = getCookieVal();
            var key = "hugoSearch";
            if (!utils.hasOwnProperty(settings, key)) {
                settings[key] = [];
            }
            settings[key].push(selectedString);
            settings[key] = utils.eliminateDuplicates(settings[key]);
            setCookieVal(settings);

            console.log("settings", settings);

            var sessionGeneList = getSession("geneList");
            console.log("sessionGeneList", sessionGeneList);

            console.log("button clicked in hugoSearch", selectedString);
        });
        setupDialogBox("sigSearch", "signature name", config["sigQueryUrl"], function(selectedString) {
            var settings = getCookieVal();
            var key = "sigSearch";
            if (!utils.hasOwnProperty(settings, key)) {
                settings[key] = [];
            }
            settings[key].push(selectedString);
            settings[key] = utils.eliminateDuplicates(settings[key]);
            setCookieVal(settings);
            console.log("button clicked in sigSearch", selectedString);
        });

        // set up context menu should follow matrix drawing
        setupContextMenus(config);

        return config;
    };

    /**
     *
     */
    var getConfiguration = function(config) {
        // look for od_config in cookies
        var querySettings = getCookieVal();
        config['querySettings'] = querySettings;

        var od_eventAlbum = null;

        // pivot_event is passed to OD from medbook-workbench via session property
        // session property may be null
        if (('pivot_event' in config) && (config['pivot_event'] != null)) {
            var pivotSettings = config['pivot_event'];
            config['querySettings']['pivot_event'] = pivotSettings;
        } else {
            // delete config['querySettings']['pivot_event'];
        }

        // detect pre-configured event album obj
        if ('eventAlbum' in config) {
            od_eventAlbum = config['eventAlbum'];
        } else {
            od_eventAlbum = new eventData.OD_eventAlbum();
            config['eventAlbum'] = od_eventAlbum;
        }

        // data to be retrieved via url
        var dataLoader = medbookDataLoader;

        if ('pivotScores' in config) {
            var pivotScoresData = config['pivotScores'];
            if ('object' in pivotScoresData) {
                dataLoader.loadPivotScores(pivotScoresData['object'], od_eventAlbum);
            }
        }
        delete config['pivotScores'];

        if ('dataUrl' in config) {
            var dataUrlConfig = config['dataUrl'];
            if ('clinicalUrl' in dataUrlConfig) {
                dataLoader.getClinicalData(dataUrlConfig['clinicalUrl'], od_eventAlbum);
            }
            if ('expressionUrl' in dataUrlConfig) {
                dataLoader.getExpressionData(dataUrlConfig['expressionUrl'], od_eventAlbum);
            }
            if ('mutationUrl' in dataUrlConfig) {
                dataLoader.getMutationData(dataUrlConfig['mutationUrl'], od_eventAlbum);
            }
        }

        // data passed in as mongo documents
        if ('mongoData' in config) {
            var mongoData = config['mongoData'];
            // TODO load contrast data
            if ("contrast" in mongoData) {
                dataLoader.mongoContrastData(mongoData['contrast'], od_eventAlbum);
            }
            if ('clinical' in mongoData) {
                dataLoader.mongoClinicalData(mongoData['clinical'], od_eventAlbum);
            }
            if ('expression' in mongoData) {
                dataLoader.mongoExpressionData(mongoData['expression'], od_eventAlbum);
            }
            if ('mutation' in mongoData) {
                dataLoader.mongoMutationData(mongoData['mutation'], od_eventAlbum);
            }
        }
        // delete the data after it has been used to load events
        delete config['mongoData'];

        // signature data
        if ('signature' in config) {
            var signatureConfig = config['signature'];
            if ('expression' in signatureConfig) {
                var expressionSigConfig = signatureConfig['expression'];
                if ('file' in expressionSigConfig) {
                    var fileNames = expressionSigConfig['file'];
                    for (var i = 0; i < fileNames.length; i++) {
                        var fileName = fileNames[i];
                        console.log(fileName);
                        dataLoader.getSignature(fileName, od_eventAlbum);
                    }
                }
                if ('object' in expressionSigConfig) {
                    var objects = expressionSigConfig['object'];
                    for (var i = 0; i < objects.length; i++) {
                        var object = objects[i];
                        dataLoader.loadSignatureObj(object, od_eventAlbum);
                    }
                }
            }
        }
        // delete the data after it has been used to load events
        delete config['signature'];

        // signature gene weights data
        if ('signature_index' in config) {
            var sigIdxConfig = config['signature_index'];
            if ('expression' in sigIdxConfig) {
                var expressionSigIdxConfig = sigIdxConfig['expression'];
                if ('object' in expressionSigIdxConfig) {
                    var objects = expressionSigIdxConfig['object'];
                    for (var i = 0; i < objects.length; i++) {
                        var object = objects[i];
                        dataLoader.loadSignatureWeightsObj(object, od_eventAlbum);
                    }
                }
            }
        }
        // delete the data after it has been used to load events
        delete config['signature_index'];

        // 'bmegSigServiceData' : bmegSigServiceData
        if ('bmegSigServiceData' in config) {
            console.log('bmegSigServiceData in config');
            dataLoader.loadBmegSignatureWeightsAsSamples(config['bmegSigServiceData'], od_eventAlbum);
        }
        // delete the data after it has been used to load events
        delete config['bmegSigServiceData'];

        // specify the samples that should be displayed
        if ('displayedSamples' in config) {
            var displayedSamples = config['displayedSamples'];
        } else {
            config['displayedSamples'] = [];
        }

        var groupedEvents = config['eventAlbum'].getEventIdsByType();
        var eventList = [];
        for (var datatype in groupedEvents) {
            var datatypeEventList = groupedEvents[datatype];
            // console.log('datatype', datatype, 'has', datatypeEventList.length, 'events', '<-- getConfiguration');
        }

        if ('deleteEvents' in config) {
            var deleteEvents = config['deleteEvents'];
            for (var i = 0; i < deleteEvents.length; i++) {
                config['eventAlbum'].deleteEvent(deleteEvents[i]);
            }
        }

        return config;
    };

    /**
     * Get event IDs that are in the cookies.  Currently only gets the expression events.
     * Exposed to meteor via "od."
     */
    od.getCookieEvents = function() {
        var eventList = [];
        var cookieObj = getCookieVal();
        if (( typeof cookieObj === 'undefined') || (cookieObj == null) || ((utils.getKeys(cookieObj)).length == 0)) {
            return [];
        }
        if (utils.hasOwnProperty(cookieObj, 'pivot_sort')) {
            eventList.push(cookieObj['pivot_sort']['pivot_event']);
        }
        if (utils.hasOwnProperty(cookieObj, 'colSort')) {
            var steps = cookieObj['colSort']['steps'];
            for (var i = 0; i < steps.length; i++) {
                var step = steps[i];
                eventList.push(step['name']);
            }
        }
        if (utils.hasOwnProperty(cookieObj, 'hide_null_samples_event')) {
            eventList = eventList.concat(cookieObj['hide_null_samples_event']);
        }

        var geneList = [];
        for (var i = 0; i < eventList.length; i++) {
            var eventId = eventList[i];
            if (utils.endsWith(eventId, '_mRNA')) {
                geneList.push(eventId.replace('_mRNA', ''));
            }
        }

        if (utils.hasOwnProperty(cookieObj, "hugoSearch")) {
            var hugoIds = cookieObj["hugoSearch"];
            geneList = geneList.concat(hugoIds);
        }

        return utils.eliminateDuplicates(geneList);
    };

    /**
     * Set up a dialog box with typeahead functionality
     * config is an obj of {title,placeholder,bloohoundObj}
     */
    var createSuggestBoxDialog = function(suggestBoxConfig) {
        var title = suggestBoxConfig["title"];
        var placeholder = suggestBoxConfig["placeholderText"];

        var divElem = utils.createDivElement(title);
        divElem.style['display'] = 'none';

        var inputElem = document.createElement("input");
        divElem.appendChild(inputElem);
        utils.setElemAttributes(inputElem, {
            // "class" : "typeahead",
            "type" : "text",
            "placeholder" : placeholder
        });

        var buttonElem = document.createElement("button");
        divElem.appendChild(buttonElem);
        utils.setElemAttributes(buttonElem, {
            "type" : "button",
            "style" : "float: right"
        });
        buttonElem.innerHTML = "select";
        buttonElem.onclick = function() {
            suggestBoxConfig["selectionCallback"](inputElem.value);
            $(divElem).dialog("close");
        };

        for (var i = 0; i < 9; i++) {
            divElem.appendChild(document.createElement("br"));
        }

        $(inputElem).typeahead({
            "hint" : true,
            "highlight" : true,
            "minLength" : 2
        }, {
            "name" : "dataset",
            "source" : suggestBoxConfig["bloodhoundObj"],
            "limit" : 99
        });

        return divElem;
    };

    /**
     * Set up a dialog boxes
     */
    var setupDialogBox = function(elementTitle, placeholderText, queryUrl, selectionCallback) {
        var queryVar = "%VALUE";
        var bodyElem = document.getElementsByTagName('body')[0];
        var dialogBox = createSuggestBoxDialog({
            "title" : elementTitle,
            "placeholderText" : placeholderText,
            "bloodhoundObj" : new Bloodhound({
                "datumTokenizer" : Bloodhound.tokenizers.whitespace,
                "queryTokenizer" : Bloodhound.tokenizers.whitespace,
                // "local" : ["abc", "def", "ghi", "abd", "abr"],
                "remote" : {
                    // "url" : "https://su2c-dev.ucsc.edu/wb/genes?q=%QUERY",
                    // "url" : "/genes?q=%VALUE",
                    "url" : queryUrl + queryVar,
                    "wildcard" : queryVar,
                    "transform" : function(response) {
                        console.log("response", response);
                        var items = response["items"];
                        var list = [];
                        for (var i = 0, length = items.length; i < length; i++) {
                            var item = items[i];
                            var id = item["id"];
                            list.push(id);
                        }
                        list = utils.eliminateDuplicates(list);
                        return list;
                    }
                }
            }),
            "selectionCallback" : selectionCallback
        });
        bodyElem.appendChild(dialogBox);
    };

    /*
     *
     */
    var setupContextMenus = function(config) {
        // config['querySettings']
        // first destroy old contextMenus
        var selectors = ['.typeLabel', '.colLabel', '.rowLabel', '.mrna_exp', '.categoric', ".signature"];
        for (var i = 0; i < selectors.length; i++) {
            var selector = selectors[i];
            $.contextMenu('destroy', selector);
        }
        setupTypeLabelContextMenu(config);
        setupColLabelContextMenu(config);
        setupRowLabelContextMenu(config);
        setupCategoricCellContextMenu(config);
        setupExpressionCellContextMenu(config);
        setupSignatureCellContextMenu(config);
    };

    /**
     * delete cookie and reset config
     */
    var resetConfig = function(config) {
        var persistentKeys = ['dataUrl', 'eventAlbum', 'mongoData', 'containerDivId', 'signature', "rowTitleCallback", "columnTitleCallback"];
        utils.deleteCookie('od_config');
        var keys = utils.getKeys(config);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (utils.isObjInArray(persistentKeys, key)) {
                continue;
            } else {
                delete config[key];
            }
        }
        console.log('remaining config', config);
    };

    /**
     * Set the obs-deck cookie. Value is an object that is stringified for the cookie.
     */
    var setCookieVal = function(value) {
        utils.setCookie(cookieName, JSON.stringify(value));
    };

    /**
     * Get the obs-deck cookie. Return empty object if no cookie.s
     */
    var getCookieVal = function() {
        var cookie = utils.getCookie(cookieName);
        var parsedCookie = utils.parseJson(cookie) || {};
        return parsedCookie;
    };

    /**
     * If session object exists, set the key/value pair.
     */
    var setSession = function(key, value) {
        if ( typeof Session !== "undefined") {
            if (key) {
                Session.set(key, value);
            }
            return true;
        } else {
            console.log("no session object for setting");
            return false;
        }
    };

    /**
     * Get session value if exists.  Else, return null.
     */
    var getSession = function(key) {
        var value = null;
        if ( typeof Session !== "undefined") {
            if (key) {
                value = Session.get(key);
            }
        } else {
            console.log("no session object for getting");
        }
        return value;
    };

    /*
     * If session object exists, delete the specified keys.
     *
     */
    var resetSession = function(keys) {
        if ( typeof Session !== "undefined") {
            for (var i = 0, length = keys.length; i < length; i++) {
                delete Session.keys[keys[i]];
            }
            return true;
        } else {
            console.log("no session object to reset");
            return false;
        }
    };

    /**
     * Clear session and cookies and then rebuild the obs-deck
     */
    var resetObsDeck = function(config) {
        console.log("!! RESETTING OBS DECK !!");
        resetConfig(config);
        resetSession(['pivotSettings', "subscriptionPaging", "geneList", "focusGenes", "lockedEvents"]);
        setSession("pivotSettings", "");

        var containerDivElem = document.getElementById(config['containerDivId']);
        var newConfig = od.buildObservationDeck(containerDivElem, config);
    };

    var getDevMode = function() {
        var useDevMode = (utils.getQueryStringParameterByName('dev_mode').toLowerCase() === 'true');
        return useDevMode;
    };

    /**
     * Set session var for datatype paging
     */
    var setDatatypePaging = function(datatype, headOrTail, upOrDown) {
        var sessionVarName = "subscriptionPaging";
        var sessionVal = getSession(sessionVarName);

        // default setting
        if (!sessionVal) {
            sessionVal = {};
        }

        if (!utils.hasOwnProperty(sessionVal, datatype)) {
            sessionVal[datatype] = {
                "head" : 0,
                "tail" : 0
            };
        }

        if (!headOrTail || !upOrDown) {
            return sessionVal[datatype];
        }

        // new setting
        var newVal;
        if (upOrDown === "down") {
            newVal = --sessionVal[datatype][headOrTail];
        } else if (upOrDown === "up") {
            newVal = ++sessionVal[datatype][headOrTail];
        } else if (upOrDown === "0") {
            newVal = sessionVal[datatype][headOrTail] = 0;
        }

        // validate
        if (newVal < 0) {
            sessionVal[datatype][headOrTail] = 0;
        }

        setSession(sessionVarName, sessionVal);
    };

    /**
     *add a sorting step object for the eventId to "rowSort" or "colSort". Defaults to "colSort".
     */
    var addSortStepToCookies = function(eventId, config, sortType, noReverse) {
        // may be rowSort or colSort, default to colSort
        var sortType = sortType || "colSort";
        var noReverse = noReverse || false;

        var sortSteps;
        var querySettings = config['querySettings'];
        if ( sortType in querySettings) {
            sortSteps = new eventData.sortingSteps(querySettings[sortType]["steps"]);
        } else {
            sortSteps = new eventData.sortingSteps();
        }
        sortSteps.addStep(eventId, noReverse);
        querySettings[sortType] = sortSteps;

        setCookieVal(querySettings);
    };

    /**
     * Create a context menu item for use with jQuery-contextMenu.
     */
    var createResetContextMenuItem = function(config) {
        var obj = {
            name : "reset",
            icon : null,
            disabled : false,
            callback : function(key, opt) {
                resetObsDeck(config);
            }
        };
        return obj;
    };

    var setupColLabelContextMenu = function(config) {

        /**
         * callback for medbook-workbench
         */
        // var titleCallback = function(sampleId) {
        // var url = '/wb/patient/' + sampleId;
        // window.open(url, "_self");
        // };

        var titleCallback = config['columnTitleCallback'];

        $.contextMenu({
            // selector : ".axis",
            selector : ".colLabel",
            trigger : 'left',
            build : function($trigger, contextmenuEvent) {
                // https://medialize.github.io/jQuery-contextMenu/demo/dynamic-create.html
                // this callback is executed every time the menu is to be shown
                // its results are destroyed every time the menu is hidden
                // e is the original contextmenu event, containing e.pageX and e.pageY (amongst other data)
                // console.log('dynamic on-demand contextMenu');
                // console.log('$trigger', $trigger);
                // console.log('contextmenuEvent', contextmenuEvent);
                var sampleId = ($trigger)[0].getAttribute('sample');
                return {
                    // callback : function(key, options) {
                    // // default callback used when no callback specified for item
                    // console.log('default callback');
                    // var elem = this[0];
                    // console.log('key:', key);
                    // console.log('options:', options);
                    // console.log('elem', elem);
                    // console.log('eventId:', elem.getAttribute('eventId'));
                    // console.log('elemClass:', elem.getAttribute("class"));
                    // console.log('elemId:', elem.getAttribute("id"));
                    // console.log("href:", window.location.href);
                    // console.log("host:", window.location.host);
                    // console.log("pathname:", window.location.pathname);
                    // console.log("search:", window.location.search);
                    // },
                    items : {
                        "title" : {
                            name : sampleId,
                            icon : null,
                            disabled : (titleCallback == null),
                            callback : function(key, opt) {
                                if (titleCallback == null) {
                                    console.log('default titleCallback for column', sampleId);
                                } else {
                                    titleCallback(sampleId, config);
                                }
                            }
                        },
                        'reset' : createResetContextMenuItem(config)
                    }
                };
            }
        });
    };

    // typeLabel
    var setupTypeLabelContextMenu = function(config) {
        var titleCallback = config['datatypeTitleCallback'];

        $.contextMenu({
            // selector : ".axis",
            selector : ".typeLabel",
            trigger : 'left',
            callback : function(key, options) {
                // default callback
                var elem = this[0];
                console.log('elem', elem);
            },
            build : function($trigger, contextmenuEvent) {
                // var datatype = ($trigger[0].getAttribute('datatype'));
                var eventId = ($trigger[0].getAttribute('eventId'));
                var isPlus = utils.endsWith(eventId, "(+)");

                var fields = eventId.split("(");
                fields.pop();
                var sanitizedEventId = fields.join("(");
                var datatype = sanitizedEventId;

                var items = {
                    'title' : {
                        name : function() {
                            return datatype;
                        },
                        icon : null,
                        disabled : false,
                        callback : function(key, opt) {
                            if (titleCallback == null) {
                                console.log('datatype', datatype);
                                console.log('default titleCallback for datatype', datatype);
                            } else {
                                titleCallback(eventId, config);
                            }
                        }
                    },
                    "sep1" : "---------",
                    'toggle_datatype_visibility' : {
                        'name' : function() {
                            return 'toggle visibility';
                        },
                        'icon' : null,
                        'disabled' : null,
                        'callback' : function(key, opt) {
                            if ('hiddenDatatypes' in config['querySettings']) {
                            } else {
                                config['querySettings']['hiddenDatatypes'] = [];
                            }

                            var hiddenDatatypes = config['querySettings']['hiddenDatatypes'];
                            if (utils.isObjInArray(hiddenDatatypes, datatype)) {
                                utils.removeA(hiddenDatatypes, datatype);
                            } else {
                                hiddenDatatypes.push(datatype);
                            }

                            setCookieVal(config['querySettings']);

                            // trigger redrawing
                            var containerDivElem = document.getElementById(config['containerDivId']);
                            od.buildObservationDeck(containerDivElem, config);
                        }
                    },
                    "hide_null_samples_datatype" : {
                        name : "(un)hide null samples in this datatype",
                        icon : null,
                        disabled : false,
                        callback : function(key, opt) {
                            var querySettings = config['querySettings'];
                            if (!utils.hasOwnProperty(querySettings, "hide_null_samples_datatype")) {
                                querySettings['hide_null_samples_datatype'] = datatype;
                                delete querySettings["hide_null_samples_event"];
                            } else {
                                if (querySettings['hide_null_samples_datatype'] === datatype) {
                                    delete querySettings['hide_null_samples_datatype'];
                                } else {
                                    querySettings['hide_null_samples_datatype'] = datatype;
                                    delete querySettings["hide_null_samples_event"];
                                }
                            }

                            setCookieVal(querySettings);

                            var containerDivElem = document.getElementById(config['containerDivId']);
                            od.buildObservationDeck(containerDivElem, config);
                            return;
                        }
                    },
                    "test_fold" : {
                        "name" : "dev_features",
                        "disabled" : function() {
                            return (!getDevMode());
                        },
                        "items" : {
                            "hugoSearch" : {
                                "name" : "HUGO search",
                                "icon" : null,
                                "disabled" : false,
                                "callback" : function(key, opt) {
                                    var dialogElem = document.getElementById('hugoSearch');
                                    dialogElem.style["display"] = "block";

                                    $(dialogElem).dialog({
                                        'title' : 'HUGO search',
                                        "buttons" : {
                                            "close" : function() {
                                                $(this).dialog("close");
                                            }
                                        }
                                    });
                                }
                            },
                            "sigSearch" : {
                                "name" : "signature search",
                                "icon" : null,
                                "disabled" : false,
                                "callback" : function(key, opt) {
                                    var dialogElem = document.getElementById('sigSearch');
                                    dialogElem.style["display"] = "block";

                                    $(dialogElem).dialog({
                                        'title' : 'signature search',
                                        "buttons" : {
                                            "close" : function() {
                                                $(this).dialog("close");
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    },
                    "reset" : createResetContextMenuItem(config)
                };
                return {
                    'items' : items
                };
            }
        });
    };

    /**
     *context menu uses http://medialize.github.io/jQuery-contextMenu
     */
    var setupRowLabelContextMenu = function(config) {

        /**
         * This is a callback for medbook-workbench.
         */

        // example of titleCallback function
        // var titleCallback = function(eventId) {
        // var eventObj = config['eventAlbum'].getEvent(eventId);
        // var datatype = eventObj.metadata['datatype'];
        // if (datatype === 'expression data') {
        // // mRNA url: /wb/gene/<gene name>
        // var gene = eventId.replace('_mRNA', '');
        // var url = '/wb/gene/' + gene;
        // window.open(url, "_self");
        // } else if (datatype === 'clinical data') {
        // // clinical url: /wb/clinical/<name>
        // var feature = eventId;
        // var url = '/wb/clinical/' + feature;
        // window.open(url, "_self");
        // }
        // };

        var titleCallback = config['rowTitleCallback'];

        $.contextMenu({
            // selector : ".axis",
            selector : ".rowLabel",
            trigger : 'left',
            callback : function(key, options) {
                // default callback
                var elem = this[0];
                console.log('elem', elem);
            },
            build : function($trigger, contextmenuEvent) {
                // var eventId = ($trigger)[0].innerHTML.split('<')[0];
                var eventId = ($trigger)[0].getAttribute('eventId');
                var eventObj = config['eventAlbum'].getEvent(eventId);
                var datatype = eventObj.metadata['datatype'];
                var scoredDatatype = eventObj.metadata.scoredDatatype;
                var allowedValues = eventObj.metadata.allowedValues;

                var displayName = eventObj.metadata.displayName;

                var pivotable = (eventObj.metadata.weightedGeneVector.length);

                var pivotable_dataypes = ["clinical data", "expression data", 'expression signature', 'kinase target activity', "tf target activity"];

                var items = {
                    'title' : {
                        name : displayName,
                        icon : null,
                        disabled : function() {
                            var result = true;
                            if ((titleCallback != null) && (utils.isObjInArray(["mutation call", 'expression data', 'clinical data', 'expression signature', 'kinase target activity', "tf target activity"], datatype))) {
                                result = false;
                            }

                            return result;
                        },
                        callback : function(key, opt) {
                            if (titleCallback == null) {
                                console.log('default titleCallback for row', eventId);
                            } else {
                                titleCallback(eventId, config);
                            }
                        }
                    },
                    "sep1" : "---------",
                    'set_pivot' : {
                        'name' : function() {
                            return 'set as pivot';
                        },
                        'icon' : null,
                        'disabled' : function(key, opt) {
                            pivotable = false;
                            if (utils.isObjInArray(pivotable_dataypes, datatype)) {
                                pivotable = true;
                            }

                            if (pivotable) {
                                // if (true) {
                                return false;
                            } else {
                                return true;
                            }
                        },
                        'callback' : function(key, opt) {
                            // in workbench, selecting this should do the following:
                            // 1- set pivot cookie
                            // 2- meteor should pick up the cookie/session and retrieve the pivot data
                            // 3- meteor should force obs-deck to rebuild, setting pivot data

                            // meteor session
                            if ( typeof Session !== 'undefined') {
                                // if (false) {
                                var mName = eventId;
                                var mVersion = '';
                                // if (utils.isObjInArray(['expression signature', 'kinase target activity', "tf target activity"], datatype)) {
                                if (utils.isObjInArray(['expression signature', 'kinase target activity', "tf target activity"], datatype)) {
                                    var names = mName.split('_v');
                                    mVersion = names.pop();
                                    mName = names.join('_v');
                                    datatype = 'signature';
                                } else if (datatype === "expression data") {
                                    mName = eventObj.metadata.displayName;
                                    mVersion = 1;
                                    datatype = "expression";
                                } else if (datatype === "clinical data") {
                                    mName = eventId;
                                    mVersion = 1;
                                    datatype = "clinical";
                                }

                                var pivotSessionSettings = {
                                    'name' : mName,
                                    'datatype' : datatype,
                                    'version' : mVersion
                                };

                                var querySettings = config['querySettings'];
                                querySettings['pivot_event'] = {
                                    'id' : eventId,
                                    'datatype' : datatype
                                };

                                var datatypes = [];
                                if ('pivot_sort_list' in querySettings) {
                                    datatypes = querySettings['pivot_sort_list'];
                                }
                                // TODO hard coded !!!
                                datatypes.push('expression data');
                                querySettings['pivot_sort_list'] = utils.eliminateDuplicates(datatypes);

                                setCookieVal(querySettings);

                                addSortStepToCookies(eventId, config, "colSort", true);

                                console.log('writing pivotSettings to Session', pivotSessionSettings);
                                setSession('pivotSettings', pivotSessionSettings);
                            } else {
                                console.log('no Session object. Writing pivotSettings to querySettings.');

                                var querySettings = config['querySettings'];
                                querySettings['pivot_event'] = {
                                    'id' : eventId,
                                    'datatype' : datatype
                                };
                                setCookieVal(querySettings);

                                addSortStepToCookies(eventId, config, "colSort", true);

                                // trigger redrawing
                                var containerDivElem = document.getElementById(config['containerDivId']);
                                od.buildObservationDeck(containerDivElem, config);
                            }
                        }
                    },
                    "sort" : {
                        name : "sort samples by this event",
                        icon : null,
                        disabled : false,
                        callback : function(key, opt) {
                            addSortStepToCookies(eventId, config, "colSort", false);

                            var containerDivElem = document.getElementById(config['containerDivId']);
                            od.buildObservationDeck(containerDivElem, config);
                        }
                    },
                    'hide_fold' : {
                        'name' : 'hide...',
                        'items' : {
                            "hide_null_samples_event" : {
                                name : "(un)hide null samples in this event",
                                icon : null,
                                disabled : false,
                                callback : function(key, opt) {
                                    var querySettings = config['querySettings'];

                                    if (!utils.hasOwnProperty(querySettings, "hide_null_samples_datatype")) {
                                        if (querySettings['hide_null_samples_datatype'] === datatype) {
                                            delete querySettings['hide_null_samples_datatype'];
                                        }
                                    }

                                    if (!utils.hasOwnProperty(querySettings, "hide_null_samples_event")) {
                                        querySettings["hide_null_samples_event"] = eventId;
                                        delete querySettings['hide_null_samples_datatype'];
                                    } else if (querySettings["hide_null_samples_event"] === eventId) {
                                        delete querySettings["hide_null_samples_event"];
                                    } else {
                                        querySettings["hide_null_samples_event"] = eventId;
                                        delete querySettings['hide_null_samples_datatype'];
                                    }

                                    setCookieVal(querySettings);

                                    var containerDivElem = document.getElementById(config['containerDivId']);
                                    od.buildObservationDeck(containerDivElem, config);
                                    return;
                                }
                            },
                            "hide_event" : {
                                name : "this event",
                                icon : null,
                                disabled : false,
                                callback : function(key, opt) {
                                    var querySettings = config['querySettings'];
                                    var hiddenEvents = querySettings['hiddenEvents'] || [];
                                    hiddenEvents.push(eventId);
                                    querySettings['hiddenEvents'] = utils.eliminateDuplicates(hiddenEvents);

                                    setCookieVal(querySettings);

                                    var containerDivElem = document.getElementById(config['containerDivId']);
                                    od.buildObservationDeck(containerDivElem, config);
                                }
                            }
                        }
                    },
                    "add_fold" : {
                        "name" : "add...",
                        "items" : {
                            "add_events_for_gene" : {
                                "name" : "events for gene",
                                "icon" : null,
                                "disabled" : function() {
                                    return (datatype === "clinical data");
                                },
                                "callback" : function(key, opt) {
                                    var gene = eventId.split(/_/)[0];
                                    var focusGenes = getSession("focusGenes") || [];
                                    focusGenes.push(gene);
                                    setSession("focusGenes", _.uniq(focusGenes));
                                    // TODO search for and add events related to this gene
                                    console.log("search for and add events related to these genes", getSession("focusGenes"));
                                }
                            },
                            "pathway_genes" : {
                                "name" : "expression of targets",
                                "icon" : null,
                                "disabled" : function() {
                                    var pathway_context_viewable = ["kinase target activity", "tf target activity"];
                                    var disabled = (_.contains(pathway_context_viewable, datatype)) ? false : true;
                                    return disabled;
                                },
                                "callback" : function(key, opt) {
                                    var sigName = eventId.replace(/_v\d+$/, "");
                                    console.log("add gene set for", sigName);
                                    // add gene set for signature
                                    var geneSetSelectElem = document.getElementById("geneset");
                                    if (_.isUndefined(geneSetSelectElem) || _.isNull(geneSetSelectElem)) {
                                        console.log("no geneSetSelectElem with ID", "geneset");
                                        return;
                                    }
                                    var geneSetOptions = geneSetSelectElem.getElementsByTagName("option");
                                    var foundMatch = false;
                                    _.each(geneSetOptions, function(option, index) {
                                        var text = option.innerHTML;
                                        text = text.replace(/ \(\d+\)$/, "").replace(/_targets_viper/, "_viper");
                                        // var val = option.getAttribute("value");
                                        // var geneList = val.split(/,/);
                                        if (text === sigName) {
                                            option.selected = true;
                                            $(geneSetSelectElem).trigger("change");
                                            foundMatch = true;
                                        }
                                    });
                                    if (!foundMatch) {
                                        alert("No gene set found for " + sigName + ".");
                                    }
                                }
                            }
                        }
                    },

                    "pathway_context" : {
                        "name" : "view pathway context",
                        "icon" : null,
                        "disabled" : function() {
                            var pathway_context_viewable = ["expression data", "mutation call", "kinase target activity", "tf target activity"];
                            var disabled = (_.contains(pathway_context_viewable, datatype)) ? false : true;
                            return disabled;
                        },
                        "callback" : function(key, opt) {
                            var geneSymbol = eventId.replace(/_mRNA$/, "").replace(/_mutation$/, "").replace(/_kinase_viper_v.+$/, "").replace(/_tf_viper_v.+$/, "");
                            var url = "/PatientCare/geneReport/" + geneSymbol;
                            console.log("linking out to", url, "for pathway context");
                            window.open(url, "_patientCare");
                        }
                    },

                    "test_fold" : {
                        "name" : "dev_features",
                        "disabled" : function() {
                            return (!getDevMode());
                        },
                        "items" : {
                            // TODO UI controls for dev features go here
                            // http://swisnl.github.io/jQuery-contextMenu/demo/input.html
                            "lock_item" : {
                                "name" : "lock item",
                                "type" : "checkbox",
                                "selected" : false,
                                "icon" : null,
                                "disabled" : false,
                                "callback" : function(key, opt) {
                                    console.log("event", eventId, datatype);
                                }
                            }
                        }
                    },
                    "sep2" : "---------",
                    "reset" : createResetContextMenuItem(config)
                };
                return {
                    'items' : items,
                    "events" : {
                        "show" : function(opt) {
                            // this is the trigger element
                            var $trigger = this;
                            // import states from data store

                            var sessionLockedEvents = getSession("lockedEvents") || {};

                            var eventId = eventObj.metadata.id;
                            var eventType = eventObj.metadata.datatype;

                            var isLocked = _.contains(sessionLockedEvents[eventType], eventId);
                            console.log("isLocked", isLocked);

                            // $.contextMenu.setInputValues(opt, $trigger.data());
                            // this basically fills the input commands from an object
                            // like {name: "foo", yesno: true, radio: "3", &hellip;}
                            $.contextMenu.setInputValues(opt, {
                                "lock_item" : isLocked
                            });
                        },
                        "hide" : function(opt) {
                            // this is the trigger element
                            var $trigger = this;
                            // export states to data store
                            $.contextMenu.getInputValues(opt, $trigger.data());
                            // this basically dumps the input commands' values to an object
                            // like {name: "foo", yesno: true, radio: "3", &hellip;}
                            var eventId = eventObj.metadata.id;
                            var eventType = eventObj.metadata.datatype;
                            var sessionLockedEvents = getSession("lockedEvents") || {};
                            if (_.isUndefined(sessionLockedEvents[eventType])) {
                                sessionLockedEvents[eventType] = [];
                            }
                            if ($trigger.data()["lock_item"]) {
                                // add event if true
                                sessionLockedEvents[eventType].push(eventId);
                                sessionLockedEvents[eventType] = _.uniq(sessionLockedEvents[eventType]);
                            } else {
                                // remove event if false
                                sessionLockedEvents[eventType] = _.without(sessionLockedEvents[eventType], eventId);
                            }
                            setSession("lockedEvents", sessionLockedEvents);
                        }
                    }
                };
            }
        });
    };

    /**
     * context menu uses http://medialize.github.io/jQuery-contextMenu
     */
    var setupExpressionCellContextMenu = function(config) {
        var sampleLinkoutCallback = config['columnTitleCallback'];

        $.contextMenu({
            // selector : ".axis",
            selector : ".mrna_exp",
            trigger : 'left',
            callback : function(key, options) {
                // default callback
                var elem = this[0];
            },
            build : function($trigger, contextmenuEvent) {
                var triggerElem = ($trigger)[0];
                var eventId = triggerElem.getAttribute('eventId');
                var sampleId = triggerElem.getAttribute('sampleId');
                var items = {
                    'title' : {
                        name : eventId + ' for ' + sampleId,
                        icon : null,
                        disabled : true
                    },
                    "sep1" : "---------",
                    "sample_link_out" : {
                        "name" : "go to details for " + sampleId,
                        "icon" : null,
                        "disabled" : false,
                        "callback" : function(key, opt) {
                            sampleLinkoutCallback(sampleId, config);
                        }
                    },
                    'rescaling_fold' : {
                        'name' : 'normalize coloring...',
                        'items' : {
                            "samplewise median rescaling" : {
                                name : "over each column",
                                icon : null,
                                disabled : false,
                                callback : function(key, opt) {
                                    // settings for rescaling
                                    var querySettings = config['querySettings'];
                                    querySettings['expression rescaling'] = {
                                        'method' : 'samplewiseMedianRescaling'
                                    };

                                    setCookieVal(querySettings);

                                    var containerDivElem = document.getElementById(config['containerDivId']);
                                    od.buildObservationDeck(containerDivElem, config);
                                }
                            },
                            "eventwise median rescaling" : {
                                name : "over each row",
                                icon : null,
                                disabled : false,
                                callback : function(key, opt) {
                                    // settings for rescaling
                                    var querySettings = config['querySettings'];
                                    querySettings['expression rescaling'] = {
                                        'method' : 'eventwiseMedianRescaling'
                                    };

                                    setCookieVal(querySettings);

                                    var containerDivElem = document.getElementById(config['containerDivId']);
                                    od.buildObservationDeck(containerDivElem, config);
                                }
                                // },
                                // "eventwise z-score rescaling" : {
                                // name : "by event z-score",
                                // icon : null,
                                // disabled : false,
                                // callback : function(key, opt) {
                                // // settings for rescaling
                                // var querySettings = config['querySettings'];
                                // querySettings['expression rescaling'] = {
                                // 'method' : 'zScoreExpressionRescaling'
                                // };
                                //
                                // setCookieVal(querySettings);
                                //
                                // var containerDivElem = document.getElementById(config['containerDivId']);
                                // od.buildObservationDeck(containerDivElem, config);
                                // }
                            }
                        }
                    },
                    "sep2" : "---------",
                    "reset" : createResetContextMenuItem(config)
                };
                return {
                    'items' : items
                };
            }
        });
    };

    /**
     * context menu uses http://medialize.github.io/jQuery-contextMenu
     */
    var setupCategoricCellContextMenu = function(config) {
        var sampleLinkoutCallback = config['columnTitleCallback'];

        $.contextMenu({
            // selector : ".axis",
            selector : ".categoric",
            trigger : 'left',
            callback : function(key, options) {
                // default callback
                var elem = this[0];
            },
            build : function($trigger, contextmenuEvent) {
                var triggerElem = ($trigger)[0];
                var eventId = triggerElem.getAttribute('eventId');
                var sampleId = triggerElem.getAttribute('sampleId');
                var items = {
                    'title' : {
                        name : eventId + ' for ' + sampleId,
                        icon : null,
                        disabled : true
                    },
                    "sep1" : "---------",
                    "sample_link_out" : {
                        "name" : "go to details for " + sampleId,
                        "icon" : null,
                        "disabled" : false,
                        "callback" : function(key, opt) {
                            sampleLinkoutCallback(sampleId, config);
                        }
                    },
                    "yulia expression rescaling" : {
                        name : "rescale mRNA values using this category",
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

                            setCookieVal(querySettings);

                            var containerDivElem = document.getElementById(config['containerDivId']);
                            od.buildObservationDeck(containerDivElem, config);
                        }
                    },
                    "sep2" : "---------",
                    "reset" : createResetContextMenuItem(config)

                };
                return {
                    'items' : items
                };
            }
        });
    };

    /**
     * context menu uses http://medialize.github.io/jQuery-contextMenu
     */
    var setupSignatureCellContextMenu = function(config) {
        var sampleLinkoutCallback = config['columnTitleCallback'];

        $.contextMenu({
            // selector : ".axis",
            selector : ".signature",
            trigger : 'left',
            callback : function(key, options) {
                // default callback
                var elem = this[0];
            },
            build : function($trigger, contextmenuEvent) {
                var triggerElem = ($trigger)[0];
                var eventId = triggerElem.getAttribute('eventId');
                var sampleId = triggerElem.getAttribute('sampleId');
                var items = {
                    'title' : {
                        name : eventId + ' for ' + sampleId,
                        icon : null,
                        disabled : true
                    },
                    "sep1" : "---------",
                    "sample_link_out" : {
                        "name" : "go to details for " + sampleId,
                        "icon" : null,
                        "disabled" : false,
                        "callback" : function(key, opt) {
                            sampleLinkoutCallback(sampleId, config);
                        }
                    },
                    "sep2s" : "---------",
                    "reset" : createResetContextMenuItem(config)

                };
                return {
                    'items' : items
                };
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
    var drawMatrix = function(containingDiv, config) {
        console.log("*** BEGIN DRAWMATRIX ***");

        var thisElement = utils.removeChildElems(containingDiv);

        // get eventList
        var eventAlbum = config['eventAlbum'];
        // eventAlbum.removeEmptyEvents(0.8);
        eventAlbum.fillInMissingSamples(null);

        eventAlbum.fillInDatatypeLabelEvents("black");

        var groupedEvents = eventAlbum.getEventIdsByType();
        var rowLabelColorMapper = d3.scale.category10();
        var eventList = [];
        for (var datatype in groupedEvents) {
            rowLabelColorMapper(datatype);
            var datatypeEventList = groupedEvents[datatype];
            // console.log('datatype', datatype, 'has', datatypeEventList.length, 'events', '<-- drawMatrix');
            eventList = eventList.concat(datatypeEventList);
        }

        var querySettings = config['querySettings'];

        var getRescalingData = function(OD_eventAlbum, querySettingsObj) {
            var groupedEvents = OD_eventAlbum.getEventIdsByType();
            var rescalingData = null;

            if (utils.hasOwnProperty(groupedEvents, 'expression data') && utils.hasOwnProperty(querySettingsObj, 'expression rescaling')) {
                var rescalingSettings = querySettingsObj['expression rescaling'];
                if (rescalingSettings['method'] === 'yulia_rescaling') {
                    rescalingData = OD_eventAlbum.yuliaExpressionRescaling(rescalingSettings['eventId'], rescalingSettings['val']);
                } else if (rescalingSettings['method'] === 'eventwiseMedianRescaling') {
                    // rescalingData = eventAlbum.zScoreExpressionRescaling();
                    rescalingData = OD_eventAlbum.eventwiseMedianRescaling(["expression data"]);
                } else if (rescalingSettings['method'] === 'zScoreExpressionRescaling') {
                    rescalingData = OD_eventAlbum.zScoreExpressionRescaling();
                } else if (rescalingSettings['method'] === 'samplewiseMedianRescaling') {
                    rescalingData = OD_eventAlbum.samplewiseMedianRescaling();
                } else {
                    // no rescaling
                }
            } else if (utils.hasOwnProperty(groupedEvents, 'expression data')) {
                rescalingData = OD_eventAlbum.eventwiseMedianRescaling(["expression data"]);
            } else {
                console.log('no expression data rescaling');
            }

            // rescalingData = eventAlbum.betweenMeansExpressionRescaling('Small Cell v Adeno', 'Adeno', 'Small Cell');
            return rescalingData;
        };

        var rescalingData = getRescalingData(eventAlbum, querySettings);

        var setColorMappers = function(rescalingData, eventAlbum) {

            /**
             * premap some colors
             */
            var premapColors = function(d3ScaleColormapper, colorSet) {
                var colorSets = {
                    "exclude" : {
                        "exclude" : "gray"
                    },
                    "small cell" : {
                        "exclude" : "gray",
                        "small cell" : "blue",
                        "not small cell" : "red"
                    },
                    "resistance" : {
                        "exclude" : "gray",
                        "naive" : "green",
                        "resistant" : "red"
                    },
                    "pos_neg" : {
                        "exclude" : "gray",
                        "pos" : "red",
                        "neg" : "blue"
                    },
                    "yes_no" : {
                        "exclude" : "gray",
                        "yes" : "green",
                        "no" : "red"
                    },
                    "adeno" : {
                        "exclude" : "gray",
                        "adeno" : "red",
                        "not adeno" : "blue"
                    },
                    //Response Evaluation Criteria in Solid Tumors (RECIST)
                    "recist" : {
                        // Complete Response
                        "cr" : "green",
                        // Partial Response
                        "pr" : "chartreuse",
                        // Stable Disease
                        "sd" : "orange",
                        // Progression of Disease
                        "pd" : "red"
                    }
                };

                // d3.scale.category10().range()
                var colorNames = {
                    "blue" : "#1f77b4",
                    "orange" : "#ff7f0e",
                    "green" : "#2ca02c",
                    "red" : "#d62728",
                    "purple" : "#9467bd",
                    "brown" : "#8c564b",
                    "pink" : "#e377c2",
                    "gray" : "#7f7f7f",
                    "chartreuse" : "#bcbd22",
                    "cyan" : "#17becf"
                };

                var mapping = (_.isUndefined(colorSets[colorSet])) ? {} : colorSets[colorSet];

                // map named colors to color code
                var inputMappings = {};
                if (!_.isUndefined(mapping)) {
                    _.each(mapping, function(value, key) {
                        var color = (_.isUndefined(colorNames[value])) ? value : colorNames[value];
                        inputMappings[key] = color;
                    });
                }

                //  assign pre-mapped colors
                var range = _.values(inputMappings);
                var domain = _.keys(inputMappings);

                // fill in remaining color range
                _.each(_.values(colorNames), function(color) {
                    if (!_.contains(range, color)) {
                        range.push(color);
                    }
                });

                // assign domain and range to color mapper
                d3ScaleColormapper.domain(domain);
                d3ScaleColormapper.range(range);

                // console.log("range", d3ScaleColormapper.range());
                // console.log("domain", d3ScaleColormapper.domain());
            };

            var expressionColorMapper = utils.centeredRgbaColorMapper(false);
            if (rescalingData != null) {
                var minExpVal = rescalingData['minVal'];
                var maxExpVal = rescalingData['maxVal'];
                expressionColorMapper = utils.centeredRgbaColorMapper(false, 0, minExpVal, maxExpVal);
            }

            var ordinalColorMappers = {};
            var ordinalTypes = utils.getKeys(eventAlbum.ordinalScoring);
            for (var i = 0, length = ordinalTypes.length; i < length; i++) {
                var allowedVals = ordinalTypes[i];
                var scoreVals = utils.getValues(eventAlbum.ordinalScoring[allowedVals]);
                var colorMapper = utils.centeredRgbaColorMapper(false, 0, jStat.min(scoreVals), jStat.max(scoreVals));
                ordinalColorMappers[allowedVals] = colorMapper;
            }

            // assign color mappers
            var colorMappers = {};
            for (var i = 0; i < eventList.length; i++) {
                var eventId = eventList[i];
                var allowedValues = eventAlbum.getEvent(eventId).metadata.allowedValues;
                if (allowedValues == 'categoric') {
                    var colorMapper = d3.scale.category10();
                    // TODO set a premapping color scheme dependent upon event
                    // colorSets ["exclude", "small cell", "resistance", "pos_neg", "yes_no", "adeno"]
                    var eventId_lc = eventId.toLowerCase();
                    var colorSet;
                    if (_.contains(["smallcell", "small_cell", "trichotomy"], eventId_lc)) {
                        colorSet = "small cell";
                    } else if (_.contains(["enzalutamide", "abiraterone", "docetaxel"], eventId_lc)) {
                        colorSet = "resistance";
                    } else if (_.contains(["mutations", "primary hr"], eventId_lc)) {
                        colorSet = "yes_no";
                    } else if (_.contains(["pten-ihc", "ar-fish"], eventId_lc)) {
                        colorSet = "pos_neg";
                    } else {
                        colorSet = "exclude";
                    }
                    premapColors(colorMapper, colorSet);
                    colorMappers[eventId] = colorMapper;
                } else if (allowedValues == 'numeric') {
                    // 0-centered color mapper
                    var eventObj = eventAlbum.getEvent(eventId);
                    var minAllowedVal = eventObj.metadata.minAllowedVal;
                    var maxAllowedVal = eventObj.metadata.maxAllowedVal;
                    if (( typeof minAllowedVal != "undefined") && ( typeof maxAllowedVal != "undefined")) {
                        // value range given in metadata
                        colorMappers[eventId] = utils.centeredRgbaColorMapper(false, 0, minAllowedVal, maxAllowedVal);
                    } else {
                        // value range computed from event data
                        var vals = eventAlbum.getEvent(eventId).data.getValues();
                        var numbers = [];
                        for (var j = 0; j < vals.length; j++) {
                            var val = vals[j];
                            if (utils.isNumerical(val)) {
                                numbers.push(val);
                            }
                        }
                        var minVal = Math.min.apply(null, numbers);
                        var maxVal = Math.max.apply(null, numbers);
                        colorMappers[eventId] = utils.centeredRgbaColorMapper(false, 0, minVal, maxVal);
                    }
                } else if (allowedValues == 'expression') {
                    // shared expression color mapper
                    colorMappers[eventId] = expressionColorMapper;
                } else if (eventAlbum.ordinalScoring.hasOwnProperty(allowedValues)) {
                    // ordinal data
                    colorMappers[eventId] = ordinalColorMappers[allowedValues];
                } else {
                    var colorMapper = d3.scale.category10();
                    colorMappers[eventId] = colorMapper;
                }
            }
            return colorMappers;
        };

        var colorMappers = setColorMappers(rescalingData, eventAlbum);

        var getColSortSteps = function(querySettings) {
            var colSortSteps = null;
            if ("colSort" in querySettings) {
                colSortSteps = new eventData.sortingSteps(querySettings["colSort"]["steps"]);
                for (var i = colSortSteps.getSteps().length - 1; i >= 0; i--) {
                    var step = colSortSteps.steps[i];
                    var name = step['name'];
                    if (eventAlbum.getEvent(name)) {
                        // event exists
                    } else {
                        // ignore events that are not found
                        console.log(name, 'not found, skip sorting by that event');
                        colSortSteps.removeStep(name);
                    }
                }
            }

            // column sort by pivot row -- old way
            if (utils.hasOwnProperty(querySettings, 'pivot_sort')) {
                var pivotSortSettings = querySettings['pivot_sort'];
                var pivotEvent = pivotSortSettings['pivot_event'];
                if (colSortSteps == null) {
                    colSortSteps = new eventData.sortingSteps();
                }
                if (eventAlbum.getEvent(pivotEvent)) {
                    // event exists
                    colSortSteps.addStep(pivotEvent, true);
                }
            }
            return colSortSteps;
        };

        var colSortSteps = getColSortSteps(querySettings);
        console.log("colSortSteps", colSortSteps);

        var getRowSortSteps = function(querySettings) {
            var rowSortSteps = null;
            if ('rowSort' in querySettings) {
                rowSortSteps = new eventData.sortingSteps(querySettings["rowSort"]["steps"]);
                for (var i = rowSortSteps.getSteps().length - 1; i >= 0; i--) {
                    var step = rowSortSteps.steps[i];
                    var name = step['name'];
                    if (eventAlbum.getEvent(name)) {
                        // event exists
                    } else {
                        // ignore events that are not found
                        console.log(name, 'not found, skip sorting by that event');
                        rowSortSteps.removeStep(name);
                    }
                }
            }
            return rowSortSteps;
        };

        var rowSortSteps = getRowSortSteps(querySettings);

        var getColNames = function(querySettings, eventAlbum, colSortSteps) {
            // get column names
            var colNames = null;

            colNames = eventAlbum.multisortSamples(colSortSteps);

            // find samples to hide
            var samplesToHide = [];
            if ('hide_null_samples_event' in querySettings) {
                var hide_null_samples_event = querySettings['hide_null_samples_event'];
                console.log("hide_null_samples_event", hide_null_samples_event);

                try {
                    var hideNullsEventObj = eventAlbum.getEvent(hide_null_samples_event);
                    var nullSamples = hideNullsEventObj.data.getNullSamples();
                    samplesToHide = samplesToHide.concat(nullSamples);
                } catch(error) {
                    console.log('ERROR while getting samples to hide in eventID:', hide_null_samples_event, 'error.message ->', error.message);
                } finally {
                    console.log('samplesToHide', samplesToHide);
                }
            } else if ("hide_null_samples_datatype" in querySettings) {
                var hide_null_samples_datatype = querySettings["hide_null_samples_datatype"];
                console.log("hide_null_samples_datatype", hide_null_samples_datatype);

                samplesToHide = eventAlbum.getDatatypeNullSamples(hide_null_samples_datatype);
            }

            // always hide clinical null samples
            var clinicalNullSamples = eventAlbum.getDatatypeNullSamples("clinical data");
            samplesToHide = samplesToHide.concat(clinicalNullSamples);

            samplesToHide = utils.eliminateDuplicates(samplesToHide);

            // colNames after hiding null samples
            var newColNames = [];
            for (var ci = 0; ci < colNames.length; ci++) {
                var colName = colNames[ci];
                if (utils.isObjInArray(config['displayedSamples'], colName)) {
                    // make sure displayedSamples are shown
                    newColNames.push(colName);
                } else if (utils.isObjInArray(samplesToHide, colName)) {
                    // samples have been specified for hiding
                    continue;
                } else if (config['displayedSamples'].length == 0) {
                    // no displayedSamples specified, so show them all by default
                    newColNames.push(colName);
                }
            }
            colNames = newColNames;
            // console.log('colNames:' + colNames);

            return colNames;
        };

        var colNames = getColNames(querySettings, eventAlbum, colSortSteps);

        // map colNames to numbers
        var colNameMapping = new Object();
        for (var i in colNames) {
            var name = colNames[i];
            colNameMapping[name] = i;
        }

        // get row names and map to numbers

        var getRowNames = function(querySettings, eventAlbum, colSortSteps, rowSortSteps) {

            var rowNames = eventAlbum.multisortEvents(rowSortSteps, colSortSteps);
            // console.log("rowNames", rowNames);

            // groupedPivotSorts ... uses pivot scoring on server side
            // TODO what about events that are in the album, but not in the pivot data?
            if (utils.hasOwnProperty(querySettings, 'pivot_sort_list')) {
                console.log('querySettings has a pivot_sort_list of datatypes', querySettings['pivot_sort_list']);
                rowNames = [];
                var pivotSortedRowNames = [];
                var pEventId = querySettings['pivot_event']['id'];
                var pEventObj = eventAlbum.getEvent(pEventId);
                var groupedPivotSorts = eventAlbum.getGroupedPivotSorts(pEventId);

                for (var datatype in groupedPivotSorts) {
                    // section header rows
                    var eventIds;
                    if (datatype === "datatype label") {
                        // skip the "datatype label" datatype
                        eventIds = [];
                    } else {
                        // events
                        eventIds = groupedPivotSorts[datatype];
                        // datatype label for correlated events
                        eventIds.unshift(datatype + "(+)");
                        // datatype label for anti-correlated events
                        eventIds.push(datatype + "(-)");
                    }
                    pivotSortedRowNames = pivotSortedRowNames.concat(eventIds);
                    // console.log(datatype, eventIds);
                }
                rowNames = pivotSortedRowNames.concat(rowNames);
                rowNames = utils.eliminateDuplicates(rowNames);
            }

            // console.log("rowNames", rowNames);

            // hide rows of datatype, preserving relative ordering
            var hiddenDatatypes = querySettings['hiddenDatatypes'] || [];
            var hiddenEvents = querySettings['hiddenEvents'] || [];
            var shownNames = [];

            var albumEventIds = eventAlbum.getAllEventIds();
            // console.log("albumEventIds", albumEventIds);

            for (var i = 0; i < rowNames.length; i++) {
                var rowName = rowNames[i];
                if (!utils.isObjInArray(albumEventIds, rowName)) {
                    // event doesn't exist ... skip
                    continue;
                }
                var datatype = eventAlbum.getEvent(rowName).metadata.datatype;
                if ((utils.isObjInArray(hiddenDatatypes, datatype)) || (utils.isObjInArray(hiddenEvents, rowName))) {
                    continue;
                }
                shownNames.push(rowName);
            }
            // console.log("shownNames", shownNames);
            rowNames = shownNames;

            // move pivot event to top of matrix (1st row)
            var pivotEventId = null;
            if (querySettings['pivot_event'] != null) {
                pivotEventId = querySettings['pivot_event']['id'];
                console.log('moving pivot event to top:', pivotEventId);
                rowNames.unshift(pivotEventId);
                rowNames = utils.eliminateDuplicates(rowNames);
            }

            // confirm events in rowNames exist in eventAlbum
            var confirmedEvents = [];
            for (var i = 0, length = rowNames.length; i < length; i++) {
                var eventId = rowNames[i];
                var eventObj = eventAlbum.getEvent(eventId);
                if (eventObj) {
                    // eventObj exists
                    confirmedEvents.push(eventId);
                } else {
                    console.log('eventObj not found for', eventId);
                }
            }
            rowNames = confirmedEvents;

            return rowNames;
        };

        var rowNames = getRowNames(querySettings, eventAlbum, colSortSteps, rowSortSteps);
        // console.log("rowNames", rowNames);

        // bring pivot event to top the top
        var pivotEventId = null;
        if (querySettings['pivot_event'] != null) {
            pivotEventId = querySettings['pivot_event']['id'];
            console.log('moving pivot event to top:', pivotEventId);
            rowNames.unshift(pivotEventId);
            rowNames = utils.eliminateDuplicates(rowNames);
        }

        /**
         * For each submatrix, find first index, last index, and row count.
         */
        var getBoundariesBetweenDatatypes = function() {
            var pivotEventObj = eventAlbum.getEvent(pivotEventId);
            if (_.isUndefined(pivotEventObj)) {
                return {};
            }
            var pivotEventDatatype = pivotEventObj.metadata.datatype;
            // pivot results for clinical data give top 5 only due to ANOVA score
            // var pageSize = (pivotEventDatatype === "clinical data") ? 5 : 10;
            var pageSize = 5;

            var rowNames_copy = rowNames.slice();
            rowNames_copy.reverse();
            var boundaries = {};
            _.each(rowNames_copy, function(rowName, index) {
                var eventObj = eventAlbum.getEvent(rowName);
                var datatype = eventObj.metadata.datatype;
                if (datatype === "datatype label" && datatype !== "mutation call") {
                    return;
                }
                if (_.isUndefined(boundaries[datatype])) {
                    boundaries[datatype] = {
                        "first" : index,
                        "last" : index
                    };
                } else {
                    if (boundaries[datatype]["last"] == index - 1) {
                        boundaries[datatype]["last"] = index;
                    }
                }
                boundaries[datatype]["count"] = boundaries[datatype]["last"] - boundaries[datatype]["first"] + 1;
            });

            // get non-correlator gene lists
            var sessionGeneList = getSession("geneList") || [];
            var cohort_tab_genelist_widget = getSession("cohort_tab_genelist_widget") || [];
            sessionGeneList = sessionGeneList.concat(cohort_tab_genelist_widget);

            // get +/- tags for row labels
            var rowNames_copy = rowNames.slice();
            rowNames_copy.reverse();
            var taggedEvents = {};
            var scoredEvents = _.pluck(eventAlbum.getPivotSortedEvents(pivotEventId), "key");
            _.each(_.keys(boundaries), function(datatype) {
                if (datatype !== "clinical data" && datatype !== "mutation call") {
                    var data = boundaries[datatype];
                    var datatypeNames = [];
                    var suffix = eventAlbum.datatypeSuffixMapping[datatype];
                    for (var i = data["first"]; i < data["last"] + 1; i++) {
                        var rowName = rowNames_copy[i];
                        var geneName = rowName.replace(suffix, "");
                        if (! _.contains(sessionGeneList, geneName)) {
                            datatypeNames.push(rowName);
                        }
                    }
                    var corrEvents = datatypeNames.reverse();
                    _.each(corrEvents.slice(0, pageSize), function(posEvent) {
                        taggedEvents[posEvent] = "+";
                    });
                    // fix: wrong tagging when there are user-added events
                    if (pivotEventDatatype !== "clinical data") {
                        _.each(corrEvents.slice(pageSize), function(negEvent) {
                            if (_.contains(scoredEvents, negEvent.replace(suffix, ""))) {
                                taggedEvents[negEvent] = "-";
                            }
                        });
                    }
                }
            });

            return taggedEvents;
        };

        // TODO determine boundaries between pos/neg-correlated events
        if (!_.isNull(pivotEventId)) {
            var taggedEvents = getBoundariesBetweenDatatypes();
        }

        // assign row numbers to row names
        var rowNameMapping = new Object();
        for (var i in rowNames) {
            var name = rowNames[i];
            rowNameMapping[name] = i;
        }

        // setup margins

        var longestColumnName = utils.lengthOfLongestString(colNames);
        var longestRowName = utils.lengthOfLongestString(rowNames);

        console.log('longestRowName', longestRowName);

        var margin = {
            // "top" : ((longestColumnName > 3) ? (9 * longestColumnName) : 30),
            "top" : 10,
            "right" : 0,
            "bottom" : 0,
            "left" : ((longestRowName > 1) ? (8 * (longestRowName + 1)) : 15)
        };

        // document.documentElement.clientWidth
        var fullWidth = document.documentElement.clientWidth;
        var width = fullWidth - margin.left - margin.right;
        var denom = (colNames.length > rowNames.length) ? colNames.length : rowNames.length;
        var gridSize = Math.floor(width / denom);

        var minGridSize = 13;
        // gridSize = (gridSize > minGridSize) ? gridSize : minGridSize;
        // console.log('gridSize', gridSize, 'margin', (margin));

        if (gridSize <= minGridSize) {
            gridSize = minGridSize;
            fullWidth = (gridSize * denom) + margin.left + margin.right;
        }

        gridSize = minGridSize;
        console.log('gridSize', gridSize, 'margin', (margin));

        // document.documentElement.clientHeight
        var fullHeight = (margin.top + margin.bottom) + (gridSize * rowNames.length);
        var height = fullHeight - margin.top - margin.bottom;

        // SVG canvas
        var svg = d3.select(thisElement).append("svg").attr({
            // "width" : fullWidth + 0,
            "width" : fullWidth,
            "height" : fullHeight,
            // "viewBox" : "42 0 " + (fullWidth) + " " + (fullHeight),
            "viewBox" : "0 0 " + (fullWidth) + " " + (fullHeight),
            "perserveAspectRatio" : "xMinYMin meet"
        }).append("g").attr({
            "transform" : "translate(" + margin.left + "," + margin.top + ")"
        });

        var primerSvgRectElem = utils.createSvgRectElement(0, 0, 0, 0, fullWidth, fullHeight, {
            "fill" : "white",
            "class" : "primer"
        });

        // draw the matrix on a white background b/c color gradient varies alpha values
        svg.append('rect').attr({
            "x" : 0,
            "y" : 0,
            "rx" : 0,
            "ry" : 0,
            // "width" : width,
            // "height" : height,
            "width" : gridSize * colNames.length,
            "height" : gridSize * rowNames.length,
            "fill" : "white",
            "class" : "primer"
        });

        // row labels
        try {
            var sessionGeneLists = config["sessionGeneLists"] || {};
            var nonCorrGeneList = _.union.apply(this, (_.values(sessionGeneLists)));
            var nonUnderlineableDatatypes = ["datatype label"];

            var translateX = -6;
            var translateY = gridSize / 1.5;
            var rowLabels = svg.selectAll(".rowLabel").data(rowNames).enter().append("text").text(function(d) {
                var eventObj = eventAlbum.getEvent(d);
                var displayName = eventObj.metadata.displayName;
                var datatype = eventObj.metadata.datatype;
                if (datatype === "datatype label") {
                    displayName = displayName.toUpperCase();
                }

                // TODO hack to shorten signature names to remove type
                if (datatype === "mvl drug sensitivity") {
                    displayName = d.replace("_mvl_drug_sensitivity", "");
                } else if (datatype === "tf target activity") {
                    displayName = d.replace("_tf_viper", "");
                } else if (datatype === "kinase target activity") {
                    displayName = d.replace("_kinase_viper", "");
                }

                // remove version number
                displayName = displayName.replace(/_v\d+$/, "");

                if (!_.isUndefined(taggedEvents)) {
                    var tag = taggedEvents[d];
                    if (!_.isUndefined(tag)) {
                        displayName = displayName + " " + tag;
                    }
                }

                return displayName;
            }).attr({
                "x" : 0,
                "y" : function(d, i) {
                    return i * gridSize;
                },
                "transform" : "translate(" + translateX + ", " + translateY + ")",
                "class" : function(d, i) {
                    var eventObj = eventAlbum.getEvent(d);
                    var datatype = eventObj.metadata.datatype;
                    var s;
                    if (datatype === "datatype label") {
                        s = "typeLabel mono axis unselectable";
                    } else {
                        s = "rowLabel mono axis unselectable";
                        if (d === pivotEventId) {
                            s = s + " bold italic";
                            // s = s + " pivotEvent";
                        }
                    }

                    // underline genes added via geneset control
                    // underline to indicate user-selected events
                    if (pivotEventId != null) {
                        if (! _.contains(nonUnderlineableDatatypes, datatype)) {
                            var suffix = eventAlbum.datatypeSuffixMapping[datatype];
                            var regex = new RegExp(suffix + "$");
                            var geneName = d.replace(regex, "");
                            if (_.contains(nonCorrGeneList, geneName)) {
                                s = s + " underline";
                            } else {
                                var editedLabel = d.split("_",1)[0];
                                if (_.contains(nonCorrGeneList, editedLabel)) {
                                    s = s + " underline";
                                }
                            }
                        }
                    }

                    return s;
                },
                'eventId' : function(d, i) {
                    return d;
                },
                'datatype' : function(d, i) {
                    var eventObj = eventAlbum.getEvent(d);
                    var datatype = eventObj.metadata.datatype;
                    return datatype;
                }
            }).style("text-anchor", "end").style("fill", function(d) {
                var eventObj = eventAlbum.getEvent(d);
                var datatype = eventObj.metadata.datatype;
                if (datatype === "datatype label") {
                    return "black";
                } else {
                    return rowLabelColorMapper(datatype);
                }
            });
            // rowLabels.on("click", config["rowClickback"]);
            // rowLabels.on("contextmenu", config["rowRightClickback"]);

            // map event to pivot score
            var pivotScoresMap;
            if (pivotEventId != null) {
                pivotScoresMap = {};
                var pivotSortedEvents = eventAlbum.getPivotSortedEvents(pivotEventId);
                for (var i = 0, lengthi = pivotSortedEvents.length; i < lengthi; i++) {
                    var pivotObj = pivotSortedEvents[i];
                    var key = pivotObj["key"];
                    var val = pivotObj["val"];
                    pivotScoresMap[key] = val;
                    // console.log(pivotEventId, key);
                }
            }

            rowLabels.append("title").text(function(d, i) {
                var eventObj = eventAlbum.getEvent(d);
                var datatype = eventObj.metadata.datatype;
                var allowedValues = eventObj.metadata.allowedValues;
                var s = 'event: ' + d + '\ndatatype: ' + datatype;

                if ((allowedValues === 'numeric') && (rescalingData != null) && (utils.hasOwnProperty(rescalingData, 'stats')) && ( typeof rescalingData['stats'][d] !== 'undefined')) {
                    s = s + '\nraw data stats: ' + utils.prettyJson(rescalingData['stats'][d]);
                }

                if ( typeof pivotScoresMap !== "undefined") {
                    var val = pivotScoresMap[d];
                    if ( typeof val === "undefined") {
                        // try _mRNA suffix
                        var key = d.replace(/_mRNA$/, "");
                        val = pivotScoresMap[key];
                    }

                    if ( typeof val !== "undefined") {
                        s = s + "\npivot score: " + val;
                    }
                }

                return s;
            });

        } catch(err) {
            console.log("ERROR drawing row labels:", err.name);
            console.log("--", err.message);
            resetObsDeck(config);
        } finally {
            console.log("finished drawing row labels");
        }

        // col labels
        try {
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
                    return "colLabel mono axis unselectable hidden";
                },
                "sample" : function(d, i) {
                    return d;
                }
            }).style("text-anchor", "start");
            // colLabels.on("click", config["columnClickback"]);
            // colLabels.on("contextmenu", config["columnRightClickback"]);
            colLabels.append("title").text(function(d) {
                var s = 'sample: ' + d;
                return s;
            });

        } catch(err) {
            console.log("ERROR drawing column labels:", err.name);
            console.log("--", err.message);
        } finally {
            console.log("finished drawing column labels");
        }

        // SVG elements for heatmap cells
        var dataList = eventAlbum.getAllDataAsList();
        var showDataList = [];
        for (var i = 0; i < dataList.length; i++) {
            var dataListObj = dataList[i];
            var eventId = dataListObj['eventId'];
            if (!utils.isObjInArray(rowNames, eventId)) {
                continue;
            } else {
                showDataList.push(dataListObj);
            }
        }

        /**
         * Create an SVG group element icon to put in the matrix cell.
         * @param {Object} x
         * @param {Object} y
         * @param {Object} rx
         * @param {Object} ry
         * @param {Object} width
         * @param {Object} height
         * @param {Object} attributes
         */
        var createMutTypeSvg = function(x, y, rx, ry, width, height, attributes) {
            var iconGroup = document.createElementNS(utils.svgNamespaceUri, "g");
            utils.setElemAttributes(iconGroup, {
                "class" : "mutTypeIconGroup"
            });

            var types = attributes["val"];
            // types.push("complex");

            // background of cell
            attributes["fill"] = "lightgrey";
            iconGroup.appendChild(utils.createSvgRectElement(x, y, rx, ry, width, height, attributes));
            delete attributes["stroke-width"];

            if ((utils.isObjInArray(types, "ins")) || (utils.isObjInArray(types, "complex"))) {
                attributes["fill"] = "red";
                var topHalfIcon = utils.createSvgRectElement(x, y, rx, ry, width, height / 2, attributes);
                iconGroup.appendChild(topHalfIcon);
            }
            if ((utils.isObjInArray(types, "del")) || (utils.isObjInArray(types, "complex"))) {
                attributes["fill"] = "blue";
                var bottomHalfIcon = utils.createSvgRectElement(x, y + height / 2, rx, ry, width, height / 2, attributes);
                iconGroup.appendChild(bottomHalfIcon);
            }
            if ((utils.isObjInArray(types, "snp")) || (utils.isObjInArray(types, "complex"))) {
                attributes["fill"] = "green";
                var centeredCircleIcon = utils.createSvgCircleElement(x + width / 2, y + height / 2, height / 4, attributes);
                iconGroup.appendChild(centeredCircleIcon);
            }
            return iconGroup;
        };

        try {
            var heatMap = svg.selectAll(".cell").data(showDataList).enter().append(function(d, i) {
                var getUpArrowPointsList = function(x, y, width, height) {
                    var pointsList = [];
                    pointsList.push(((width / 2) + x) + "," + (0 + y));
                    pointsList.push((width + x) + "," + (height + y));
                    pointsList.push((0 + x) + "," + (height + y));
                    return pointsList;
                };

                var getDownArrowPointsList = function(x, y, width, height) {
                    var pointsList = [];
                    pointsList.push(((width / 2) + x) + "," + (height + y));
                    pointsList.push((width + x) + "," + (0 + y));
                    pointsList.push((0 + x) + "," + (0 + y));
                    return pointsList;
                };

                var group = document.createElementNS(utils.svgNamespaceUri, "g");
                group.setAttributeNS(null, "class", "cell unselectable");

                var colName = d['id'];
                if (! utils.hasOwnProperty(colNameMapping, colName)) {
                    return group;
                }

                var strokeWidth = 2;
                var x = (colNameMapping[d['id']] * gridSize);
                var y = (rowNameMapping[d['eventId']] * gridSize);
                var rx = 0;
                var ry = rx;
                var width = gridSize - (0.5 * strokeWidth);
                var height = width;

                var type = d['eventId'];
                var val = d['val'];
                var colorMapper = colorMappers[d['eventId']];

                var getFill = function(d) {
                    var allowed_values = eventAlbum.getEvent(d['eventId']).metadata.allowedValues;
                    var val = d["val"];
                    if (_.isString(val)) {
                        val = val.toLowerCase();
                    }
                    // if (eventAlbum.ordinalScoring.hasOwnProperty(allowed_values)) {
                    // var score = eventAlbum.ordinalScoring[allowed_values][val];
                    // return colorMapper(score);
                    // } else {
                    // return colorMapper(val);
                    // }
                    return colorMapper(val);
                };

                // pivot background
                var pivotEventObj;
                var pivotEventColorMapper;
                var strokeOpacity = 1;
                if (pivotEventId != null) {
                    pivotEventObj = eventAlbum.getEvent(pivotEventId);
                    pivotEventColorMapper = colorMappers[pivotEventId];
                    strokeOpacity = 0.4;
                }

                var getStroke = function(d) {
                    var grey = "#E6E6E6";
                    var stroke;
                    if (_.isUndefined(pivotEventColorMapper) || d["eventId"] === pivotEventId) {
                        stroke = grey;
                    } else {
                        // use fill for sample pivot event value
                        var sampleId = d["id"];
                        var data = pivotEventObj.data.getData([sampleId]);
                        var val = data[0]["val"];
                        if (val === null) {
                            stroke = grey;
                        } else {
                            // !!! colors are mapped to lowercase of strings !!!
                            if (_.isString(val)) {
                                val = val.toLowerCase();
                            }
                            stroke = pivotEventColorMapper(val);
                        }
                    }
                    return stroke;
                };

                if ((type === null) || (d['val'] === null)) {
                    // final rectangle for null values
                    var attributes = {
                        "fill" : "lightgrey",
                        "stroke" : getStroke(d),
                        "stroke-width" : strokeWidth,
                        "stroke-opacity" : strokeOpacity
                    };
                    group.appendChild(utils.createSvgRectElement(x, y, rx, ry, width, height, attributes));
                    return group;
                } else {
                    // draw over the primer rectangle instead of drawing a background for each cell
                    // background for icons
                    // attributes["fill"] = "white";
                    // attributes["fill"] = rowLabelColorMapper(eventAlbum.getEvent(d['eventId']).metadata.datatype)
                }
                // group.appendChild(utils.createSvgRectElement(x, y, rx, ry, width, height, attributes));

                var attributes = {
                    "stroke" : getStroke(d),
                    "stroke-width" : strokeWidth,
                    "fill" : getFill(d),
                    "stroke-opacity" : strokeOpacity
                };
                var icon;
                if (eventAlbum.getEvent(d['eventId']).metadata.allowedValues === 'categoric') {
                    attributes['class'] = 'categoric';
                    attributes['eventId'] = d['eventId'];
                    attributes['sampleId'] = d['id'];
                    attributes['val'] = d['val'];
                    icon = utils.createSvgRectElement(x, y, rx, ry, width, height, attributes);
                } else if (eventAlbum.getEvent(d['eventId']).metadata.datatype === 'expression data') {
                    attributes['class'] = 'mrna_exp';
                    attributes['eventId'] = d['eventId'];
                    attributes['sampleId'] = d['id'];
                    attributes['val'] = d['val'];
                    icon = utils.createSvgRectElement(x, y, rx, ry, width, height, attributes);
                } else if (utils.isObjInArray(["expression signature", "kinase target activity", "tf target activity", "mvl drug sensitivity"], eventAlbum.getEvent(d['eventId']).metadata.datatype)) {
                    attributes['class'] = "signature";
                    attributes['eventId'] = d['eventId'];
                    attributes['sampleId'] = d['id'];
                    attributes['val'] = d['val'];
                    icon = utils.createSvgRectElement(x, y, rx, ry, width, height, attributes);
                } else if (eventAlbum.getEvent(d['eventId']).metadata.datatype === 'mutation call') {
                    // oncoprint-style icons
                    attributes['class'] = "signature";
                    attributes['eventId'] = d['eventId'];
                    attributes['sampleId'] = d['id'];
                    // val is a list of mutation types
                    attributes['val'] = d['val'].sort();

                    icon = createMutTypeSvg(x, y, rx, ry, width, height, attributes);
                } else if (false & eventAlbum.getEvent(d['eventId']).metadata.datatype === "datatype label") {
                    // datatype label cells
                    var eventId = d["eventId"];
                    var datatype;
                    var headOrTail;
                    if (utils.endsWith(eventId, "(+)")) {
                        datatype = eventId.replace("(+)", "");
                        headOrTail = "head";
                    } else {
                        datatype = eventId.replace("(-)", "");
                        headOrTail = "tail";
                    }
                    attributes['class'] = "datatype";
                    attributes['eventId'] = datatype;
                    attributes["fill"] = rowLabelColorMapper(datatype);
                    var colNameIndex = colNameMapping[colName];
                    if (colNameIndex == 0) {
                        attributes["stroke-width"] = "0px";
                        group.onclick = function() {
                            var upOrDown = (headOrTail === "head") ? "down" : "up";
                            setDatatypePaging(datatype, headOrTail, upOrDown);
                        };
                        attributes["points"] = getUpArrowPointsList(x, y, width, height).join(" ");

                        icon = utils.createSVGPolygonElement(attributes);
                    } else if (colNameIndex == 1) {
                        attributes["stroke-width"] = "0px";
                        group.onclick = function() {
                            var upOrDown = (headOrTail === "head") ? "up" : "down";
                            setDatatypePaging(datatype, headOrTail, upOrDown);
                        };
                        attributes["points"] = getDownArrowPointsList(x, y, width, height).join(" ");
                        icon = utils.createSVGPolygonElement(attributes);
                    } else if (colNameIndex == 2) {
                        icon = document.createElementNS(utils.svgNamespaceUri, "g");
                        attributes["stroke-width"] = "0px";
                        group.onclick = function() {
                            setDatatypePaging(datatype, headOrTail, "0");
                        };
                        var bar;
                        var arrow;
                        if (headOrTail === "head") {
                            bar = utils.createSvgRectElement(x, y, 0, 0, width, 2, attributes);
                            attributes["points"] = getUpArrowPointsList(x, y, width, height).join(" ");
                            arrow = utils.createSVGPolygonElement(attributes);
                        } else {
                            bar = utils.createSvgRectElement(x, y + height - 3, 0, 0, width, 2, attributes);
                            attributes["points"] = getDownArrowPointsList(x, y + 1, width, height - 2).join(" ");
                            arrow = utils.createSVGPolygonElement(attributes);
                        }
                        icon.appendChild(bar);
                        icon.appendChild(arrow);
                    } else {
                        attributes["stroke-width"] = "0px";
                        attributes["fill"] = rowLabelColorMapper(datatype);
                        icon = utils.createSvgRectElement(x, (1 + y + (height / 2)), 0, 0, width, 2, attributes);
                    }
                } else if (true & eventAlbum.getEvent(d['eventId']).metadata.datatype === "datatype label") {
                    var eventId = d["eventId"];
                    var datatype;
                    var headOrTail;
                    if (utils.endsWith(eventId, "(+)")) {
                        datatype = eventId.replace("(+)", "");
                        headOrTail = "head";
                    } else {
                        datatype = eventId.replace("(-)", "");
                        headOrTail = "tail";
                    }

                    // https://en.wikipedia.org/wiki/List_of_Unicode_characters
                    // http://www.fileformat.info/info/unicode/char/search.htm
                    // http://shapecatcher.com/
                    // http://www.charbase.com/block/miscellaneous-symbols-and-pictographs
                    // https://stackoverflow.com/questions/12036038/is-there-unicode-glyph-symbol-to-represent-search?lq=1
                    // use "C/C++/Java source code" from search results: http://www.fileformat.info/info/unicode/char/search.htm
                    var glyphs = {
                        "upArrow" : "\u2191",
                        "downArrow" : "\u2193",
                        "upArrowBar" : "\u2912",
                        "downArrowBar" : "\u2913",
                        "magGlass" : "\uD83D\uDD0E",
                        "ghost" : "\uD83D\uDC7B"
                    };

                    attributes['class'] = "datatype";
                    attributes['eventId'] = datatype;
                    attributes["fill"] = rowLabelColorMapper(datatype);
                    var colNameIndex = colNameMapping[colName];

                    // if (querySettings['pivot_event'] == null) {
                    // attributes["stroke-width"] = "0px";
                    // attributes["fill"] = rowLabelColorMapper(datatype);
                    // icon = utils.createSvgRectElement(x, (1 + y + (height / 2)), 0, 0, width, 2, attributes);
                    // } else

                    if (colNameIndex == 0) {
                        // up
                        icon = document.createElementNS(utils.svgNamespaceUri, "g");
                        attributes["stroke-width"] = "0px";
                        group.onclick = function() {
                            var upOrDown = (headOrTail === "head") ? "down" : "up";
                            setDatatypePaging(datatype, headOrTail, upOrDown);
                        };
                        attributes["points"] = getUpArrowPointsList(x, y, width, height).join(" ");
                        var polygon = utils.createSvgRectElement(x, y, 0, 0, width, height, attributes);

                        var labelAttributes = {
                            "font-size" : 16,
                            "fill" : "lightgray",
                            // "x" : x + 1.3,
                            "text-anchor" : "middle",
                            "x" : x + (gridSize / 2),
                            "y" : y + 10
                        };

                        var label = document.createElementNS(utils.svgNamespaceUri, "text");
                        utils.setElemAttributes(label, labelAttributes);

                        var textNode = document.createTextNode(glyphs.upArrow);
                        label.appendChild(textNode);

                        icon.appendChild(polygon);
                        icon.appendChild(label);
                    } else if (colNameIndex == 1) {
                        // down
                        icon = document.createElementNS(utils.svgNamespaceUri, "g");
                        attributes["stroke-width"] = "0px";
                        group.onclick = function() {
                            var upOrDown = (headOrTail === "head") ? "up" : "down";
                            setDatatypePaging(datatype, headOrTail, upOrDown);
                        };
                        attributes["points"] = getDownArrowPointsList(x, y, width, height).join(" ");
                        var polygon = utils.createSvgRectElement(x, y, 0, 0, width, height, attributes);

                        var labelAttributes = {
                            "font-size" : 16,
                            "fill" : "lightgray",
                            "text-anchor" : "middle",
                            "x" : x + (gridSize / 2),
                            "y" : y + 10
                        };

                        var label = document.createElementNS(utils.svgNamespaceUri, "text");
                        utils.setElemAttributes(label, labelAttributes);

                        var textNode = document.createTextNode(glyphs.downArrow);
                        label.appendChild(textNode);

                        icon.appendChild(polygon);
                        icon.appendChild(label);
                    } else if (colNameIndex == 2) {
                        // top or bottom
                        icon = document.createElementNS(utils.svgNamespaceUri, "g");
                        attributes["stroke-width"] = "0px";
                        group.onclick = function() {
                            setDatatypePaging(datatype, headOrTail, "0");
                        };
                        var polygon = utils.createSvgRectElement(x, y, 0, 0, width, height, attributes);
                        var textNode;
                        if (headOrTail === "head") {
                            textNode = document.createTextNode(glyphs.upArrowBar);
                        } else {
                            textNode = document.createTextNode(glyphs.downArrowBar);
                        }

                        var labelAttributes = {
                            "font-size" : 16,
                            "fill" : "lightgray",
                            "text-anchor" : "middle",
                            "x" : x + (gridSize / 2),
                            "y" : y + 12.5
                        };

                        var label = document.createElementNS(utils.svgNamespaceUri, "text");
                        utils.setElemAttributes(label, labelAttributes);
                        label.appendChild(textNode);
                        icon.appendChild(polygon);
                        icon.appendChild(label);
                    } else {
                        // section lines
                        attributes["stroke-width"] = "0px";
                        attributes["fill"] = rowLabelColorMapper(datatype);
                        icon = utils.createSvgRectElement(x, (1 + y + (height / 2)), 0, 0, width, 2, attributes);
                    }
                }
                group.appendChild(icon);

                return group;
            });

            // heatmap click event
            // heatMap.on("click", config["cellClickback"]).on("contextmenu", config["cellRightClickback"]);

            // heatmap titles
            heatMap.append("title").text(function(d) {
                var eventId = d["eventId"];
                var datatype = eventAlbum.getEvent(eventId).metadata.datatype;
                var sampleId = d['id'];
                var val = d["val"];
                if (datatype === "datatype label") {
                    var colNameIndex = colNameMapping[sampleId];
                    var headOrTail;
                    if (utils.endsWith(eventId, "(+)")) {
                        datatype = eventId.replace("(+)", "");
                        headOrTail = "head";
                    } else {
                        datatype = eventId.replace("(-)", "");
                        headOrTail = "tail";
                    }
                    var anti = (headOrTail === "head") ? "" : "ANTI-";
                    var s = "";
                    if (colNameIndex == 0) {
                        var moreOrLess;
                        if (headOrTail === "head") {
                            moreOrLess = "MORE";
                        } else {
                            moreOrLess = "LESS";
                        }
                        s = "show " + datatype + " events " + moreOrLess + " " + anti + "CORRELATED to pivot event";
                    } else if (colNameIndex == 1) {
                        var moreOrLess;
                        if (headOrTail === "head") {
                            moreOrLess = "LESS";
                        } else {
                            moreOrLess = "MORE";
                        }
                        s = "show " + datatype + " events " + moreOrLess + " " + anti + "CORRELATED to pivot event";
                    } else if (colNameIndex == 2) {
                        s = "show TOP " + datatype + " events " + anti + "CORRELATED to pivot event";
                    } else {

                    }
                    return s;
                } else {
                    // var s = "r:" + d['eventId'] + "\n\nc:" + d['id'] + "\n\nval:" + d['val'] + "\n\nval_orig:" + d['val_orig'];
                    var s = "event: " + d['eventId'] + "\nsample: " + d['id'] + "\nvalue: " + d['val'];
                    return s;
                }
            });

        } catch(err) {
            console.log("ERROR drawing matrix cells:", err.name);
            console.log("--", err.message);
        } finally {
            console.log("finished drawing matrix cells");
        }

        console.log("*** END DRAWMATRIX ***");
        return config;
        // end drawMatrix
    };

})(observation_deck);
