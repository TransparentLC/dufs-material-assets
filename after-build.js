import fs from 'node:fs';

let index = fs.readFileSync('dist/index.html', {encoding: 'utf-8'});
console.log(index);
index = index.replace(/<link href="\/([^"]*?)" rel="stylesheet">/g, '<link href="__ASSETS_PREFIX__$1" rel="stylesheet">');
console.log(index);
index = index.replace(/<script crossorigin src="\/([^"]*?)" type="module">/g, '<script crossorigin src="__ASSETS_PREFIX__$1" type="module">');
if (process.env.DUFS_EMBED_FILENAME) {
    index = index.replace(/<link href="\/([^"]*?)" rel="icon">/g, '<link href="__ASSETS_PREFIX__$1" rel="icon">');
} else {
    index = index.replace(/<link href="\/([^"]*?)" rel="icon" type="image\/svg\+xml">/g, '<link href="__ASSETS_PREFIX__$1" rel="icon" type="image/svg+xml">');
}
fs.writeFileSync('dist/index.html', index);
