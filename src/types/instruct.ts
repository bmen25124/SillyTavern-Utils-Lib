export interface InstructSettings {
  enabled: boolean;
  preset: string;
  input_sequence: string;
  input_suffix: string;
  output_sequence: string;
  output_suffix: string;
  system_sequence: string;
  system_suffix: string;
  last_system_sequence: string;
  first_input_sequence: string;
  first_output_sequence: string;
  last_input_sequence: string;
  last_output_sequence: string;
  system_sequence_prefix: string;
  system_sequence_suffix: string;
  stop_sequence: string;
  wrap: boolean;
  macro: boolean;
  names_behavior: string;
  activation_regex: string;
  derived: boolean;
  bind_to_context: boolean;
  user_alignment_message: string;
  system_same_as_user: boolean;
  separator_sequence: string;
}
