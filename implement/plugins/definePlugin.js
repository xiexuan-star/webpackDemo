/**
 * @typedef DefinePluginOptions
 * @type {Record<string,string>}
 */

class DefinePlugin {
  /**
   * @param {DefinePluginOptions} options
   */
  constructor(options) {
    this.options = options;
  }

  replace(str) {
    Object.entries(this.options).forEach(([o, n]) => {
      str = str.replace(new RegExp(o, 'g'), n);
    });
    return str;
  }

  apply(compiler) {
    compiler.hooks.emit.tap('DefinePlugin', () => {
      compiler.assets.forEach((asset, key, map) => {
        map.set(key, this.replace(asset));
      });
    });
  }
}

module.exports = DefinePlugin;
