mkdir -p docs
cp -r src/* docs
drop-inline-css -r src -o docs
deno run -A bundle.ts ./lib/mod.ts > src/color-reducer.js
deno run -A bundle.ts ./src/index.js > docs/index.js
minify -r docs -o .
