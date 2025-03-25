import { Message } from './prompt-builder.js';
import { StreamResponse, ExtractedData } from './types/index.js';

export interface GenerateOptions {
  abortController?: AbortController;
  /**
   * Depends on stream mode, "data" or "chunk" would be avaiable.
   */
  onEntry?: (data: ExtractedData | StreamResponse) => void;

  onStart?: (uuid: string) => void;

  /**
   * Depends on stream mode, "data" or "chunk" would be avaiable.
   * If error occurs during request, it will be passed.
   * If "data" and "error" is undefined, it means the request is cancelled.
   */
  onFinish?: (data?: ExtractedData | StreamResponse, error?: Error) => void;
}

interface RequestState {
  abortController?: AbortController;
  isStream: boolean;
  options?: GenerateOptions;
}

export class Generator {
  private requestMap: Map<string, RequestState>;

  constructor() {
    this.requestMap = new Map();
  }

  public abortRequest(requestId: string): void {
    const state = this.requestMap.get(requestId);
    if (!state) return;

    if (state.abortController) {
      try {
        state.abortController.abort();
      } catch (error) {}
    }

    if (state.options?.onFinish) {
      state.options.onFinish();
    }

    this.requestMap.delete(requestId);
  }

  /**
   * @returns return value is not important because request would be finished anyway. So use "options".
   */
  public async generateRequest(
    requestParams: {
      profileId: string;
      prompt: string | Message[];
      maxTokens: number;
      custom?: {
        stream?: boolean;
        signal?: AbortSignal;
        extractData?: boolean;
        includePreset?: boolean;
        includeInstruct?: boolean;
      };
    },
    options?: GenerateOptions,
  ): Promise<string> {
    const context = SillyTavern.getContext();
    const requestId = context.uuidv4();
    const isStream = requestParams?.custom?.stream ?? false;

    this.requestMap.set(requestId, {
      abortController: options?.abortController,
      isStream,
      options,
    });

    if (!isStream) {
      try {
        if (options?.onStart) {
          options.onStart(requestId);
        }
        const response = await context.ConnectionManagerRequestService.sendRequest(
          requestParams.profileId,
          requestParams.prompt,
          requestParams.maxTokens,
          requestParams.custom,
        );

        if (this.requestMap.get(requestId)) {
          if (options?.onEntry) {
            options.onEntry(response as ExtractedData);
          }

          if (options?.onFinish) {
            options.onFinish(response as ExtractedData);
          }
        }
      } catch (error) {
        if (options?.onFinish) {
          options.onFinish(undefined, error as Error);
        }
      } finally {
        this.requestMap.delete(requestId);
      }
    } else {
      try {
        const responseGen = await context.ConnectionManagerRequestService.sendRequest(
          requestParams.profileId,
          requestParams.prompt,
          requestParams.maxTokens,
          requestParams.custom,
        );

        if (options?.onStart) {
          options.onStart(requestId);
        }

        let lastChunk: StreamResponse | undefined;
        for await (const chunk of (responseGen as () => AsyncGenerator<StreamResponse>)()) {
          lastChunk = chunk;
          if (options?.onEntry) {
            options.onEntry(chunk);
          }
        }
        if (options?.onFinish) {
          options.onFinish(lastChunk);
        }
      } catch (error) {
        if (options?.onFinish) {
          options.onFinish(undefined, error as Error);
        }
      } finally {
        this.requestMap.delete(requestId);
      }
    }

    return requestId;
  }

  public getActiveRequest(requestId: string): AbortController | undefined {
    return this.requestMap.get(requestId)?.abortController;
  }

  public getAllActiveRequests(): Map<string, AbortController | undefined> {
    const activeRequests = new Map<string, AbortController | undefined>();
    for (const [id, state] of this.requestMap) {
      activeRequests.set(id, state.abortController);
    }
    return activeRequests;
  }
}
