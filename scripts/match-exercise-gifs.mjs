// Script to match our exercises to ExerciseDB GIFs and generate SQL
// Run with: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/match-exercise-gifs.mjs

const API_BASE = "https://oss.exercisedb.dev/api/v1";

const OUR_EXERCISES = [
  "Bench Press", "Incline Bench Press", "Decline Bench Press", "Dumbbell Chest Press",
  "Incline Dumbbell Press", "Chest Fly", "Cable Chest Fly", "Push-Up", "Incline Push-Up",
  "Dips", "Pec Deck", "Deadlift", "Romanian Deadlift", "Barbell Row", "Dumbbell Row",
  "Pull-Up", "Chin-Up", "Lat Pulldown", "Seated Cable Row", "T-Bar Row", "Face Pull",
  "Good Morning", "Back Extension", "Overhead Press", "Seated Dumbbell Press", "Arnold Press",
  "Lateral Raise", "Front Raise", "Rear Delt Fly", "Cable Lateral Raise", "Upright Row",
  "Shrugs", "Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Incline Dumbbell Curl",
  "Cable Curl", "Preacher Curl", "Concentration Curl", "EZ Bar Curl", "Tricep Pushdown",
  "Overhead Tricep Extension", "Skull Crusher", "Close-Grip Bench Press", "Tricep Dips",
  "Kickbacks", "Diamond Push-Up", "Wrist Curl", "Reverse Wrist Curl", "Farmers Walk",
  "Plank", "Crunches", "Bicycle Crunch", "Leg Raise", "Russian Twist", "Ab Wheel Rollout",
  "Cable Crunch", "Hanging Leg Raise", "Side Plank", "Woodchop", "Hip Thrust", "Glute Bridge",
  "Cable Kickback", "Donkey Kick", "Squat", "Front Squat", "Goblet Squat", "Hack Squat",
  "Leg Press", "Leg Extension", "Bulgarian Split Squat", "Lunge", "Walking Lunge", "Step-Up",
  "Leg Curl", "Seated Leg Curl", "Nordic Curl", "Stiff-Leg Deadlift", "Standing Calf Raise",
  "Seated Calf Raise", "Donkey Calf Raise", "Running", "Cycling", "Rowing Machine",
  "Jump Rope", "Stair Climber", "Elliptical", "Swimming", "Power Clean", "Clean and Jerk",
  "Snatch", "Thruster", "Burpee", "Box Jump", "Kettlebell Swing", "Turkish Get-Up",
];

// Search terms to use per exercise (maps our name → search query)
const SEARCH_TERMS = {
  "Bench Press": "barbell bench press",
  "Incline Bench Press": "barbell incline bench press",
  "Decline Bench Press": "barbell decline bench press",
  "Dumbbell Chest Press": "dumbbell bench press",
  "Incline Dumbbell Press": "dumbbell incline bench press",
  "Chest Fly": "dumbbell fly",
  "Cable Chest Fly": "cable crossover",
  "Push-Up": "push-up",
  "Incline Push-Up": "incline push up",
  "Dips": "dips",
  "Pec Deck": "pec deck",
  "Deadlift": "barbell deadlift",
  "Romanian Deadlift": "romanian deadlift",
  "Barbell Row": "barbell bent over row",
  "Dumbbell Row": "dumbbell bent over row",
  "Pull-Up": "pull-up",
  "Chin-Up": "chin-up",
  "Lat Pulldown": "cable lat pulldown",
  "Seated Cable Row": "cable seated row",
  "T-Bar Row": "t bar row",
  "Face Pull": "cable face pull",
  "Good Morning": "good morning",
  "Back Extension": "back extension",
  "Overhead Press": "barbell overhead press",
  "Seated Dumbbell Press": "dumbbell seated shoulder press",
  "Arnold Press": "arnold press",
  "Lateral Raise": "dumbbell lateral raise",
  "Front Raise": "dumbbell front raise",
  "Rear Delt Fly": "dumbbell rear delt fly",
  "Cable Lateral Raise": "cable lateral raise",
  "Upright Row": "barbell upright row",
  "Shrugs": "barbell shrug",
  "Barbell Curl": "barbell curl",
  "Dumbbell Curl": "dumbbell bicep curl",
  "Hammer Curl": "dumbbell hammer curl",
  "Incline Dumbbell Curl": "dumbbell incline curl",
  "Cable Curl": "cable curl",
  "Preacher Curl": "barbell preacher curl",
  "Concentration Curl": "dumbbell concentration curl",
  "EZ Bar Curl": "ez bar curl",
  "Tricep Pushdown": "cable triceps pushdown",
  "Overhead Tricep Extension": "dumbbell tricep overhead extension",
  "Skull Crusher": "skull crusher",
  "Close-Grip Bench Press": "barbell close grip bench press",
  "Tricep Dips": "dips",
  "Kickbacks": "dumbbell kickback",
  "Diamond Push-Up": "diamond push up",
  "Wrist Curl": "wrist curl",
  "Reverse Wrist Curl": "reverse wrist curl",
  "Farmers Walk": "farmers walk",
  "Plank": "plank",
  "Crunches": "crunch",
  "Bicycle Crunch": "bicycle crunch",
  "Leg Raise": "leg raises",
  "Russian Twist": "russian twist",
  "Ab Wheel Rollout": "ab wheel rollout",
  "Cable Crunch": "cable crunch",
  "Hanging Leg Raise": "hanging leg raise",
  "Side Plank": "side plank",
  "Woodchop": "woodchop",
  "Hip Thrust": "barbell hip thrust",
  "Glute Bridge": "glute bridge",
  "Cable Kickback": "cable kickback",
  "Donkey Kick": "donkey kick",
  "Squat": "barbell squat",
  "Front Squat": "barbell front squat",
  "Goblet Squat": "dumbbell goblet squat",
  "Hack Squat": "hack squat",
  "Leg Press": "leg press",
  "Leg Extension": "leg extension",
  "Bulgarian Split Squat": "bulgarian split squat",
  "Lunge": "dumbbell lunge",
  "Walking Lunge": "walking lunge",
  "Step-Up": "step up",
  "Leg Curl": "lying leg curls",
  "Seated Leg Curl": "seated leg curl",
  "Nordic Curl": "natural leg curl",
  "Stiff-Leg Deadlift": "stiff leg deadlift",
  "Standing Calf Raise": "calf raise",
  "Seated Calf Raise": "seated calf raise",
  "Donkey Calf Raise": "donkey calf raise",
  "Burpee": "burpee",
  "Box Jump": "box jump",
  "Kettlebell Swing": "kettlebell swing",
  "Turkish Get-Up": "turkish get up",
  "Thruster": "barbell thruster",
  "Snatch": "barbell snatch",
  "Power Clean": "power clean",
  "Clean and Jerk": "clean and jerk",
};

// Manually verified exercise IDs from ExerciseDB OSS (for exercises that are hard to search)
// GIF URL pattern: https://static.exercisedb.dev/media/{exerciseId}.gif
const HARDCODED_GIFS = {
  // Back
  "Deadlift":              "ila4NZS", // barbell deadlift
  "Romanian Deadlift":     "o6LqKKP", // traditional barbell romanian deadlift
  "Barbell Row":           "r0z6xzQ", // barbell pendlay row
  "Dumbbell Row":          "BJ0Hz5L", // dumbbell bent over row
  "Pull-Up":               "HMzLjXx", // weighted pull-up
  "Chin-Up":               "dVeWXf2", // chin-up diagonal
  "Lat Pulldown":          "0MlxeMn", // cable pulldown pro lat bar
  "Back Extension":        "Krmb3cB", // lever reverse hyperextension
  // Shoulders
  "Lateral Raise":         "DsgkuIt", // dumbbell lateral raise
  "Arnold Press":          "eOrFCnx", // dumbbell arnold press v. 2
  "Rear Delt Fly":         "8DiFDVA", // dumbbell rear fly
  "Shrugs":                "cbuFJrn", // lever gripless shrug v. 2
  // Arms
  "Preacher Curl":         "7D5bgLT", // dumbbell seated preacher curl
  "Incline Dumbbell Curl": "ByX0WxV", // dumbbell incline hammer curl
  "Hammer Curl":           "2NpxjC1", // dumbbell hammer curl v. 2
  "EZ Bar Curl":           "25GPyDY", // barbell curl
  "Barbell Curl":          "25GPyDY", // barbell curl
  "Wrist Curl":            "2dImyQ8", // dumbbell seated palms up wrist curl
  "Skull Crusher":         "h8LFzo9", // barbell lying triceps extension skull crusher
  "Overhead Tricep Extension": "1xHyxys", // cable high pulley overhead tricep extension
  // Core
  "Crunches":              "9Ap7miY", // decline crunch
  "Bicycle Crunch":        "tZkGYZ9", // band bicycle crunch
  "Russian Twist":         "fZFZ704", // weighted russian twist
  "Ab Wheel Rollout":      "xnInPfE", // barbell standing ab rollerout
  "Side Plank":            "5VXmnV5", // bodyweight incline side plank
  "Plank":                 "hCjGsRQ", // power point plank
  "Farmers Walk":          "qPEzJjA", // farmers walk
  // Glutes
  "Hip Thrust":            "qg2PGl6", // barbell glute bridge two legs on bench
  "Glute Bridge":          "GibBPPg", // glute bridge march
  // Legs
  "Squat":                 "DhMl549", // barbell full squat
  "Front Squat":           "lFhb2Rw", // smith front squat clean grip
  "Leg Curl":              "17lJ1kr", // lever lying leg curl
  "Nordic Curl":           "0rHfvy9", // inverse leg curl on pull-up cable machine
  "Leg Press":             "10Z2DXU", // sled 45° leg press
  "Leg Extension":         "my33uHU", // lever leg extension
  "Walking Lunge":         "IZVHb27", // walking lunge
  "Step-Up":               "76vfTdU", // dumbbell step up
  "Seated Calf Raise":     "0S75mYG", // smith seated one leg calf raise
  "Donkey Calf Raise":     "A2upspL", // one leg donkey calf raise
  // Olympic / Plyometric
  "Power Clean":           "SiWCcTN", // power clean
  "Clean and Jerk":        "SGY8Zui", // barbell clean and press
  "Box Jump":              "iPm26QU", // box jump down with one leg stabilization
  "Burpee":                "dK9394r", // burpee
};
const GIF_BASE = "https://static.exercisedb.dev/media";

function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function scoreMatch(dbName, query) {
  const db = normalize(dbName);
  const q = normalize(query);
  if (db === q) return 100;
  if (db.startsWith(q) || q.startsWith(db)) return 80;
  const qWords = q.split(" ");
  const dbWords = db.split(" ");
  const allPresent = qWords.every(w => dbWords.includes(w));
  if (allPresent) return 60;
  const matchCount = qWords.filter(w => db.includes(w)).length;
  return (matchCount / qWords.length) * 40;
}

async function apiFetch(searchTerm, retries = 3) {
  const encoded = encodeURIComponent(searchTerm);
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 500 * attempt));
    try {
      const res = await fetch(`${API_BASE}/exercises?name=${encoded}&limit=30`);
      if (!res.ok) continue;
      const json = await res.json();
      const data = json.data ?? [];
      if (data.length > 0) return data;
    } catch { /* network error, retry */ }
  }
  return [];
}

async function searchExercise(ourName, query) {
  // Build search query variants from most to least specific
  const normQuery = normalize(query);
  const normName = normalize(ourName);
  const words = normName.split(" ").filter(w => w.length > 3);
  const queries = [...new Set([
    normQuery,
    normName,
    words.join(" "),        // all meaningful words
    words.slice(0, 2).join(" "), // first two words
    words.pop(),            // last word (most distinctive)
    words[0],               // first word
  ])].filter(Boolean);

  for (const q of queries) {
    const results = await apiFetch(q);
    if (results.length > 0) return { results, usedQuery: q };
  }
  return { results: [], usedQuery: query };
}

function bestMatch(results, query) {
  if (!results.length) return null;
  let best = null;
  let bestScore = 0;
  for (const r of results) {
    const score = scoreMatch(r.name, query);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore >= 20 ? best : null;
}

async function main() {
  const matched = [];
  const unmatched = [];

  for (const ourName of OUR_EXERCISES) {
    // Use hardcoded GIF ID if available (avoids rate-limit issues)
    if (HARDCODED_GIFS[ourName]) {
      const gifUrl = `${GIF_BASE}/${HARDCODED_GIFS[ourName]}.gif`;
      matched.push({ ourName, gifUrl, dbName: "(hardcoded)" });
      process.stderr.write(`  ✓ ${ourName} → (hardcoded)\n`);
      continue;
    }

    const query = SEARCH_TERMS[ourName] ?? ourName.toLowerCase();
    const { results, usedQuery } = await searchExercise(ourName, query);
    const match = bestMatch(results, query);

    if (match) {
      matched.push({ ourName, gifUrl: match.gifUrl, dbName: match.name });
      process.stderr.write(`  ✓ ${ourName} → ${match.name} (via "${usedQuery}")\n`);
    } else {
      unmatched.push(ourName);
      process.stderr.write(`  ✗ ${ourName} (no match for "${usedQuery}")\n`);
    }
    await new Promise(r => setTimeout(r, 400));
  }

  console.error(`\nMatched: ${matched.length}/${OUR_EXERCISES.length}`);
  if (unmatched.length) console.error("Unmatched:", unmatched.join(", "));

  console.log("-- Auto-generated: exercise GIF URLs from ExerciseDB OSS (https://oss.exercisedb.dev)");
  console.log("alter table exercises add column if not exists gif_url text;\n");
  for (const { ourName, gifUrl } of matched) {
    const escaped = ourName.replace(/'/g, "''");
    console.log(`update exercises set gif_url = '${gifUrl}' where name = '${escaped}' and is_custom = false;`);
  }
}

main().catch(console.error);
