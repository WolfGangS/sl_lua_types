export type StrObj<T> = { [k: string]: T };

export type FuncDefs = StrObj<FuncDef>;
export type FuncDef = {
  def: "func";
  name: string;
  args: FuncArgs;
  result: string | null;
  desc: string;
  energy: number;
  sleep: number;
  pure: boolean;
  link: string;
};
export type FuncArgs = FuncArg[];
export type FuncArg = {
  def: "arg";
  name: string;
  type: string | null;
  desc: string;
};

export type ConstDef = {
  def: "const";
  name: string;
  type: string | null;
  valueRaw: string | null;
  value: number | string | null;
  desc: string;
  link: string;
};
export type ConstDefs = StrObj<ConstDef>;

export type EventDefs = StrObj<EventDef>;
export type EventDef = {
  def: "event";
  name: string;
  args: FuncArgs;
  desc: string;
  link: string;
};

export type TypeDefs = StrObj<TypeDef>;
export type TypeDef = {
  name: string;
  desc: string;
};

export type Override = {
  key: (string | number)[];
  value: string | number | boolean;
};
export type Overrides = Override[];
