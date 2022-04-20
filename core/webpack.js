function webpack(options) {
  // 合并参数
  const mergeOptions = _mergeOptions(options);

  function compiler() {
    //
  }

  return { compiler };
}

// 合并shell命令中的option，通过process.argv
function _mergeOptions(options) {
  const shellOptions = process.argv.reduce((option, argv) => {
    // slice(2) 将--剔除
    // argv -> --mode=production
    const [key, value] = argv.slice(2).split('=');
    if (key && value) {
      const parseKey = key.slice(2);
      option[parseKey] = value;
    }
    return option;
  }, {});
  return Object.assign({}, options, shellOptions);
}

module.exports = webpack;
