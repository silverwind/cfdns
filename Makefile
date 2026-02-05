.PHONY: test
test:
	pnpm exec eslint --color .

.PHONY: publish
publish:
	git push -u --tags origin master
	pnpm publish

.PHONY: update
update:
	pnpm exec updates -u
	rm -rf node_modules
	pnpm install

.PHONY: patch
patch:
	$(MAKE) test
	pnpm exec ver patch
	$(MAKE) publish

.PHONY: minor
minor:
	$(MAKE) test
	pnpm exec ver minor
	$(MAKE) publish

.PHONY: major
major:
	$(MAKE) test
	pnpm exec ver major
	$(MAKE) publish
