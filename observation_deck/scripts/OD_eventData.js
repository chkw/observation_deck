/**
 * chrisw@soe.ucsc.edu
 * 12AUG14
 * OD_eventData.js defines an event object that is to be used with Observation Deck.
 */

function OD_eventMetadataAlbum() {
    this.album = {};

    this.addEvent = function(metadataObj, data) {
        var newEvent = new OD_event(metadataObj);
        this.album[metadataObj['id']] = newEvent;

        // TODO add data
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

    this.setData = function(dataList) {
        this.dataCollection = [];
        for (var i = 0; i < dataList.length; i++) {
            var data = dataList[i];
            var id = data['id'];
            var val = data['val'];
            this.dataCollection.append(new sampleData(id, val));
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
