/**
 * chrisw@soe.ucsc.edu
 * 23JAN14
 * observation_deck.js
 */

var countsUrl = "observation_deck/data/gene_count.tab";
var panelUrl = "observation_deck/data/gene.tab";

/**
 * get the JSON data to create a heatmapData object.
 */
function setObservationData(url) {
    d3.tsv(url, function(d) {
        console.log(d);
        return {
            "sample" : "" + d.Group,
            "event" : "" + d.Workflow,
            "value" : "" + d.State
        };
    }, function(error, data) {
        var settings = {
        };

        var dataObj = new observationData(data, settings);
    });
}

// TODO onload
window.onload = function() {
    console.log("Page loaded. Start onload.");

    setObservationData(countsUrl);
};
