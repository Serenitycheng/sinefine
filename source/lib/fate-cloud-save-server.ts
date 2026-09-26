import 'server-only';
import {
  cloudIdentity,
  CloudConfigurationError,
  CloudError,
} from './fate-cloud';
import { CloudSaveError, type CloudSaveBackend } from './fate-cloud-save';

export const connectCloudSave: CloudSaveBackend = async () => {
  let identity: NonNullable<Awaited<ReturnType<typeof cloudIdentity>>>;
  try {
    identity = (await cloudIdentity())!;
  } catch (error) {
    if (error instanceof CloudConfigurationError)
      throw new CloudSaveError(
        '云端游戏存档尚未配置，本地进度仍可继续保存。',
        503,
        'not_configured',
      );
    if (error instanceof CloudError && error.status === 401)
      throw new CloudSaveError(
        '请先登录游戏账号，再读取或保存云端进度。',
        401,
        'unauthenticated',
      );
    throw new CloudSaveError(
      '暂时无法验证游戏账号，请稍后重试。',
      503,
      'unavailable',
    );
  }
  const { admin, user, account } = identity;
  const toSlot = (row: {
    backup: unknown;
    revision: number;
    updated_at: string;
  }) => ({
    backup: row.backup,
    revision: row.revision,
    updatedAt: row.updated_at,
  });
  return {
    username: account.username,
    async read() {
      const { data, error } = await admin
        .from('fate_game_saves')
        .select('backup,revision,updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error)
        throw new CloudSaveError(
          '暂时无法读取云端存档，请确认服务已配置并稍后重试。',
          503,
          'unavailable',
        );
      return data ? toSlot(data) : null;
    },
    async compareAndSwap(backup, expectedRevision) {
      const { data, error } = await admin
        .rpc('fate_write_game_save', {
          p_user_id: user.id,
          p_expected_revision: expectedRevision,
          p_backup: backup,
        })
        .maybeSingle();
      if (error)
        throw new CloudSaveError(
          '未能确认云端保存结果，请重新读取云端进度后再操作。',
          503,
          'unavailable',
        );
      return data
        ? toSlot(
            data as { backup: unknown; revision: number; updated_at: string },
          )
        : null;
    },
  };
};
