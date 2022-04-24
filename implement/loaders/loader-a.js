function LoaderA(source) {
  console.log('loader-a');
  return source += '\n const loaderA = "loaderA"';
}

module.exports = LoaderA;
