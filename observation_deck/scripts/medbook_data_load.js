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

function transposeClinicalData(input, recordKey) {
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
}

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
function getClinicalData(url, OD_eventAlbum) {
    var response = getResponse(url);
    var lines = response.split('\n');

    var dataLines = [];
    var commentLines = [];
    var types = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (beginsWith(line, '#')) {
            commentLines.push(line);
        } else if (beginsWith(line, 'STRING')) {
            types = line.split('\t');
        } else {
            dataLines.push(line);
        }
    }

    var parsedResponse = d3.tsv.parse(dataLines.join('\n'));
    var transposed = transposeClinicalData(parsedResponse, 'SAMPLE_ID');
    delete transposed['SAMPLE_ID'];

    var eventIdList = getKeys(transposed);
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
}

function getClinicalData_old(url, OD_eventAlbum) {
    var response = getResponse(url);
    var parsedResponse = d3.tsv.parse(response);
    var transposed = transposeClinicalData(parsedResponse, 'CASE_ID');

    for (var eventType in transposed) {
        var data = transposed[eventType];
        var id = eventType;
        var allowedValues = (endsWith(id.toLowerCase(), '_score')) ? 'numeric' : 'categoric';
        OD_eventAlbum.addEvent({
            'id' : id,
            'name' : null,
            'displayName' : null,
            'description' : null,
            'datatype' : 'clinical data',
            'allowedValues' : allowedValues
        }, data);
    }
}

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
function getMutationData(url, OD_eventAlbum) {
    var response = getResponse(url);
    var parsedResponse = d3.tsv.parse(response);

    console.log(prettyJson(parsedResponse));

    return parsedResponse;
}

/**
 *
 * @param {Object} url
 */
function getMutationData_old(url) {
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
function getExpressionData(url, OD_eventAlbum) {
    var response = getResponse(url);
    var parsedResponse = d3.tsv.parse(response);

    for (var eventType in parsedResponse) {
        var data = parsedResponse[eventType];
        var geneId = data[''];
        delete data[''];
        OD_eventAlbum.addEvent({
            'id' : geneId + '_mRNA',
            'name' : null,
            'displayName' : null,
            'description' : null,
            'datatype' : 'expression data',
            'allowedValues' : 'expression'
        }, data);
    }
}

