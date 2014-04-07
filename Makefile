# Deploy a page and it's associated files to medbook.
# https://su2c-dev.ucsc.edu/static/observation_deck.html

PAGE_NAME = observation_deck

#TARGET_DIR = /data/medbook-galaxy-central/static
TARGET_DIR = ~/Documents/eclipse_workspace/medbook_sandbox/data/medbook-galaxy-central/static

test:

deploy:
	rsync -avP $(PAGE_NAME).html $(TARGET_DIR)/. ;
	\
	rsync -avP --exclude="$(PAGE_NAME)/data/" --delete-excluded $(PAGE_NAME) $(TARGET_DIR)/. ;
	\
	
remove:
	rm -f $(TARGET_DIR)/$(PAGE_NAME).html ;
	\
	rm -rf $(TARGET_DIR)/$(PAGE_NAME)/ ;
	\

