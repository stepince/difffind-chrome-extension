NAME := difffind-launcher
VERSION := $(shell node -p "require('./manifest.json').version")
OUT := dist/$(NAME)-$(VERSION).zip
SOURCES := manifest.json config.js launcher.js background.js popup.html popup.js styles.css icons assets
.PHONY: build clean check
build:
	node scripts/validate.mjs
	mkdir -p dist
	rm -f $(OUT)
	zip -q -r $(OUT) $(SOURCES) -x '.*'
	@echo "Built $(OUT)"
check:
	npm run check
clean:
	rm -rf dist
