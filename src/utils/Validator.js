class Validator {
  static validateEntity(entity) {
    if (!entity.id) {
      throw new Error("Entity must have id");
    }
  }
}

module.exports = Validator;
