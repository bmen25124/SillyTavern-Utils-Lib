import {
  extension_prompt_types,
  name1,
  name2,
  persona_description_positions,
  selected_group,
  st_baseChatReplace,
  st_formatInstructModeExamples,
  st_getAuthorNote,
  depth_prompt_depth_default,
  st_getGroupDepthPrompts,
  st_getMaxContextSize,
  st_getPromptRole,
  st_parseMesExamples,
  st_renderStoryString,
  this_chid,
  wi_anchor_position,
  world_info_include_names,
  depth_prompt_role_default,
  st_prepareOpenAIMessages,
  st_setOpenAIMessages,
  st_setOpenAIMessageExamples,
  regex_placement,
  st_getRegexedString,
  st_appendFileContent,
  st_formatWorldInfo,
  st_getPromptPosition,
  st_formatInstructModeSystemPrompt,
} from './config.js';
import { ChatCompletionPreset, PromptConfig } from './types/chat-completion.js';
import { ContextSettings } from './types/context.js';
import { ChatCompletionMessage, ChatMessage } from './types/index.js';
import { InstructSettings } from './types/instruct.js';
import { SyspromptSettings } from './types/sysprompt.js';
import { TextCompletionPreset } from './types/text-completion.js';

export interface Message extends ChatCompletionMessage {
  ignoreInstruct?: boolean;
  source?: ChatMessage; // used for chat completion messages to reference the original message.
}

export interface BuildPromptOptions {
  targetCharacterId?: number;
  presetName?: string;
  instructName?: string;
  contextName?: string;
  syspromptName?: string;
  maxContext?: number | 'preset' | 'active';
  includeNames?: boolean;
  ignoreCharacterFields?: boolean;
  ignoreAuthorNote?: boolean;
  ignoreWorldInfo?: boolean;

  /**
   * Use both -1 to not include any messages
   */
  messageIndexesBetween?: {
    start?: number;
    end?: number;
  };
}

/**
 * Builds chat prompt. Don't expect a perfect chat prompt like ST. But I would give guarantee that it will cover 98% of the cases.
 *
 * Token calculation is crippled. We only calculating tokens for the chat history. For example, If your max context is 16k, total token will be 16k + world info, author note, extensionPrompts, etc. Better than nothing.
 * @param targetMessageIndex - Last message index to include in prompt
 * @param [param1={}] - Options
 */
export async function buildPrompt(
  api: string,
  {
    targetCharacterId,
    presetName,
    instructName,
    contextName,
    syspromptName,
    maxContext,
    includeNames,
    ignoreCharacterFields,
    ignoreAuthorNote,
    ignoreWorldInfo,
    messageIndexesBetween,
  }: BuildPromptOptions = {},
): Promise<{ result: Message[]; warnings?: string[] }> {
  if (!['textgenerationwebui', 'openai'].includes(api)) {
    throw new Error('Unsupported API');
  }

  const context = SillyTavern.getContext();
  let messages: Message[] = [];

  let { description, personality, persona, scenario, mesExamples, system, jailbreak } = !ignoreCharacterFields
    ? context.getCharacterCardFields({
        chid: targetCharacterId,
      })
    : {
        description: '',
        personality: '',
        persona: '',
        scenario: '',
        mesExamples: '',
        system: '',
        jailbreak: '',
      };

  const instructPreset =
    api === 'textgenerationwebui'
      ? (context.getPresetManager('instruct')?.getCompletionPresetByName(instructName) as undefined | InstructSettings)
      : undefined;
  const isInstruct = !!instructPreset?.enabled;
  let mesExamplesArray = st_parseMesExamples(mesExamples, isInstruct);

  function getMaxContext(): number {
    if (typeof maxContext === 'number') {
      return maxContext;
    }

    if (!maxContext) {
      return st_getMaxContextSize();
    }

    if (maxContext === 'active' || !presetName) {
      return st_getMaxContextSize();
    }

    if (typeof maxContext === 'number') {
      return maxContext;
    }

    let response: number | undefined;
    if (api === 'textgenerationwebui') {
      const preset = context.getPresetManager('textgenerationwebui')?.getCompletionPresetByName(presetName) as
        | TextCompletionPreset
        | undefined;
      response = preset?.max_length;
    } else {
      const preset = context.getPresetManager('openai')?.getCompletionPresetByName(presetName) as
        | ChatCompletionPreset
        | undefined;
      response = preset?.openai_max_context;
    }

    return typeof response === 'number' ? response : st_getMaxContextSize();
  }

  let warnings: string[] = [];
  const currentMaxContext = getMaxContext();
  if (currentMaxContext <= 0) {
    return { result: [], warnings };
  }

  const canUseTools = context.ToolManager.isToolCallingSupported();
  const startIndex = messageIndexesBetween?.start ?? 0;
  const endIndex = messageIndexesBetween?.end ? messageIndexesBetween.end + 1 : undefined;
  let coreChat =
    startIndex === -1 && endIndex === 0
      ? []
      : context.chat
          .slice(startIndex, endIndex)
          .filter((x) => !x.is_system || (canUseTools && Array.isArray(x.extra?.tool_invocations)));

  coreChat = await Promise.all(
    coreChat.map(async (chatItem, index) => {
      let message = chatItem.mes;
      let regexType = chatItem.is_user ? regex_placement.USER_INPUT : regex_placement.AI_OUTPUT;
      const isContinue = false;
      let options = { isPrompt: true, depth: coreChat.length - index - (isContinue ? 2 : 1) };

      let regexedMessage = st_getRegexedString(message, regexType, options);
      regexedMessage = await st_appendFileContent(chatItem, regexedMessage);

      if (chatItem?.extra?.append_title && chatItem?.extra?.title) {
        regexedMessage = `${regexedMessage}\n\n${chatItem.extra.title}`;
      }

      return {
        ...chatItem,
        mes: regexedMessage,
        index,
      };
    }),
  );

  const chatForWI = coreChat.map((x) => (world_info_include_names ? `${x.name}: ${x.mes}` : x.mes)).reverse();
  const { worldInfoString, worldInfoBefore, worldInfoAfter, worldInfoExamples, worldInfoDepth, anBefore, anAfter } =
    !ignoreWorldInfo
      ? await context.getWorldInfoPrompt(chatForWI, currentMaxContext, false)
      : {
          worldInfoString: '',
          worldInfoBefore: '',
          worldInfoAfter: '',
          worldInfoExamples: [],
          worldInfoDepth: [],
          anBefore: [],
          anAfter: [],
        };

  // Add message example WI
  for (const example of worldInfoExamples) {
    const exampleMessage = example.content;

    if (exampleMessage.length === 0) {
      continue;
    }

    const formattedExample = st_baseChatReplace(exampleMessage, name1, name2);
    const cleanedExample = st_parseMesExamples(formattedExample, isInstruct);

    // Insert depending on before or after position
    if (example.position === wi_anchor_position.before) {
      mesExamplesArray.unshift(...cleanedExample);
    } else {
      mesExamplesArray.push(...cleanedExample);
    }
  }

  function addChatToMessages() {
    // Add messages starting from most recent to respect context limits
    let currentTokenCount = 0;
    const chatMessages: Message[] = [];
    for (let i = coreChat.length - 1; i >= 0; i--) {
      const message = coreChat[i];

      // Skip if adding this message would exceed context
      if (message.extra?.token_count && currentTokenCount + message.extra.token_count > currentMaxContext) {
        break;
      }

      currentTokenCount += message.extra?.token_count || 0;
      chatMessages.unshift({
        role: message.is_user ? 'user' : 'assistant',
        content: includeNames ? `${message.name}: ${message.mes}` : message.mes,
        source: message,
      });
    }

    messages.push(...chatMessages);
  }

  const textCompletion = api === 'textgenerationwebui';
  if (textCompletion) {
    // At this point, the raw message examples can be created
    const mesExamplesRawArray = [...mesExamplesArray];

    if (mesExamplesArray) {
      mesExamplesArray = st_formatInstructModeExamples(mesExamplesArray, name1, name2);
    }

    const syspromptPreset = context.getPresetManager('sysprompt')?.getCompletionPresetByName(syspromptName) as
      | undefined
      | SyspromptSettings;
    if (syspromptPreset) {
      system =
        context.powerUserSettings.prefer_character_prompt && system
          ? system
          : st_baseChatReplace(syspromptPreset.content, name1, name2);
      system = isInstruct
        ? st_formatInstructModeSystemPrompt(
            context.substituteParams(system, name1, name2, syspromptPreset.content),
            instructPreset,
          )
        : system;
    }

    // Build story string
    const storyStringParams = {
      description: description,
      personality: personality,
      persona:
        context.powerUserSettings.persona_description_position == persona_description_positions.IN_PROMPT
          ? persona
          : '',
      scenario: scenario,
      system: system,
      char: name2,
      user: name1,
      wiBefore: worldInfoBefore,
      wiAfter: worldInfoAfter,
      loreBefore: worldInfoBefore,
      loreAfter: worldInfoAfter,
      mesExamples: mesExamplesArray.join(''),
      mesExamplesRaw: mesExamplesRawArray.join(''),
    };

    const contextPreset = context.getPresetManager('context')?.getCompletionPresetByName(contextName) as
      | undefined
      | ContextSettings;
    let storyString = st_renderStoryString(storyStringParams, {
      customInstructSettings: instructPreset,
      customStoryString: contextPreset?.story_string,
    });

    messages.push({ role: 'system', content: storyString, ignoreInstruct: true });

    addChatToMessages();
  } else {
    let oaiMessages = st_setOpenAIMessages(coreChat);
    let oaiMessageExamples = st_setOpenAIMessageExamples(mesExamplesArray);

    async function addDefaultPreset() {
      let [prompt, _counts] = await st_prepareOpenAIMessages(
        {
          name2: name2,
          charDescription: description,
          charPersonality: personality,
          Scenario: scenario,
          worldInfoBefore: worldInfoBefore,
          worldInfoAfter: worldInfoAfter,
          extensionPrompts: context.extensionPrompts,
          bias: '',
          type: 'normal',
          quietPrompt: undefined,
          quietImage: undefined,
          cyclePrompt: '',
          systemPromptOverride: system,
          jailbreakPromptOverride: jailbreak,
          personaDescription: persona,
          messages: oaiMessages,
          messageExamples: oaiMessageExamples,
        },
        false,
      );

      messages.push(...prompt);
    }

    if (!presetName) {
      warnings.push('No preset name provided. Using default preset.');
      await addDefaultPreset();
      return { result: messages, warnings };
    }

    const preset = context.getPresetManager('openai')?.getCompletionPresetByName(presetName) as
      | ChatCompletionPreset
      | undefined;
    if (!preset) {
      console.warn(`Preset not found: ${presetName}. Using current preset.`);
      warnings.push(`Preset not found: ${presetName}. Using current preset.`);
      addDefaultPreset();
      return { result: messages, warnings };
    }

    let promptOrder = preset.prompt_order?.find((prompt) => prompt.character_id === this_chid);
    if (!promptOrder && preset.prompt_order && preset.prompt_order.length > 0) {
      promptOrder = preset.prompt_order[0];
    }
    if (!promptOrder) {
      console.warn(`No prompt order found for preset: ${presetName}. Using current preset.`);
      warnings.push(`No prompt order found for preset: ${presetName}. Using current preset.`);
      addDefaultPreset();
      return { result: messages, warnings };
    }

    const scenarioText = scenario && preset.scenario_format ? context.substituteParams(preset.scenario_format) : '';
    const charPersonalityText =
      personality && preset.personality_format ? context.substituteParams(preset.personality_format) : '';
    const groupNudge = context.substituteParams(preset.group_nudge_prompt);
    const impersonationPrompt = preset.impersonation_prompt
      ? context.substituteParams(preset.impersonation_prompt)
      : '';

    const systemPrompts: (PromptConfig & { position?: string | boolean })[] = [];
    // Create entries for system prompts
    if (!ignoreWorldInfo) {
      systemPrompts.push(
        ...[
          {
            role: 'system',
            content: st_formatWorldInfo(worldInfoBefore, { wiFormat: preset.wi_format }),
            identifier: 'worldInfoBefore',
          },
          {
            role: 'system',
            content: st_formatWorldInfo(worldInfoAfter, { wiFormat: preset.wi_format }),
            identifier: 'worldInfoAfter',
          },
        ],
      );
    }
    if (!ignoreCharacterFields) {
      systemPrompts.push(
        ...[
          { role: 'system', content: description, identifier: 'charDescription' },
          { role: 'system', content: charPersonalityText, identifier: 'charPersonality' },
          { role: 'system', content: scenarioText, identifier: 'scenario' },
        ],
      );
    }
    systemPrompts.push(
      ...[
        { role: 'system', content: impersonationPrompt, identifier: 'impersonate' },
        { role: 'system', content: groupNudge, identifier: 'groupNudge' },
      ],
    );

    // Tavern Extras - Summary
    const summary = context.extensionPrompts['1_memory'];
    if (summary && summary.value)
      systemPrompts.push({
        role: st_getPromptRole(summary.role),
        content: summary.value,
        identifier: 'summary',
        position: st_getPromptPosition(summary.position),
      });

    // Authors Note
    const authorsNote = context.extensionPrompts['2_floating_prompt'];
    if (!ignoreAuthorNote && authorsNote && authorsNote.value)
      systemPrompts.push({
        role: st_getPromptRole(authorsNote.role),
        content: authorsNote.value,
        identifier: 'authorsNote',
        position: st_getPromptPosition(authorsNote.position),
      });

    // Vectors Memory
    const vectorsMemory = context.extensionPrompts['3_vectors'];
    if (vectorsMemory && vectorsMemory.value)
      systemPrompts.push({
        role: 'system',
        content: vectorsMemory.value,
        identifier: 'vectorsMemory',
        position: st_getPromptPosition(vectorsMemory.position),
      });

    const vectorsDataBank = context.extensionPrompts['4_vectors_data_bank'];
    if (vectorsDataBank && vectorsDataBank.value)
      systemPrompts.push({
        role: st_getPromptRole(vectorsDataBank.role),
        content: vectorsDataBank.value,
        identifier: 'vectorsDataBank',
        position: st_getPromptPosition(vectorsDataBank.position),
      });

    // Smart Context (ChromaDB)
    const smartContext = context.extensionPrompts['chromadb'];
    if (smartContext && smartContext.value)
      systemPrompts.push({
        role: 'system',
        content: smartContext.value,
        identifier: 'smartContext',
        position: st_getPromptPosition(smartContext.position),
      });

    // Persona Description
    if (
      !ignoreCharacterFields &&
      context.powerUserSettings.persona_description &&
      context.powerUserSettings.persona_description_position === persona_description_positions.IN_PROMPT
    ) {
      systemPrompts.push({
        role: 'system',
        content: context.powerUserSettings.persona_description,
        identifier: 'personaDescription',
      });
    }

    function getPrompt(identifier: string): PromptConfig | undefined {
      const sysPrompt = systemPrompts.find((prompt) => prompt.identifier === identifier);
      if (sysPrompt) {
        return sysPrompt;
      }
      const presetPrompt = preset!.prompts.find((prompt) => prompt.identifier === identifier);
      if (presetPrompt) {
        return presetPrompt;
      }
      return undefined;
    }

    promptOrder.order.forEach((prompt) => {
      if (!prompt.enabled) {
        return;
      }

      const collectionPrompt = getPrompt(prompt.identifier);
      if (collectionPrompt && collectionPrompt.content) {
        messages.push({
          role: collectionPrompt.role ?? 'system',
          content: context.substituteParams(collectionPrompt.content),
        });
        return;
      }

      if (prompt.identifier === 'chatHistory') {
        addChatToMessages();
      }
    });
  }

  const knownExtensionPrompts = [
    '1_memory',
    '2_floating_prompt',
    '3_vectors',
    '4_vectors_data_bank',
    'chromadb',
    'PERSONA_DESCRIPTION',
    'QUIET_PROMPT',
    'DEPTH_PROMPT',
  ];

  // Anything that is not a known extension prompt
  for (const key in context.extensionPrompts) {
    if (Object.hasOwn(context.extensionPrompts, key)) {
      const prompt = context.extensionPrompts[key];
      if (knownExtensionPrompts.includes(key)) continue;
      if (!context.extensionPrompts[key].value) continue;
      if (![extension_prompt_types.BEFORE_PROMPT, extension_prompt_types.IN_PROMPT].includes(prompt.position)) continue;

      const hasFilter = typeof prompt.filter === 'function';
      if (hasFilter && !(await prompt.filter())) continue;

      if (prompt.position === extension_prompt_types.BEFORE_PROMPT) {
        messages = [
          ...messages.slice(0, prompt.depth),
          {
            role: st_getPromptRole(prompt.role) ?? 'system',
            content: prompt.value,
          },
          ...messages.slice(prompt.depth),
        ];
      } else if (prompt.position === extension_prompt_types.IN_PROMPT) {
        messages = [
          ...messages.slice(0, messages.length - prompt.depth!),
          {
            role: st_getPromptRole(prompt.role) ?? 'system',
            content: prompt.value,
          },
          ...messages.slice(messages.length - prompt.depth!),
        ];
      }
    }
  }

  // Inject world info depth.
  for (const worldInfo of worldInfoDepth) {
    messages = [
      ...messages.slice(0, messages.length - worldInfo.depth),
      { role: st_getPromptRole(worldInfo.role), content: worldInfo.entries.join('\n') },
      ...messages.slice(messages.length - worldInfo.depth),
    ];
  }

  if (!ignoreCharacterFields) {
    const groupDepthPrompts = st_getGroupDepthPrompts(selected_group, Number(this_chid));
    if (selected_group && Array.isArray(groupDepthPrompts) && groupDepthPrompts.length > 0) {
      groupDepthPrompts
        .filter((value) => value.text)
        .forEach((value, _index) => {
          messages = [
            ...messages.slice(0, messages.length - value.depth),
            { role: value.role, content: value.text },
            ...messages.slice(messages.length - value.depth),
          ];
        });
    } else {
      const depthPromptText =
        st_baseChatReplace(
          context.characters[this_chid]?.data?.extensions?.depth_prompt?.prompt?.trim(),
          name1,
          name2,
        ) || '';
      if (depthPromptText) {
        const depthPromptDepth = depth_prompt_depth_default;
        const depthPromptRole =
          context.characters[this_chid]?.data?.extensions?.depth_prompt?.role ?? depth_prompt_role_default;

        messages = [
          ...messages.slice(0, messages.length - depthPromptDepth),
          { role: st_getPromptRole(depthPromptRole), content: depthPromptText },
          ...messages.slice(messages.length - depthPromptDepth),
        ];
      }
    }
  }

  let authorNoteIndex = -1;
  if (!ignoreAuthorNote) {
    // TODO: We should respect interval and world info scanning
    const authorNote = st_getAuthorNote();

    if (authorNote.prompt) {
      authorNote.prompt = st_baseChatReplace(authorNote.prompt, name1, name2);
      switch (authorNote.position) {
        case extension_prompt_types.IN_PROMPT: // After first message
          messages = [...messages.slice(0, 1), { role: 'user', content: authorNote.prompt }, ...messages.slice(1)];
          authorNoteIndex = 1;
          break;
        case extension_prompt_types.IN_CHAT: // Depth + role in chat
          messages = [
            ...messages.slice(0, messages.length - authorNote.depth),
            { role: st_getPromptRole(authorNote.role), content: authorNote.prompt },
            ...messages.slice(messages.length - authorNote.depth),
          ];
          authorNoteIndex = messages.length - authorNote.depth - 1;
          break;
        case extension_prompt_types.BEFORE_PROMPT: // Before first message
          messages.unshift({ role: 'user', content: authorNote.prompt });
          authorNoteIndex = 0;
          break;
        default:
          break;
      }
    }
  }

  // Add world info to author note
  if (authorNoteIndex >= 0) {
    if (anBefore.length > 0) {
      messages = [
        ...messages.slice(0, authorNoteIndex),
        { role: 'system', content: anBefore.join('\n') },
        ...messages.slice(authorNoteIndex),
      ];
      authorNoteIndex++;
    }

    if (anAfter.length > 0) {
      messages = [
        ...messages.slice(0, authorNoteIndex + 1),
        { role: 'system', content: anAfter.join('\n') },
        ...messages.slice(authorNoteIndex + 1),
      ];
    }
  }

  return { result: messages, warnings };
}
