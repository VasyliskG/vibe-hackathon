const Entity = require("./domain/Entity");
const Processor = require("./domain/Processor");
const MainService = require("./services/MainService");
const BaseStrategy = require("./strategies/BaseStrategy");
const Validator = require("./utils/Validator");

// Приклад конкретної стратегії
class ExampleStrategy extends BaseStrategy {
  canProcess(entity) {
    return entity.data.type === "example";
  }

  process(entity) {
    return `Processed entity ${entity.id}`;
  }
}

// Ініціалізація
const strategies = [new ExampleStrategy()];
const service = new MainService(strategies);

const entity = new Entity("1", { type: "example" });

Validator.validateEntity(entity);

const result = service.execute(entity);
console.log(result);
