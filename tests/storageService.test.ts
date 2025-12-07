import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/storage', () => {
  return {
    getStorage: vi.fn(() => ({ mocked: true })),
    ref: vi.fn((storage: any, path: string) => ({ fullPath: path })),
    uploadString: vi.fn(async () => {}),
    getDownloadURL: vi.fn(async () => 'https://example.com/avatar.jpg'),
  };
});

import { uploadAdminAvatar } from '../services/storageService';

describe('uploadAdminAvatar', () => {
  it('uploads current and backup and returns a URL', async () => {
    const { url, backupPath } = await uploadAdminAvatar('data:image/jpeg;base64,abc', 'Admin User');
    expect(url).toMatch(/https?:\/\/.*\/avatar\.jpg/);
    expect(backupPath).toMatch(/admin_avatars\/backups\/admin_user_\d+\.jpg/);
  });
});

