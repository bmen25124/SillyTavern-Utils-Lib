export interface ConnectionProfile {
  id: string;
  mode: string;
  name?: string;
  api?: string;
  preset?: string;
  model?: string;
  proxy?: string;
  instruct?: string;
  'instruct-state'?: string;
  context?: string;
  sysprompt?: string;
  'sysprompt-state'?: string;
  'api-url'?: string;
  tokenizer?: string;
  stop_strings?: string;
  exclude?: string[];
}
