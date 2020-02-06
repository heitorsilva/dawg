module.exports = {
  chainWebpack: config => {
    config.resolve.symlinks(false);
  },
  configureWebpack: {
    externals: {
      vue: "vue",
      "@vue/composition-api": "@vue/composition-api"
    }
  },
  css: {
    extract: false
  }
};
