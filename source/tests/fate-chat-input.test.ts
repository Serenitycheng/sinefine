import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isChatSendKey } from '../lib/fate-chat-input';

const enter = {
  key: 'Enter',
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  isComposing: false,
  keyCode: 13,
};

void test('Enter sends while Shift+Enter and modified keys retain text editing behavior', () => {
  assert.equal(isChatSendKey(enter), true);
  for (const modifier of ['shiftKey', 'ctrlKey', 'altKey', 'metaKey'] as const)
    assert.equal(isChatSendKey({ ...enter, [modifier]: true }), false);
  assert.equal(isChatSendKey({ ...enter, key: 'a' }), false);
});

void test('Chinese IME confirmation cannot submit, including composition lifecycle and Safari 229', () => {
  assert.equal(isChatSendKey({ ...enter, isComposing: true }), false);
  assert.equal(isChatSendKey({ ...enter, keyCode: 229 }), false);
  assert.equal(isChatSendKey(enter, true), false);
  assert.equal(isChatSendKey(enter, false), true);
});
