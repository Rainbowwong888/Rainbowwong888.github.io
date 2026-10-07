/**
 * 依人數等比例縮放食材份量
 */
function scaleIngredients(recipe, servings) {
  const factor = servings / recipe.baseServings;
  return recipe.ingredients.map(function (i) {
    return {
      name: i.name,
      amount: roundNice(i.amount * factor),
      unit: i.unit,
      optional: i.optional,
    };
  });
}

/**
 * 讓數字好看一點：大數取整、中間取 0.5、小數保留 2 位
 */
function roundNice(n) {
  if (n >= 10) return Math.round(n);
  if (n >= 1) return Math.round(n * 2) / 2;
  return Math.round(n * 100) / 100;
}

/**
 * 評分儲存（localStorage）
 * 之後要跨裝置同步，只要換這兩個函式的實作就好
 */
const FEEDBACK_KEY = 'recipe_feedback_v1';

function loadFeedback() {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveFeedback(feedback) {
  const all = loadFeedback();
  all.push(feedback);
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all));
  } catch (e) {
    // 私密模式或空間不足時忽略
  }
}

function avgRating(recipeId) {
  const all = loadFeedback().filter(function (f) {
    return f.recipeId === recipeId;
  });
  if (!all.length) return null;
  let sum = 0;
  for (let i = 0; i < all.length; i++) sum += all[i].rating;
  return sum / all.length;
}

/**
 * 推薦引擎
 *   1. 硬性過濾 — 過敏、設備不足、超時 → 直接淘汰
 *   2. 軟性評分 — 食材覆蓋率高的排前面
 */
function recommend(recipes, prefs) {
  const have = {};
  prefs.have.forEach(function (n) {
    have[normalize(n)] = true;
  });

  const equip = {};
  prefs.equipment.forEach(function (e) {
    equip[e] = true;
  });

  const allergies = {};
  prefs.allergies.forEach(function (a) {
    allergies[normalize(a)] = true;
  });

  const results = [];

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];

    // ===== 硬性過濾 =====
    let blocked = false;

    for (let j = 0; j < r.allergens.length; j++) {
      if (allergies[normalize(r.allergens[j])]) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    for (let j = 0; j < r.equipment.length; j++) {
      if (!equip[r.equipment[j]]) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    if (r.timeMinutes > prefs.maxTime) continue;

    // ===== 軟性評分 =====
    const required = r.ingredients.filter(function (x) {
      return !x.optional;
    });
    const owned = required.filter(function (x) {
      return have[normalize(x.name)];
    });
    const missing = required.filter(function (x) {
      return !have[normalize(x.name)];
    });

    const coverage = required.length ? owned.length / required.length : 1;
    const missingPenalty = Math.min(missing.length * 0.08, 0.4);
    const score = coverage * 0.85 - missingPenalty + 0.15;

    results.push({
      recipe: r,
      score: score,
      coverage: coverage,
      missing: missing.map(function (x) {
        return x.name;
      }),
      owned: owned.map(function (x) {
        return x.name;
      }),
    });
  }

  return results.sort(function (a, b) {
    return b.score - a.score;
  });
}