/**
 * chrisw@soe.ucsc.edu
 * 23JAN14
 * observation_deck.js
 */

var countsUrl = "observation_deck/data/gene_count.tab";
var panelUrl = "observation_deck/data/gene.tab";

/*
 * Synchronous GET
 */
function getResponse(url) {
    var xhr = null;
    xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.onload = function() {
        var status = xhr.status;
        if (status != 200) {
            console.log("xhr error: " + status);
        }
    };
    xhr.send(null);
    var response = xhr.responseText;

    return response;
}

/**
 * Get a pretty JSON.
 */
function prettyJson(object) {
    return JSON.stringify(object, null, '\t');
}

/**
 * get the JSON data to create a heatmapData object.
 */
function setObservationData(url) {
    var response = getResponse(url);
    var parsedResponse = d3.tsv.parse(response, function(d) {
        var event = d["#GENE"];
        var rowData = new Array();
        for (var sample in d) {
            if (sample != "#GENE") {
                var value = d[sample];
                var data = {
                    "sample" : sample,
                    "event" : event,
                    "value" : +value
                };
                rowData.push(data);
            }
        }
        return rowData;
    });

    console.log("parsedResponse->" + prettyJson(parsedResponse));
}

// TODO onload
window.onload = function() {
    console.log("Page loaded. Start onload.");

    setObservationData(countsUrl);
};
