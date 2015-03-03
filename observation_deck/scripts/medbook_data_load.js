/**
 * chrisw@soe.ucsc.edu
 * 27AUG14
 * medbook_data_load.js is meant to load cBio/medbook data into data objects.
 */

// cBio-Medbook api:
// https://medbook.ucsc.edu/cbioportal/webservice.do?cmd=getClinicalData&case_set_id=prad_wcdt_all
// https://medbook.ucsc.edu/cbioportal/webservice.do?cmd=getMutationData&case_set_id=prad_wcdt_all&genetic_profile_id=prad_wcdt_mutations&gene_list=AKT1+AKT2+RB1+PTEN
// https://medbook.ucsc.edu/cbioportal/webservice.do?cmd=getCaseLists&cancer_study_id=prad_wcdt

// var clinicalDataFileUrl = 'observation_deck/data/cbioMedbook/data_clinical.txt';
// var caseListsFileUrl = 'observation_deck/data/cbioMedbook/getCaseLists.txt';
// var mutationDataFileUrl = 'observation_deck/data/cbioMedbook/mutation.txt';
// var expressionDataFileUrl = 'observation_deck/data/cbioMedbook/expressionData.tab';

var medbookDataLoader = {};

(function(mdl) {
    mdl.transposeClinicalData = function(input, recordKey) {
        var transposed = {};
        for (var i = 0; i < input.length; i++) {
            var obj = input[i];
            var case_id = obj[recordKey];
            // delete (obj[recordKey]);
            for (var key in obj) {
                if ( key in transposed) {
                } else {
                    transposed[key] = {};
                }
                transposed[key][case_id] = obj[key];
            }
        }
        return transposed;
    };

    /**
     * The clinical data file looks like this:

     #Sample f1    f2   f3     f4
     #Sample f1    f2   f3     f4
     STRING  STRING  DATE    STRING  STRING
     SAMPLE_ID       f1    f2   f3     f4
     1 UCSF    6/15/2012       Bone    Resistant
     2 UCSF    12/15/2012      Liver   Naive
     3 UCSF    2/26/2013       Liver   Naive
     4 UCSF    2/21/2013       Liver   Naive

     * @param {Object} url
     * @param {Object} OD_eventAlbum
     */
    mdl.getClinicalData = function(url, OD_eventAlbum) {
        var response = utils.getResponse(url);
        var lines = response.split('\n');

        var dataLines = [];
        var commentLines = [];
        var types = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (utils.beginsWith(line, '#')) {
                commentLines.push(line);
            } else if (utils.beginsWith(line, 'STRING')) {
                types = line.split('\t');
            } else {
                dataLines.push(line);
            }
        }

        var parsedResponse = d3.tsv.parse(dataLines.join('\n'));
        var transposed = this.transposeClinicalData(parsedResponse, 'SAMPLE_ID');
        delete transposed['SAMPLE_ID'];

        var eventIdList = utils.getKeys(transposed);
        for (var i = 0; i < eventIdList.length; i++) {
            var eventId = eventIdList[i];
            var clinicalData = transposed[eventId];
            var type = types[i + 1];

            var allowedValues = 'categoric';
            if (type.toLowerCase() == 'number') {
                allowedValues = 'numeric';
            } else if (type.toLowerCase() == 'date') {
                allowedValues = 'date';
            }

            OD_eventAlbum.addEvent({
                'id' : eventId,
                'name' : null,
                'displayName' : null,
                'description' : null,
                'datatype' : 'clinical data',
                'allowedValues' : allowedValues
            }, clinicalData);

        }

        return parsedResponse;
    };

    /**
     * The mutation data file is a maf file and looks like this:

     Hugo_Symbol     Entrez_Gene_Id  Center  NCBI_Build
     PEG10   23089   ucsc.edu        GRCh37-lite
     CNKSR3  154043  ucsc.edu        GRCh37-lite
     ANK2    287     ucsc.edu        GRCh37-lite
     ST8SIA4 7903    ucsc.edu        GRCh37-lite
     RUNX1T1 862     ucsc.edu        GRCh37-lite
     GABRB3  2562    ucsc.edu        GRCh37-lite

     * @param {Object} url
     * @param {Object} OD_eventAlbum
     */
    mdl.getMutationData = function(url, OD_eventAlbum) {
        var response = utils.getResponse(url);
        var parsedResponse = d3.tsv.parse(response);

        var dataByGene = {};

        for (var i = 0; i < parsedResponse.length; i++) {
            var parsedData = parsedResponse[i];
            var gene = parsedData['Hugo_Symbol'];
            var classification = parsedData['Variant_Classification'];
            var variantType = parsedData['Variant_Type'];
            var sampleId = parsedData['Tumor_Sample_Barcode'];

            // maf file uses - instead of _
            sampleId = sampleId.replace(/_/g, '-');

            // some samples have trailing [A-Z]
            sampleId = sampleId.replace(/[A-Z]$/, '');

            if (!utils.hasOwnProperty(dataByGene, gene)) {
                dataByGene[gene] = {};
                dataByGene[gene]['metadata'] = {
                    'id' : gene + '_mut',
                    'name' : null,
                    'displayName' : null,
                    'description' : null,
                    'datatype' : 'mutation data',
                    'allowedValues' : 'categoric'
                };
                dataByGene[gene]['data'] = {};
            }

            dataByGene[gene]['data'][sampleId] = true;
        }

        // add mutation events
        var mutatedGenes = utils.getKeys(dataByGene);
        for (var j = 0; j < mutatedGenes.length; j++) {
            var mutatedGene = mutatedGenes[j];
            var mutationData = dataByGene[mutatedGene];
            OD_eventAlbum.addEvent(mutationData['metadata'], mutationData['data']);
        }

        return dataByGene;
    };

    /**
     * The expression data looks like this:

     a b c
     ACOT9   7.89702013149366        4.56919333525263        7.30772632354453
     ADM     9.8457751118653 1       3.92199798893442
     AGR2    14.0603428300693        1       9.25656041315632
     ANG     3.47130453638819        4.56919333525263        6.94655542449336
     ANK2    6.22356349157533        10.7658085407174        12.4021643510831

     * @param {Object} url
     * @param {Object} OD_eventAlbum
     */
    mdl.getExpressionData = function(url, OD_eventAlbum) {
        mdl.getSampleByGeneData(url, OD_eventAlbum, '_mRNA', 'expression data', 'numeric');
    };

    mdl.getViperData = function(url, OD_eventAlbum) {
        mdl.getSampleByGeneData(url, OD_eventAlbum, '_viper', 'viper data', 'numeric');
    };

    /**
     *
     */
    mdl.getSampleByGeneData = function(url, OD_eventAlbum, geneSuffix, datatype, allowedValues) {
        var response = utils.getResponse(url);
        var parsedResponse = d3.tsv.parse(response);

        for (var eventType in parsedResponse) {
            var data = parsedResponse[eventType];
            var geneId = data[''];
            delete data[''];
            OD_eventAlbum.addEvent({
                'geneSuffix' : geneSuffix,
                'id' : geneId + geneSuffix,
                'name' : null,
                'displayName' : null,
                'description' : null,
                'datatype' : datatype,
                'allowedValues' : allowedValues
            }, data);
        }
    };

    /**
     *Add clinical data from mongo collection.
     * @param {Object} collection
     * @param {Object} OD_eventAlbum
     */
    mdl.mongoClinicalData = function(collection, OD_eventAlbum) {
        // iter over doc (each doc = sample)
        for (var i = 0; i < collection.length; i++) {
            var doc = collection[i];

            var sampleId = null;
            // TODO col name for this field has been inconsistent, so try to detect it here
            if (utils.hasOwnProperty(doc, 'sample')) {
                sampleId = doc['sample'];
            } else if (hasOwnProperty(doc, 'Sample')) {
                sampleId = doc['Sample'];
            } else if (hasOwnProperty(doc, 'Patient ID')) {
                sampleId = doc['Patient ID'];
            } else if (hasOwnProperty(doc, 'Patient ID ')) {
                sampleId = doc['Patient ID '];
            } else {
                // no gene identifier found
                console.log('no sample ID found in clinical doc: ' + prettyJson(doc));
                continue;
            }

            sampleId = sampleId.trim();

            // don't use this field
            if ((sampleId === 'Patient ID') || (sampleId === 'Patient ID ')) {
                continue;
            }

            // iter over event names (file columns)
            var keys = utils.getKeys(doc);
            for (var j = 0; j < keys.length; j++) {
                var key = keys[j];
                if (utils.isObjInArray(['_id', 'sample', 'Sample'], key)) {
                    // skip these file columns
                    continue;
                }
                var eventObj = OD_eventAlbum.getEvent(key);

                // add event if DNE
                if (eventObj == null) {
                    OD_eventAlbum.addEvent({
                        'id' : key,
                        'name' : null,
                        'displayName' : null,
                        'description' : null,
                        'datatype' : 'clinical data',
                        'allowedValues' : 'categoric'
                    }, []);
                    eventObj = OD_eventAlbum.getEvent(key);
                }
                var value = doc[key];
                var data = {};
                data[sampleId] = value;
                eventObj.data.setData(data);
            }
        }
        return eventObj;
    };

    /**
     *Add expression data from mongo collection.
     * @param {Object} collection
     * @param {Object} OD_eventAlbum
     */
    mdl.mongoExpressionData = function(collection, OD_eventAlbum) {
        // iter over doc (each doc = sample)
        for (var i = 0; i < collection.length; i++) {
            var doc = collection[i];

            var gene = null;
            if (utils.hasOwnProperty(doc, 'gene')) {
                gene = doc['gene'];
            } else if (utils.hasOwnProperty(doc, 'id')) {
                gene = doc['id'];
            } else {
                // no gene identifier found
                console.log('no gene identifier found in expression doc: ' + utils.prettyJson(doc));
                continue;
            }

            gene = gene.trim();
            var eventId = gene + '_mRNA';

            // iter over samples
            var samples = utils.getKeys(doc);
            for (var j = 0; j < samples.length; j++) {
                var sample = samples[j];
                if (utils.isObjInArray(['_id', 'gene', 'id'], sample)) {
                    // skip these 'samples'
                    continue;
                }
                var eventObj = OD_eventAlbum.getEvent(eventId);

                // add event if DNE
                if (eventObj == null) {
                    OD_eventAlbum.addEvent({
                        'id' : eventId,
                        'name' : null,
                        'displayName' : null,
                        'description' : null,
                        'datatype' : 'expression data',
                        'allowedValues' : 'numeric'
                    }, []);
                    eventObj = OD_eventAlbum.getEvent(eventId);
                }
                var value = doc[sample];
                var data = {};
                data[sample] = parseFloat(value);
                eventObj.data.setData(data);
            }
        }
        return eventObj;
    };

    /**
     *Get a signature via url.  This one does not load sample data.
     * @param {Object} url
     * @param {Object} OD_eventAlbum
     */
    mdl.getSignature = function(url, OD_eventAlbum) {
        var response = utils.getResponse(url);
        var parsedResponse = d3.tsv.parse(response);

        var eventId = url.split('/').pop();

        var eventObj = OD_eventAlbum.getEvent(eventId);

        // add event if DNE
        if (eventObj == null) {
            OD_eventAlbum.addEvent({
                'id' : eventId,
                'name' : null,
                'displayName' : null,
                'description' : null,
                'datatype' : 'expression signature',
                'allowedValues' : 'numeric',
                'weightedGeneVector' : parsedResponse
            }, []);
            eventObj = OD_eventAlbum.getEvent(eventId);
        }
        return eventObj;
    };

    /**
     * obj contains a metadata and a data.  The data is the mongo documents which is a list of records, with 'id' and 'val'.
     * @param {Object} obj
     * @param {Object} OD_eventAlbum
     */
    mdl.loadSignatureObj_old = function(obj, OD_eventAlbum) {
        var sigScoresMongoDocs = obj['data'];

        var sigScoresData = {};
        for (var qq = 0; qq < sigScoresMongoDocs.length; qq++) {
            var doc = sigScoresMongoDocs[qq];
            var id = doc['id'];
            var val = doc['val'];
            sigScoresData[id] = val;
        }

        OD_eventAlbum.addEvent(obj['metadata'], sigScoresData);
        eventObj = OD_eventAlbum.getEvent(obj['metadata']['id']);
    };

    /**
     * Load sample signature scores.
     * @param {Object} obj  mongo collection... an array of {'id':sampleId, 'name':eventId, 'val':sampleScore}
     * @param {Object} OD_eventAlbum
     */
    mdl.loadSignatureObj = function(obj, OD_eventAlbum) {
        var sigScoresMongoDocs = obj;

        // group data by eventID
        var groupedData = {};
        for (var i = 0; i < sigScoresMongoDocs.length; i++) {
            var mongoDoc = sigScoresMongoDocs[i];
            var id = mongoDoc['id'];
            var name = mongoDoc['name'];
            var val = mongoDoc['val'];

            if (! utils.hasOwnProperty(groupedData, name)) {
                groupedData[name] = {};
            }
            groupedData[name][id] = val;
        }

        // set eventData
        var eventIds = utils.getKeys(groupedData);
        for (var i = 0; i < eventIds.length; i++) {
            var eventId = eventIds[i];
            var eventData = groupedData[eventId];

            var eventObj = OD_eventAlbum.getEvent(eventId);

            // add event if DNE
            if (eventObj == null) {
                OD_eventAlbum.addEvent({
                    'id' : eventId,
                    'name' : null,
                    'displayName' : null,
                    'description' : null,
                    'datatype' : 'expression signature',
                    'allowedValues' : 'numeric'
                    // 'weightedGeneVector' : null
                }, {});
                eventObj = OD_eventAlbum.getEvent(eventId);
            }

            eventObj.data.setData(eventData);
        }

    };

    // TODO qqq
    mdl.loadSignatureWeightsObj = function(obj, OD_eventAlbum) {
        // fields: name and version and signature... signature is an obj keyed by gene {'weight':weight,'pval':pval}
        var eventId = obj['name'] + '_v' + obj['version'];

        var eventObj = OD_eventAlbum.getEvent(eventId);

        // weightedGeneVector to be converted to Array of {'gene':gene,'weight':weight}
        var weightedGeneVector = [];
        var signatures = obj['signature'];
        var genes = utils.getKeys(signatures);
        for (var i = 0; i < genes.length; i++) {
            var gene = genes[i];
            var data = signatures[gene];
            weightedGeneVector.push({
                'gene' : gene,
                'weight' : data['weight']
            });
        }

        if (eventObj == null) {
            // create eventObj
            console.log('adding weightedGeneVector to new eventObj');
            OD_eventAlbum.addEvent({
                'id' : eventId,
                'name' : null,
                'displayName' : null,
                'description' : null,
                'datatype' : 'expression signature',
                'allowedValues' : 'numeric',
                'weightedGeneVector' : weightedGeneVector
            }, []);
            eventObj = OD_eventAlbum.getEvent(eventId);
        } else {
            // add 'weightedGeneVector' to existing eventObj
            console.log('adding weightedGeneVector to existing eventObj');
            eventObj.metadata.weightedGeneVector = weightedGeneVector;
        }
        var size = eventObj.metadata.weightedGeneVector.length;
        console.log('weightedGeneVector for', eventId, 'has', size, 'genes');
        return eventObj;
    };

    /**
     * This loader loads signature weights data as sample data.  Events are genes, samples are signatures, data are weights (hopfully, normalized).
     * @param {Object} obj
     * @param {Object} OD_eventAlbum
     */
    mdl.loadBmegSignatureWeightsAsSamples = function(obj, OD_eventAlbum) {
        // build up objects that can be loaded into event album

        // get query genes
        var queryObj = obj['query'];
        var queryGeneList = utils.getKeys(queryObj['weights']);

        // get signature gene weight data
        var signaturesDict = obj['signatures'];
        var geneWiseObj = {};
        var sigNames = utils.getKeys(signaturesDict);
        console.log('num signatures: ' + sigNames.length);
        var queryScores = {};
        for (var i = 0; i < sigNames.length; i++) {
            var signatureName = sigNames[i];
            var signatureObj = signaturesDict[signatureName];
            var score = signatureObj['score'];
            queryScores[signatureName] = score;

            var weights = signatureObj['weights'];
            var geneList = utils.getKeys(weights);
            for (var j = 0; (j < geneList.length); j++) {
                var gene = geneList[j];

                // only keep query genes
                if (! utils.isObjInArray(queryGeneList, gene)) {
                    continue;
                }
                var weight = weights[gene];
                if (! utils.hasOwnProperty(geneWiseObj, gene)) {
                    geneWiseObj[gene] = {};
                }
                geneWiseObj[gene][signatureName] = weight;
            }
        }

        console.log('num genes:' + utils.getKeys(geneWiseObj).length);

        // query score event
        OD_eventAlbum.addEvent({
            'id' : 'query_score',
            'name' : null,
            'displayName' : null,
            'description' : null,
            'datatype' : 'signature weight',
            'allowedValues' : 'numeric'
        }, queryScores);

        // load data into event album
        var geneList = utils.getKeys(geneWiseObj);
        for (var i = 0; i < geneList.length; i++) {
            var eventId = geneList[i];

            var eventObj = OD_eventAlbum.getEvent(eventId);

            if (eventObj == null) {
                // create eventObj
                OD_eventAlbum.addEvent({
                    'id' : eventId + '_weight',
                    'name' : null,
                    'displayName' : null,
                    'description' : null,
                    'datatype' : 'signature weight',
                    'allowedValues' : 'numeric'
                }, geneWiseObj[eventId]);
                eventObj = OD_eventAlbum.getEvent(eventId);
            } else {
                // add 'weightedGeneVector' to existing eventObj
                console.log('loadBmegSignatureWeightsAsSamples:', 'existing event for: ' + eventId);
            }
        }
    };

})(medbookDataLoader);
