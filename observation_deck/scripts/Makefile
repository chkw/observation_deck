# 25SEP14 chrisw
# Package up observation deck scripts into one file.

#SCRIPTS = jquery-1.11.1.js jquery.contextMenu.js d3.min.js jstat.min.js static.js OD_eventData.js medbook_data_load.js observation_deck_3.js
SCRIPTS = jquery.contextMenu.js d3.min.js jstat.min.js static.js OD_eventData.js medbook_data_load.js observation_deck_3.js

TARGETS = observation_deck_plugin.js

CLOSURE_COMPILER_JAR = ~/git/closure-compiler/build/compiler.jar
COMPILATION_LEVEL = SIMPLE_OPTIMIZATIONS
#COMPILATION_LEVEL = ADVANCED_OPTIMIZATIONS

METEOR_PACKAGE_DIR = ~/workspace/MedBook-Workbench/packages/observation-deck

sync_meteor: observation_deck_plugin.js
	rsync -avP $< $(METEOR_PACKAGE_DIR)/.
	\

sync_dev: observation_deck_plugin.js
	rsync -avP $< su2c-dev.ucsc.edu:~/observation_deck/observation_deck/scripts/. ;
	\

observation_deck_plugin.js: $(SCRIPTS)
	java -jar $(CLOSURE_COMPILER_JAR) --compilation_level $(COMPILATION_LEVEL) --js_output_file=$@ $(SCRIPTS) ;
	\

observation_deck_jqplugin.js_old: $(SCRIPTS)
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
