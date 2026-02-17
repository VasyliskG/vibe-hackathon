class BaseStrategy {
  canProcess(entity) {
    throw new Error("Method not implemented");
  }

  process(entity) {
    throw new Error("Method not implemented");
  }
}

module.exports = BaseStrategy;
