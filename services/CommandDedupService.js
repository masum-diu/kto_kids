import AsyncStorage from '@react-native-async-storage/async-storage';

const COMMAND_DEDUP_KEY = 'monitoring:recent-command-ids';
const DEDUP_TTL_MS = 10 * 60 * 1000;
const MAX_IDS = 100;

function buildMessageId(remoteMessage) {
  const direct = remoteMessage?.data?.commandId || remoteMessage?.messageId;
  if (direct && String(direct).trim()) return String(direct).trim();

  const command = remoteMessage?.data?.command || 'UNKNOWN';
  const timestamp = remoteMessage?.data?.timestamp || remoteMessage?.sentTime || Date.now();
  return `${command}:${timestamp}`;
}

function prune(mapObj) {
  const now = Date.now();
  const validEntries = Object.entries(mapObj || {}).filter(([, at]) => now - Number(at) < DEDUP_TTL_MS);
  validEntries.sort((a, b) => Number(b[1]) - Number(a[1]));
  return Object.fromEntries(validEntries.slice(0, MAX_IDS));
}

export async function shouldProcessCommand(remoteMessage) {
  const messageId = buildMessageId(remoteMessage);
  const now = Date.now();

  let parsed = {};
  try {
    const raw = await AsyncStorage.getItem(COMMAND_DEDUP_KEY);
    parsed = raw ? JSON.parse(raw) : {};
  } catch (e) {
    parsed = {};
  }

  const pruned = prune(parsed);
  if (pruned[messageId] && now - Number(pruned[messageId]) < DEDUP_TTL_MS) {
    return false;
  }

  pruned[messageId] = now;
  await AsyncStorage.setItem(COMMAND_DEDUP_KEY, JSON.stringify(prune(pruned)));
  return true;
}
