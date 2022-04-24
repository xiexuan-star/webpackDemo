function LoaderB(source) {
  console.log('loader-b');
  return source += '\n const loaderB = "loaderB"';
}

module.exports = LoaderB;
