module.exports = {
  chainWebpack: config => {
    config.resolve.symlinks(false);
  },
  css: {
    extract: false
  }
};
