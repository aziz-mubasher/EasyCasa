import {
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

/** Rejects ASCII control characters U+0000–U+001F (Meilisearch filter-injection guard). */
export function stringHasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) <= 0x1f) return true;
  }
  return false;
}

export function NoControlChars(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'noControlChars',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value == null || value === '') return true;
          if (typeof value !== 'string') return false;
          return !stringHasControlChar(value);
        },
        defaultMessage() {
          return 'must not contain control characters';
        },
      },
    });
  };
}
