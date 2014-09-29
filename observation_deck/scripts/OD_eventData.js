/**
 * chrisw@soe.ucsc.edu
 * 12AUG14
 * OD_eventData.js defines an event object that is to be used with Observation Deck.
 */

var eventHierarchyUrl = 'observation_deck/data/eventHierarchy.xml';

/**
 * Get the elements with the specified eventType.  Returns a list of elements.
 */
function getEventElems(jqXmlHierarchy, eventType) {
    var eventElemList = [];
    jqXmlHierarchy.find('event').each(function(index, value) {
        var type = value.getAttribute('type');
        if ((eventType === undefined) || (eventType === null)) {
            eventElemList.push(value);
        } else if (type === eventType) {
            eventElemList.push(value);
        }
    });
    return eventElemList;
}

/**
 * Get the event types of an event's parent and children.
 */
function getEventParentChildren(jqXmlHierarchy, eventType) {
    var result = {};
    result['parent'] = null;
    result['children'] = [];

    var eventElems = getEventElems(jqXmlHierarchy, eventType);
    $(eventElems).each(function(index, elem) {
        if (elem.tagName !== 'event') {
            return 'continue';
        }
        var parentElem = elem.parentNode;
        result['parent'] = parentElem.getAttribute('type');

        $(elem.children).each(function(index, elem) {
            if (elem.tagName === 'event') {
                result['children'].push(elem.getAttribute('type'));
            }
        });
    });
    return result;
}

/**
 * Find the path to the root of the hierarchy.
 */
function tracebackToRoot(jqXmlHierarchy, eventType) {
    var tracebacks = [];
    var eventElems = getEventElems(jqXmlHierarchy, eventType);
    for (var i = 0; i < eventElems.length; i++) {
        var eventElem = eventElems[i];
        var traceback = [];
        tracebacks.push(traceback);

        var type = eventElem.getAttribute('type');
        var parentType = getEventParentChildren(jqXmlHierarchy, type)['parent'];
        while ((parentType !== undefined) && (parentType !== null)) {
            traceback.push(parentType);
            parentType = getEventParentChildren(jqXmlHierarchy, parentType)['parent'];
        }
    }
    return tracebacks;
}

function OD_eventMetadataAlbum() {
    // TODO instead of writing XML parser, better to use jQuery XML DOM traversal due to better handling of browser differences
    var xmlStr = getResponse(eventHierarchyUrl);
    if (xmlStr === null) {
        alert('Could not load event hierarchy!');
    }
    // parse string for XML doc (javascript obj)
    xmlDoc = $.parseXML(xmlStr);
    // convert JS obj to jQ obj
    $xml = $(xmlDoc);

    this.album = {};

    this.addEvent = function(metadataObj, data) {
        var newEvent = new OD_event(metadataObj);
        this.album[metadataObj['id']] = newEvent;

        // add data
        var isNumeric = ((metadataObj['allowedValues'] == 'numeric') || metadataObj['allowedValues'] == 'expression');
        newEvent.data.setData(data, isNumeric);

        return this;
    };

    /**
     * Get the eventIds grouped by datatype.
     */
    this.getEventIdsByType = function() {
        var groupedEventIds = {};
        var eventIdList = getKeys(this.album);
        for (var i = 0; i < eventIdList.length; i++) {
            var eventId = eventIdList[i];
            var datatype = this.getEvent(eventId).metadata.datatype;
            if (!hasOwnProperty(groupedEventIds, datatype)) {
                groupedEventIds[datatype] = [];
            }
            groupedEventIds[datatype].push(eventId);
        }
        return groupedEventIds;
    };

    /**
     * Get all of the event data for specified samples.
     */
    this.getEventData = function(sampleIds) {
        var result = {};
        // iter over eventIds
        var eventIdList = getKeys(this.album);
        for (var i = 0; i < eventIdList.length; i++) {
            var eventId = eventIdList[i];
            var eventData = this.getEvent(eventId).data;
            // grab data for sample IDs
            var data = eventData.getData(sampleIds);
            result[eventId] = data;
        }
        return result;
    };

    /**
     * Get all of the event data in a list of objects.  Each object has keys: eventId, id, val.
     */
    this.getAllDataAsList = function() {
        var allDataList = [];
        var allDataObj = this.getEventData();
        var eventNameList = getKeys(allDataObj);
        for (var i = 0; i < eventNameList.length; i++) {
            var eventName = eventNameList[i];
            var eventData = allDataObj[eventName].slice();
            for (var j = 0; j < eventData.length; j++) {
                eventData[j]['eventId'] = eventName;
            }
            allDataList = allDataList.concat(eventData);
        }
        return allDataList;
    };

    /**
     * Get all of the sample IDs in album.
     */
    this.getAllSampleIds = function() {
        var sampleIds = [];
        var eventIdList = getKeys(this.album);
        for (var i = 0; i < eventIdList.length; i++) {
            var eventId = eventIdList[i];
            var eventSampleIds = this.getEvent(eventId).data.getAllSampleIds();
            sampleIds = sampleIds.concat(eventSampleIds);
        }
        return eliminateDuplicates(sampleIds);
    };

    /**
     * Get the specified event from the album.
     */
    this.getEvent = function(id) {
        var e = this.album[id];
        return e;
    };

    /**
     * recursive function to get all children IDs.
     */
    this.getAllChildren = function(idList, inputChildrenList) {
        var childList = ( typeof inputChildrenList === "undefined") ? [] : inputChildrenList;

        // collect children
        var currentChildren = [];
        for (var i = 0; i < idList.length; i++) {
            var id = idList[i];
            var currentMetadata = this.getEvent(id).metadata;
            currentChildren = currentChildren.concat(getKeys(currentMetadata.children));
        }

        // recurse on children
        if (currentChildren.length == 0) {
            return childList;
        } else {
            var newChildList = childList.concat(currentChildren);
            return this.getAllChildren(currentChildren, newChildList);
        }
    };

    /**
     * If sortingSteps is null, then just return the sampleIds without sorting.
     */
    this.multisortSamples = function(sortingSteps) {
        var sampleIds = this.getAllSampleIds();
        if (sortingSteps == null) {
            return sampleIds;
        }
        var steps = sortingSteps.getSteps().slice();
        steps.reverse();

        var album = this;

        sampleIds.sort(function(a, b) {
            // begin sort function
            var comparisonResult = 0;
            // iterate over sorting steps in order
            for (var i = 0; i < steps.length; i++) {
                // get this step's values
                var eventId = steps[i]['name'];
                var reverse = steps[i]['reverse'];
                var allowedValues = album.getEvent(eventId).metadata['allowedValues'];

                var vals = album.getEvent(eventId).data.getData([a, b]);
                var valA = vals[0]['val'];
                var valB = vals[1]['val'];

                // select correct comparator
                var comparator = null;
                if (allowedValues == 'numeric') {
                    comparator = compareAsNumeric;
                } else if (allowedValues == 'categoric') {
                    comparator = compareAsString;
                } else if (allowedValues == 'expression') {
                    comparator = compareAsNumeric;
                } else if (allowedValues == 'date') {
                    comparator = compareAsDate;
                } else {
                    comparator = compareAsString;
                }

                // compare this step's values
                comparisonResult = comparator(valA, valB);
                if (reverse) {
                    comparisonResult = comparisonResult * -1;
                }

                // return final comparison or try next eventId
                if (comparisonResult == 0) {
                    continue;
                } else {
                    break;
                }

            }
            return comparisonResult;
            // end sort function
        });

        return sampleIds;
    };
}

function OD_event(metadataObj) {
    this.metadata = new OD_eventMetadata(metadataObj);
    this.data = new OD_eventDataCollection();
}

function OD_eventMetadata(obj) {
    this.id = obj['id'];
    this.name = obj['name'];
    this.displayName = obj['displayName'];
    this.description = obj['description'];
    this.datatype = obj['datatype'];
    this.allowedValues = obj['allowedValues'];
    this.parents = {};
    this.children = {};

    this.addParent = function(parentId) {
        this.parents[parentId] = parentId;
        return this;
    };

    this.addChild = function(childId) {
        this.children[childId] = childId;
        return this;
    };

    this.computeCompositeScore = function(sampleIdList) {
        // TODO compute composite score over specified samples in child tree
        return null;
    };
}

function OD_eventDataCollection() {
    /**
     * list of sampleData objects with keys: 'id', 'val'.
     */
    this.dataCollection = [];

    function sampleData(id, val) {
        this.id = id;
        this.val = val;
    };

    this.getValues = function(dedup) {
        var vals = [];
        var dataList = this.getData();
        for (var i = 0; i < dataList.length; i++) {
            var dataObj = dataList[i];
            var val = dataObj['val'];
            vals.push(val);
        }
        if ((dedup != null) && (dedup == true)) {
            vals = eliminateDuplicates(vals);
        }
        return vals;
    };

    this.setData = function(dataObj, isNumeric) {
        // this.dataCollection = [];
        for (var sampleId in dataObj) {
            var val = dataObj[sampleId];
            if ((isNumeric != null) && (isNumeric == true)) {
                val = parseFloat(val);
            }
            this.dataCollection.push(new sampleData(sampleId, val));
        }
        return this;
    };

    /**
     * Order of samples is maintained... allows multi-sort
     */
    this.getData = function(sampleIdList) {
        // a mapping of sampleId to index
        var allSampleIds = this.getAllSampleIds(true);

        if (sampleIdList == null) {
            sampleIdList = getKeys(allSampleIds);
        }
        var returnData = [];

        for (var i = 0; i < sampleIdList.length; i++) {
            var sampleId = sampleIdList[i];
            // check if sampleId is in allSampleIds
            if ( sampleId in allSampleIds) {
                var index = allSampleIds[sampleId];
                var data = this.dataCollection[index];
                returnData.push(data);
            } else {
                returnData.push(new sampleData(sampleId, null));
            }
        }
        return returnData;
    };

    /**
     * Get all sampleIds as array.  If indices == true, then return mapping of id to index.
     */
    this.getAllSampleIds = function(indices) {
        var ids = {};
        for (var i = 0; i < this.dataCollection.length; i++) {
            var data = this.dataCollection[i];
            var id = data['id'];
            ids[id] = i;
        }
        if (indices) {
            return ids;
        }
        return getKeys(ids);
    };

    /**
     * compare sample scores and return sorted list of sample IDs. If sortType == numeric, then numeric sort.  Else, sort as strings.
     */
    this.sortSamples = function(sampleIdList, sortType) {
        // sortingData has to be an array
        var sortingData = this.getData(sampleIdList);

        // sort objects
        var comparator = compareSamplesAsStrings;
        if (sortType == null) {
            sortType = 'categoric';
        } else {
            sortType = sortType.toLowerCase();
        }

        if (((sortType == 'numeric') || (sortType == 'expression'))) {
            comparator = compareSamplesAsNumeric;
        } else if (sortType == 'date') {
            comparator = compareSamplesAsDate;
        }
        sortingData.sort(comparator);

        // return row names in sorted order
        var sortedNames = new Array();
        for (var k = 0; k < sortingData.length; k++) {
            sortedNames.push(sortingData[k]['id']);
        }

        return sortedNames;
    };
}

/**
 * Keep track of sorting.
 */
function sortingSteps(arrayOfSteps) {
    this.steps = new Array();
    if (arrayOfSteps != null) {
        this.steps = arrayOfSteps;
    }

    this.getSteps = function() {
        return this.steps;
    };

    this.getIndex = function(name) {
        var result = -1;
        for (var i = 0; i < this.steps.length; i++) {
            if (this.steps[i]["name"] == name) {
                return i;
            }
        }
        return result;
    };

    this.addStep = function(name) {
        var index = this.getIndex(name);
        if (index >= 0) {
            var c = this.steps.splice(index, 1)[0];
            c["reverse"] = !c["reverse"];
            this.steps.push(c);
        } else {
            this.steps.push({
                "name" : name,
                "reverse" : false
            });
        }
    };

    this.removeStep = function(name) {
        var index = this.getIndex(name);
        if (index >= 0) {
            this.steps.splice(index, 1);
        }
    };

    this.clearSteps = function() {
        this.steps.splice(0, this.steps.length);
    };
}
