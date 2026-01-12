import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthTokens, clearAuthTokens, getAccessToken, STORAGE_KEYS } from '../api';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('API Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setAuthTokens', () => {
    it('should store access and refresh tokens', async () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      await setAuthTokens(accessToken, refreshToken);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        accessToken
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN,
        refreshToken
      );
    });
  });

  describe('clearAuthTokens', () => {
    it('should remove all auth-related data', async () => {
      await clearAuthTokens();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
    });
  });

  describe('getAccessToken', () => {
    it('should retrieve access token from storage', async () => {
      const mockToken = 'test-token';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockToken);

      const token = await getAccessToken();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(token).toBe(mockToken);
    });

    it('should return null if no token exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const token = await getAccessToken();

      expect(token).toBeNull();
    });
  });
});
