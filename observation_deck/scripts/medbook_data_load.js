/**
 * chrisw@soe.ucsc.edu
 * 27AUG14
 * medbook_data_load.js is meant to load cBio/medbook data into data objects.
 */

var clinicalDataFileUrl = 'observation_deck/data/cbioMedbook/getClinicalData.txt';
var caseListsFileUrl = 'observation_deck/data/cbioMedbook/getCaseLists.txt';
var mutationDataFileUrl = 'observation_deck/data/cbioMedbook/mutation.txt';

function loadClinicalData(url) {
    var response = getResponse(url);
    var parsedResponse = d3.tsv.parse(response);
    console.log(prettyJson(parsedResponse));
}

function loadMutationData(url) {
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
    console.log(prettyJson(parsedResponse));
}