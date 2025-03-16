export interface TextCompletionPreset {
  // Temperature and sampling settings
  temp: number;
  temperature_last: boolean;
  top_p: number;
  top_k: number;
  top_a: number;
  tfs: number;
  epsilon_cutoff: number;
  eta_cutoff: number;
  typical_p: number;
  min_p: number;

  // Repetition penalty settings
  rep_pen: number;
  rep_pen_range: number;
  rep_pen_decay: number;
  rep_pen_slope: number;
  no_repeat_ngram_size: number;
  penalty_alpha: number;

  // Beam search settings
  num_beams: number;
  length_penalty: number;
  min_length: number;

  // Encoder repetition penalty
  encoder_rep_pen: number;

  // Additional penalties
  freq_pen: number;
  presence_pen: number;
  skew: number;

  // Sampling flags
  do_sample: boolean;
  early_stopping: boolean;

  // Dynamic temperature settings
  dynatemp: boolean;
  min_temp: number;
  max_temp: number;
  dynatemp_exponent: number;

  // Smoothing settings
  smoothing_factor: number;
  smoothing_curve: number;

  // Dry run settings
  dry_allowed_length: number;
  dry_multiplier: number;
  dry_base: number;
  dry_sequence_breakers: string;
  dry_penalty_last_n: number;

  // Token handling
  add_bos_token: boolean;
  ban_eos_token: boolean;
  skip_special_tokens: boolean;

  // Mirostat settings
  mirostat_mode: number;
  mirostat_tau: number;
  mirostat_eta: number;

  // Guidance and prompting
  guidance_scale: number;
  negative_prompt: string;

  // Grammar and schema settings
  grammar_string: string;
  json_schema: Record<string, any>;

  // Banned tokens
  banned_tokens: string;
  global_banned_tokens?: string;
  send_banned_tokens?: boolean;

  // Sampler configuration
  sampler_priority: string[];
  samplers: string[];
  samplers_priorities: string[];

  // Additional token handling
  ignore_eos_token: boolean;
  spaces_between_special_tokens: boolean;
  speculative_ngram: boolean;

  // Sampler order
  sampler_order: number[];

  // Logit bias
  logit_bias: Array<any>;

  // XTC settings
  xtc_threshold: number;
  xtc_probability: number;

  // Additional settings from the setting_names array
  nsigma: number;
  rep_pen_size?: number;
  seed?: number;
  max_tokens_second?: number;
  include_reasoning?: boolean;
  streaming?: boolean;
  n?: number;
  custom_model?: string;
  bypass_status_check?: boolean;
  openrouter_allow_fallbacks?: boolean;
  generic_model?: string;

  // Generation limits
  genamt?: number;
  max_length: number;
}
