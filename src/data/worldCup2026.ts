import type { Fixture, GroupLetter, Team } from "../types";

export const GROUPS: GroupLetter[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
];

export const TEAMS: Team[] = [
  { id: "mex", group: "A", name: "墨西哥", enName: "Mexico", code: "MEX", flag: "🇲🇽", elo: 1780 },
  { id: "rsa", group: "A", name: "南非", enName: "South Africa", code: "RSA", flag: "🇿🇦", elo: 1635 },
  { id: "kor", group: "A", name: "韩国", enName: "Korea Republic", code: "KOR", flag: "🇰🇷", elo: 1786 },
  { id: "cze", group: "A", name: "捷克", enName: "Czechia", code: "CZE", flag: "🇨🇿", elo: 1768 },

  { id: "can", group: "B", name: "加拿大", enName: "Canada", code: "CAN", flag: "🇨🇦", elo: 1742 },
  { id: "qat", group: "B", name: "卡塔尔", enName: "Qatar", code: "QAT", flag: "🇶🇦", elo: 1668 },
  { id: "sui", group: "B", name: "瑞士", enName: "Switzerland", code: "SUI", flag: "🇨🇭", elo: 1842 },
  { id: "bih", group: "B", name: "波黑", enName: "Bosnia and Herzegovina", code: "BIH", flag: "🇧🇦", elo: 1708 },

  { id: "bra", group: "C", name: "巴西", enName: "Brazil", code: "BRA", flag: "🇧🇷", elo: 1948 },
  { id: "mar", group: "C", name: "摩洛哥", enName: "Morocco", code: "MAR", flag: "🇲🇦", elo: 1828 },
  { id: "hai", group: "C", name: "海地", enName: "Haiti", code: "HAI", flag: "🇭🇹", elo: 1508 },
  { id: "sco", group: "C", name: "苏格兰", enName: "Scotland", code: "SCO", flag: "🏴", elo: 1775 },

  { id: "usa", group: "D", name: "美国", enName: "United States", code: "USA", flag: "🇺🇸", elo: 1800 },
  { id: "par", group: "D", name: "巴拉圭", enName: "Paraguay", code: "PAR", flag: "🇵🇾", elo: 1732 },
  { id: "aus", group: "D", name: "澳大利亚", enName: "Australia", code: "AUS", flag: "🇦🇺", elo: 1728 },
  { id: "tur", group: "D", name: "土耳其", enName: "Türkiye", code: "TUR", flag: "🇹🇷", elo: 1818 },

  { id: "ger", group: "E", name: "德国", enName: "Germany", code: "GER", flag: "🇩🇪", elo: 1908 },
  { id: "cur", group: "E", name: "库拉索", enName: "Curaçao", code: "CUW", flag: "🇨🇼", elo: 1550 },
  { id: "civ", group: "E", name: "科特迪瓦", enName: "Côte d'Ivoire", code: "CIV", flag: "🇨🇮", elo: 1748 },
  { id: "ecu", group: "E", name: "厄瓜多尔", enName: "Ecuador", code: "ECU", flag: "🇪🇨", elo: 1840 },

  { id: "ned", group: "F", name: "荷兰", enName: "Netherlands", code: "NED", flag: "🇳🇱", elo: 1930 },
  { id: "jpn", group: "F", name: "日本", enName: "Japan", code: "JPN", flag: "🇯🇵", elo: 1822 },
  { id: "tun", group: "F", name: "突尼斯", enName: "Tunisia", code: "TUN", flag: "🇹🇳", elo: 1690 },
  { id: "swe", group: "F", name: "瑞典", enName: "Sweden", code: "SWE", flag: "🇸🇪", elo: 1780 },

  { id: "bel", group: "G", name: "比利时", enName: "Belgium", code: "BEL", flag: "🇧🇪", elo: 1882 },
  { id: "egy", group: "G", name: "埃及", enName: "Egypt", code: "EGY", flag: "🇪🇬", elo: 1705 },
  { id: "irn", group: "G", name: "伊朗", enName: "Iran", code: "IRN", flag: "🇮🇷", elo: 1808 },
  { id: "nzl", group: "G", name: "新西兰", enName: "New Zealand", code: "NZL", flag: "🇳🇿", elo: 1515 },

  { id: "esp", group: "H", name: "西班牙", enName: "Spain", code: "ESP", flag: "🇪🇸", elo: 1995 },
  { id: "cpv", group: "H", name: "佛得角", enName: "Cabo Verde", code: "CPV", flag: "🇨🇻", elo: 1666 },
  { id: "ksa", group: "H", name: "沙特", enName: "Saudi Arabia", code: "KSA", flag: "🇸🇦", elo: 1642 },
  { id: "uru", group: "H", name: "乌拉圭", enName: "Uruguay", code: "URU", flag: "🇺🇾", elo: 1902 },

  { id: "fra", group: "I", name: "法国", enName: "France", code: "FRA", flag: "🇫🇷", elo: 2002 },
  { id: "sen", group: "I", name: "塞内加尔", enName: "Senegal", code: "SEN", flag: "🇸🇳", elo: 1798 },
  { id: "nor", group: "I", name: "挪威", enName: "Norway", code: "NOR", flag: "🇳🇴", elo: 1808 },
  { id: "irq", group: "I", name: "伊拉克", enName: "Iraq", code: "IRQ", flag: "🇮🇶", elo: 1608 },

  { id: "arg", group: "J", name: "阿根廷", enName: "Argentina", code: "ARG", flag: "🇦🇷", elo: 1998 },
  { id: "alg", group: "J", name: "阿尔及利亚", enName: "Algeria", code: "ALG", flag: "🇩🇿", elo: 1734 },
  { id: "aut", group: "J", name: "奥地利", enName: "Austria", code: "AUT", flag: "🇦🇹", elo: 1846 },
  { id: "jor", group: "J", name: "约旦", enName: "Jordan", code: "JOR", flag: "🇯🇴", elo: 1542 },

  { id: "por", group: "K", name: "葡萄牙", enName: "Portugal", code: "POR", flag: "🇵🇹", elo: 1940 },
  { id: "uzb", group: "K", name: "乌兹别克斯坦", enName: "Uzbekistan", code: "UZB", flag: "🇺🇿", elo: 1652 },
  { id: "col", group: "K", name: "哥伦比亚", enName: "Colombia", code: "COL", flag: "🇨🇴", elo: 1878 },
  { id: "cod", group: "K", name: "刚果民主共和国", enName: "Congo DR", code: "COD", flag: "🇨🇩", elo: 1612 },

  { id: "eng", group: "L", name: "英格兰", enName: "England", code: "ENG", flag: "🏴", elo: 1985 },
  { id: "cro", group: "L", name: "克罗地亚", enName: "Croatia", code: "CRO", flag: "🇭🇷", elo: 1844 },
  { id: "gha", group: "L", name: "加纳", enName: "Ghana", code: "GHA", flag: "🇬🇭", elo: 1666 },
  { id: "pan", group: "L", name: "巴拿马", enName: "Panama", code: "PAN", flag: "🇵🇦", elo: 1630 },
];

const groupDates: Record<GroupLetter, [string, string, string]> = {
  A: ["2026-06-11", "2026-06-18", "2026-06-24"],
  B: ["2026-06-12", "2026-06-18", "2026-06-24"],
  C: ["2026-06-13", "2026-06-19", "2026-06-25"],
  D: ["2026-06-12", "2026-06-19", "2026-06-25"],
  E: ["2026-06-14", "2026-06-20", "2026-06-26"],
  F: ["2026-06-14", "2026-06-20", "2026-06-26"],
  G: ["2026-06-15", "2026-06-21", "2026-06-27"],
  H: ["2026-06-15", "2026-06-21", "2026-06-27"],
  I: ["2026-06-16", "2026-06-22", "2026-06-28"],
  J: ["2026-06-16", "2026-06-22", "2026-06-28"],
  K: ["2026-06-17", "2026-06-23", "2026-06-29"],
  L: ["2026-06-17", "2026-06-23", "2026-06-29"],
};

const roundRobinPairs = [
  [0, 1],
  [2, 3],
  [0, 2],
  [3, 1],
  [3, 0],
  [1, 2],
] as const;

export const FIXTURES: Fixture[] = GROUPS.flatMap((group, groupIndex) => {
  const teams = TEAMS.filter((team) => team.group === group);
  return roundRobinPairs.map(([homeIndex, awayIndex], pairIndex) => ({
    id: `${group}-${pairIndex + 1}`,
    matchNo: groupIndex * 6 + pairIndex + 1,
    group,
    home: teams[homeIndex].id,
    away: teams[awayIndex].id,
    dateLabel: groupDates[group][Math.floor(pairIndex / 2)],
  }));
});

export const teamById = Object.fromEntries(TEAMS.map((team) => [team.id, team])) as Record<string, Team>;

const FLAG_CODES: Record<string, string> = {
  mex: "mx",
  rsa: "za",
  kor: "kr",
  cze: "cz",
  can: "ca",
  qat: "qa",
  sui: "ch",
  bih: "ba",
  bra: "br",
  mar: "ma",
  hai: "ht",
  sco: "gb-sct",
  usa: "us",
  par: "py",
  aus: "au",
  tur: "tr",
  ger: "de",
  cur: "cw",
  civ: "ci",
  ecu: "ec",
  ned: "nl",
  jpn: "jp",
  tun: "tn",
  swe: "se",
  bel: "be",
  egy: "eg",
  irn: "ir",
  nzl: "nz",
  esp: "es",
  cpv: "cv",
  ksa: "sa",
  uru: "uy",
  fra: "fr",
  sen: "sn",
  nor: "no",
  irq: "iq",
  arg: "ar",
  alg: "dz",
  aut: "at",
  jor: "jo",
  por: "pt",
  uzb: "uz",
  col: "co",
  cod: "cd",
  eng: "gb-eng",
  cro: "hr",
  gha: "gh",
  pan: "pa",
};

export function getFlagUrl(teamId: string) {
  return `https://flagcdn.com/${FLAG_CODES[teamId] ?? "un"}.svg`;
}
