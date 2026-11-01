import { extraWordsByBook } from "./vocabulary-extra";

export type SeedWord = {
  spelling: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  exampleEn: string;
  exampleZh: string;
  memoryHint: string;
};

export type SeedWordBook = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  accent: string;
  emoji: string;
  sortOrder: number;
  words: SeedWord[];
};

/**
 * The same catalogue powers the Prisma seed and the zero-config preview mode.
 * Keeping it in one place means `npm run dev` is useful before Supabase exists.
 */
export const wordbookSeed: SeedWordBook[] = [
  {
    slug: "everyday-essentials",
    title: "Everyday Essentials",
    subtitle: "把日常英语说得更自然",
    description: "从情绪、习惯到生活小事，掌握真正用得上的高频表达。",
    level: "A2 · 日常",
    accent: "#dff3c8",
    emoji: "🌿",
    sortOrder: 1,
    words: [
      {
        spelling: "serendipity",
        phonetic: "/ˌserənˈdɪpəti/",
        partOfSpeech: "n.",
        meaning: "意外发现美好事物的运气；机缘巧合",
        exampleEn: "Finding that little café was pure serendipity.",
        exampleZh: "发现那家小咖啡馆纯属意外之喜。",
        memoryHint: "serene（平静）+ dip（偶遇）：平静地散步时，美好自己撞了上来。",
      },
      {
        spelling: "thrive",
        phonetic: "/θraɪv/",
        partOfSpeech: "v.",
        meaning: "茁壮成长；蓬勃发展",
        exampleEn: "Plants thrive in warm, humid weather.",
        exampleZh: "植物在温暖潮湿的天气里长得很好。",
        memoryHint: "把 thrive 想成 three + hive：三箱蜜蜂，越忙越兴旺。",
      },
      {
        spelling: "cherish",
        phonetic: "/ˈtʃerɪʃ/",
        partOfSpeech: "v.",
        meaning: "珍惜；珍爱",
        exampleEn: "I cherish the quiet mornings with coffee.",
        exampleZh: "我很珍惜那些安静喝咖啡的早晨。",
        memoryHint: "cherry（樱桃）很娇贵，所以要 cherish——小心捧着。",
      },
      {
        spelling: "resilient",
        phonetic: "/rɪˈzɪliənt/",
        partOfSpeech: "adj.",
        meaning: "有韧性的；能迅速恢复的",
        exampleEn: "Children are often more resilient than adults expect.",
        exampleZh: "孩子往往比大人想象中更有韧性。",
        memoryHint: "re（再次）+ sil（跳）——被压弯后还能弹回来。",
      },
      {
        spelling: "wander",
        phonetic: "/ˈwɒndə(r)/",
        partOfSpeech: "v.",
        meaning: "漫步；闲逛；走神",
        exampleEn: "We wandered through the old town without a map.",
        exampleZh: "我们没有看地图，在老城里随意闲逛。",
        memoryHint: "wonder（好奇）地走，就是 wander（漫游）。",
      },
      {
        spelling: "gratitude",
        phonetic: "/ˈɡrætɪtjuːd/",
        partOfSpeech: "n.",
        meaning: "感激；感恩",
        exampleEn: "She wrote a note of gratitude to her mentor.",
        exampleZh: "她给导师写了一张感谢便条。",
        memoryHint: "gratis 在拉丁语里是“免费、无偿”，别人白给的好意值得感恩。",
      },
    ],
  },
  {
    slug: "business-core",
    title: "Business Core",
    subtitle: "职场沟通的底气",
    description: "会议、邮件、谈判都能用上的表达，让专业感自然发生。",
    level: "B1 · 职场",
    accent: "#dbe7ff",
    emoji: "💼",
    sortOrder: 2,
    words: [
      {
        spelling: "leverage",
        phonetic: "/ˈliːvərɪdʒ/",
        partOfSpeech: "v.",
        meaning: "利用；充分发挥……的价值",
        exampleEn: "We can leverage our network to reach new customers.",
        exampleZh: "我们可以利用现有网络触达新客户。",
        memoryHint: "lever 是杠杆：找到一个支点，把现有资源撬动起来。",
      },
      {
        spelling: "streamline",
        phonetic: "/ˈstriːmlaɪn/",
        partOfSpeech: "v.",
        meaning: "简化；使流程更高效",
        exampleEn: "The new tool streamlines our weekly reporting.",
        exampleZh: "这个新工具简化了我们每周的报告流程。",
        memoryHint: "stream（水流）+ line（直线）：把弯弯绕绕的流程拉直。",
      },
      {
        spelling: "stakeholder",
        phonetic: "/ˈsteɪkhəʊldə(r)/",
        partOfSpeech: "n.",
        meaning: "利益相关者；股东",
        exampleEn: "Every stakeholder needs to approve the plan.",
        exampleZh: "每一位利益相关者都需要批准这项计划。",
        memoryHint: "stake 是“筹码、利害关系”，手里有筹码的人就是 stakeholder。",
      },
      {
        spelling: "feasible",
        phonetic: "/ˈfiːzəbl/",
        partOfSpeech: "adj.",
        meaning: "可行的；做得到的",
        exampleEn: "The timeline is ambitious but feasible.",
        exampleZh: "这个时间表很有野心，但并非不可行。",
        memoryHint: "feasible 和 easy 都让人松口气：这件事“能做”。",
      },
      {
        spelling: "negotiate",
        phonetic: "/nɪˈɡəʊʃieɪt/",
        partOfSpeech: "v.",
        meaning: "谈判；协商",
        exampleEn: "We negotiated a better rate with the supplier.",
        exampleZh: "我们和供应商谈到了更好的价格。",
        memoryHint: "neg（不）+ oti（闲暇）：没空休息，因为还在谈条件。",
      },
      {
        spelling: "deadline",
        phonetic: "/ˈdedlaɪn/",
        partOfSpeech: "n.",
        meaning: "截止日期；最后期限",
        exampleEn: "The deadline for applications is Friday.",
        exampleZh: "申请截止日期是星期五。",
        memoryHint: "dead + line：越过这条线，机会就“死”了。",
      },
    ],
  },
  {
    slug: "ielts-academic",
    title: "IELTS Academic",
    subtitle: "学术阅读与写作高频",
    description: "写作 Task 2 和阅读长文里的熟面孔，一次理清它们的准确含义。",
    level: "B2 · 学术",
    accent: "#ffe5d6",
    emoji: "🎓",
    sortOrder: 3,
    words: [
      {
        spelling: "ubiquitous",
        phonetic: "/juːˈbɪkwɪtəs/",
        partOfSpeech: "adj.",
        meaning: "无处不在的；普遍存在的",
        exampleEn: "Smartphones have become ubiquitous in modern life.",
        exampleZh: "智能手机在现代生活中已经无处不在。",
        memoryHint: "ubi 在拉丁语里是“哪里”，哪里都有，就是 ubiquitous。",
      },
      {
        spelling: "mitigate",
        phonetic: "/ˈmɪtɪɡeɪt/",
        partOfSpeech: "v.",
        meaning: "减轻；缓解（不良影响）",
        exampleEn: "Urban trees can mitigate the effects of extreme heat.",
        exampleZh: "城市树木可以缓解极端高温带来的影响。",
        memoryHint: "miti（温和）+ gate（门）：用一扇温和的门挡住冲击。",
      },
      {
        spelling: "empirical",
        phonetic: "/ɪmˈpɪrɪkl/",
        partOfSpeech: "adj.",
        meaning: "以观察或实验为依据的；经验主义的",
        exampleEn: "The theory is supported by empirical evidence.",
        exampleZh: "该理论得到了实证证据的支持。",
        memoryHint: "empire（帝国）靠真实数据治理？empirical 强调“做过实验才算数”。",
      },
      {
        spelling: "discrepancy",
        phonetic: "/dɪsˈkrepənsi/",
        partOfSpeech: "n.",
        meaning: "差异；不一致之处",
        exampleEn: "Researchers found a discrepancy between the two datasets.",
        exampleZh: "研究人员发现两组数据之间存在差异。",
        memoryHint: "dis（分开）+ crep（裂缝）：两份数据之间裂开了一条缝。",
      },
      {
        spelling: "sustainable",
        phonetic: "/səˈsteɪnəbl/",
        partOfSpeech: "adj.",
        meaning: "可持续的；能长期维持的",
        exampleEn: "The city is investing in sustainable transport.",
        exampleZh: "这座城市正在投资可持续交通。",
        memoryHint: "sustain（托住）+ able（能够）：能一直托住，才算可持续。",
      },
      {
        spelling: "hypothesis",
        phonetic: "/haɪˈpɒθəsɪs/",
        partOfSpeech: "n.",
        meaning: "假设；假说",
        exampleEn: "The experiment was designed to test the hypothesis.",
        exampleZh: "这个实验旨在验证该假设。",
        memoryHint: "hypo（下面）+ thesis（论点）：先垫在下面的论点，等着被验证。",
      },
    ],
  },
  {
    slug: "travel-light",
    title: "Travel Light",
    subtitle: "带上英语去远方",
    description: "订住宿、看行程、和当地人聊天，轻装出发也能从容表达。",
    level: "A2 · 旅行",
    accent: "#eadfff",
    emoji: "✈️",
    sortOrder: 4,
    words: [
      {
        spelling: "itinerary",
        phonetic: "/aɪˈtɪnərəri/",
        partOfSpeech: "n.",
        meaning: "行程；旅行计划",
        exampleEn: "Our itinerary includes three days in Kyoto.",
        exampleZh: "我们的行程包括在京都停留三天。",
        memoryHint: "itiner（旅程）+ ary（清单）：一张写着每天去哪的清单。",
      },
      {
        spelling: "accommodation",
        phonetic: "/əˌkɒməˈdeɪʃn/",
        partOfSpeech: "n.",
        meaning: "住宿；住处",
        exampleEn: "We booked accommodation near the station.",
        exampleZh: "我们订了车站附近的住处。",
        memoryHint: "ac + commod（方便）：让你住得方便的地方。",
      },
      {
        spelling: "breathtaking",
        phonetic: "/ˈbreθteɪkɪŋ/",
        partOfSpeech: "adj.",
        meaning: "令人惊叹的；美得让人屏息的",
        exampleEn: "The view from the summit was breathtaking.",
        exampleZh: "山顶的景色美得令人屏息。",
        memoryHint: "美到 breath（呼吸）+ taking（被夺走）——看得忘了呼吸。",
      },
      {
        spelling: "souvenir",
        phonetic: "/ˌsuːvəˈnɪə(r)/",
        partOfSpeech: "n.",
        meaning: "纪念品",
        exampleEn: "I bought a small ceramic bowl as a souvenir.",
        exampleZh: "我买了一只小陶碗作为纪念品。",
        memoryHint: "souvenir 来自法语“记住”：带回家的不是物件，是一段记忆。",
      },
      {
        spelling: "commute",
        phonetic: "/kəˈmjuːt/",
        partOfSpeech: "v.",
        meaning: "通勤；上下班往返",
        exampleEn: "She commutes to work by train every day.",
        exampleZh: "她每天坐火车通勤上班。",
        memoryHint: "com（共同）+ mute（改变）：每天在公司和家之间来回切换。",
      },
      {
        spelling: "local",
        phonetic: "/ˈləʊkl/",
        partOfSpeech: "adj. / n.",
        meaning: "当地的；本地人",
        exampleEn: "Ask the locals where they like to eat.",
        exampleZh: "问问当地人他们喜欢去哪里吃饭。",
        memoryHint: "loc（地点）+ al：属于这个地点的，就是 local。",
      },
    ],
  },
].map((book) => ({
  ...book,
  words: [...book.words, ...(extraWordsByBook[book.slug] ?? [])],
}));

export function findSeedBook(slug: string) {
  return wordbookSeed.find((book) => book.slug === slug);
}
