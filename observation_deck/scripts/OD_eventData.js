/**
 * chrisw@soe.ucsc.edu
 * 12AUG14
 * OD_eventData.js defines an event object that is to be used with Observation Deck.
 */

var eventData = {};
(function(ed) {

    var eventHierarchyUrl = 'observation_deck/data/eventHierarchy.xml';

    /**
     * Get the elements with the specified eventType.  Returns a list of elements.
     */
    ed.getEventElems = function(jqXmlHierarchy, eventType) {
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
    };

    /**
     * Get the event types of an event's parent and children.
     */
    ed.getEventParentChildren = function(jqXmlHierarchy, eventType) {
        var result = {};
        result['parent'] = null;
        result['children'] = [];

        var eventElems = ed.getEventElems(jqXmlHierarchy, eventType);
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
    };

    /**
     * Find the path to the root of the hierarchy.
     */
    ed.tracebackToRoot = function(jqXmlHierarchy, eventType) {
        var tracebacks = [];
        var eventElems = ed.getEventElems(jqXmlHierarchy, eventType);
        for (var i = 0; i < eventElems.length; i++) {
            var eventElem = eventElems[i];
            var traceback = [];
            tracebacks.push(traceback);

            var type = eventElem.getAttribute('type');
            var parentType = ed.getEventParentChildren(jqXmlHierarchy, type)['parent'];
            while ((parentType !== undefined) && (parentType !== null)) {
                traceback.push(parentType);
                parentType = ed.getEventParentChildren(jqXmlHierarchy, parentType)['parent'];
            }
        }
        return tracebacks;
    };

    ed.OD_eventAlbum = function() {
        // TODO instead of writing XML parser, better to use jQuery XML DOM traversal due to better handling of browser differences
        // var xmlStr = getResponse(eventHierarchyUrl);
        // if (xmlStr === null) {
        // alert('Could not load event hierarchy!');
        // }
        // // parse string for XML doc (javascript obj)
        // xmlDoc = $.parseXML(xmlStr);
        // // convert JS obj to jQ obj
        // $xml = $(xmlDoc);

        this.album = {};

        this.addEvent = function(metadataObj, data) {
            var newEvent = new ed.OD_event(metadataObj);
            this.album[metadataObj['id']] = newEvent;

            // add data
            var isNumeric = ((metadataObj['allowedValues'] == 'numeric') || metadataObj['allowedValues'] == 'expression');
            newEvent.data.setData(data, isNumeric);

            return this;
        };

        this.deleteEvent = function(eventId) {
            delete this.album[eventId];
        };

        /**
         * Get the eventIds grouped by datatype.
         */
        this.getEventIdsByType = function() {
            var groupedEventIds = {};
            var eventIdList = utils.getKeys(this.album);
            for (var i = 0; i < eventIdList.length; i++) {
                var eventId = eventIdList[i];
                var datatype = this.getEvent(eventId).metadata.datatype;
                if (!utils.hasOwnProperty(groupedEventIds, datatype)) {
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
            var eventIdList = utils.getKeys(this.album);
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
            var eventNameList = utils.getKeys(allDataObj);
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
            var eventIdList = utils.getKeys(this.album);
            for (var i = 0; i < eventIdList.length; i++) {
                var eventId = eventIdList[i];
                var eventSampleIds = this.getEvent(eventId).data.getAllSampleIds();
                sampleIds = sampleIds.concat(eventSampleIds);
            }
            return utils.eliminateDuplicates(sampleIds);
        };

        /**
         * Select samples that meet the criteria.
         */
        this.selectSamples = function(selectionCriteria) {
            var ids = this.getAllSampleIds();
            if (selectionCriteria.length == 0) {
                return ids;
            }
            for (var i in selectionCriteria) {
                var eventId = selectionCriteria[i]["eventId"];
                var value = selectionCriteria[i]["value"];

                // select IDs from event data
                ids = this.getEvent(eventId).data.selectIds(value, ids);
            }
            return ids;
        };
        /**
         * Get the specified event from the album.
         */
        this.getEvent = function(eventId) {
            var e = this.album[eventId];
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
         * multi-sorting of events
         */
        this.multisortEvents = function(rowSortSteps, colSortSteps) {
            console.log('multisortEvents');
            console.log('rowSortSteps', rowSortSteps);
            console.log('colSortSteps', colSortSteps);
            // default ordering
            var groupedEvents = this.getEventIdsByType();
            var eventList = [];
            for (var datatype in groupedEvents) {
                var datatypeEventList = groupedEvents[datatype];
                eventList = eventList.concat(datatypeEventList);
            }

            // bubble up colSort events
            var bubbledUpEvents = [];
            if (colSortSteps != null) {
                // bring sorting rows up to top
                var steps = colSortSteps.getSteps();
                for (var b = 0; b < steps.length; b++) {
                    var step = steps[b];
                    var eventId = step['name'];
                    bubbledUpEvents.push(eventId);
                }
                bubbledUpEvents.reverse();
            }
            var rowNames = bubbledUpEvents.slice(0);

            // fill in rest of the list
            for (var r = 0; r < eventList.length; r++) {
                var eventId = eventList[r];
                if (! utils.isObjInArray(rowNames, eventId)) {
                    rowNames.push(eventId);
                }
            }

            if ((rowSortSteps != null) && ('expression data' in groupedEvents)) {
                var steps = rowSortSteps.getSteps().reverse();
                for (var b = 0; b < steps.length; b++) {
                    var step = steps[b];
                    var eventId = step['name'];
                    var reverse = step['reverse'];
                    var eventObj = this.getEvent(eventId);
                    var datatype = eventObj.metadata.datatype;
                    if (datatype === 'expression signature') {
                        // TODO sort expression events by signature weight
                        console.log('expression signature: ' + eventId);

                        var orderedGeneList = eventObj.metadata.sortSignatureVector();
                        if (reverse) {
                            orderedGeneList.reverse();
                        }

                        var expressionEventIds = groupedEvents['expression data'].slice(0);

                        var processedExpressionEventList = [];
                        for (var c = 0; c < orderedGeneList.length; c++) {
                            var orderedGene = orderedGeneList[c];
                            var orderedGene_eventId = orderedGene + "_mRNA";
                            var index = expressionEventIds.indexOf(orderedGene_eventId);
                            // if (index >= 0) {
                            if ((index >= 0) && (!utils.isObjInArray(bubbledUpEvents, orderedGene_eventId))) {
                                // only add expression events that have records in the event album
                                processedExpressionEventList.push(orderedGene_eventId);
                                delete expressionEventIds[index];
                            }

                            if (utils.isObjInArray(bubbledUpEvents, orderedGene_eventId)) {
                                // skip bubbled up expression events
                                delete expressionEventIds[index];
                            }
                        }

                        // add events that did not appear in signature
                        for (var d in expressionEventIds) {
                            processedExpressionEventList.push(expressionEventIds[d]);
                        }

                        // assemble all datatypes together
                        var eventList = bubbledUpEvents.slice(0);
                        for (var datatype in groupedEvents) {
                            if (datatype === 'expression data') {
                                eventList = eventList.concat(processedExpressionEventList);
                            } else {
                                var datatypeEventList = groupedEvents[datatype];
                                for (var i in datatypeEventList) {
                                    var eventId = datatypeEventList[i];
                                    if (utils.isObjInArray(eventList, eventId)) {
                                        // skip
                                    } else {
                                        eventList.push(eventId);
                                    }
                                }
                            }
                        }

                        rowNames = eventList;
                        console.log('rowNames.length', rowNames.length);

                        // only do this for the first step
                        break;
                    } else {
                        continue;
                    }
                }
            }

            return rowNames;
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
                    var eventObj = album.getEvent(eventId);
                    if ((eventObj == undefined) || (eventObj == null)) {
                        console.log('no event found for sorting: ' + eventId);
                        continue;
                    }
                    var allowedValues = eventObj.metadata['allowedValues'];

                    var vals = eventObj.data.getData([a, b]);
                    var valA = vals[0]['val'];
                    var valB = vals[1]['val'];

                    // select correct comparator
                    var comparator = null;
                    if (allowedValues == 'numeric') {
                        comparator = utils.compareAsNumeric;
                    } else if (allowedValues == 'categoric') {
                        comparator = utils.compareAsString;
                    } else if (allowedValues == 'expression') {
                        comparator = utils.compareAsNumeric;
                    } else if (allowedValues == 'date') {
                        comparator = utils.compareAsDate;
                    } else {
                        comparator = utils.compareAsString;
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

        /**
         * rescale by z-score over each eventId
         */
        this.zScoreExpressionRescaling = function() {
            console.log('zScoreExpressionRescaling');

            // get expression events
            var allEventIds = this.getEventIdsByType();
            if (!utils.hasOwnProperty(allEventIds, 'expression data')) {
                console.log('no expression');
                return null;
            }
            var expressionEventIds = allEventIds['expression data'];

            // compute average expression each gene
            var stats = {};
            var result = {
                'stats' : stats
            };

            var allAdjustedVals = [];

            for (var i = 0; i < expressionEventIds.length; i++) {
                var eventId = expressionEventIds[i];

                // get mean and sd
                var eventStats = this.getEvent(eventId).data.getStats();
                stats[eventId] = {};
                stats[eventId] = eventStats;

                // finally iter over all samples to adjust score
                var allEventData = this.getEvent(eventId).data.getData();
                for (var k = 0; k < allEventData.length; k++) {
                    var data = allEventData[k];
                    if (utils.hasOwnProperty(data, 'val_orig')) {
                        data['val'] = data['val_orig'];
                    }
                    var val = data['val'];
                    data['val_orig'] = val;
                    if (utils.isNumerical(val)) {
                        var z = (val - stats[eventId]['mean']) / (stats[eventId]['sd']);
                        data['val'] = z;
                        allAdjustedVals.push(data['val']);
                    }
                }
            }

            // find min/max of entire expression matrix
            result['maxVal'] = jStat.max(allAdjustedVals);
            result['minVal'] = jStat.min(allAdjustedVals);

            return result;
        };

        /**
         *  Rescale expression data.

         */
        this.betweenMeansExpressionRescaling = function(clinicalEventId, category1, category2) {
            console.log('betweenMeansExpressionRescaling', clinicalEventId, category1, category2);
            // get group sample IDs
            var group1SampleIds = this.getEvent(clinicalEventId).data.selectIds(category1);

            var group2SampleIds = null;
            if (category2 == null) {
                group2SampleIds = this.getEvent(clinicalEventId).data.selectIds(category2);
                group2SampleIds = group2SampleIds.concat(group1SampleIds);
                group2SampleIds = utils.eliminateDuplicates(group2SampleIds);
            } else {
                group2SampleIds = this.getEvent(clinicalEventId).data.selectIds(category2);
            }

            // get expression events
            var allEventIds = this.getEventIdsByType();
            if (!utils.hasOwnProperty(allEventIds, 'expression data')) {
                console.log('no expression');
                return null;
            }
            var expressionEventIds = allEventIds['expression data'];

            // compute average expression of groups over each gene
            var meanVals = {};
            var result = {
                'meanVals' : meanVals
            };

            var allAdjustedVals = [];

            for (var i = 0; i < expressionEventIds.length; i++) {
                var eventId = expressionEventIds[i];
                meanVals[eventId] = {};
                meanVals[eventId]['group1'] = this.getEvent(eventId).data.getStats(group1SampleIds)['mean'];
                meanVals[eventId]['group2'] = this.getEvent(eventId).data.getStats(group2SampleIds)['mean'];

                // finally iter over all samples to adjust score
                var adjustment = (meanVals[eventId]['group2'] - meanVals[eventId]['group1']) / 2;
                var allEventData = this.getEvent(eventId).data.getData();
                for (var k = 0; k < allEventData.length; k++) {
                    var data = allEventData[k];
                    if (utils.hasOwnProperty(data, 'val_orig')) {
                        data['val'] = data['val_orig'];
                    }
                    var val = data['val'];
                    data['val_orig'] = val;
                    if (utils.isNumerical(val)) {
                        data['val'] = val - adjustment;
                        allAdjustedVals.push(data['val']);
                    }
                }
            }

            // find min/max of entire expression matrix
            result['maxVal'] = jStat.max(allAdjustedVals);
            result['minVal'] = jStat.min(allAdjustedVals);

            return result;
        };

        /**
         * Rescale all expression data by subtracting mean of specified group on a per-event basis.  Returns new min/max values.
         */
        this.yuliaExpressionRescaling = function(clinicalEventId, category) {
            console.log('yuliaExpressionRescaling', clinicalEventId, category);
            // get sampleId list of neg group
            var negSampleIds = this.getEvent(clinicalEventId).data.selectIds(category);

            // get expression events
            var allEventIds = this.getEventIdsByType();
            if (!utils.hasOwnProperty(allEventIds, 'expression data')) {
                console.log('no expression');
                return null;
            }
            var expressionEventIds = allEventIds['expression data'];

            // compute average expression of neg group over each gene
            var meanVals = {};
            var result = {
                'meanVals' : meanVals
            };

            var allAdjustedVals = [];

            for (var i = 0; i < expressionEventIds.length; i++) {
                var eventId = expressionEventIds[i];
                meanVals[eventId] = this.getEvent(eventId).data.getStats(negSampleIds)['mean'];

                // second iter over all samples to adjust score
                var allEventData = this.getEvent(eventId).data.getData();
                for (var j = 0; j < allEventData.length; j++) {
                    var data = allEventData[j];
                    if (utils.hasOwnProperty(data, 'val_orig')) {
                        data['val'] = data['val_orig'];
                    }
                    var val = data['val'];
                    data['val_orig'] = val;
                    if (utils.isNumerical(val)) {
                        data['val'] = val - meanVals[eventId];
                        allAdjustedVals.push(data['val']);
                    }
                }
            }

            // find min/max of entire expression matrix
            result['maxVal'] = jStat.max(allAdjustedVals);
            result['minVal'] = jStat.min(allAdjustedVals);

            return result;
        };

        /**
         * for checking if some samples have differential expression
         */
        this.eventwiseMedianRescaling = function() {
            // TODO
            console.log('eventwiseMedianRescaling');

            // get expression events
            var allEventIds = this.getEventIdsByType();
            if (!utils.hasOwnProperty(allEventIds, 'expression data')) {
                console.log('no expression');
                return null;
            }
            var expressionEventIds = allEventIds['expression data'];

            // compute average expression each gene
            var stats = {};
            var result = {
                'stats' : stats
            };

            var allAdjustedVals = [];

            for (var i = 0; i < expressionEventIds.length; i++) {
                var eventId = expressionEventIds[i];

                // get stats
                var eventStats = this.getEvent(eventId).data.getStats();
                stats[eventId] = {};
                stats[eventId] = eventStats;

                // finally iter over all samples to adjust score
                var allEventData = this.getEvent(eventId).data.getData();
                for (var k = 0; k < allEventData.length; k++) {
                    var data = allEventData[k];
                    if (utils.hasOwnProperty(data, 'val_orig')) {
                        data['val'] = data['val_orig'];
                    }
                    var val = data['val'];
                    data['val_orig'] = val;
                    if (utils.isNumerical(val)) {
                        var newVal = (val - stats[eventId]['median']);
                        data['val'] = newVal;
                        allAdjustedVals.push(data['val']);
                    }
                }
            }

            // find min/max of entire expression matrix
            result['maxVal'] = jStat.max(allAdjustedVals);
            result['minVal'] = jStat.min(allAdjustedVals);

            return result;
        };

        /**
         * for checking general expression level of gene
         */
        this.samplewiseMedianRescaling = function() {
            // TODO
            console.log('samplewiseMedianRescaling');

            // get expression events
            var allEventIds = this.getEventIdsByType();
            if (!utils.hasOwnProperty(allEventIds, 'expression data')) {
                console.log('no expression');
                return null;
            }
            var expressionEventIds = allEventIds['expression data'];

            // compute average expression each sample
            var stats = {};
            var result = {
                'stats' : stats
            };

            var allAdjustedVals = [];

            var samples = this.getAllSampleIds();
            for (var i = 0; i < samples.length; i++) {
                var sample = samples[i];
                stats[sample] = {};
                // console.log(sample);
                var sampleEventData = this.getEventData([sample]);
                // console.log(prettyJson(sampleEventData));
                // compute median over expression events
                var sampleVals = [];
                for (var j = 0; j < expressionEventIds.length; j++) {
                    var eventId = expressionEventIds[j];
                    if (utils.hasOwnProperty(sampleEventData, eventId)) {
                        var eventData = sampleEventData[eventId][0];
                        if (eventData['id'] === sample) {
                            if (utils.hasOwnProperty(eventData, 'val_orig')) {
                                eventData['val'] = eventData['val_orig'];
                            }
                            var val = eventData['val'];
                            eventData['val_orig'] = val;
                            if (utils.isNumerical(val)) {
                                sampleVals.push(val);
                                // console.log(sample + "->" + eventId + "->" + val);
                            }
                        }
                    } else {
                        console.log(eventId + ' was not found for ' + sample);
                        continue;
                    }
                }
                // console.log('sampleVals.length for ' + sample + ': ' + sampleVals.length);
                var sampleMed = jStat.median(sampleVals);
                // console.log('expression median for ' + sample + ': ' + sampleMed);
                stats[sample]['samplewise median'] = sampleMed;

                if (isNaN(sampleMed)) {
                    console.log('sample median for ' + sample + ' is NaN.');
                    continue;
                }

                // rescale values over expression events
                for (var j = 0; j < expressionEventIds.length; j++) {
                    var eventId = expressionEventIds[j];
                    if (utils.hasOwnProperty(sampleEventData, eventId)) {
                        var eventData = sampleEventData[eventId][0];
                        if (eventData['id'] === sample) {
                            if (utils.hasOwnProperty(eventData, 'val_orig')) {
                                eventData['val'] = eventData['val_orig'];
                            }
                            var val = eventData['val'];
                            eventData['val_orig'] = val;
                            if (utils.isNumerical(val)) {
                                var newVal = val - stats[sample]['samplewise median'];
                                eventData['val'] = newVal;
                                allAdjustedVals.push(val);
                            }
                        }
                    } else {
                        console.log(eventId + ' was not found for ' + sample);
                        continue;
                    }
                }
            }

            // find min/max of entire expression matrix
            result['maxVal'] = jStat.max(allAdjustedVals);
            result['minVal'] = jStat.min(allAdjustedVals);

            return result;
        };

        /**
         * for checking if a differential expression is in an expressed gene or not
         */
        this.bivariateNormalization = function() {
            // TODO

        };

        /**
         * Fill in missing samples data with the specified value.
         */
        this.fillInMissingSamples = function(value) {
            // get all sample IDs
            var allAlbumSampleIds = this.getAllSampleIds();

            // get all sample IDs for event
            var allEventIdsByCategory = this.getEventIdsByType();
            for (var i = 0; i < utils.getKeys(allEventIdsByCategory).length; i++) {
                var category = utils.getKeys(allEventIdsByCategory)[i];
                for (var j = 0; j < allEventIdsByCategory[category].length; j++) {
                    var eventId = allEventIdsByCategory[category][j];
                    var eventData = this.getEvent(eventId).data;
                    var allEventSampleIds = eventData.getAllSampleIds();
                    if (allAlbumSampleIds.length - allEventSampleIds.length == 0) {
                        continue;
                    };

                    // find missing data
                    var missingSampleIds = utils.keepReplicates(allAlbumSampleIds.concat(allEventSampleIds), 2, true);
                    var missingData = {};
                    for (var k = 0; k < missingSampleIds.length; k++) {
                        var id = missingSampleIds[k];
                        missingData[id] = value;
                    }
                    // add data
                    this.getEvent(eventId).data.setData(missingData);
                }
            }
            return this;
        };
    };

    ed.OD_event = function(metadataObj) {
        this.metadata = new ed.OD_eventMetadata(metadataObj);
        this.data = new ed.OD_eventDataCollection();
    };

    ed.OD_eventMetadata = function(obj) {
        this.id = obj['id'];
        this.name = obj['name'];
        this.displayName = obj['displayName'];
        this.description = obj['description'];
        this.datatype = obj['datatype'];
        this.allowedValues = obj['allowedValues'];
        this.parents = {};
        this.children = {};
        this.weightedGeneVector = [];
        if (utils.hasOwnProperty(obj, 'weightedGeneVector')) {
            this.weightedGeneVector = obj['weightedGeneVector'];
        }

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

        /**
         * For an event that is a signature of weighted genes, sort genes by weight... heaviest at top
         */
        this.sortSignatureVector = function(reverse) {

            /**
             * comparator for weighted gene vector
             */
            var compareWeightedGenes = function(a, b) {
                var weightA = a['weight'];
                var weightB = b['weight'];
                return utils.compareAsNumeric(weightA, weightB);
            };

            var sig = this.weightedGeneVector.slice(0);
            sig.sort(compareWeightedGenes);

            // output sorted list of geness
            var geneList = [];
            for (var i = 0; i < sig.length; i++) {
                geneList.push(sig[i]['gene']);
            }

            if (reverse) {
            } else {
                geneList.reverse();
            }

            return geneList;
        };
    };

    ed.OD_eventDataCollection = function() {
        /**
         * list of sampleData objects with keys: 'id', 'val'.
         */
        this.dataCollection = [];

        function sampleData(id, val) {
            this.id = id;
            this.val = val;
        };

        /**
         * get the sample count for each value.  Useful for something like histogram.  Restrict to sample list, if given.
         */
        this.getValueCounts = function(sampleList) {
            var valCounts = {};
            // get sample data
            var dataList = this.getData(sampleList);

            // get the sample count for each value
            for (var i = 0; i < dataList.length; i++) {
                var dataObj = dataList[i];
                var val = dataObj['val'];
                if (!utils.hasOwnProperty(valCounts, val)) {
                    valCounts[val] = 0;
                }
                valCounts[val] = valCounts[val] + 1;
            }
            return valCounts;
        };

        /**
         * Get all data values.
         */
        this.getValues = function(dedup) {
            var valueCounts = this.getValueCounts();
            var vals = utils.getKeys(valueCounts);

            if ((dedup != null) && (dedup == true)) {
                vals = utils.eliminateDuplicates(vals);
            }
            return vals;
        };

        this.setData = function(dataObj, isNumeric) {
            // this.dataCollection = [];
            for (var sampleId in dataObj) {
                var val = dataObj[sampleId];
                if ((val == "NaN") || (val == "null") || (val == "") || (val == "N/A")) {
                    // skip non-values
                    continue;
                }
                if ((isNumeric != null) && (isNumeric == true)) {
                    val = parseFloat(val);
                }
                this.dataCollection.push(new sampleData(sampleId, val));
            }
            return this;
        };

        /**
         * Order of samples is maintained... allows multi-sort.
         * If a specified ID is not found, then null is used for the value.
         * Restrict to sampleIdList, if given.
         */
        this.getData = function(sampleIdList) {
            // a mapping of sampleId to index
            var allSampleIds = this.getAllSampleIds(true);

            if (sampleIdList == null) {
                sampleIdList = utils.getKeys(allSampleIds);
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
            return utils.getKeys(ids);
        };

        /**
         *Get the sampleIds with null data values
         */
        this.getNullSamples = function(inputIds) {
            var resultIds = [];
            var sampleData = this.getData(inputIds);
            for (var i = 0; i < sampleData.length; i++) {
                var data = sampleData[i];
                if (data['val'] == null) {
                    resultIds.push(data['id']);
                }
            }
            return resultIds;
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

        /**
         * Select Ids with data that match a value. Restrict to startingIds, if given.
         */
        this.selectIds = function(selectVal, startingIds) {
            var selectedIds = [];

            var allData = (startingIds == null) ? this.getData() : this.getData(startingIds);
            for (var i = 0; i < allData.length; i++) {
                var data = allData[i];
                if (data['val'] == selectVal) {
                    selectedIds.push(data['id']);
                }
            }

            return selectedIds;
        };

        /** *get mean,sd,median,meddev,meandev.  Uses jStat library
         */
        this.getStats = function(sampleIdList) {
            var results = {
                'min' : 0,
                'max' : 0,
                'mean' : 0,
                'median' : 0,
                'sd' : 0,
                'meddev' : 0,
                'meandev' : 0
            };

            // a mapping of sampleId to index
            var allSampleIds = this.getAllSampleIds(true);

            if (sampleIdList == null) {
                sampleIdList = utils.getKeys(allSampleIds);
            }

            var vector = [];
            for (var i = 0; i < sampleIdList.length; i++) {
                var sampleId = sampleIdList[i];
                // check if sampleId is in allSampleIds
                if ( sampleId in allSampleIds) {
                    var index = allSampleIds[sampleId];
                    var data = this.dataCollection[index];
                    var val = null;
                    // be sure to use original values
                    if (utils.hasOwnProperty(data, 'val_orig')) {
                        val = data['val_orig'];
                    } else {
                        val = data['val'];
                    }
                    if (utils.isNumerical(val)) {
                        vector.push(val);
                    }
                }
            }
            results['mean'] = jStat.mean(vector);
            results['sd'] = jStat.stdev(vector);
            results['median'] = jStat.median(vector);
            results['meddev'] = jStat.meddev(vector);
            results['meandev'] = jStat.meandev(vector);
            results['min'] = jStat.min(vector);
            results['max'] = jStat.max(vector);

            return results;
        };
    };

    /**
     * Keep track of sorting.
     */
    ed.sortingSteps = function(arrayOfSteps) {
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
    };

    /**
     * Object to help with selecting sample IDs based on selection criteria.
     */
    ed.sampleSelectionCriteria = function() {
        this.criteria = new Array();

        this.getCriteria = function() {
            return this.criteria;
        };

        this.addCriteria = function(eventId, value) {
            var criteria = {
                "eventId" : eventId,
                "value" : value
            };
            for (var i in this.criteria) {
                if (JSON.stringify(this.criteria[i]) == JSON.stringify(criteria)) {
                    return;
                }
            }
            this.criteria.push(criteria);
        };

        this.removeCriteria = function(eventId, value) {
            for (var i = 0; i < this.criteria.length; i++) {
                if ((this.criteria[i]["eventId"] == eventId) && (this.criteria[i]["value"] == value)) {
                    this.criteria.splice(i, 1);
                    break;
                }
            }
        };

        this.clearCriteria = function() {
            this.criteria.splice(0, this.criteria.length);
        };
    };

})(eventData);
