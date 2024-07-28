# git clone https://github.com/denosaurs/pngs
# cd pngs
# edit src/lib.rs, mod.ts
#   remove decode()
# edit scripts/_deps.ts (option)
#   export { encodeBase64 as encode } from "jsr:@std/encoding/base64";
#   export { exists } from "jsr:@std/fs";
#   export { compress } from "https://deno.land/x/lz4@0.1.3/mod.ts";
#   export { minify } from "https://esm.sh/terser@5.31.3";
# cargo install wasm-pack
# wasm-pack build --target web --release
# mkdir ../src/pngs
# cp pkg/* ../src/pngs
# convert mod.ts to src/pngs.js
#   cd ..
#   deno run -A bundle.js ./pngs/mod.ts > pngs.js
#   edit pngs.js
#   deno fmt pngs.js
#   cp pngs.js src/pngs.js
