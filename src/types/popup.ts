export enum POPUP_TYPE {
  TEXT = 1,
  CONFIRM = 2,
  INPUT = 3,
  DISPLAY = 4,
}

export enum POPUP_RESULT {
  AFFIRMATIVE = 1,
  NEGATIVE = 0,
  // @ts-ignore
  CANCELLED = null,
}

export interface CustomPopupButton {
  text: string;
  result?: POPUP_RESULT | number;
  classes?: string[] | string;
  action?: () => void;
  appendAtEnd?: boolean;
}

export interface CustomPopupInput {
  id: string;
  label: string;
  tooltip?: string;
  defaultState?: boolean;
}

export interface PopupOptions {
  okButton?: string | boolean;
  cancelButton?: string | boolean;
  rows?: number;
  wide?: boolean;
  wider?: boolean;
  large?: boolean;
  transparent?: boolean;
  allowHorizontalScrolling?: boolean;
  allowVerticalScrolling?: boolean;
  animation?: 'slow' | 'fast' | 'none';
  defaultResult?: POPUP_RESULT | number;
  customButtons?: CustomPopupButton[] | string[];
  customInputs?: CustomPopupInput[];
  onClosing?: (popup: any) => Promise<boolean> | boolean;
  onClose?: (popup: any) => Promise<void> | void;
}
