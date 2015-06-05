# 25SEP14 chrisw
# Package up observation deck scripts into one file.

BOWER_DIR = bower_components

#SCRIPTS = jquery-1.11.1.js jquery.contextMenu.js d3.min.js jstat.min.js static.js OD_eventData.js medbook_data_load.js observation_deck_3.js
#SCRIPTS = $(BOWER_DIR)/jQuery-contextMenu/src/jquery.contextMenu.js $(BOWER_DIR)/d3/d3.min.js $(BOWER_DIR)/jstat/dist/jstat.min.js utils.js OD_eventData.js medbook_data_load.js observation_deck_3.js signatures.js gene_lists.js
#SCRIPTS = $(BOWER_DIR)/jQuery-contextMenu/src/jquery.contextMenu.js $(BOWER_DIR)/d3/d3.min.js $(BOWER_DIR)/jstat/dist/jstat.min.js utils.js OD_eventData.js medbook_data_load.js observation_deck_3.js signatures.js
SCRIPTS = $(BOWER_DIR)/typeahead.js/dist/typeahead.bundle.js $(BOWER_DIR)/jQuery-contextMenu/src/jquery.contextMenu.js $(BOWER_DIR)/d3/d3.min.js $(BOWER_DIR)/jstat/dist/jstat.min.js utils.js OD_eventData.js medbook_data_load.js observation_deck_3.js

TARGETS = observation_deck_plugin.js

CLOSURE_COMPILER_JAR = ~/git/closure-compiler/build/compiler.jar
#COMPILATION_LEVEL = WHITESPACE_ONLY
COMPILATION_LEVEL = SIMPLE_OPTIMIZATIONS
#COMPILATION_LEVEL = ADVANCED_OPTIMIZATIONS

METEOR_PACKAGE_DIR = ~/workspace/MedBook-Workbench/packages/observation-deck

test:

bower_update:
	bower update ;
	\

bower_clean:
	rm -rf $(BOWER_DIR) ;
	\

sync_meteor: observation_deck_plugin.js
	rsync -avP $< $(METEOR_PACKAGE_DIR)/.
	\

observation_deck_plugin.js: $(SCRIPTS)
	java -jar $(CLOSURE_COMPILER_JAR) --compilation_level $(COMPILATION_LEVEL) --js_output_file=$@ $(SCRIPTS) ;
	\

observation_deck_plugin_dev.js: $(SCRIPTS)
	rm -f 1.tmp ;
	\
	for script in $(SCRIPTS) ; do \
		cat $$script >> 1.tmp ; \
	done ;
	\
	mv 1.tmp $@ ;
	\
	rm -f 1.tmp ;
	\

clean:
	rm -f $(TARGETS)
