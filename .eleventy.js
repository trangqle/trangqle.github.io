module.exports = function(eleventyConfig) {
    // Watch changes to css
    eleventyConfig.addWatchTarget("./css/")
    eleventyConfig.addPassthroughCopy("./css/")
    // Copy assets
    eleventyConfig.addWatchTarget("assets")
    eleventyConfig.addPassthroughCopy("assets")

    // Configure markdown generator
    let md = require("markdown-it")()
              .use(require("markdown-it-block-image"))
              .use(require("markdown-it-attrs"))
    eleventyConfig.setLibrary("md", md)

    global.filters = eleventyConfig.javascriptFunctions
    eleventyConfig.setPugOptions({
      globals: ['filters']
    })

    return {
        dir: {
          layouts: "layouts"
        }
      }
}

