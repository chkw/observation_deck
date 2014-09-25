# 25SEP14 chrisw
# Package up observation deck scripts into one file.

SCRIPTS = static.js OD_eventData.js medbook_data_load.js observation_deck_2.js

TARGETS = observation_deck_jqplugin.js

observation_deck_jqplugin.js: $(SCRIPTS)
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
