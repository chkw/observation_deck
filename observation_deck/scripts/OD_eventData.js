/**
 * chrisw@soe.ucsc.edu
 * 12AUG14
 * OD_eventData.js defines an event object that is to be used with Observation Deck.
 */

function OD_eventMetadataAlbum() {
    this.album = {};

    this.addMetadata = function(metadata) {
        return this;
    };

    this.getMetadata = function(id) {
        return null;
    };

    this.getAllChildren = function(id) {
        return null;
    };
}

function OD_event(id) {
    this.metadata = new OD_eventMetadata(id);
    this.data = new OD_eventDataCollection();
}

function OD_eventMetadata(id) {
    this.id = id;
    this.name = null;
    this.displayName = null;
    this.description = null;
    this.datatype = null;
    this.allowedValues = null;
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
