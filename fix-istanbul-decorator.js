const { default: tsJest } = require('ts-jest');

module.exports = fixIstanbulDecoratorCoverageTransformer();

function fixIstanbulDecoratorCoverageTransformer() {
  const transformer = tsJest.createTransformer();

  const process = transformer.process.bind(transformer);

  transformer.process = (...args) => {
    const result = process(...args);

    result.code = result.code.replace(/__decorate/g, '/* istanbul ignore next */__decorate');

    result.code = result.code.replace(
      /(?<=__metadata\("design:paramtypes".*?)(typeof \(_\w\s*=)/g,
      '/* istanbul ignore next */$1',
    );

    return result;
  };

  return transformer;
}
