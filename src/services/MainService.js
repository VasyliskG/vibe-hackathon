class MainService {
  constructor(strategies = []) {
    this.strategies = strategies;
  }

  execute(entity) {
    const strategy = this.strategies.find(s =>
      s.canProcess(entity)
    );

    if (!strategy) {
      throw new Error("No suitable strategy found");
    }

    return strategy.process(entity);
  }
}

module.exports = MainService;
