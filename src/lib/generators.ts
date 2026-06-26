/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Vocabulary banks categorized by style
const vocab = {
  simple: {
    subjects: ["The cat", "A dog", "The boy", "A girl", "The bird", "A teacher", "The doctor", "My friend", "The child"],
    verbs: ["climbed", "ran", "jumped", "smiled", "walked", "read", "wrote", "played", "sang", "danced", "slept"],
    adverbs: ["slowly", "quickly", "happily", "quietly", "softly", "suddenly", "gently", "calmly", "loudly"],
    objects: ["up the tree", "across the yard", "in the park", "a good book", "a sweet song", "with a ball", "on the floor"],
    adjectives: ["little", "happy", "blue", "small", "quick", "bright", "soft", "sweet", "friendly", "young"]
  },
  intermediate: {
    subjects: ["The software engineer", "A passionate musician", "The local gardener", "A determined athlete", "The clever student", "Our team leader", "The store manager"],
    verbs: ["carefully analyzed", "beautifully performed", "consistently maintained", "eagerly completed", "enthusiastically proposed", "successfully designed"],
    conjunctions: ["although it was late", "while others were sleeping", "because the goal was near", "even though obstacles appeared", "so that we could succeed"],
    clauses: ["to improve efficiency", "with great attention to detail", "achieving a major milestone", "inspiring everyone in the room", "under difficult circumstances"]
  },
  advanced: {
    subjects: ["The profound complexity of the project", "An intrinsic motivation for self-improvement", "A subtle nuance in the artist's work", "The multi-faceted nature of global economics"],
    verbs: ["comprehensively demonstrates", "fundamentally transforms", "meticulously articulates", "consistently exacerbates", "significantly expedites"],
    objects: ["paradigm shifts within the scientific community", "cognitive developments in early childhood", "intricate networks of information flow", "dynamic equilibria in natural habitats"]
  },
  academic: {
    subjects: ["This empirical study", "Prior research in cognitive neuroscience", "Statistical analysis of the dataset", "The theoretical framework"],
    verbs: ["corroborates the hypothesis that", "evaluates the correlation between", "synthesizes historical accounts of", "delineates the boundaries of"],
    objects: ["socio-economic disparities in urban environments", "neural plasticity during active learning processes", "methodological constraints in qualitative research"]
  },
  story: {
    subjects: ["An ancient grandfather clock", "The lone traveler", "A mysterious shadow", "The ancient oak tree", "A brilliant shooting star"],
    verbs: ["whispered softly of", "loomed silently over", "danced gracefully across", "glowed intensely beneath", "echoed through"],
    objects: ["forgotten secrets of a bygone era", "the quiet cobblestone streets", "the shimmering surface of the lake", "the misty, enchanted forest valley"]
  },
  news: {
    subjects: ["Local city council members", "A major technology conglomerate", "The national health organization", "Environmental advocates"],
    verbs: ["announced a groundbreaking initiative to", "recently declared a state of", "unveiled a state-of-the-art facility for", "strongly urged immediate reform on"],
    objects: ["climate change mitigation in metropolitan areas", "next-generation artificial intelligence safety protocols", "public wellness campaigns nationwide"]
  },
  business: {
    subjects: ["Our corporate synergy", "The quarterly financial projection", "Strategic resource allocation", "Cross-functional design teams"],
    verbs: ["maximizes shareholder value by", "optimizes operational pipelines to", "streamlines customer onboarding while", "leverages cutting-edge analytics to"],
    objects: ["exploit niche market opportunities", "mitigate structural deficits", "enhance high-margin product verticals"]
  },
  science: {
    subjects: ["Cellular respiration", "Quantum entanglement", "The gravitational field", "Photosynthetic pathways", "Tectonic plate movement"],
    verbs: ["fundamentally governs", "converts electromagnetic radiation into", "generates localized perturbations in", "catalyzes the synthesis of"],
    objects: ["molecular structures within organic matter", "the space-time continuum near massive bodies", "highly volatile chemical compounds"]
  },
  conversation: {
    subjects: ["I was thinking that we", "Maybe you should try to", "If we have some spare time, let's", "Do you remember when we"],
    verbs: ["grab some coffee and", "head over to that new place and", "take a look at the instructions and", "catch up about the latest project and"],
    objects: ["see what everyone else is planning.", "chat about how things are going.", "decide on a final schedule.", "have a quiet evening."]
  }
};

// Hand-curated, beautiful base templates of exact styles to guarantee natural reading sentences
const staticSentences = {
  simple: [
    "The cat climbed slowly up the tree.",
    "A small dog ran quickly across the green yard.",
    "The happy child played safely in the sunny park.",
    "My friendly teacher read a wonderful story aloud.",
    "The bright sun shone warmly on the quiet blue ocean.",
    "A quick red fox jumped over the lazy sleeping dog."
  ],
  intermediate: [
    "Although the heavy rain continued to fall, the determined athletes finished their practice.",
    "The software engineer carefully analyzed the code to ensure maximum performance under pressure.",
    "A passionate musician beautifully performed a solo that inspired everyone in the crowded room.",
    "Our team leader enthusiastically proposed a new strategy that completed the project ahead of schedule.",
    "Even though obstacles appeared at every turn, they maintained a positive attitude throughout the week."
  ],
  advanced: [
    "The profound complexity of quantum superposition fundamentally challenges our classical understanding of physical reality.",
    "An intrinsic motivation for self-improvement meticulously guides her cognitive development through challenging disciplines.",
    "The multi-faceted nature of global economics comprehensively demonstrates the intricate networks of modern trade flow.",
    "By meticulously articulating these subtle nuances, the author succeeds in transforming our shared cultural perspective."
  ],
  academic: [
    "This empirical study synthesizes historical accounts of socio-economic disparities in rapidly expanding urban environments.",
    "Prior research in cognitive neuroscience delineates the boundaries of neural plasticity during active multi-sensory learning.",
    "Statistical analysis of the dataset evaluates the correlation between digital device exposure and focus duration.",
    "The theoretical framework corroborates the hypothesis that linguistic variance directly influences abstract conceptualization."
  ],
  story: [
    "An ancient grandfather clock ticked quietly in the dim corner, whispering forgotten secrets of a bygone era.",
    "The lone traveler walked down the quiet cobblestone streets, wrapped in a thick wool coat against the cold fog.",
    "A brilliant shooting star danced gracefully across the night sky, reflecting on the shimmering surface of the lake.",
    "The ancient oak tree loomed silently over the misty valley, keeping watch over centuries of quiet change."
  ],
  news: [
    "Local city council members announced a groundbreaking initiative yesterday to support green energy throughout the town.",
    "A major technology conglomerate unveiled a state-of-the-art facility designed to research AI safety guidelines.",
    "The national health organization strongly urged immediate reform on mental health accessibility in schools.",
    "Environmental advocates recently declared a state of emergency regarding declining marine biodiversity in coastal zones."
  ],
  business: [
    "Our primary objective this quarter is to optimize operational pipelines and leverage synergy across vertical divisions.",
    "Strategic resource allocation maximizes shareholder value by targeting high-margin product developments first.",
    "Cross-functional design teams utilize advanced analytics to streamline customer onboarding and drive organic engagement.",
    "The quarterly financial projection underscores the critical need to mitigate structural deficits in international distribution."
  ],
  science: [
    "Photosynthetic pathways convert electromagnetic radiation into stable chemical potential energy stored in organic molecules.",
    "Quantum entanglement fundamentally governs the instantaneous transfer of spin states across vast spatial separations.",
    "Cellular respiration catalyzes the synthesis of adenosine triphosphate to fuel vital metabolic reactions within the body.",
    "Tectonic plate movement generates localized perturbations in stress fields, culminating in episodic seismic events."
  ],
  conversation: [
    "I was thinking we could grab some coffee tomorrow and catch up about how things are going with you.",
    "Do you remember when we head over to that new place and laughed for hours about nothing?",
    "If we have some spare time this weekend, let's take a look at the travel guide and make plans.",
    "Maybe you should try to talk with her directly rather than sending another long, complicated message."
  ]
};

// Hand-curated rich paragraph sources for all styles to guarantee extremely high-quality cohesive text
const staticParagraphs: Record<string, string[]> = {
  simple: [
    "The small bird flew high in the bright sky. It sang a happy song. Down below, a little brown rabbit hopped slowly through the green grass. A young girl sat on a big wooden bench, eating a sweet red apple. She smiled when she saw the rabbit. The day was warm and quiet. Everyone felt safe and happy in the beautiful garden.",
    "My friend lives in a big yellow house near the school. We walk to class together every single morning. We talk about our favorite games and books. Our teacher is very kind and helps us learn new words. After school, we play soccer in the wide park. When the sun goes down, we go home and eat dinner with our families."
  ],
  intermediate: [
    "Modern urban parks play a crucial role in maintaining mental well-being for city residents. Surrounded by towering concrete structures and bustling streets, these green havens offer a peaceful retreat where people can slow down. Visitors can be found reading books under shady maple trees, jogging along winding dirt paths, or simply listening to the gentle splash of central fountains. Engaging with nature, even in small doses, has been scientifically proven to lower stress hormones, improve memory retention, and boost creative problem-solving skills.",
    "Learning a second language is a deeply rewarding challenge that opens doors to new cultures and perspectives. Although the initial stages of grammar memorization can feel tedious and overwhelming, consistency is the key to progress. Practicing for just fifteen minutes every day helps build strong neural pathways that aid in memory recall. Over time, words that once felt completely foreign begin to flow naturally. Conversing with native speakers eventually turns a daunting academic task into an exciting bridge for human connection."
  ],
  academic: [
    "The investigation of neural plasticity has fundamentally shifted the paradigm of cognitive rehabilitation. Historically, the adult human brain was considered a static organ with highly rigid pathways. However, contemporary neuroimaging technologies demonstrate that active cognitive engagement can stimulate dendritic branching and synaptic remodeling. By subjecting participants to intensive working memory tasks over extended periods, researchers observed significant structural enhancements in prefrontal networks. This empirical evidence supports the implementation of targeted digital training protocols as a viable countermeasure against age-related cognitive decline.",
    "Socio-economic integration in metropolitan sectors remains a primary determinant of regional economic stability. This research synthesizes extensive municipal datasets to evaluate how public infrastructure investments correlate with community mobility. The analytical model underscores that robust public transit corridors not only decrease commuting latency but also expand access to higher-margin employment. Consequently, regional planning committees must prioritize equitable transit development to bridge persistent wealth gaps and promote sustainable, diversified growth in emerging urban epicenters."
  ],
  story: [
    "The wind howled through the cracked window of the abandoned lighthouse, carrying with it the salty breath of the turbulent sea. Julian sat on an upturned wooden crate, nursing a flickering lantern that cast dancing shadows against the damp brick walls. For forty years, his grandfather had kept the great copper beacon burning, guiding lost sailors away from the jagged teeth of the black reef. Now, the old gears lay rusted and silent, yet Julian felt an invisible pull to stand watch on this stormy night. In the distance, a faint horn echoed, signaling a ship battling the towering dark waves.",
    "Deep within the Whispering Woods, where the canopy was so dense that sunlight only filtered through as thin silver needles, Clara discovered the clockwork fountain. Crafted from polished brass gears and glowing amber crystals, it hummed with a quiet, rhythmic melody that echoed the heartbeat of the forest. When she dipped her copper canteen into the sparkling water, the gears began to rotate backward, and the surrounding wildflowers instantly bloomed and withered in a rapid loop. She realized then that this fountain did not supply water, but rather controlled the local passage of time itself."
  ],
  news: [
    "A coalition of international space agencies announced yesterday the successful launch of the Horizon deep-space observatory. This state-of-the-art satellite is equipped with advanced infrared sensors capable of piercing dense interstellar dust clouds to observe the earliest stages of star formation. Scientists from over thirty countries have spent the past decade collaborating on this mission, which aims to unlock secrets about the cosmic events that occurred shortly after the Big Bang. The first high-resolution images are expected to be transmitted back to Earth within three weeks.",
    "The metropolitan transit authority unveiled an ambitious ten-year plan to transition its entire fleet of diesel buses to zero-emission hydrogen fuel cell vehicles. The three-billion-dollar initiative represents one of the largest public environmental investments in the state's history. To support the transition, the city will construct twelve solar-powered hydrogen fueling depots, creating hundreds of green engineering jobs in the process. City planners expect the project to reduce localized greenhouse gas emissions by sixty-five percent, drastically improving air quality in densely populated urban centers."
  ],
  business: [
    "To survive in today's hyper-competitive marketplace, legacy corporations must transition from monolithic operating structures to agile, cross-functional ecosystems. Our analysis indicates that organizations utilizing decentralized decision-making loops deliver products to market forty percent faster than their traditional counterparts. By empowering small, multi-disciplinary teams to iterate rapidly, companies can respond to volatile customer preferences with precision. Leaders must foster a psychological safety net where calculated risk-taking is celebrated and failures are analyzed as critical stepping stones toward high-margin innovation.",
    "The integration of predictive analytics into supply chain logistics has revolutionized inventory optimization. By feeding historical purchase records, weather forecasts, and regional economic indicators into machine learning models, distributors can anticipate demand spikes with ninety-two percent accuracy. This preventative planning minimizes overhead storage fees and prevents costly stockouts of high-demand items. Over the next fiscal year, our strategic priority will be scaling this analytical dashboard across our European logistics centers, thereby solidifying our market dominance in rapid global distribution."
  ],
  science: [
    "Superconductivity, the state of zero electrical resistance and expulsion of magnetic fields, represents one of the most intriguing phenomena in solid-state physics. When certain materials are cooled below their critical transition temperatures, electrons form Cooper pairs that flow through the atomic lattice without scattering. While conventional superconductivity requires temperatures approaching absolute zero, recent breakthroughs in high-pressure hydrides suggest that room-temperature superconductivity may soon be achievable. Achieving this milestone would revolutionize global power grids, lossless energy storage devices, and high-speed maglev transportation.",
    "The human gut microbiome represents a complex, symbiotic ecosystem consisting of trillions of microorganisms that play a vital role in host physiology. Beyond digesting complex dietary fibers, these diverse bacterial phyla synthesize essential vitamins and regulate systemic immune responses. Crucially, recent research highlights the bidirectional communication of the gut-brain axis, demonstrating that microbial metabolites can cross the blood-brain barrier to modulate neurotransmitter synthesis. This intricate biological connection suggests that dietary interventions may serve as key therapeutic strategies for addressing neuropsychiatric conditions."
  ],
  conversation: [
    "Honestly, I was really skeptical about trying a cognitive training app at first because they always seemed a bit gimmicky, but after a week, I actually feel a lot sharper. It is like waking up your brain in the morning instead of just zoning out on social media. My favorite is definitely the visual memory one with the flashing grids, though it gets insanely hard once you reach the five-by-five levels. Let me know if you want to set up a daily challenge together, it might help us both stay a bit more consistent.",
    "We should definitely try that new bistro on the corner for our lunch break tomorrow, especially since they just opened up a beautiful outdoor seating area. I heard their hand-pressed sandwiches and iced matcha lattes are absolutely amazing, and the prices are surprisingly reasonable for this neighborhood. Let's head out around twelve-thirty so we can beat the rush hour crowd and actually enjoy some sunshine. Let me know if that time works for you, or if we need to adjust it a bit."
  ]
};

// Generates a random sentence based on dynamic vocabulary combinatorics
export function generateDynamicSentence(style: keyof typeof vocab, targetWordCount: number): string {
  const registry = vocab as Record<string, any>;
  const currentVocab = registry[style] || registry.simple;
  
  let words: string[] = [];
  
  if (targetWordCount <= 6) {
    // Very simple form: S + V + O
    const s = getRandomItem(currentVocab.subjects || registry.simple.subjects) as string;
    const sWord = s.split(" ")[1] || s;
    const v = getRandomItem(currentVocab.verbs || registry.simple.verbs) as string;
    const o = getRandomItem(currentVocab.objects || registry.simple.objects) as string;
    words = [sWord, v, o];
  } else if (targetWordCount <= 12) {
    // S + V + O
    const s = getRandomItem(currentVocab.subjects || registry.simple.subjects) as string;
    const v = getRandomItem(currentVocab.verbs || registry.simple.verbs) as string;
    const o = getRandomItem(currentVocab.objects || registry.simple.objects) as string;
    words = [...s.split(" "), v, ...o.split(" ")];
  } else {
    // Long sentence with clauses and conjunctions
    const s = getRandomItem(currentVocab.subjects || registry.simple.subjects) as string;
    const v = getRandomItem(currentVocab.verbs || registry.simple.verbs) as string;
    const c = getRandomItem(currentVocab.conjunctions || registry.intermediate.conjunctions) as string;
    const cl = getRandomItem(currentVocab.clauses || registry.intermediate.clauses) as string;
    words = [...c.split(" "), ...s.split(" "), ...v.split(" "), ...cl.split(" ")];
  }

  // Combine and refine to target count
  let rawSentence = words.filter(Boolean).join(" ");
  // Trim or expand to meet exact or close to target word count
  let finalWords = rawSentence.split(/\s+/);
  
  if (finalWords.length > targetWordCount) {
    finalWords = finalWords.slice(0, targetWordCount);
  } else {
    // Pad with filler words from vocabulary if needed
    const fillers = ["with", "careful", "attention", "making", "great", "progress", "every", "single", "day", "in", "the", "system"];
    let i = 0;
    while (finalWords.length < targetWordCount) {
      finalWords.push(fillers[i % fillers.length]);
      i++;
    }
  }

  // Format capitalization and punctuation
  let sentence = finalWords.join(" ");
  sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  if (!sentence.endsWith(".") && !sentence.endsWith("?") && !sentence.endsWith("!")) {
    sentence += ".";
  }
  return sentence;
}

// Main high level API to retrieve sentences
export function getSentence(style: string, targetWords: number): string {
  const normalizedStyle = (staticSentences as any)[style] ? style : "simple";
  const sentenceList = (staticSentences as any)[normalizedStyle] as string[];
  
  // See if any static sentence matches close to the word count (within 3 words)
  const matchingStatic = sentenceList.find(s => {
    const len = s.split(/\s+/).length;
    return Math.abs(len - targetWords) <= 3;
  });

  if (matchingStatic && Math.random() > 0.5) {
    return matchingStatic;
  }

  // Otherwise, procedurally generate a custom sentence matching the word count
  return generateDynamicSentence(normalizedStyle as any, targetWords);
}

// Main high level API to retrieve paragraphs
export function getParagraph(style: string, targetWords: number): string {
  const normalizedStyle = staticParagraphs[style] ? style : "simple";
  const pList = staticParagraphs[normalizedStyle];
  
  // Pick a base paragraph
  const baseP = getRandomItem(pList);
  const words = baseP.split(/\s+/);
  
  if (words.length === targetWords) {
    return baseP;
  }
  
  if (words.length > targetWords) {
    // Truncate cleanly at a sentence boundary near targetWords if possible, or just truncate and add period
    const truncatedWords = words.slice(0, targetWords);
    let str = truncatedWords.join(" ");
    if (!str.endsWith(".") && !str.endsWith("?") && !str.endsWith("!")) {
      // Find last word and replace any comma with period
      str = str.replace(/[,;:]$/, "");
      str += ".";
    }
    return str;
  }
  
  // If target is larger than our base paragraph, concatenate parts or pad procedurally
  let combinedWords = [...words];
  let attempts = 0;
  while (combinedWords.length < targetWords && attempts < 5) {
    const anotherP = getRandomItem(pList);
    combinedWords.push(...anotherP.split(/\s+/));
    attempts++;
  }
  
  const truncatedWords = combinedWords.slice(0, targetWords);
  let str = truncatedWords.join(" ");
  if (!str.endsWith(".") && !str.endsWith("?") && !str.endsWith("!")) {
    str = str.replace(/[,;:]$/, "");
    str += ".";
  }
  return str;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
