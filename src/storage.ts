import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY_NICKNAME = "nickname";
const KEY_SCORE = "score";
export async function saveNickname(name: string) {
  await AsyncStorage.setItem(KEY_NICKNAME, name.trim());
}
export async function getNickname(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_NICKNAME);
}

export async function saveScore(number: number) {
  await AsyncStorage.setItem(KEY_SCORE, number.toString());
}
export async function getScore(): Promise<number | null> {
  return parseFloat(AsyncStorage.getItem(KEY_SCORE));
}