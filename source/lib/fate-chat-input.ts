type ChatKey = Pick<
  KeyboardEvent,
  | 'key'
  | 'shiftKey'
  | 'ctrlKey'
  | 'altKey'
  | 'metaKey'
  | 'isComposing'
> & { keyCode: number };

/** IME confirmation is typing, including Safari's legacy keyCode 229 event. */
export function isChatSendKey(event: ChatKey, composing = false) {
  return (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.isComposing &&
    event.keyCode !== 229 &&
    !composing
  );
}
