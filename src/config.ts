// @ts-ignore
import { persona_description_positions, renderStoryString } from '../../../../power-user.js';

import {
  name1,
  name2,
  getMaxContextSize,
  parseMesExamples,
  baseChatReplace,
  chat_metadata,
  extension_prompt_types,
  this_chid,
  characters,
  depth_prompt_role_default,
  depth_prompt_depth_default,
  main_api,
  systemUserName,
  system_avatar,
  // @ts-ignore
} from '../../../../../script.js';

// @ts-ignore
import { world_info_include_names, wi_anchor_position } from '../../../../world-info.js';

// @ts-ignore
import { formatInstructModeExamples } from '../../../../instruct-mode.js';

// @ts-ignore
import { appendFileContent } from '../../../../chats.js';

import {
  getPromptRole,
  prepareOpenAIMessages,
  setOpenAIMessages,
  setOpenAIMessageExamples,
  // @ts-ignore
} from '../../../../openai.js';

// @ts-ignore
import { metadata_keys } from '../../../../authors-note.js';

// @ts-ignore
import { getGroupDepthPrompts, selected_group } from '../../../../group-chats.js';

// @ts-ignore
import { regex_placement, getRegexedString } from '../../../regex/engine.js';

/**
 * Sends an echo message using the SlashCommandParser's echo command.
 */
export async function st_echo(severity: string, message: string): Promise<void> {
  // @ts-ignore
  await SillyTavern.getContext().SlashCommandParser.commands['echo'].callback({ severity: severity }, message);
}

export function st_getMaxContextSize(overrideResponseLength?: number): number {
  return getMaxContextSize(overrideResponseLength);
}

export function st_parseMesExamples(examplesStr: string, isInstruct: boolean): string[] {
  return parseMesExamples(examplesStr, isInstruct);
}

export function st_baseChatReplace(value: any, name1: any, name2: any): any {
  return baseChatReplace(value, name1, name2);
}

export function st_formatInstructModeExamples(mesExamplesArray: string[], name1: string, name2: string): string[] {
  return formatInstructModeExamples(mesExamplesArray, name1, name2);
}

export function st_renderStoryString(params: object): string {
  return renderStoryString(params);
}

export function st_getPromptRole(role: number): string {
  return getPromptRole(role);
}

export function st_getAuthorNote(): {
  prompt: string;
  interval: number;
  position: number;
  depth: number;
  role: number;
} {
  return {
    prompt: chat_metadata[metadata_keys.prompt],
    interval: chat_metadata[metadata_keys.interval],
    position: chat_metadata[metadata_keys.position],
    depth: chat_metadata[metadata_keys.depth],
    role: chat_metadata[metadata_keys.role],
  };
}

export function st_getGroupDepthPrompts(
  groupId: string,
  characterId: number,
): {
  depth: number;
  text: string;
  role: string;
}[] {
  return getGroupDepthPrompts(groupId, characterId);
}

export function st_prepareOpenAIMessages(
  {
    name2,
    charDescription,
    charPersonality,
    Scenario,
    worldInfoBefore,
    worldInfoAfter,
    bias,
    type,
    quietPrompt,
    quietImage,
    extensionPrompts,
    cyclePrompt,
    systemPromptOverride,
    jailbreakPromptOverride,
    personaDescription,
    messages,
    messageExamples,
  }: {
    name2: string;
    charDescription: string;
    charPersonality: string;
    Scenario: string;
    worldInfoBefore: string;
    worldInfoAfter: string;
    bias: string;
    type: string;
    quietPrompt?: string;
    quietImage?: string;
    cyclePrompt: string;
    systemPromptOverride: string;
    jailbreakPromptOverride: string;
    personaDescription: string;
    extensionPrompts: object;
    messages: object[];
    messageExamples: string[];
  },
  dryRun: any,
): Promise<any[]> {
  return prepareOpenAIMessages(
    {
      name2,
      charDescription,
      charPersonality,
      Scenario,
      worldInfoBefore,
      worldInfoAfter,
      bias,
      type,
      quietPrompt,
      quietImage,
      cyclePrompt,
      systemPromptOverride,
      jailbreakPromptOverride,
      personaDescription,
      extensionPrompts,
      messages,
      messageExamples,
    },
    dryRun,
  );
}

export function st_setOpenAIMessages(chat: object[]): object[] {
  return setOpenAIMessages(chat);
}

export function st_setOpenAIMessageExamples(mesExamplesArray: string[]): string[] {
  return setOpenAIMessageExamples(mesExamplesArray);
}

export function st_getRegexedString(
  rawString: string,
  placement: regex_placement,
  {
    characterOverride,
    isMarkdown,
    isPrompt,
    isEdit,
    depth,
  }: { characterOverride?: string; isMarkdown?: boolean; isPrompt?: boolean; isEdit?: boolean; depth?: number },
): string {
  return getRegexedString(rawString, placement, { characterOverride, isMarkdown, isPrompt, isEdit, depth });
}

export async function st_appendFileContent(message: object, messageText: string): Promise<string> {
  return await appendFileContent(message, messageText);
}

export {
  persona_description_positions,
  name1,
  name2,
  world_info_include_names,
  wi_anchor_position,
  extension_prompt_types,
  selected_group,
  this_chid,
  characters,
  depth_prompt_role_default,
  depth_prompt_depth_default,
  main_api,
  regex_placement,
  systemUserName,
  system_avatar,
};
