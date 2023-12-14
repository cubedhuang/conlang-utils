async function fetchWords() {
	const data = await fetch("https://nimi.li/data/linku").then(r => r.json());

	return Object.values(
		data.data as Record<string, { word: string; usage_category: string }>
	)
		.filter(
			w =>
				w.usage_category === "core" || w.usage_category === "widespread"
		)
		.map(w => w.word);
}

const words = await fetchWords();

const syllable = /[jklmnpstw]?(?=[aeiou])[aeiou]n?(?![aeiou])/gi;

const wordToSyllablesCache = new Map<string, string[]>();

function wordToSyllables(word: string) {
	if (wordToSyllablesCache.has(word)) {
		return [...wordToSyllablesCache.get(word)!];
	}

	const syllables = word.match(syllable) || [];

	for (let i = 0; i < syllables.length; i++) {
		if (syllables[i].endsWith("n")) {
			syllables[i] = syllables[i].slice(0, -1);
			syllables.splice(i + 1, 0, "n");
			i++;
		}
	}

	wordToSyllablesCache.set(word, syllables);

	return syllables;
}

function getMergeablePairs(words: string[]) {
	const minimalPairs = new Set<string>();
	const foundSyllables = new Set<string>();

	for (const a of words) {
		for (const b of words) {
			if (a === b) continue;

			const as = wordToSyllables(a);
			const bs = wordToSyllables(b);

			for (const syllable of as) {
				foundSyllables.add(syllable);
			}

			for (const syllable of bs) {
				foundSyllables.add(syllable);
			}

			if (as.length !== bs.length) continue;

			for (let i = 0; i < as.length; i++) {
				const temp = as[i];
				as[i] = bs[i];

				if (as.join("") === bs.join("")) {
					const pair = [temp, bs[i]].sort() as [string, string];

					if (minimalPairs.has(pair.join(" "))) continue;

					minimalPairs.add(pair.join(" "));

					// console.log(pair.join(" "), a, b);
				}

				as[i] = temp;
			}
		}
	}

	const mergeable = new Set<string>();

	for (const s1 of foundSyllables) {
		for (const s2 of foundSyllables) {
			const pair = [s1, s2].sort() as [string, string];

			if (pair[0] === pair[1]) continue;
			if (minimalPairs.has(pair.join(" "))) continue;

			mergeable.add(pair.join(" "));
		}
	}

	return [...mergeable].filter(p => !p.startsWith("n ") && !p.endsWith(" n"));
}

const mergedWords = words.slice();
const merges: string[] = [];
const mergeablePairs = getMergeablePairs(words);

while (mergeablePairs.length) {
	// There are many ways to choose a pair to merge. For some reason, pop and
	// shift seem to produce the best results. Random will consistently produce
	// way more than 12 groups.

	// const pair = mergeablePairs.pop()!;
	// const pair = mergeablePairs.shift()!;
	const randomIndex = Math.floor(Math.random() * mergeablePairs.length);
	mergeablePairs.splice(randomIndex, 1);
	const pair = mergeablePairs[randomIndex];

	merges.push(pair);

	const [a, b] = pair.split(" ");

	for (let i = 0; i < mergedWords.length; i++) {
		const syllables = wordToSyllables(mergedWords[i]);

		for (let j = 0; j < syllables.length; j++) {
			if (syllables[j] === a) {
				syllables[j] = b;
			}
		}

		mergedWords[i] = syllables.join("");
	}

	const newMergeablePairs = getMergeablePairs(mergedWords);

	for (let i = 0; i < mergeablePairs.length; i++) {
		if (!newMergeablePairs.includes(mergeablePairs[i])) {
			mergeablePairs.splice(i, 1);
			i--;
		}
	}

	console.log(mergeablePairs.length);
}

console.log(merges.join("\n"));

// convert merges to groups

const groups: string[][] = [];

for (const merge of merges) {
	const [a, b] = merge.split(" ");

	let found = false;

	for (const group of groups) {
		if (group.includes(a) || group.includes(b)) {
			if (!group.includes(a)) {
				group.push(a);
			}

			if (!group.includes(b)) {
				group.push(b);
			}

			found = true;
			break;
		}
	}

	if (!found) {
		groups.push([a, b]);
	}
}

console.log("\n" + groups.length + " groups\n");

console.log(groups.map(g => g.join(" ") + " (" + g.length + ")").join("\n"));

let remainingSyllables: string[] = [];

for (const c of "jklmnpstw".split("").concat([""])) {
	for (const v of "aeiou") {
		remainingSyllables.push(c + v);
	}
}

const usedSyllables = [...new Set(groups.flat())];

remainingSyllables = remainingSyllables.filter(
	s => !usedSyllables.includes(s) && !["wu", "wo", "ji", "ti"].includes(s)
);

console.log(
	remainingSyllables.join(" ") +
		" (" +
		remainingSyllables.length +
		" remaining)"
);
