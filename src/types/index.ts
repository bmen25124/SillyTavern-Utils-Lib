import { EventEmitter } from 'events';
import { Message } from '../prompt-builder.js';
import { POPUP_RESULT, POPUP_TYPE, PopupOptions } from './popup.js';
import { AutoModeOptions } from './translate.js';
import { ConnectionProfile } from './profiles.js';
import { WIEntry, WIPromptResult } from './world-info.js';
import { ChatCompletionPreset, ChatCompletionSettings } from './chat-completion.js';
import { TextCompletionPreset } from './text-completion.js';
import { RegexScriptData } from './regex.js';

export enum EventNames {
  APP_READY = 'app_ready',
  EXTRAS_CONNECTED = 'extras_connected',
  MESSAGE_SWIPED = 'message_swiped',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_UPDATED = 'message_updated',
  MESSAGE_FILE_EMBEDDED = 'message_file_embedded',
  MORE_MESSAGES_LOADED = 'more_messages_loaded',
  IMPERSONATE_READY = 'impersonate_ready',
  CHAT_CHANGED = 'chat_id_changed',
  GENERATION_AFTER_COMMANDS = 'GENERATION_AFTER_COMMANDS',
  GENERATION_STARTED = 'generation_started',
  GENERATION_STOPPED = 'generation_stopped',
  GENERATION_ENDED = 'generation_ended',
  EXTENSIONS_FIRST_LOAD = 'extensions_first_load',
  EXTENSION_SETTINGS_LOADED = 'extension_settings_loaded',
  SETTINGS_LOADED = 'settings_loaded',
  SETTINGS_UPDATED = 'settings_updated',
  GROUP_UPDATED = 'group_updated',
  MOVABLE_PANELS_RESET = 'movable_panels_reset',
  SETTINGS_LOADED_BEFORE = 'settings_loaded_before',
  SETTINGS_LOADED_AFTER = 'settings_loaded_after',
  CHATCOMPLETION_SOURCE_CHANGED = 'chatcompletion_source_changed',
  CHATCOMPLETION_MODEL_CHANGED = 'chatcompletion_model_changed',
  OAI_PRESET_CHANGED_BEFORE = 'oai_preset_changed_before',
  OAI_PRESET_CHANGED_AFTER = 'oai_preset_changed_after',
  OAI_PRESET_EXPORT_READY = 'oai_preset_export_ready',
  OAI_PRESET_IMPORT_READY = 'oai_preset_import_ready',
  WORLDINFO_SETTINGS_UPDATED = 'worldinfo_settings_updated',
  WORLDINFO_UPDATED = 'worldinfo_updated',
  CHARACTER_EDITED = 'character_edited',
  CHARACTER_PAGE_LOADED = 'character_page_loaded',
  CHARACTER_GROUP_OVERLAY_STATE_CHANGE_BEFORE = 'character_group_overlay_state_change_before',
  CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER = 'character_group_overlay_state_change_after',
  USER_MESSAGE_RENDERED = 'user_message_rendered',
  CHARACTER_MESSAGE_RENDERED = 'character_message_rendered',
  FORCE_SET_BACKGROUND = 'force_set_background',
  CHAT_DELETED = 'chat_deleted',
  CHAT_CREATED = 'chat_created',
  GROUP_CHAT_DELETED = 'group_chat_deleted',
  GROUP_CHAT_CREATED = 'group_chat_created',
  GENERATE_BEFORE_COMBINE_PROMPTS = 'generate_before_combine_prompts',
  GENERATE_AFTER_COMBINE_PROMPTS = 'generate_after_combine_prompts',
  GENERATE_AFTER_DATA = 'generate_after_data',
  GROUP_MEMBER_DRAFTED = 'group_member_drafted',
  GROUP_WRAPPER_STARTED = 'group_wrapper_started',
  GROUP_WRAPPER_FINISHED = 'group_wrapper_finished',
  WORLD_INFO_ACTIVATED = 'world_info_activated',
  TEXT_COMPLETION_SETTINGS_READY = 'text_completion_settings_ready',
  CHAT_COMPLETION_SETTINGS_READY = 'chat_completion_settings_ready',
  CHAT_COMPLETION_PROMPT_READY = 'chat_completion_prompt_ready',
  CHARACTER_FIRST_MESSAGE_SELECTED = 'character_first_message_selected',
  // TODO: Naming convention is inconsistent with other events
  CHARACTER_DELETED = 'characterDeleted',
  CHARACTER_DUPLICATED = 'character_duplicated',
  CHARACTER_RENAMED = 'character_renamed',
  /** @deprecated The event is aliased to STREAM_TOKEN_RECEIVED. */
  SMOOTH_STREAM_TOKEN_RECEIVED = 'stream_token_received',
  STREAM_TOKEN_RECEIVED = 'stream_token_received',
  STREAM_REASONING_DONE = 'stream_reasoning_done',
  FILE_ATTACHMENT_DELETED = 'file_attachment_deleted',
  WORLDINFO_FORCE_ACTIVATE = 'worldinfo_force_activate',
  OPEN_CHARACTER_LIBRARY = 'open_character_library',
  ONLINE_STATUS_CHANGED = 'online_status_changed',
  IMAGE_SWIPED = 'image_swiped',
  CONNECTION_PROFILE_LOADED = 'connection_profile_loaded',
  TOOL_CALLS_PERFORMED = 'tool_calls_performed',
  TOOL_CALLS_RENDERED = 'tool_calls_rendered',
}

export interface ChatCompletionMessage {
  role: string;
  content: string;
}

export interface ExtractedData {
  content: string;
  reasoning?: string;
}

export interface StreamResponse {
  text: string;
  swipes: string[];
  state: {
    reasoning?: string | null;
    image?: string | null;
  };
}

export interface ChatMessage {
  name: string;
  mes: string;
  is_user?: boolean;
  is_system?: boolean;
  force_avatar?: string;
  original_avatar?: string;
  extra?: {
    reasoning?: string;
    reasoning_duration?: number;
    reasoning_type?: string;
    display_text?: string;
    reasoning_display_text?: string;
    tool_invocations?: any[];
    append_title?: boolean;
    title?: string;
    isSmallSys?: boolean;
    token_count?: number;
  } & Record<string, any>;
}

export interface ConnectAPIMap {
  [key: string]: {
    selected: string;
    button?: string;
    type?: string;
    source?: string;
  };
}

export interface FullExportData {
  name: string;
  description: string;
  first_mes: string;
  scenario: string;
  personality: string;
  mes_example: string;
  creatorcomment?: string;
  tags?: string[];
  avatar: string;
  data: {
    name: string;
    description: string;
    first_mes: string;
    scenario: string;
    personality: string;
    mes_example: string;
    character_book?: { entries: any[]; name: string };
    creator?: string;
    creator_notes?: string;
    tags: string[];
    character_version?: string;
    avatar: string;
    alternate_greetings?: string[];
    extensions?: {
      depth_prompt?: {
        prompt: string;
        depth: number;
        role: string;
      };
      world?: string;
    };
  };
  spec: 'chara_card_v3';
  spec_version: '3.0';
}

export interface Character {
  name: string;
  avatar: string;
  description?: string;
  first_mes?: string;
  scenario?: string;
  personality?: string;
  mes_example?: string;
  tags?: string[];
  creatorcomment?: string;
  data?: { alternate_greetings?: string[] } & Record<string, any>;
}

export interface SillyTavernContext {
  // Fuck commmand that types, I'll do it later.
  SlashCommandParser: any;
  SlashCommand: any;
  SlashCommandArgument: any;
  SlashCommandNamedArgument: any;
  ARGUMENT_TYPE: any;
  eventSource: EventEmitter;
  getRequestHeaders: () => {
    'Content-Type': string;
    'X-CSRF-Token': any;
  };
  renderExtensionTemplateAsync: (
    extensionName: string,
    templateId: string,
    templateData?: object,
    sanitize?: boolean,
    localize?: boolean,
  ) => Promise<string>;
  extensionSettings: {
    connectionManager?: {
      profiles: ConnectionProfile[];
    };
    translate?: {
      target_language: string;
      auto_mode: AutoModeOptions;
    };
    regex?: RegexScriptData[];
  } & Record<string, any>;
  saveSettingsDebounced: () => void;
  callGenericPopup: (
    content: JQuery<HTMLElement> | string | Element,
    type: POPUP_TYPE,
    inputValue?: string,
    popupOptions?: PopupOptions,
  ) => Promise<POPUP_RESULT | string | (boolean | null)>;
  Popup: {
    show: {
      confirm: (message: string, title?: string) => Promise<boolean>;
      input: (
        header: string | null,
        text?: string | null,
        defaultValue?: string,
        popupOptions?: PopupOptions,
      ) => Promise<string | null>;
    };
  };
  chat: ChatMessage[];
  getCharacterCardFields: (options?: { chid?: number }) => {
    system: string;
    mesExamples: string;
    description: string;
    personality: string;
    persona: string;
    scenario: string;
    jailbreak: string;
    version: string;
  };
  characters: Character[];
  /**
   * Weird naming, it also updates the UI. I mainly use for update character list after importing character via API.
   */
  getCharacters: () => Promise<void>;
  getThumbnailUrl: (type: string, file?: string) => string;
  powerUserSettings: {
    persona_description_position: number;
    persona_description: string;
    persona_description_lorebook: string;
    prefer_character_prompt: boolean;
    request_token_probabilities: boolean;
  };
  getWorldInfoPrompt: (chat: string[], maxContext: number, isDryRun: boolean) => Promise<WIPromptResult>;
  saveWorldInfo: (name: string, data: { entries: Record<number, WIEntry> }, immediately?: boolean) => Promise<void>;
  loadWorldInfo: (worldName: string) => Promise<{ entries: Record<number, WIEntry>; name: string } | null>;
  reloadWorldInfoEditor: (file: string, loadIfNotSelected?: boolean) => void;
  ToolManager: {
    isToolCallingSupported(): boolean;
    canPerformToolCalls(type: string): boolean;
    RECURSE_LIMIT: number;
  };
  ConnectionManagerRequestService: {
    sendRequest: (
      profileId: string,
      prompt: string | Message[],
      maxTokens: number,
      custom?: {
        stream?: boolean;
        signal?: AbortSignal;
        extractData?: boolean;
        includePreset?: boolean;
        includeInstruct?: boolean;
        instructSettings?: Record<string, any>;
      },
      overridePayload?: Record<string, any>,
    ) => Promise<ExtractedData | (() => AsyncGenerator<StreamResponse>)>;
    handleDropdown: (
      selector: string,
      initialSelectedProfileId: string,
      onChange: (profile?: ConnectionProfile) => void,
    ) => void;
  };
  extensionPrompts: Record<
    string,
    {
      value: string;
      role: number;
      position: number;
      depth: number;
      identifier: string;
      filter?: any;
    }
  >;
  setExtensionPrompt: (
    key: string,
    value: string,
    position: number,
    depth: number,
    scan?: boolean,
    role?: number,
    filter?: () => Promise<boolean> | boolean,
  ) => void;
  chatCompletionSettings: ChatCompletionSettings;
  textCompletionSettings: TextCompletionPreset;
  addOneMessage(
    mes: ChatMessage,
    {
      type,
      insertAfter,
      scroll,
      insertBefore,
      forceId,
      showSwipes,
    }?: {
      type?: string;
      insertAfter?: number;
      scroll?: boolean;
      insertBefore?: number;
      forceId?: number;
      showSwipes?: boolean;
    },
  ): void;
  messageFormatting: (
    mes: string,
    ch_name: string,
    isSystem: boolean,
    isUser: boolean,
    messageId: number,
    sanitizerOverrides?: object,
    isReasoning?: boolean,
  ) => string;
  saveChat: () => Promise<void>;
  chatMetadata: Record<string, any>;
  getPresetManager: (apiId?: string) => {
    getCompletionPresetByName(name?: string): undefined | TextCompletionPreset | ChatCompletionPreset;
    getPresetList(): {
      presets: undefined | TextCompletionPreset | ChatCompletionPreset[];
      preset_names: Record<string, number> | string[];
    };
  };
  substituteParams: (
    content: string,
    _name1?: string,
    _name2?: string,
    _original?: string,
    _group?: string,
    _replaceCharacterCard?: boolean,
    additionalMacro?: Record<string, any>,
    postProcessFn?: (x: string) => string,
  ) => string;
  CONNECT_API_MAP: ConnectAPIMap;
  registerFunctionTool: (options: {
    name: string;
    displayName: string;
    description: string;
    parameters: Record<string, any>;
    action: (parameters: Record<string, any>) => Promise<unknown>;
    formatMessage: (parameters: Record<string, any>) => Promise<string>;
  }) => void;
  unregisterFunctionTool: (name: string) => void;
  extractMessageFromData: (data: object, activeApi?: string) => string;
  getTextGenServer: (type?: string) => string;
  activateSendButtons: () => void;
  deactivateSendButtons: () => void;
  uuidv4: () => string;
}

declare global {
  const SillyTavern: {
    getContext(): SillyTavernContext;
  };
}
