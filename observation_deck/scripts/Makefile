# 25SEP14 chrisw
# Package up observation deck scripts into one file.

SCRIPTS = jquery-1.11.1.js jquery.contextMenu.js d3.min.js jstat.min.js static.js OD_eventData.js medbook_data_load.js observation_deck_3.js

TARGETS = observation_deck_jqplugin.js

CLOSURE_COMPILER_JAR = ~/git/closure-compiler/build/compiler.jar
COMPILATION_LEVEL = SIMPLE_OPTIMIZATIONS
#COMPILATION_LEVEL = ADVANCED_OPTIMIZATIONS

sync_dev: observation_deck_jqplugin.js
	rsync -avP $< su2c-dev.ucsc.edu:~/observation_deck/observation_deck/scripts/. ;
	\

observation_deck_jqplugin.js: $(SCRIPTS)
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
