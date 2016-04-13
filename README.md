observation_deck
================

What is the Observation Deck?
---

The Observation Deck is a web-browser-based tool (javascript) for visualizing data from a set of cancer samples. Various datatypes may be visualized simultaneously in the Observation Deck including mRNA expression, mutation type, copy number, signature scores, and clinical variables. A search box with suggestions assists the user in selecting data events of interest. The selected events are visualized in matrices that are organized by datatype. For example, mutation calls are visualized in a submatrix separate from the clinical variables submatrix. Each row represents a data event; and each column represents a sample. Furthermore, mutation calls are visualized with oncoprint-style symbols in which snp, insertions, and deletions are shown in a compact format. The Observation Deck also allows the user to select a single data event that is used to pull in other data events that are strongly correlated or strongly anticorrelated to the selected event. Again, the results are separated into submatrices based on datatype. With this feature, it is possible to page through the transcription factor viper signature scores that are the most highly anticorrelated with the selected mRNA expression, for example.

How To Use
---

To render an observation deck, pass the data to the method `observation_deck.buildObservationDeck()`. The `observation_deck` object is exposed in `observation_deck/scripts/observation_deck_plugin_dev.js`. `test.html` has an example of how to do it.

3rd Party Dependencies
---

The Observation Deck uses:

  * d3
  * jQuery-contextMenu
  * jquery
  * jstat
  * typeahead
  * underscore

