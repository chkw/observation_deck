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
        var isNumeric = (metadataObj['allowedValues'] == 'numeric');
        newEvent.data.setData(data, isNumeric);

        return this;
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

    this.setData = function(dataObj, isNumeric) {
        this.dataCollection = [];
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
        if (sampleIdList == null) {
            sampleIdList = this.getAllSampleIds();
        }
        var returnData = [];

        // a mapping of sampleId to index
        var allSampleIds = this.getAllSampleIds(true);

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
     * compare sample scores and return sorted list of sample IDs
     */
    this.sortSamples = function(sampleIdList, comparator) {
        // sortingData has to be an array
        var sortingData = this.getData(sampleIdList);

        // sort objects
        if (comparator == null) {
            comparator = compareSamplesAsStrings;
        }
        sortingData.sort(comparator);

        // return row names in sorted order
        var sortedNames = new Array();
        for (var k = 0; k < sortingData.length; k++) {
            sortedNames.push(sortingData[k]['id']);
        }

        return sortedNames;
    };

    /**
     *Compare sample values as numbers
     * @param {Object} a
     * @param {Object} b
     */
    var compareSamples = function(a, b) {
        var valA = a['val'];
        var valB = b['val'];

        // convert to numbers
        var scoreA = parseFloat(valA);
        var scoreB = parseFloat(valB);

        if (isNumerical(scoreA) && (isNumerical(scoreB))) {
            if (scoreA < scoreB) {
                return -1;
            }
            if (scoreA > scoreB) {
                return 1;
            } else {
                return 0;
            }
        } else {
            // handle non-numericals
            if (scoreA != scoreA && scoreB != scoreB) {
                // both non-numerical, may be nulls
                return 0;
            } else if (scoreA != scoreA) {
                return -1;
            } else if (scoreB != scoreB) {
                return 1;
            }
        }
        // default scoring
        return 0;
    };

    /**
     * Compare sample values as string
     * @param {Object} a
     * @param {Object} b
     */
    var compareSamplesAsStrings = function(a, b) {
        var valA = new String(a['val']);
        var valB = new String(b['val']);

        return valA.localeCompare(valB);
    };
}
