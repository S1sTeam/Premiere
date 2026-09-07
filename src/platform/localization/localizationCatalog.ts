import { am } from "./am";
import { ar } from "./ar";
import { az } from "./az";
import { be } from "./be";
import { bg } from "./bg";
import { bn } from "./bn";
import { cs } from "./cs";
import { de } from "./de";
import { el } from "./el";
import { en } from "./en";
import { es } from "./es";
import { fa } from "./fa";
import { fil } from "./fil";
import { fr } from "./fr";
import { hi } from "./hi";
import { id } from "./id";
import { it } from "./it";
import { ja } from "./ja";
import { kk } from "./kk";
import { ko } from "./ko";
import { mr } from "./mr";
import { ms } from "./ms";
import { my } from "./my";
import { nl } from "./nl";
import { pa } from "./pa";
import { pl } from "./pl";
import { pt } from "./pt";
import { ro } from "./ro";
import { ru } from "./ru";
import { sr } from "./sr";
import { sv } from "./sv";
import { th } from "./th";
import { tr } from "./tr";
import { uk } from "./uk";
import { vi } from "./vi";
import { zhCN } from "./zhCN";
import { zhTW } from "./zhTW";

export type { Translations } from "./ru";

export const languages = {
  Russian: ru,
  English: { ...ru, ...en },
  Chinese: { ...ru, ...en, ...zhTW },
  ChineseSimplified: { ...ru, ...en, ...zhCN },
  Ukrainian: { ...ru, ...en, ...uk },
  Belarusian: { ...ru, ...en, ...be },
  Spanish: { ...ru, ...en, ...es },
  Italian: { ...ru, ...en, ...it },
  Portuguese: { ...ru, ...en, ...pt },
  Japanese: { ...ru, ...en, ...ja },
  Serbian: { ...ru, ...en, ...sr },
  French: { ...ru, ...en, ...fr },
  German: { ...ru, ...en, ...de },
  Hindi: { ...ru, ...en, ...hi },
  Arabic: { ...ru, ...en, ...ar },
  Indonesian: { ...ru, ...en, ...id },
  Korean: { ...ru, ...en, ...ko },
  Turkish: { ...ru, ...en, ...tr },
  Vietnamese: { ...ru, ...en, ...vi },
  Polish: { ...ru, ...en, ...pl },
  Dutch: { ...ru, ...en, ...nl },
  Romanian: { ...ru, ...en, ...ro },
  Greek: { ...ru, ...en, ...el },
  Swedish: { ...ru, ...en, ...sv },
  Kazakh: { ...ru, ...en, ...kk },
  Azerbaijani: { ...ru, ...en, ...az },
  Thai: { ...ru, ...en, ...th },
  Bengali: { ...ru, ...en, ...bn },
  Punjabi: { ...ru, ...en, ...pa },
  Bulgarian: { ...ru, ...en, ...bg },
  Czech: { ...ru, ...en, ...cs },
  Filipino: { ...ru, ...en, ...fil },
  Persian: { ...ru, ...en, ...fa },
  Malay: { ...ru, ...en, ...ms },
  Burmese: { ...ru, ...en, ...my },
  Amharic: { ...ru, ...en, ...am },
  Marathi: { ...ru, ...en, ...mr },
} as const;

export type LangCode = keyof typeof languages;

export const languageOptions: { value: LangCode; label: string }[] = [
  { value: "Russian", label: ru.langRussian },
  { value: "English", label: ru.langEnglish },
  { value: "ChineseSimplified", label: ru.langChineseSimplified },
  { value: "Spanish", label: ru.langSpanish },
  { value: "French", label: ru.langFrench },
  { value: "German", label: ru.langGerman },
  { value: "Arabic", label: ru.langArabic },
  { value: "Portuguese", label: ru.langPortuguese },
  { value: "Japanese", label: ru.langJapanese },
  { value: "Italian", label: ru.langItalian },
  { value: "Ukrainian", label: ru.langUkrainian },
  { value: "Hindi", label: ru.langHindi },
  { value: "Indonesian", label: ru.langIndonesian },
  { value: "Chinese", label: ru.langChinese },
  { value: "Serbian", label: ru.langSerbian },
  { value: "Belarusian", label: ru.langBelarusian },
  { value: "Korean", label: ru.langKorean },
  { value: "Turkish", label: ru.langTurkish },
  { value: "Vietnamese", label: ru.langVietnamese },
  { value: "Polish", label: ru.langPolish },
  { value: "Dutch", label: ru.langDutch },
  { value: "Romanian", label: ru.langRomanian },
  { value: "Greek", label: ru.langGreek },
  { value: "Swedish", label: ru.langSwedish },
  { value: "Kazakh", label: ru.langKazakh },
  { value: "Azerbaijani", label: ru.langAzerbaijani },
  { value: "Thai", label: ru.langThai },
  { value: "Bengali", label: ru.langBengali },
  { value: "Punjabi", label: ru.langPunjabi },
  { value: "Bulgarian", label: ru.langBulgarian },
  { value: "Czech", label: ru.langCzech },
  { value: "Filipino", label: ru.langFilipino },
  { value: "Persian", label: ru.langPersian },
  { value: "Malay", label: ru.langMalay },
  { value: "Burmese", label: ru.langBurmese },
  { value: "Amharic", label: ru.langAmharic },
  { value: "Marathi", label: ru.langMarathi },
];

export const languageLabels: Record<LangCode, string> = {
  Russian: "Русский",
  English: "English",
  Chinese: "中文 (繁体)",
  ChineseSimplified: "简体中文",
  Ukrainian: "Українська",
  Belarusian: "Беларуская",
  Spanish: "Español",
  Italian: "Italiano",
  Portuguese: "Português",
  Japanese: "日本語",
  Serbian: "Srpski",
  French: "Français",
  German: "Deutsch",
  Hindi: "हिन्दी",
  Arabic: "العربية",
  Indonesian: "Indonesia",
  Korean: "한국어",
  Turkish: "Türkçe",
  Vietnamese: "Tiếng Việt",
  Polish: "Polski",
  Dutch: "Nederlands",
  Romanian: "Română",
  Greek: "Ελληνικά",
  Swedish: "Svenska",
  Kazakh: "Қазақша",
  Azerbaijani: "Azərbaycanca",
  Thai: "ไทย",
  Bengali: "বাংলা",
  Punjabi: "ਪੰਜਾਬੀ",
  Bulgarian: "Български",
  Czech: "Čeština",
  Filipino: "Filipino",
  Persian: "فارسی",
  Malay: "Melayu",
  Burmese: "မြန်မာဘာသာ",
  Amharic: "አማርኛ",
  Marathi: "मराठी",
};
