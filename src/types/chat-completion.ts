export interface ChatCompletionPreset {
  chat_completion_source: string;
  openai_model: string;
  claude_model: string;
  windowai_model: string;
  openrouter_model: string;
  openrouter_use_fallback: boolean;
  openrouter_group_models: boolean;
  openrouter_sort_models: string;
  openrouter_providers: string[];
  openrouter_allow_fallbacks: boolean;
  openrouter_middleout: string;
  ai21_model: string;
  mistralai_model: string;
  cohere_model: string;
  perplexity_model: string;
  groq_model: string;
  nanogpt_model?: string;
  deepseek_model?: string;
  zerooneai_model: string;
  blockentropy_model: string;
  custom_model: string;
  custom_url: string;
  custom_include_body: string;
  custom_exclude_body: string;
  custom_include_headers: string;
  custom_prompt_post_processing: string;
  google_model: string;
  temperature: number;
  frequency_penalty: number;
  presence_penalty: number;
  top_p: number;
  top_k: number;
  top_a: number;
  min_p: number;
  repetition_penalty: number;
  openai_max_context: number;
  openai_max_tokens: number;
  wrap_in_quotes: boolean;
  names_behavior: number;
  send_if_empty: string;
  impersonation_prompt: string;
  new_chat_prompt: string;
  new_group_chat_prompt: string;
  new_example_chat_prompt: string;
  continue_nudge_prompt: string;
  bias_preset_selected: string;
  reverse_proxy: string;
  proxy_password: string;
  max_context_unlocked: boolean;
  wi_format: string;
  scenario_format: string;
  personality_format: string;
  group_nudge_prompt: string;
  stream_openai: boolean;
  prompts: PromptConfig[];
  prompt_order?: PromptOrder[];
  api_url_scale: string;
  show_external_models: boolean;
  assistant_prefill: string;
  assistant_impersonation: string;
  claude_use_sysprompt: boolean;
  use_makersuite_sysprompt: boolean;
  use_alt_scale: boolean;
  squash_system_messages: boolean;
  image_inlining: boolean;
  inline_image_quality: string;
  bypass_status_check: boolean;
  continue_prefill: boolean;
  continue_postfix: string;
  function_calling: boolean;
  show_thoughts: boolean;
  reasoning_effort: string;
  enable_web_search: boolean;
  seed: number;
  n: number;
  request_images?: boolean;
}

export interface PromptConfig {
  name?: string;
  system_prompt?: boolean;
  enabled?: boolean;
  role?: string;
  content: string;
  identifier: string;
  injection_position?: number;
  injection_depth?: number;
  forbid_overrides?: boolean;
  marker?: boolean;
}

export interface PromptOrder {
  character_id: number;
  order: {
    identifier: string;
    enabled: boolean;
  }[];
}

export interface ChatCompletionSettings {
  // Preset settings
  preset_settings_openai: string;

  // Generation parameters
  temp_openai: number;
  freq_pen_openai: number;
  pres_pen_openai: number;
  top_p_openai: number;
  top_k_openai: number;
  min_p_openai: number;
  top_a_openai: number;
  repetition_penalty_openai: number;
  seed: number;
  n: number;

  // Context and output settings
  stream_openai: boolean;
  openai_max_context: number;
  openai_max_tokens: number;
  wrap_in_quotes: boolean;

  // Prompt management
  prompts: PromptConfig[];
  prompt_order: PromptOrder[];

  // Various prompts
  send_if_empty: string;
  impersonation_prompt: string;
  new_chat_prompt: string;
  new_group_chat_prompt: string;
  new_example_chat_prompt: string;
  continue_nudge_prompt: string;

  // Bias settings
  bias_preset_selected: string;
  bias_presets: Record<string, any>;

  // Format settings
  wi_format: string;
  group_nudge_prompt: string;
  scenario_format: string;
  personality_format: string;

  // Model selections
  openai_model: string;
  claude_model: string;
  google_model: string;
  ai21_model: string;
  mistralai_model: string;
  cohere_model: string;
  perplexity_model: string;
  groq_model: string;
  nanogpt_model: string;
  zerooneai_model: string;
  blockentropy_model: string;
  deepseek_model: string;
  custom_model: string;
  windowai_model: string;

  // Custom API settings
  custom_url: string;
  custom_include_body: string;
  custom_exclude_body: string;
  custom_include_headers: string;
  custom_prompt_post_processing: string;

  // OpenRouter settings
  openrouter_model: string;
  openrouter_use_fallback: boolean;
  openrouter_group_models: boolean;
  openrouter_sort_models: string;
  openrouter_providers: string[];
  openrouter_allow_fallbacks: boolean;
  openrouter_middleout: string;

  // Proxy settings
  reverse_proxy: string;
  proxy_password: string;

  // Source and configuration
  chat_completion_source: string;
  max_context_unlocked: boolean;
  api_url_scale: string;
  show_external_models: boolean;

  // Claude specific
  assistant_prefill: string;
  assistant_impersonation: string;
  claude_use_sysprompt: boolean;

  // Google specific
  use_makersuite_sysprompt: boolean;

  // Miscellaneous settings
  use_alt_scale: boolean;
  squash_system_messages: boolean;
  image_inlining: boolean;
  inline_image_quality: string;
  bypass_status_check: boolean;
  continue_prefill: boolean;
  function_calling: boolean;
  names_behavior: number;
  continue_postfix: string;
  show_thoughts: boolean;
  reasoning_effort: string;
  enable_web_search: boolean;
  request_images: boolean;
}
