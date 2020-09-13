# Asset Compressor
A very simple utility to compress all your assets into Brotli &amp; Gzip ready to be served via webserver.

Repository is open for issues & pull requests

# Usage

```js
const compressAssets = require('asset-compressor');
const options = {
    dirs: ["public/img"],
    threshold: 5 * 1024,
    minRatio: 0.9,
    onProcessed: (file) => {
        console.log("c", file);
    },
    onBrotliProcessed: (file) => {
        console.log("a", file);
    },
    onGzipProcessed: (file) => {
        console.log("b", file)
    }
};

compressAssets(options).then(() => console.log("Completed!"));
```

# Options:
```js
const defaultOptions = {
    dirs: [],
    threshold: 0,
    minRatio: 1.0,
    brotliSettings: {
        extension: "br",
        skipLarger: true,
        mode: 0, // 0 = generic, 1 = text, 2 = font (WOFF2)
        quality: 11, // 0 - 11,
        lgwin: 22, // default
    },
    onProcessed: null,
    onBrotliProcessed: null,
    onGzipProcessed: null,
};
```

- The application will traverse through the directories given in `options.dirs` recursively and find all assets that can be compressed with better ratio than `options.minRatio`
- For each file
    - It tries to first generate the Gzip version of the file with *.gz file extension. On each completed gzip, it tries to call `options.onGzipProcessed` if present. It also logs the result into the console in human readable format.
    - Then it tries to generate the Brotli version of the file with *.br file extension. After finishing, it tries to call `option.onBrotliProcessed`. It also logs the result into the console in human readable format. 
    - It then calls the `options.onProcessed` with object including filePath, skipped (true|false), brotli (object), gzip (object)

# Typical usage with apache2

```
# Specify gzip-encoded assets
<Files *.js.gz>
    AddType "text/javascript" .gz
    AddEncoding gzip .gz
</Files>
<Files *.css.gz>
    AddType "text/css" .gz
    AddEncoding gzip .gz
</Files>
<Files *.svg.gz>
    AddType "image/svg+xml" .gz
    AddEncoding gzip .gz
</Files>
<Files *.png.gz>
    AddType "image/png" .gz
    AddEncoding gzip .gz
</Files>
<Files *.jpg.gz>
    AddType "image/jpeg" .gz
    AddEncoding gzip .gz
</Files>
<Files *.html.gz>
    AddType "text/html" .gz
    AddEncoding gzip .gz
</Files>

# Specify Brotli-encoded assets
<Files *.js.br>
    AddType "text/javascript" .br
    AddEncoding br .br
</Files>
<Files *.png.br>
    AddType "image/png" .br
    AddEncoding br .br
</Files>
<Files *.jpg.br>
    AddType "image/jpeg" .br
    AddEncoding br .br
</Files>

<Files *.css.br>
    AddType "text/css" .br
    AddEncoding br .br
</Files>
<Files *.svg.br>
    AddType "image/svg+xml" .br
    AddEncoding br .br
</Files>
<Files *.html.br>
    AddType "text/html" .br
    AddEncoding br .br
</Files>

<IfModule mod_headers.c>
AddOutputFilterByType DEFLATE text/plain
AddOutputFilterByType DEFLATE text/html
AddOutputFilterByType DEFLATE text/xml
AddOutputFilterByType DEFLATE text/css
AddOutputFilterByType DEFLATE image/jpeg
AddOutputFilterByType DEFLATE image/png
AddOutputFilterByType DEFLATE image/svg+xml
AddOutputFilterByType DEFLATE application/xml
AddOutputFilterByType DEFLATE application/xhtml+xml
AddOutputFilterByType DEFLATE application/rss+xml
AddOutputFilterByType DEFLATE application/javascript
AddOutputFilterByType DEFLATE application/x-javascript

RewriteEngine On
# Serve pre-compressed Brotli assets
RewriteCond %{HTTP:Accept-Encoding} br
RewriteCond %{REQUEST_FILENAME}.br -f
RewriteRule ^(.*)$ $1.br [L]
# Serve pre-compressed gzip assets
RewriteCond %{HTTP:Accept-Encoding} gzip
RewriteCond %{REQUEST_FILENAME}.gz -f
RewriteRule ^(.*)$ $1.gz [L]
</IfModule>
```