#Usage

```js

const compressAssets = require("asset-compressor");
const options = {
    dirs: ["public/img"],
    threshold: 5 * 1024,
    minRatio: 0.9,
};

compressAssets(options);

```

#