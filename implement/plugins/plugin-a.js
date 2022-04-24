class PluginA {
  apply(compiler) {
    compiler.hooks.run.tap('pluginA', () => {
      console.log('run=>pluginA');
    });
  }
}

module.exports = PluginA;
