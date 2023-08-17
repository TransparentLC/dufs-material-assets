import fs from 'node:fs';

let index = fs.readFileSync('dist/index.html', {encoding: 'utf-8'});
index = index.replace(/<link href="\/(.*?)" rel="icon" type="image\/svg\+xml">/g, '<link href="__ASSETS_PREFIX__$1" rel="icon" type="image/svg+xml">');
index = index.replace(/<link href="\/(.*?)" rel="stylesheet">/g, '<link href="__ASSETS_PREFIX__$1" rel="stylesheet">');
index = index.replace(/<script crossorigin src="\/(.*?)" type="module">/g, '<script crossorigin src="__ASSETS_PREFIX__$1" type="module">');
fs.writeFileSync('dist/index.html', index);
