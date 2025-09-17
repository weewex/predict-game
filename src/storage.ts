import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY_NICKNAME = "nickname";
export async function saveNickname(name: string) {
  await AsyncStorage.setItem(KEY_NICKNAME, name.trim());
}
export async function getNickname(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_NICKNAME);
}
