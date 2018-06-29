.PHONY: all package deploy clean

all: deploy

package:
	cd lambda && npm install && npm run build

deploy: package
	bin/deploy

clean:
	rm -rf lambda/node_modules