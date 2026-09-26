import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completeAccountSignIn } from '../lib/fate-account-completion';

void test('committed signup and recovery keep their new recovery code when automatic sign-in fails', async () => {
  for (const action of ['signup', 'recover'] as const) {
    let attempts = 0;
    const result = await completeAccountSignIn(
      action,
      'player',
      'new-recovery-code',
      async () => {
        attempts++;
        throw new Error('provider failure with private diagnostic');
      },
    );
    assert.equal(
      attempts,
      1,
      'do not retry an account mutation or login automatically',
    );
    assert.equal(result.username, null);
    assert.equal(result.loginRequired, true);
    assert.equal(result.recoveryCode, 'new-recovery-code');
    assert.match(result.notice!, /保存.*恢复码/);
    assert.doesNotMatch(result.notice!, /private diagnostic/);
    if (action === 'recover')
      assert.match(result.notice!, /密码已更新.*旧恢复码已失效/);
  }
});

void test('ordinary login failures and uncommitted account operations remain failures', async () => {
  const failure = new Error('sign-in rejected');
  for (const [action, code] of [
    ['login', undefined],
    ['login', 'must-not-leak'],
    ['signup', undefined],
    ['recover', undefined],
  ] as const) {
    await assert.rejects(
      completeAccountSignIn(action, 'player', code, async () => {
        throw failure;
      }),
      (error) => error === failure,
    );
  }
});

void test('successful sign-in returns the authenticated account and only a newly issued recovery code', async () => {
  assert.deepEqual(
    await completeAccountSignIn('login', 'player', undefined, async () => {}),
    { username: 'player' },
  );
  for (const action of ['signup', 'recover'] as const) {
    assert.deepEqual(
      await completeAccountSignIn(action, 'player', 'new-code', async () => {}),
      { username: 'player', recoveryCode: 'new-code' },
    );
  }
});
