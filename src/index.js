const brotli = require("brotli");
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const util = require("util");

const brotliSettings = {
    extension: "br",
    skipLarger: true,
    mode: 0, // 0 = generic, 1 = text, 2 = font (WOFF2)
    quality: 11, // 0 - 11,
    lgwin: 22, // default
};

const defaultOptions = {
    dirs: [],
    threshold: 0,
    minRatio: 1.0,
    brotliSettings,
    onProcessed: null,
    onBrotliProcessed: null,
    onGzipProcessed: null,
};

const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);

// as of https://stackoverflow.com/a/5827895/1044146
const walk = function(dir, done) {
    var results = [];
    return fs.readdir(dir, function(err, list) {
        if (err) {
            return done(err);
        }
        var pending = list.length;
        if (!pending) {
            return done(null, results);
        }
        list.forEach(function(file) {
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function(err, res) {
                        results = results.concat(res);
                        if (!--pending) {
                            done(null, results);
                        }
                    });
                } else {
                    results.push(file);
                    if (!--pending) {
                        done(null, results);
                    }
                }
            });
        });
    });
};

const kb = bytes => {
    return bytes / 1000;
};

const procBrotli = async (filePath, size, options) => {
    return new Promise(async (resolve, reject) => {
        const result = brotli.compress(await readFile(filePath), brotliSettings);
        if (result === null) {
            return resolve(skipped(filePath + ".br", "result", size));
        }
        const ratio = result.length / size;
        const ratioPerc = ratio * 100;

        let brotliExist;
        let allowSkip = false;
        try {
            brotliExist = await stat(filePath + ".br");
            allowSkip = false;
        } catch (e) {
            allowSkip = true;
        }
        if (ratio > options.minRatio && allowSkip === true) {
            return resolve(skipped(filePath + ".br", "ratio", size, result.length));
        } else {
            await writeFile(filePath + ".br", result);
            return resolve(completed(filePath + ".br", size, result.length));
        }
    });
};

const procGzip = (filePath, size, options) => {
    return new Promise((resolve, reject) => {
        const fileContents = fs.createReadStream(filePath);
        const writeStream = fs.createWriteStream(filePath + ".gz");
        const zip = zlib.createGzip({
            level: 9,
        });
        fileContents
            .pipe(zip)
            .on("error", err => console.error(err))
            .pipe(writeStream)
            .on("finish", async () => {
                const stats2 = await stat(filePath + ".gz");
                const ratio = stats2["size"] / size;
                const ratioPerc = ratio * 100;
                if (ratio > options.minRatio) {
                    const skippedObj = skipped(filePath + ".gz", "ratio", size, stats2["size"]);
                    fs.unlink(filePath + ".gz", () => {});
                    resolve(skippedObj);
                } else {
                    const completedObj = completed(filePath + ".gz", size, stats2["size"]);
                    resolve(completedObj);
                }
            })
            .on("error", err => console.error(err));
    });
};

const procFile = async (filePath, options) => {
    if (filePath.endsWith(".js") || filePath.endsWith(".css") || filePath.endsWith(".html") || filePath.endsWith(".svg") || filePath.endsWith("jpg")) {
        const stats = await stat(filePath);
        const size = stats["size"];
        if (size < options.threshold) {
            skipped(filePath, "size", size);
            return {
                filePath: filePath,
                skipped: true,
                brotli: null,
                gzip: null,
            };
        }

        const resultGzip = await procGzip(filePath, size, options);
        if (options.onGzipProcessed) {
            options.onGzipProcessed(resultGzip);
        }

        const resultBrotli = await procBrotli(filePath, size, options);
        if (options.onBrotliProcessed) {
            options.onBrotliProcessed(resultBrotli);
        }

        return {
            filePath,
            skipped: false,
            brotli: resultBrotli,
            gzip: resultGzip,
        };
    }
    return {
        filePath,
        skipped: true,
        brotli: null,
        gzip: null,
    };
};

function completed(filePath, size1, size2, type) {
    const ratio = size2 / size1;
    const ratioPerc = ratio * 100;
    const ratioText = ratioPerc + "% == " + kb(size1) + "kB -> " + kb(size2) + "kB";

    console.log("[done] " + filePath + ": " + ratioText);
    return {
        filePath,
        initialSize: size1,
        compressedSize: size2,
        type,
        ratio: ratio,
    };
}

const skipped = (filePath, reason, size1, size2) => {
    const ratio = size2 / size1;
    const ratioPercent = ratio * 100;
    console.log("[skip:" + reason + "] " + filePath + ": " + kb(size1) + "kB" + (size2 ? " -> " + kb(size2) + "kB (ratio " + ratio + "%)" : ""));
    return {
        filePath,
        initialSize: size1,
        compressedSize: size2 || null,
        ratio: ratio || null,
        ratioPercent: ratioPercent || null,
    };
};

const compressAssets = async options => {
    options = {
        ...defaultOptions,
        ...options,
    };
    const result = [];

    const allCompressedFiles = [];
    options.dirs.forEach(dir => {
        walk(dir, function(err, results) {
            const processedFiles = results.map(async file => {
                const processedFile = await procFile(file, options);
                if (typeof options.onProcessed === "function") {
                    options.onProcessed(processedFile);
                }
                return processedFile;
            });
            allCompressedFiles.concat(processedFiles);
        });
    });
    return allCompressedFiles;
};

module.exports = function(options) {
    return compressAssets(options);
};
