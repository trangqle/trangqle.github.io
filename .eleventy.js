module.exports = function(eleventyConfig) {
    // Watch changes to css
    eleventyConfig.addWatchTarget("./css/");
    eleventyConfig.addPassthroughCopy("./css/");
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

