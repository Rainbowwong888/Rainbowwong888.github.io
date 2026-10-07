/**
 * 主程式：UI 渲染 + 狀態管理 + 事件處理
 * 全部用事件委派，不需要每次 render 都重新綁定
 */
(function () {
  'use strict';

  // ==================== 常數 ====================
  const EQUIPMENT = [
    '爐灶', '平底鍋', '湯鍋', '烤箱', '微波爐', '電鍋', '氣炸鍋',
  ];

  const COMMON_INGREDIENTS = [
    '蛋', '番茄', '洋蔥', '蒜', '蔥', '馬鈴薯', '胡蘿蔔', '青菜',
    '雞肉', '豬肉', '牛肉', '米', '麵條', '豆腐', '香菇',
    '起司', '奶油', '牛奶',
  ];

  const COMMON_ALLERGENS = [
    '蛋', '奶', '花生', '堅果', '海鮮', '麩質', '大豆', '芝麻',
  ];

  const TIME_OPTIONS = [
    { label: '15 分鐘內', value: 15 },
    { label: '30 分鐘內', value: 30 },
    { label: '60 分鐘內', value: 60 },
    { label: '無限制', value: 999 },
  ];

  const TOTAL_STEPS = 5;
  const RATING_LABELS = ['', '麻麻地', 'OK', '不錯', '好好食', '完美！'];

  // ==================== 狀態 ====================
  const state = {
    phase: 'wizard',       // wizard | results | detail | rating
    wizardStep: 0,

    // 問卷資料
    servings: 2,
    have: [],
    allergies: [],
    maxTime: 30,
    equipment: ['爐灶', '平底鍋'],

    // 結果
    matches: [],
    selected: null,
    checkedSteps: [],

    // 評分
    rating: 0,
    comment: '',
    ratingSubmitted: false,
  };

  const app = document.getElementById('app');

  // ==================== 工具 ====================
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c];
    });
  }

  function toggleInArray(arr, value) {
    const i = arr.indexOf(value);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(value);
  }

  // ==================== 渲染入口 ====================
  function render(scroll) {
    if (scroll !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    switch (state.phase) {
      case 'wizard':
        renderWizard();
        break;
      case 'results':
        renderResults();
        break;
      case 'detail':
        renderDetail();
        break;
      case 'rating':
        renderRating();
        break;
    }
  }

  // ==================== Wizard ====================
  function renderWizard() {
    const step = state.wizardStep;
    let body = '';

    // --- 步驟 0：人數 ---
    if (step === 0) {
      body =
        '<div class="section">' +
          '<h2>幾人份？</h2>' +
          '<p class="hint">會按人數自動調整食材份量</p>' +
          '<div class="counter">' +
            '<button class="counter-btn" data-action="dec-servings"' +
              (state.servings <= 1 ? ' disabled' : '') + '>−</button>' +
            '<span class="counter-value">' + state.servings + '</span>' +
            '<button class="counter-btn" data-action="inc-servings"' +
              (state.servings >= 12 ? ' disabled' : '') + '>+</button>' +
            '<span class="counter-label">人份</span>' +
          '</div>' +
        '</div>';
    }

    // --- 步驟 1：現有食材 ---
    else if (step === 1) {
      let chipsHtml = '';
      if (state.have.length) {
        chipsHtml = '<div class="chips">';
        state.have.forEach(function (item) {
          chipsHtml +=
            '<button class="chip" data-action="remove-have" data-value="' +
              esc(item) + '">' + esc(item) + ' ✕</button>';
        });
        chipsHtml += '</div>';
      }

      const availableQuick = COMMON_INGREDIENTS.filter(function (i) {
        return state.have.indexOf(i) < 0;
      });

      let quickHtml = '';
      availableQuick.forEach(function (item) {
        quickHtml +=
          '<button class="quick-btn" data-action="quick-add-have" data-value="' +
            esc(item) + '">+ ' + esc(item) + '</button>';
      });

      body =
        '<div class="section">' +
          '<h2>你手上有什麼食材？</h2>' +
          '<p class="hint">選或打都可以，沒有也可以直接跳過</p>' +
          '<div class="input-group">' +
            '<input class="input" data-input="ingredient" ' +
              'placeholder="輸入食材，例如：番茄" />' +
            '<button class="btn btn-primary" data-action="add-have">加入</button>' +
          '</div>' +
          chipsHtml +
          '<p class="quick-label">熱門食材</p>' +
          '<div class="quick-options">' + quickHtml + '</div>' +
        '</div>';
    }

    // --- 步驟 2：過敏 ---
    else if (step === 2) {
      let allergenBtns = '';
      COMMON_ALLERGENS.forEach(function (item) {
        const selected = state.allergies.indexOf(item) >= 0;
        allergenBtns +=
          '<button class="allergy-btn' + (selected ? ' selected' : '') + '" ' +
            'data-action="toggle-allergy" data-value="' + esc(item) + '">' +
            esc(item) +
          '</button>';
      });

      const warning = state.allergies.length
        ? '<p class="allergy-warning">會排除含：' +
            esc(state.allergies.join('、')) + ' 的菜式</p>'
        : '';

      body =
        '<div class="section">' +
          '<h2>有沒有過敏或唔食嘅嘢？</h2>' +
          '<p class="hint">這些食材會完全排除，不會出現在建議中</p>' +
          '<div class="quick-options">' + allergenBtns + '</div>' +
          warning +
        '</div>';
    }

    // --- 步驟 3：時間 ---
    else if (step === 3) {
      let timeBtns = '';
      TIME_OPTIONS.forEach(function (opt) {
        const selected = state.maxTime === opt.value;
        timeBtns +=
          '<button class="time-btn' + (selected ? ' selected' : '') + '" ' +
            'data-action="set-time" data-value="' + opt.value + '">' +
            esc(opt.label) +
          '</button>';
      });

      body =
        '<div class="section">' +
          '<h2>可以煮幾久？</h2>' +
          '<p class="hint">會按食譜總時間過濾</p>' +
          '<div class="time-grid">' + timeBtns + '</div>' +
        '</div>';
    }

    // --- 步驟 4：設備 ---
    else if (step === 4) {
      let equipBtns = '';
      EQUIPMENT.forEach(function (item) {
        const selected = state.equipment.indexOf(item) >= 0;
        equipBtns +=
          '<button class="equip-btn' + (selected ? ' selected' : '') + '" ' +
            'data-action="toggle-equipment" data-value="' + esc(item) + '">' +
            esc(item) +
          '</button>';
      });

      const warn = state.equipment.length === 0
        ? '<p class="allergy-warning">至少要選一項設備才會有建議</p>'
        : '';

      body =
        '<div class="section">' +
          '<h2>你有什麼煮食設備？</h2>' +
          '<p class="hint">只會顯示你能做到的菜式</p>' +
          '<div class="equip-grid">' + equipBtns + '</div>' +
          warn +
        '</div>';
    }

    // --- 進度條 ---
    let progressHtml = '<div class="progress">';
    for (let i = 0; i < TOTAL_STEPS; i++) {
      progressHtml +=
        '<div class="progress-bar' + (i <= step ? ' active' : '') + '"></div>';
    }
    progressHtml += '</div>';

    // --- 底部按鈕 ---
    const nextDisabled = step === 4 && state.equipment.length === 0;
    const nextLabel = step === TOTAL_STEPS - 1 ? '查看建議' : '下一步';

    app.innerHTML =
      '<div class="card">' +
        progressHtml +
        body +
        '<div class="wizard-nav">' +
          '<button class="btn btn-ghost" data-action="wizard-back"' +
            (step === 0 ? ' disabled' : '') + '>上一步</button>' +
          '<button class="btn btn-primary" data-action="wizard-next"' +
            (nextDisabled ? ' disabled' : '') + '>' + nextLabel + '</button>' +
        '</div>' +
      '</div>';
  }

  // ==================== Results ====================
  function renderResults() {
    if (!state.matches.length) {
      app.innerHTML =
        '<div class="card empty-state">' +
          '<div class="emoji-lg">🤔</div>' +
          '<p class="empty-title">找不到符合的菜式</p>' +
          '<p class="empty-hint">試下放寬時間、增加設備，或者減少過敏原限制</p>' +
          '<button class="btn btn-primary" data-action="restart">重新選擇</button>' +
        '</div>';
      return;
    }

    let itemsHtml = '';
    state.matches.forEach(function (m) {
      const coverage = Math.round(m.coverage * 100);
      const tagClass = m.coverage === 1 ? 'tag-success' : 'tag-warn';

      const missingHtml = m.missing.length
        ? '<p class="recipe-missing">還需要：' +
            esc(m.missing.join('、')) + '</p>'
        : '';

      itemsHtml +=
        '<button class="recipe-item" data-action="select-recipe" ' +
          'data-id="' + esc(m.recipe.id) + '">' +
          '<div class="recipe-emoji">' + m.recipe.emoji + '</div>' +
          '<div class="recipe-info">' +
            '<h3>' + esc(m.recipe.name) + '</h3>' +
            '<p class="recipe-desc">' + esc(m.recipe.description) + '</p>' +
            '<div class="recipe-tags">' +
              '<span class="tag">⏱ ' + m.recipe.timeMinutes + ' 分鐘</span>' +
              '<span class="tag ' + tagClass + '">食材齊 ' + coverage + '%</span>' +
            '</div>' +
            missingHtml +
          '</div>' +
          '<div class="recipe-score">' +
            '<div class="score-num">' + Math.round(m.score * 100) + '</div>' +
            '<div class="score-label">匹配分</div>' +
          '</div>' +
        '</button>';
    });

    app.innerHTML =
      '<div class="results-header">' +
        '<div>' +
          '<h2>為你推薦 ' + state.matches.length + ' 道菜</h2>' +
          '<p>' + state.servings + ' 人份 · 按食材匹配度排序</p>' +
        '</div>' +
        '<button class="link-btn" data-action="restart">重新選擇</button>' +
      '</div>' +
      '<div class="recipe-list">' + itemsHtml + '</div>';
  }

  // ==================== Detail ====================
  function renderDetail() {
    const recipe = state.selected;
    const scaled = scaleIngredients(recipe, state.servings);

    // 食材列表
    let ingredientsHtml = '';
    scaled.forEach(function (ing) {
      const optionalTag = ing.optional
        ? ' <span class="optional">（可選）</span>'
        : '';
      ingredientsHtml +=
        '<li>' +
          '<span>' + esc(ing.name) + '</span>' +
          '<span class="muted">' + ing.amount + ' ' + esc(ing.unit) +
            optionalTag + '</span>' +
        '</li>';
    });

    // 步驟列表
    const allDone = state.checkedSteps.length === recipe.steps.length;
    let stepsHtml = '';
    recipe.steps.forEach(function (s) {
      const done = state.checkedSteps.indexOf(s.order) >= 0;
      const timeHtml = s.minutes !== undefined
        ? '<span class="step-time">' + s.minutes + ' 分</span>'
        : '';

      stepsHtml +=
        '<li>' +
          '<button class="step' + (done ? ' step-done' : '') + '" ' +
            'data-action="toggle-step" data-order="' + s.order + '">' +
            '<span class="step-num">' + (done ? '✓' : s.order) + '</span>' +
            '<span class="step-text">' + esc(s.text) + '</span>' +
            timeHtml +
          '</button>' +
        '</li>';
    });

    // 過敏警告
    const allergensHtml = recipe.allergens.length
      ? '<div class="alert alert-danger">⚠️ 本食譜含：' +
          esc(recipe.allergens.join('、')) +
          '<div class="alert-sub">如有嚴重過敏，請自行評估交叉污染風險</div>' +
        '</div>'
      : '';

    // 設備標籤
    let equipHtml = '';
    recipe.equipment.forEach(function (e) {
      equipHtml += '<span class="tag">' + esc(e) + '</span>';
    });

    // 重設步驟按鈕
    const resetBtn = state.checkedSteps.length
      ? '<button class="link-btn small" data-action="reset-steps">重設</button>'
      : '';

    app.innerHTML =
      '<button class="link-btn back-btn" data-action="back-to-results">' +
        '← 返回列表' +
      '</button>' +
      '<div class="card">' +
        '<div class="detail-header">' +
          '<div class="recipe-emoji-lg">' + recipe.emoji + '</div>' +
          '<div>' +
            '<h2 class="detail-title">' + esc(recipe.name) + '</h2>' +
            '<p class="muted">' + esc(recipe.description) + '</p>' +
          '</div>' +
        '</div>' +

        '<div class="tags">' +
          '<span class="tag">⏱ ' + recipe.timeMinutes + ' 分鐘</span>' +
          '<span class="tag">🍽 ' + state.servings + ' 人份</span>' +
          equipHtml +
        '</div>' +

        allergensHtml +

        '<section class="section" style="margin-top:24px">' +
          '<h3>食材（' + state.servings + ' 人份）</h3>' +
          '<ul class="ingredient-list">' + ingredientsHtml + '</ul>' +
        '</section>' +

        '<section class="section">' +
          '<div class="section-header">' +
            '<h3>步驟（' + state.checkedSteps.length + '/' +
              recipe.steps.length + '）</h3>' +
            resetBtn +
          '</div>' +
          '<ol class="step-list">' + stepsHtml + '</ol>' +
        '</section>' +

        '<button class="btn btn-block ' +
          (allDone ? 'btn-success' : 'btn-primary') + '" data-action="go-rating">' +
          (allDone ? '🎉 煮完了，去評分' : '煮完了，去評分') +
        '</button>' +
      '</div>';
  }

  // ==================== Rating ====================
  function renderRating() {
    if (state.ratingSubmitted) {
      app.innerHTML =
        '<div class="card empty-state">' +
          '<div class="emoji-lg">🎉</div>' +
          '<h2 class="empty-title">多謝你的評分！</h2>' +
          '<p class="empty-hint">你的意見會用來改善之後的推薦</p>' +
          '<button class="btn btn-primary" data-action="finish">再煮一道</button>' +
        '</div>';
      return;
    }

    let starsHtml = '';
    for (let n = 1; n <= 5; n++) {
      const active = n <= state.rating ? ' active' : '';
      starsHtml +=
        '<button class="star' + active + '" data-action="set-rating" ' +
          'data-value="' + n + '" aria-label="' + n + ' 星">⭐</button>';
    }

    const labelText = state.rating
      ? RATING_LABELS[state.rating]
      : '點星星評分';

    app.innerHTML =
      '<div class="card">' +
        '<h2 class="detail-title" style="font-size:20px">' +
          '為「' + esc(state.selected.name) + '」評分' +
        '</h2>' +
        '<p class="hint">幫手話我知呢道菜好唔好食</p>' +

        '<div class="stars">' + starsHtml + '</div>' +
        '<p class="rating-label">' + labelText + '</p>' +

        '<textarea class="textarea" data-input="comment" rows="4" ' +
          'placeholder="有什麼想講？（可選）例如：太鹹、步驟清楚、份量剛好、想加辣...">' +
          esc(state.comment) +
        '</textarea>' +

        '<div class="rating-actions">' +
          '<button class="btn btn-ghost flex-1" data-action="skip-rating">跳過</button>' +
          '<button class="btn btn-primary flex-1" data-action="submit-rating"' +
            (state.rating ? '' : ' disabled') + '>提交</button>' +
        '</div>' +
      '</div>';

    // 星星 hover 預覽
    const starsEl = app.querySelector('.stars');
    if (starsEl) {
      starsEl.addEventListener('mouseover', function (e) {
        const star = e.target.closest('.star');
        if (!star) return;
        const hoverVal = Number(star.dataset.value);
        const all = starsEl.querySelectorAll('.star');
        for (let i = 0; i < all.length; i++) {
          const v = Number(all[i].dataset.value);
          all[i].classList.toggle('active', v <= hoverVal);
        }
      });
      starsEl.addEventListener('mouseleave', function () {
        const all = starsEl.querySelectorAll('.star');
        for (let i = 0; i < all.length; i++) {
          const v = Number(all[i].dataset.value);
          all[i].classList.toggle('active', v <= state.rating);
        }
      });
    }
  }

  // ==================== 動作邏輯 ====================
  function addIngredient() {
    const input = app.querySelector('[data-input="ingredient"]');
    if (!input) return;
    const val = input.value.trim();
    if (val && state.have.indexOf(val) < 0) {
      state.have.push(val);
      render(false);
      const newInput = app.querySelector('[data-input="ingredient"]');
      if (newInput) newInput.focus();
    }
  }

  function startRecommendation() {
    const prefs = {
      servings: state.servings,
      have: state.have,
      allergies: state.allergies,
      maxTime: state.maxTime,
      equipment: state.equipment,
    };

    let matches = recommend(RECIPES, prefs);
    matches = applyFeedback(matches);

    state.matches = matches;
    state.phase = 'results';
    render();
  }

  /**
   * 把使用者過去對某些食譜的評分反映到排序
   * 3 分為中性；負評權重比正評更重
   */
  function applyFeedback(matches) {
    const all = loadFeedback();
    if (!all.length) return matches;

    return matches
      .map(function (m) {
        const ratings = all.filter(function (f) {
          return f.recipeId === m.recipe.id;
        });
        if (!ratings.length) return m;

        let sum = 0;
        for (let i = 0; i < ratings.length; i++) sum += ratings[i].rating;
        const avg = sum / ratings.length;

        const delta = avg >= 3 ? (avg - 3) * 0.05 : (avg - 3) * 0.1;
        return Object.assign({}, m, { score: m.score + delta });
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });
  }

  function submitRating() {
    if (!state.rating) return;
    saveFeedback({
      recipeId: state.selected.id,
      rating: state.rating,
      comment: state.comment.trim(),
      at: Date.now(),
    });
    state.ratingSubmitted = true;
    render();
  }

  function resetAll() {
    state.phase = 'wizard';
    state.wizardStep = 0;
    state.servings = 2;
    state.have = [];
    state.allergies = [];
    state.maxTime = 30;
    state.equipment = ['爐灶', '平底鍋'];
    state.matches = [];
    state.selected = null;
    state.checkedSteps = [];
    state.rating = 0;
    state.comment = '';
    state.ratingSubmitted = false;
  }

  // ==================== 事件：點擊 ====================
  function handleClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;

    switch (action) {
      // ---- Wizard ----
      case 'inc-servings':
        state.servings = Math.min(12, state.servings + 1);
        render(false);
        break;

      case 'dec-servings':
        state.servings = Math.max(1, state.servings - 1);
        render(false);
        break;

      case 'wizard-back':
        if (state.wizardStep > 0) {
          state.wizardStep--;
          render();
        }
        break;

      case 'wizard-next':
        if (state.wizardStep < TOTAL_STEPS - 1) {
          state.wizardStep++;
          render();
        } else {
          startRecommendation();
        }
        break;

      case 'add-have':
        addIngredient();
        break;

      case 'remove-have':
        state.have = state.have.filter(function (x) {
          return x !== btn.dataset.value;
        });
        render(false);
        break;

      case 'quick-add-have':
        if (state.have.indexOf(btn.dataset.value) < 0) {
          state.have.push(btn.dataset.value);
        }
        render(false);
        break;

      case 'toggle-allergy':
        toggleInArray(state.allergies, btn.dataset.value);
        render(false);
        break;

      case 'set-time':
        state.maxTime = Number(btn.dataset.value);
        render(false);
        break;

      case 'toggle-equipment':
        toggleInArray(state.equipment, btn.dataset.value);
        render(false);
        break;

      // ---- Results ----
      case 'restart':
        resetAll();
        render();
        break;

      case 'select-recipe':
        state.selected = RECIPES.find(function (r) {
          return r.id === btn.dataset.id;
        });
        state.checkedSteps = [];
        state.phase = 'detail';
        render();
        break;

      // ---- Detail ----
      case 'back-to-results':
        state.phase = 'results';
        render();
        break;

      case 'toggle-step': {
        const order = Number(btn.dataset.order);
        toggleInArray(state.checkedSteps, order);
        render(false);
        break;
      }

      case 'reset-steps':
        state.checkedSteps = [];
        render(false);
        break;

      case 'go-rating':
        state.phase = 'rating';
        state.rating = 0;
        state.comment = '';
        state.ratingSubmitted = false;
        render();
        break;

      // ---- Rating ----
      case 'set-rating':
        state.rating = Number(btn.dataset.value);
        render(false);
        break;

      case 'submit-rating':
        submitRating();
        break;

      case 'skip-rating':
      case 'finish':
        resetAll();
        render();
        break;
    }
  }

  // ==================== 事件：輸入 ====================
  function handleInput(e) {
    const el = e.target.closest('[data-input]');
    if (!el) return;
    if (el.dataset.input === 'comment') {
      state.comment = el.value;
    }
  }

  // ==================== 事件：鍵盤 ====================
  function handleKeydown(e) {
    if (e.key === 'Enter' && e.target.dataset.input === 'ingredient') {
      e.preventDefault();
      addIngredient();
    }
  }

  // ==================== 綁定 ====================
  app.addEventListener('click', handleClick);
  app.addEventListener('input', handleInput);
  app.addEventListener('keydown', handleKeydown);

  // ==================== 啟動 ====================
  render();
})();