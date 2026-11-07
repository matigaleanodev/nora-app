import { vi } from "vitest";

vi.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { DATE: "date" },
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  getPermissionsAsync: vi.fn(async () => ({
    granted: false,
    canAskAgain: false,
  })),
  requestPermissionsAsync: vi.fn(async () => ({ granted: false })),
  getAllScheduledNotificationsAsync: vi.fn(async () => []),
  scheduleNotificationAsync: vi.fn(async () => "aviso-1"),
  cancelScheduledNotificationAsync: vi.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: vi.fn(async () => undefined),
  setNotificationChannelAsync: vi.fn(async () => null),
  setNotificationHandler: vi.fn(),
  getLastNotificationResponseAsync: vi.fn(async () => null),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
}));

vi.mock("@react-native-community/datetimepicker", () => ({
  DateTimePickerAndroid: { open: vi.fn() },
}));
