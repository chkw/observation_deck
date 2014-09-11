/**
 * chrisw@soe.ucsc.edu
 * 27AUG14
 * medbook_data_load.js is meant to load cBio/medbook data into data objects.
 */

var clinicalDataFileUrl = 'observation_deck/data/cbioMedbook/getClinicalData.txt';
var caseListsFileUrl = 'observation_deck/data/cbioMedbook/getCaseLists.txt';
var mutationDataFileUrl = 'observation_deck/data/cbioMedbook/mutation.txt';

function transposeClinicalData(input, recordKey) {
    var transposed = {};
    for (var i = 0; i < input.length; i++) {
        var obj = input[i];
        var case_id = obj[recordKey];
        delete (obj[recordKey]);
        for (var key in obj) {
            if ( key in transposed) {
            } else {
                transposed[key] = {};
            }
            transposed[key][case_id] = obj[key];
        }
    }
    return transposed;
}

function getClinicalData(url, OD_eventAlbum) {
    var response = getResponse(url);
    var parsedResponse = d3.tsv.parse(response);
    var transposed = transposeClinicalData(parsedResponse, 'CASE_ID');

    for (var eventType in transposed) {
        var data = transposed[eventType];
        var id = eventType;
        OD_eventAlbum.addEvent({
            'id' : id,
            'name' : null,
            'displayName' : null,
            'description' : null,
            'datatype' : 'clinical data',
            'allowedValues' : 'categorical'
        }, data);
    }
}

function getMutationData(url) {
    var response = getResponse(url);
    var lines = response.split('\n');

    var dataLines = [];
    var commentLines = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (beginsWith(line, '#')) {
            commentLines.push(line);
        } else {
            dataLines.push(line);
        }
    }

    var parsedResponse = d3.tsv.parse(dataLines.join('\n'));

    for (var i = 0; i < parsedResponse.length; i++) {
        var mutationData = parsedResponse[i];
        var geneId = mutationData['GENE_ID'];
        var common = mutationData['COMMON'];
        delete mutationData['GENE_ID'];
        delete mutationData['COMMON'];

        OD_eventAlbum.addEvent({
            'id' : common + '_mutation',
            'name' : null,
            'displayName' : null,
            'description' : null,
            'datatype' : 'mutation',
            'allowedValues' : 'numeric'
        }, mutationData);

    }

    return parsedResponse;
}

