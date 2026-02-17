class Processor {
  constructor(strategies = []) {
    this.strategies = strategies;
  }

  registerStrategy(strategy) {
    this.strategies.push(strategy);
  }

  process(entity) {
    if (!entity) {
      throw new Error("Entity is required");
    }

    const strategy = this.strategies.find((s) =>
      s.canProcess(entity)
    );

    if (!strategy) {
      throw new Error("No suitable strategy found");
    }

    return strategy.process(entity);
  }
}

module.exports = Processor;
