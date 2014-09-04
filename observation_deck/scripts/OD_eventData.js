/**
 * chrisw@soe.ucsc.edu
 * 12AUG14
 * OD_eventData.js defines an event object that is to be used with Observation Deck.
 */

var eventHierarchyUrl = 'observation_deck/data/eventHierarchy.xml';

function getHierarchyEventElement(xmlDom, eventType) {
    var rootElem = xmlDom.getElementsByTagName('eventHierarchy')[0];
    var eventElemList = rootElem.getElementsByTagName('event');
    var resultElem = null;
    for (var i = 0; i < eventElemList.length; i++) {
        var elem = eventElemList[i];
        if (elem.getAttribute('type') == eventType) {
            resultElem = elem;
            break;
        }
    }
    return resultElem;
}

function getEventElems(jqXmlHierarchy, eventType) {
    var eventElemList = [];
    jqXmlHierarchy.find('event').each(function(index, value) {
        var type = value.getAttribute('type');
        if ((eventType === undefined) || (eventType === null)) {
            console.log(index + ": " + type);
            eventElemList.push(value);
        } else if (type === eventType) {
            console.log(index + ": " + type);
            eventElemList.push(value);
        }
    });
    return eventElemList;
}

function getEventParentChildren(jqXmlHierarchy, eventType) {
    var result = {};
    result['parent'] = null;
    result['children'] = [];

    var eventElems = getEventElems(jqXmlHierarchy, eventType);
    $(eventElems).each(function(i, elemi) {
        var parentElem = elemi.parentNode;
        result['parent'] = parentElem.getAttribute('type');

        $(elemi.children).each(function(j, elemj) {
            result['children'].push(elemj.getAttribute('type'));
        });
    });
    return result;
}

function OD_eventMetadataAlbum() {
    // TODO better to use jQuery XML DOM traversal due to browser differences
    var xmlStr = getResponse(eventHierarchyUrl);
    // parse string for XML doc (javascript obj)
    xmlDoc = $.parseXML(xmlStr);
    // convert JS obj to jQ obj
    $xml = $(xmlDoc);

    console.log($xml);

    var eventElems = getEventElems($xml, 'AR');
    $(eventElems).each(function(index, elem) {
        console.log(elem.getAttribute('type'));
    });

    var parentChildren = getEventParentChildren($xml, 'mutation');
    console.log(prettyJson(parentChildren));

    this.album = {};

    this.addEvent = function(metadataObj, data) {
        var newEvent = new OD_event(metadataObj);
        this.album[metadataObj['id']] = newEvent;

        // add data
        newEvent.data.setData(data);

        return this;
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
            var e = this.getEvent(id);
            var currentMetadata = e.metadata;
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

    this.setData = function(dataObj) {
        this.dataCollection = [];
        for (var sampleId in dataObj) {
            var val = dataObj[sampleId];
            this.dataCollection.push(new sampleData(sampleId, val));
        }
        return this;
    };

    this.getData = function(sampleIdList) {
        if (sampleIdList == null) {
            sampleIdList = this.getAllSampleIds();
        }
        var returnData = [];

        for (var i = 0; i < this.dataCollection.length; i++) {
            var data = this.dataCollection[i];
            var id = data['id'];
            if (sampleIdList.indexOf(id) == -1) {
                continue;
            }
            returnData.push(data);
        }
        return returnData;
    };

    this.getAllSampleIds = function() {
        var ids = {};
        for (var i = 0; i < this.dataCollection.length; i++) {
            var data = this.dataCollection[i];
            var id = data['id'];
            ids[id] = true;
        }
        return getKeys(ids);
    };

    /**
     * compare sample scores and return sorted list of sample IDs
     */
    this.sortSamples = function(sampleIdList) {
        // sortingData has to be an array
        var sortingData = this.getData(sampleIdList);

        // sort objects
        sortingData.sort(compareSamples);

        // return row names in sorted order
        var sortedNames = new Array();
        for (var k = 0; k < sortingData.length; k++) {
            sortedNames.push(sortingData[k]['id']);
        }

        return sortedNames;

        function compareSamples(a, b) {
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
        }

    };
}
