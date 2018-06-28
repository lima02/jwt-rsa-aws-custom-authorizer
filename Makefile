.PHONY: all package deploy clean

all: deploy

package:
	cd lambda && npm install && npm run build

deploy: package
	bin/deploy

clean:
	rm -r lambda/node_modules