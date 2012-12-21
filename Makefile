all: solum.min.js

solum.min.js: solum.browserify.js
	./node_modules/uglify-js/bin/uglifyjs solum.browserify.js -o solum.min.js

solum.browserify.js:
	./node_modules/browserify/bin/cmd.js lib/solum.js -o solum.browserify.js

clean:
	rm solum.min.js solum.browserify.js