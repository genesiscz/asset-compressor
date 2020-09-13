#Usage

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

- The application will traverse through the directories given in `options.dirs` recursively and find all assets that can be compressed with better ratio than `options.minRatio`
- For each file
    - It tries to first generate the Gzip version of the file with *.gz file extension. On each completed gzip, it tries to call `options.onGzipProcessed` if present. It also logs the result into the console in human readable format.
    - Then it tries to generate the Brotli version of the file with *.br file extension. After finishing, it tries to call `option.onBrotliProcessed`. It also logs the result into the console in human readable format. 
    - It then calls the `options.onProcessed` with object including filePath, skipped (true|false), brotli (object), gzip (object)
