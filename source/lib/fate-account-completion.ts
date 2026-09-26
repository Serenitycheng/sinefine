export type AccountAction = 'login' | 'signup' | 'recover';
export type AccountCompletion = {
  username: string | null;
  recoveryCode?: string;
  loginRequired?: true;
  notice?: string;
};

/** Account creation/password recovery has committed before this last login step. */
export async function completeAccountSignIn(
  action: AccountAction,
  username: string,
  recoveryCode: string | undefined,
  signIn: () => Promise<void>,
): Promise<AccountCompletion> {
  try {
    await signIn();
    return { username, ...(recoveryCode ? { recoveryCode } : {}) };
  } catch (error) {
    // A failed automatic login must not discard the only copy of the new code.
    // Ordinary login failures, or failures without a committed code, stay errors.
    if (action === 'login' || !recoveryCode) throw error;
    return {
      username: null,
      recoveryCode,
      loginRequired: true,
      notice:
        action === 'signup'
          ? '账号已创建，但自动登录暂未成功。请先保存恢复码，再切换到「登录」使用刚设置的密码。'
          : '密码已更新，但自动登录暂未成功。请先保存新的恢复码，再切换到「登录」使用新密码；旧恢复码已失效。',
    };
  }
}
