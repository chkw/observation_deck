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
 * 5) utils.js
 * 6) OD_eventData.js
 * 7) typeahead <https://github.com/twitter/typeahead.js>
 */

u = utils;

/**
 *  Build an observation deck!
 */
buildObservationDeck = function(containerDivElem, config) {
    // console.log('buildObservationDeck');
    config = getConfiguration(config);

    config['containerDivId'] = containerDivElem.id;

    drawMatrix(containerDivElem, config);

    // set up dialog box
    setupDialogBox(config);

    // set up context menu should follow matrix drawing
    setupContextMenus(config);

    return config;
};

/**
 *
 */
getConfiguration = function(config) {
    // look for od_config in cookies
    var cookie = utils.getCookie('od_config');
    // console.log('cookie', cookie);
    var querySettings = utils.parseJson(cookie) || {};
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
        if ('clinical' in mongoData) {
            dataLoader.mongoClinicalData(mongoData['clinical'], od_eventAlbum);
        }
        if ('expression' in mongoData) {
            dataLoader.mongoExpressionData(mongoData['expression'], od_eventAlbum);
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
 */
getCookieEvents = function() {
    var eventList = [];
    var cookieObj = utils.parseJson(utils.getCookie('od_config'));
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
    if (utils.hasOwnProperty(cookieObj, 'required events')) {
        eventList = eventList.concat(cookieObj['required events']);
    }

    var geneList = [];
    for (var i = 0; i < eventList.length; i++) {
        var eventId = eventList[i];
        if (utils.endsWith(eventId, '_mRNA')) {
            geneList.push(eventId.replace('_mRNA', ''));
        }
    }

    return utils.eliminateDuplicates(geneList);
};

/**
 * Set up a dialog box with typeahead functionality
 * config is an obj of {title,placeholder,bloohoundObj}
 */
createSuggestBoxDialog = function(suggestBoxConfig) {
    var title = suggestBoxConfig["title"];
    var placeholder = suggestBoxConfig["placeholder"];

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
        "type" : "button"
    });
    buttonElem.innerHTML = "select";
    buttonElem.onclick = function() {
        console.log("button clicked", inputElem.value);
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
setupDialogBox = function(config) {
    var geneQueryUrl = config["geneQueryUrl"];
    var queryVar = "%VALUE";
    var bodyElem = document.getElementsByTagName('body')[0];
    var dialogBox = createSuggestBoxDialog({
        "title" : "hugoSearch",
        "placeholder" : "HUGO symbol",
        "bloodhoundObj" : new Bloodhound({
            "datumTokenizer" : Bloodhound.tokenizers.whitespace,
            "queryTokenizer" : Bloodhound.tokenizers.whitespace,
            // "local" : ["abc", "def", "ghi", "abd", "abr"],
            "remote" : {
                // "url" : "https://su2c-dev.ucsc.edu/wb/genes?q=%QUERY",
                // "url" : "/genes?q=%VALUE",
                "url" : geneQueryUrl + queryVar,
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
                    return list;
                }
            }
        })
    });
    bodyElem.appendChild(dialogBox);
};

/*
 *
 */
setupContextMenus = function(config) {
    // config['querySettings']
    // first destroy old contextMenus
    var selectors = ['.typeLabel', '.colLabel', '.rowLabel', '.mrna_exp', '.categoric'];
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
resetConfig = function(config) {
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
 * If session object exists, set the key/value pair.
 */
setSession = function(key, value) {
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
getSession = function(key) {
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
resetSession = function(keys) {
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
 * Set session var for datatype paging
 */
setDatatypePaging = function(datatype, headOrTail, upOrDown) {
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
 * Create a context menu item for use with jQuery-contextMenu.
 */
createResetContextMenuItem = function(config) {
    var obj = {
        name : "reset",
        icon : null,
        disabled : false,
        callback : function(key, opt) {
            resetConfig(config);
            resetSession(['pivotSettings', "subscriptionPaging", "geneList"]);
            setSession("pivotSettings", "");

            var containerDivElem = document.getElementById(config['containerDivId']);
            var newConfig = buildObservationDeck(containerDivElem, config);
        }
    };
    return obj;
};

setupColLabelContextMenu = function(config) {

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
setupTypeLabelContextMenu = function(config) {
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
                // "pagingFold" : {
                // "name" : "paging",
                // "items" : {
                // "pagingHeadHome" : {
                // "name" : "most correlated",
                // "icon" : null,
                // "disabled" : false,
                // "callback" : function(key, opt) {
                // setDatatypePaging(datatype, "head", "0");
                // }
                // },
                // "pagingHeadDown" : {
                // "name" : "correlated ^",
                // "icon" : null,
                // "disabled" : false,
                // "callback" : function(key, opt) {
                // setDatatypePaging(datatype, "head", "down");
                // }
                // },
                // "pagingHeadUp" : {
                // "name" : "correlated v",
                // "icon" : null,
                // "disabled" : false,
                // "callback" : function(key, opt) {
                // setDatatypePaging(datatype, "head", "up");
                // }
                // },
                // "sep1" : "---------",
                // "pagingTailUp" : {
                // "name" : "anti-correlated ^",
                // "icon" : null,
                // "disabled" : false,
                // "callback" : function(key, opt) {
                // setDatatypePaging(datatype, "tail", "up");
                // }
                // },
                // "pagingTailDown" : {
                // "name" : "anti-correlated v",
                // "icon" : null,
                // "disabled" : false,
                // "callback" : function(key, opt) {
                // setDatatypePaging(datatype, "tail", "down");
                // }
                // },
                // "pagingTailEnd" : {
                // "name" : "most anti-correlated",
                // "icon" : null,
                // "disabled" : false,
                // "callback" : function(key, opt) {
                // setDatatypePaging(datatype, "tail", "0");
                // }
                // }
                // }
                // },
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

                        utils.setCookie('od_config', JSON.stringify(config['querySettings']));

                        // trigger redrawing
                        var containerDivElem = document.getElementById(config['containerDivId']);
                        buildObservationDeck(containerDivElem, config);
                    }
                },
                // TODO experimental features here
                // "test_fold" : {
                // "name" : "dev_features",
                // "items" : {
                // "hugoSearch" : {
                // "name" : "HUGO search",
                // "icon" : null,
                // "disabled" : false,
                // "callback" : function(key, opt) {
                // console.log("key", key, "opt", opt);
                // var dialogElem = document.getElementById('hugoSearch');
                // dialogElem.style["display"] = "block";
                //
                // $(dialogElem).dialog({
                // 'title' : 'HUGO search',
                // "buttons" : {
                // "close" : function() {
                // $(this).dialog("close");
                //
                // // }, //this just closes it - doesn't clean it up!!
                // // "destroy" : function() {
                // // $(this).dialog("destroy");
                // // //this completely empties the dialog
                // // //and returns it to its initial state
                //
                // }
                // }
                // });
                // }
                // }
                // }
                // },
                "reset" : createResetContextMenuItem(config)
            };
            return {
                'items' : items
            };
        }
    });
};

// TODO setupRowLabelContextMenu
/**
 *context menu uses http://medialize.github.io/jQuery-contextMenu
 */
setupRowLabelContextMenu = function(config) {

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

            var items = {
                'title' : {
                    name : displayName,
                    icon : null,
                    disabled : function() {
                        var result = true;
                        if ((titleCallback != null) && (utils.isObjInArray(['expression data', 'clinical data', 'expression signature', 'kinase target activity', "tf target activity"], datatype))) {
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
                        // if (pivotable) {
                        if (utils.isObjInArray(['expression signature', 'kinase target activity', "tf target activity"], datatype)) {
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
                            if (utils.isObjInArray(['expression signature', 'kinase target activity', "tf target activity"], datatype)) {
                                var names = mName.split('_v');
                                mVersion = names.pop();
                                mName = names.join('_v');
                                datatype = 'signature';
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

                            utils.setCookie('od_config', JSON.stringify(querySettings));

                            console.log('writing pivotSettings to Session', pivotSessionSettings);
                            setSession('pivotSettings', pivotSessionSettings);
                        } else {
                            console.log('no Session object. Writing pivotSettings to querySettings.');

                            var querySettings = config['querySettings'];
                            querySettings['pivot_event'] = {
                                'id' : eventId,
                                'datatype' : datatype
                            };
                            utils.setCookie('od_config', JSON.stringify(querySettings));

                            // trigger redrawing
                            var containerDivElem = document.getElementById(config['containerDivId']);
                            buildObservationDeck(containerDivElem, config);
                        }
                    }
                },
                'sort_fold' : {
                    'name' : 'sort...',
                    'items' : {
                        "sort" : {
                            name : "samples by this event",
                            icon : null,
                            disabled : false,
                            callback : function(key, opt) {
                                var sortType = 'colSort';

                                var sortSteps = null;
                                var querySettings = config['querySettings'];
                                if ( sortType in querySettings) {
                                    sortSteps = new eventData.sortingSteps(querySettings[sortType]["steps"]);
                                } else {
                                    sortSteps = new eventData.sortingSteps();
                                }
                                sortSteps.addStep(eventId);
                                querySettings[sortType] = sortSteps;

                                utils.setCookie('od_config', JSON.stringify(querySettings));

                                var containerDivElem = document.getElementById(config['containerDivId']);
                                buildObservationDeck(containerDivElem, config);
                            }
                        }
                    }
                },
                'hide_fold' : {
                    'name' : 'hide...',
                    'items' : {
                        "hide_null_samples" : {
                            name : "null samples in this event",
                            icon : null,
                            disabled : false,
                            callback : function(key, opt) {
                                var querySettings = config['querySettings'];
                                querySettings['required events'] = [eventId];

                                utils.setCookie('od_config', JSON.stringify(querySettings));

                                var containerDivElem = document.getElementById(config['containerDivId']);
                                buildObservationDeck(containerDivElem, config);
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

                                utils.setCookie('od_config', JSON.stringify(querySettings));

                                var containerDivElem = document.getElementById(config['containerDivId']);
                                buildObservationDeck(containerDivElem, config);
                            }
                        }
                    }
                },
                "sep1" : "---------",
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
setupExpressionCellContextMenu = function(config) {
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

                                utils.setCookie('od_config', JSON.stringify(querySettings));

                                var containerDivElem = document.getElementById(config['containerDivId']);
                                buildObservationDeck(containerDivElem, config);
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

                                utils.setCookie('od_config', JSON.stringify(querySettings));

                                var containerDivElem = document.getElementById(config['containerDivId']);
                                buildObservationDeck(containerDivElem, config);
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
                            // utils.setCookie('od_config', JSON.stringify(querySettings));
                            //
                            // var containerDivElem = document.getElementById(config['containerDivId']);
                            // buildObservationDeck(containerDivElem, config);
                            // }
                        }
                    }
                },
                "sep1" : "---------",
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
setupCategoricCellContextMenu = function(config) {
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

                        utils.setCookie('od_config', JSON.stringify(querySettings));

                        var containerDivElem = document.getElementById(config['containerDivId']);
                        buildObservationDeck(containerDivElem, config);
                    }
                },
                "sep1" : "---------",
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
setupSignatureCellContextMenu = function(config) {
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
                "sep1" : "---------",
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
drawMatrix = function(containingDiv, config) {
    // TODO begin drawMatrix

    var thisElement = utils.removeChildElems(containingDiv);

    // get eventList
    var eventAlbum = config['eventAlbum'];
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
                rescalingData = OD_eventAlbum.eventwiseMedianRescaling();
            } else if (rescalingSettings['method'] === 'zScoreExpressionRescaling') {
                rescalingData = OD_eventAlbum.zScoreExpressionRescaling();
            } else if (rescalingSettings['method'] === 'samplewiseMedianRescaling') {
                rescalingData = OD_eventAlbum.samplewiseMedianRescaling();
            } else {
                // no rescaling
            }
        } else if (utils.hasOwnProperty(groupedEvents, 'expression data')) {
            rescalingData = OD_eventAlbum.eventwiseMedianRescaling();
        } else {
            console.log('no expression data rescaling');
        }

        // rescalingData = eventAlbum.betweenMeansExpressionRescaling('Small Cell v Adeno', 'Adeno', 'Small Cell');
        return rescalingData;
    };

    var rescalingData = getRescalingData(eventAlbum, querySettings);

    var setColorMappers = function(rescalingData, eventAlbum) {
        var expressionColorMapper = utils.centeredRgbaColorMapper(false);
        if (rescalingData != null) {
            var minExpVal = rescalingData['minVal'];
            var maxExpVal = rescalingData['maxVal'];
            expressionColorMapper = utils.centeredRgbaColorMapper(false, 0, minExpVal, maxExpVal);
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
            } else {
                colorMappers[eventId] = d3.scale.category10();
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

        // TODO enforce required events in config['querySettings']['required events']
        var samplesToHide = [];
        if ('required events' in querySettings) {
            var requiredEventId = querySettings['required events'][0];
            console.log("requiredEventId", requiredEventId);

            try {
                var requiredEventObj = eventAlbum.getEvent(requiredEventId);
                var nullSamples = requiredEventObj.data.getNullSamples();
                samplesToHide = samplesToHide.concat(nullSamples);
            } catch(error) {
                console.log('ERROR while getting samples to hide in eventID:', requiredEventId, 'error.message ->', error.message);
            } finally {
                console.log('samplesToHide', samplesToHide);
            }
        }
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
        if (utils.hasOwnProperty(querySettings, 'pivot_sort_list')) {
            console.log('querySettings has a pivot_sort_list of datatypes', querySettings['pivot_sort_list']);
            rowNames = [];
            var pivotSortedRowNames = [];
            var pEventId = querySettings['pivot_event']['id'];
            var pEventObj = eventAlbum.getEvent(pEventId);
            var keepTailsOnly = true;
            var groupedPivotSorts = eventAlbum.getGroupedPivotSorts(pEventId, keepTailsOnly);

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
        } else {
            // TODO need to insert the datatype label events in correct order when no pivot sort used
            var datatypeLabels = [];
            for (var i = 0, length = rowNames.length; i < length; i++) {
                var rowName = rowNames[i];
                if (utils.endsWith(rowName, "(+)") || utils.endsWith(rowName, "(-)")) {
                    datatypeLabels.push(rowName);
                }
            }

            for (var i = 0, length = datatypeLabels.length; i < length; i++) {
                var datatypeLabel = datatypeLabels[i];
                utils.removeA(rowNames, datatypeLabel);
            }
        }

        // console.log("rowNames", rowNames);

        // hide rows of datatype, preserving relative ordering
        var hiddenDatatypes = querySettings['hiddenDatatypes'] || [];
        var hiddenEvents = querySettings['hiddenEvents'] || [];
        var shownNames = [];

        var albumEventIds = eventAlbum.getAllEventIds();
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

    // TODO hack
    var pivotEventId = null;
    if (querySettings['pivot_event'] != null) {
        pivotEventId = querySettings['pivot_event']['id'];
        console.log('moving pivot event to top:', pivotEventId);
        rowNames.unshift(pivotEventId);
        rowNames = utils.eliminateDuplicates(rowNames);
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
    gridSize = (gridSize > minGridSize) ? gridSize : minGridSize;
    console.log('gridSize', gridSize, 'margin', (margin));

    // document.documentElement.clientHeight
    var fullHeight = (margin.top + margin.bottom) + (gridSize * rowNames.length);
    var height = fullHeight - margin.top - margin.bottom;

    // SVG canvas
    var svg = d3.select(thisElement).append("svg").attr({
        "width" : fullWidth + 0,
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

    // TODO datatype labels
    // var datatypeLabels = svg.selectAll(".typeLabel").data(function() {
    // var datatypes = utils.getKeys(groupedEvents);
    // return datatypes;
    // }).enter().append("text").text(function(d) {
    // var text = d.toUpperCase();
    // return text;
    // }).attr({
    // "x" : function(d, i) {
    // var rowCount = 0;
    // for (var datatype in groupedEvents) {
    // if (datatype === d) {
    // break;
    // } else {
    // rowCount = rowCount + groupedEvents[datatype].length;
    // }
    // }
    // var datatypes = utils.getKeys(groupedEvents);
    //
    // var startPosition = rowCount * gridSize * -1;
    // if (i >= datatypes.length - 1) {
    // // bottom submatrix
    // // startPosition = (startPosition - (groupedEvents[d].length * gridSize)) + (6.8 * d.length);
    // startPosition = (-1 * gridSize * rowNames.length) + (8.2 * d.length);
    // }
    // return startPosition;
    // },
    // "y" : function(d, i) {
    // var fullOffset = 22;
    // var pad = 12;
    // var offset = (i % 2 == 0) ? (fullOffset - pad) : fullOffset;
    // return -1 * (margin.left - offset);
    // },
    // "transform" : "rotate(-90)",
    // "class" : function(d, i) {
    // var s = "typeLabel mono axis unselectable";
    // return s;
    // },
    // 'datatype' : function(d, i) {
    // return d;
    // }
    // }).style("text-anchor", "end").style("fill", function(d) {
    // var datatype = d;
    // return rowLabelColorMapper(datatype);
    // });
    // datatypeLabels.append("title").text(function(d) {
    // var datatype = d;
    // var s = 'datatype: ' + datatype;
    // return s;
    // });

    // row labels
    var translateX = -6;
    var translateY = gridSize / 1.5;
    var rowLabels = svg.selectAll(".rowLabel").data(rowNames).enter().append("text").text(function(d) {
        var eventObj = eventAlbum.getEvent(d);
        var displayName = eventObj.metadata.displayName;
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
                    s = s + " pivotEvent";
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
    rowLabels.append("title").text(function(d, i) {
        var eventObj = eventAlbum.getEvent(d);
        var datatype = eventObj.metadata.datatype;
        var allowedValues = eventObj.metadata.allowedValues;
        var s = 'event: ' + d + '\ndatatype: ' + datatype;

        if ((allowedValues === 'numeric') && (rescalingData != null) && (utils.hasOwnProperty(rescalingData, 'stats')) && ( typeof rescalingData['stats'][d] !== 'undefined')) {
            s = s + '\nraw data stats: ' + utils.prettyJson(rescalingData['stats'][d]);
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

    // TODO SVG elements for heatmap cells
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
        group.setAttributeNS(null, "class", "cell");

        var colName = d['id'];
        if (! utils.hasOwnProperty(colNameMapping, colName)) {
            return group;
        }

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
            group.appendChild(utils.createSvgRectElement(x, y, rx, ry, width, height, attributes));
        } else {
            // draw over the primer rectangle instead of drawing a background for each cell
            // background for icons
            // attributes["fill"] = "white";
            // attributes["fill"] = rowLabelColorMapper(eventAlbum.getEvent(d['eventId']).metadata.datatype)
        }
        // group.appendChild(utils.createSvgRectElement(x, y, rx, ry, width, height, attributes));

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
        } else if (utils.isObjInArray(["expression signature", "kinase target activity", "tf target activity"], eventAlbum.getEvent(d['eventId']).metadata.datatype)) {
            attributes['class'] = "signature";
            attributes['eventId'] = d['eventId'];
            attributes['sampleId'] = d['id'];
            attributes['val'] = d['val'];
            icon = utils.createSvgRectElement(x, y, rx, ry, width, height, attributes);
        } else if (eventAlbum.getEvent(d['eventId']).metadata.datatype === "datatype label") {
            // TODO datatype label cells
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
            attributes["fill"] = "black";
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
                attributes["fill"] = "DarkSlateGray";
                icon = utils.createSvgRectElement(x, (1 + y + (height / 2)), 0, 0, width, 2, attributes);
            }
        }
        group.appendChild(icon);

        return group;
    });

    // TODO heatmap click event
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

    return config;
    // TODO end drawMatrix
};
