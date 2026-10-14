// Loose shapes of the parts of an OpenRPC 1.x document the rule functions look at.
// Every property is optional/unknown because the functions also run against invalid documents.

export type ContentDescriptor = {
  name?: unknown;
  required?: unknown;
  schema?: unknown;
};

export type ExampleObject = {
  name?: unknown;
  value?: unknown;
  externalValue?: unknown;
};

export type ExamplePairing = {
  name?: unknown;
  params?: unknown;
  result?: unknown;
};

export type MethodObject = {
  name?: unknown;
  params?: unknown;
  result?: unknown;
  errors?: unknown;
  examples?: unknown;
  paramStructure?: unknown;
};

export type ServerObject = {
  url?: unknown;
  variables?: unknown;
};
