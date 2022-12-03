const Image = require('@11ty/eleventy-img');
const getImageSize = require('image-size')
const fs = require('fs');

function makeImage(src, options) {
    const opts = {
        formats: ["avif", "webp", "jpeg"],
        urlPath: "/assets/img/",
        outputDir: "./_site/assets/img/",
        ...options,
    };
    Image(src, opts);
    const dimensions = getImageSize(fs.readFileSync(src));
    const img = new Image.Image(src, opts);
    return img.getFullStats({
        width: dimensions.width,
        height: dimensions.height,
        type: dimensions.type,
    });
}

function imageShortcode(src, alt, sizes = "100vw") {
    if (alt === undefined) {
        // You bet we throw an error on missing alt (alt="" works okay)
        throw new Error(`Missing \`alt\` attribute on eleventy-img shortcode from: ${originalSrc}`);
    }

    let widths1x = [640, 960, 1280, 'auto'];
    let widths2x = widths1x.map(x => x === 'auto' ? x : x * 2);

    let meta1x = makeImage(src, {
        widths: widths1x,
        sharpWebpOptions: { quality: 75 },
        sharpJpegOptions: { quality: 75, mozjpeg: true },
        sharpAvifOptions: { quality: 50 },
    });

    let meta2x = makeImage(src, {
        widths: widths2x,
        sharpWebpOptions: { quality: 44 },
        sharpJpegOptions: { quality: 50, mozjpeg: true },
        sharpAvifOptions: { quality: 37 },
    });

    let lowsrc = meta1x.jpeg[0];
    let highsrc = meta1x.jpeg.at(-1);

    function makeSource(meta, media) {
        return Object.values(meta).map(format =>
            `<source type="${format[0].sourceType}" ${media ? "media=" + '"' + media + '"' : ""} srcset="${format.map(entry => entry.srcset).join(", ")}" sizes="${sizes}"/>`
        ).join('');
    }
    return '<picture>' +
        makeSource(meta1x) +
        makeSource(meta2x, "(-webkit-min-device-pixel-ratio: 1.5)") +
        `<img src="${lowsrc.url}" width="${highsrc.width}" height="${highsrc.height}" alt="${alt}" loading="lazy" decoding="async"/>` +
        '</picture>';
}

module.exports = function(eleventyConfig) {
    // Watch changes to css
    eleventyConfig.addWatchTarget("css");
    eleventyConfig.addPassthroughCopy("css");
    // Watch changes to not css
    eleventyConfig.addWatchTarget("./js/");
    eleventyConfig.addPassthroughCopy("./js/");
    // Copy assets
    eleventyConfig.addWatchTarget("assets");
    eleventyConfig.addPassthroughCopy("assets");

    // Configure markdown generator
    let md = require("markdown-it")()
        .use(require("markdown-it-block-image"))
        .use(require("markdown-it-attrs"));
    eleventyConfig.setLibrary("md", md);

    global.filters = eleventyConfig.javascriptFunctions;
    eleventyConfig.setPugOptions({
        globals: ['filters']
    });

    eleventyConfig.addNunjucksShortcode("image", imageShortcode);
    eleventyConfig.addLiquidShortcode("image", imageShortcode);
    eleventyConfig.addJavaScriptFunction("image", imageShortcode);

    // Create collection work ordered by recent post to oldest
    eleventyConfig.addCollection('work', (collectionApi) => {
        return collectionApi.getFilteredByTag('work').sort((a, b) => b.date - a.date);
    });

    return {
        dir: {
            layouts: "layouts"
        }
    };
}

